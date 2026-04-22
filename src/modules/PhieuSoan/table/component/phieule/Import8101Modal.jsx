/* eslint-disable react/prop-types */
import { useState } from "react";
import { phieuLeService } from "@/services/phieusoan/phieule.service";
import { dinhViService } from "@/services/phieusoan/dinhvi.service";

// =============================================================================
// PARSE INV041 (8101) - Chạy hoàn toàn ở frontend
// File UTF-16LE → mỗi ký tự xen space → normalize trước
//
// Lấy:
//   sd_tf   ← Transaction Reference cuối mỗi dòng SKU (17087861)
//   mach    ← "665" (số đầu của Store line)
//   tench   ← "00665-CF TINH LO 15-1031" (phần còn lại của Store line)
//   sku     ← 7 chữ số đầu dòng data
//   quantity← số X.XX đầu tiên < 10000, kế tiếp là giá >= 1000
//
// so_document ← MBR Name: R0053471 → bỏ prefix R00 → 53471
// =============================================================================
const parseINV041 = (rawText) => {
  // Normalize: collapse multi-space (do UTF-16LE render) thành single space
  const normalized = rawText.replace(/[ \t]+/g, " ").trim();
  const lines = normalized.split(/\r?\n/);

  let so_document = null;
  let sd_tf = null;
  let mach = null;
  let tench = null;
  const items = []; // { sku, quantity }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // MBR Name: R0053471 → so_document = 53471
    if (!so_document) {
      const m = line.match(/MBR\s+Name\s*:\s*R0*(\d+)/i);
      if (m) {
        so_document = parseInt(m[1], 10);
        continue;
      }
    }

    // Store:   665 00665-CF TINH LO 15-1031
    if (!mach) {
      const m = line.match(/Store\s*:\s*(\d+)\s+(.+)/i);
      if (m) {
        mach = m[1].trim(); // "665"
        tench = m[2].trim(); // "00665-CF TINH LO 15-1031"
        continue;
      }
    }

    // Chỉ xử lý dòng data có "On Order - Transfer"
    if (!line.includes("On Order - Transfer")) continue;

    // Bỏ dòng category header: "73 On Order - Transfer"
    if (/^\d+\s+On Order\s+-\s+Transfer\s*$/.test(line)) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 10) continue;

    // SKU: 7 chữ số đầu
    if (!/^\d{7}$/.test(parts[0])) continue;
    const sku = parseInt(parts[0], 10);

    // Transaction Reference: phần tử cuối (17087861)
    const refStr = parts[parts.length - 1];
    if (!/^\d{6,}$/.test(refStr)) continue;
    if (!sd_tf) sd_tf = parseInt(refStr, 10);

    // Quantity: số X.XX đầu tiên < 10000, phần tử kế >= 1000 (Unit Retail)
    const dateIdx = parts.findIndex((p) => /^\d{2}\/\d{2}\/\d{2,4}$/.test(p));
    let quantity = null;
    if (dateIdx !== -1 && dateIdx + 1 < parts.length) {
      const qtyStr = parts[dateIdx + 1];
      if (/^\d+\.\d{2}$/.test(qtyStr)) {
        quantity = parseFloat(qtyStr);
      }
    }

    if (!quantity || quantity <= 0) continue;

    items.push({ sku, quantity });
  }

  return { so_document, sd_tf, mach, tench, items };
};

// =============================================================================
// COMPONENT
// =============================================================================
const Import8101Modal = ({ isOpen, onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [importProgress, setImportProgress] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...selected.filter((f) => !existing.has(f.name))];
    });
    setMessage("");
  };

  const handleRemoveFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleClearFiles = () => setFiles([]);

  // ── Map SKU list → { sku: name } qua dinhViService ────────────────────────
  const fetchSkuNames = async (skuList) => {
    const nameMap = {};
    // Gọi song song, mỗi SKU 1 request (limit=1)
    await Promise.allSettled(
      skuList.map(async (sku) => {
        try {
          const res = await dinhViService.getAllDinhVi({ sku, limit: 1 });
          // getAllDinhVi trả { data: [...], pagination: {...} }
          const record = res?.data?.[0] ?? res?.[0];
          nameMap[sku] = record?.name || record?.Name || `SKU ${sku}`;
        } catch {
          nameMap[sku] = `SKU ${sku}`;
        }
      }),
    );
    return nameMap;
  };

  // ── Đọc file txt → text string ────────────────────────────────────────────
  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      // UTF-16LE phổ biến với INV041
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Không đọc được file"));
      reader.readAsText(file, "utf-16");
    });

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!files.length) {
      setMessage("Vui lòng chọn ít nhất 1 file để import");
      setMessageType("error");
      return;
    }

    setImporting(true);
    setMessage("");
    setImportProgress({ current: 0, total: files.length });

    const results = { success: 0, failed: 0, duplicates: [], otherErrors: [] };

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // 1. Đọc + parse file
          const text = await readFileAsText(file);
          const parsed = parseINV041(text);

          if (!parsed.so_document || !parsed.items.length) {
            throw new Error(
              "Không parse được dữ liệu từ file. Kiểm tra định dạng INV041.",
            );
          }

          // 2. Map SKU → name từ DinhVi (bulk)
          const skuList = [...new Set(parsed.items.map((i) => i.sku))];
          const nameMap = await fetchSkuNames(skuList);

          // 3. Build chi_tiet — chỉ lấy name từ DinhVi, slot mặc định "8101"
          const chi_tiet = parsed.items.map((item, idx) => ({
            seq: idx + 1,
            slot: "8101",
            sku: item.sku,
            name: nameMap[item.sku] || `SKU ${item.sku}`,
            quantity: item.quantity,
          }));

          // 4. Build payload — truyền thẳng sd_tf, mach, tench, không để backend map DataCH
          const payload = {
            loai_phieu: "8101",
            trang_thai: "Chờ xử lý",
            sd_tf: parsed.sd_tf,
            mach: parsed.mach, // ✅ giữ
            // tench: parsed.tench, ❌ bỏ — backend tự lấy từ DataCH
            chi_tiet,
          };

          // 5. Gọi createPhieuLe có sẵn
          await phieuLeService.import8101PhieuLe(payload);
          results.success++;
        } catch (err) {
          results.failed++;
          const errMsg =
            err?.response?.data?.message || err?.message || "Không xác định";

          if (/trùng|duplicate|exists|đã tồn tại/i.test(errMsg)) {
            const docMatch = errMsg.match(/document\s*(\d+)/i);
            const fileMatch = file.name.match(/(\d{4,})/);
            results.duplicates.push({
              fileName: file.name,
              soDocument: docMatch?.[1] || fileMatch?.[1] || "Không xác định",
              message: errMsg,
            });
          } else {
            results.otherErrors.push({ fileName: file.name, message: errMsg });
          }
        }

        setImportProgress({ current: i + 1, total: files.length });
      }

      // ── Summary ────────────────────────────────────────────────────────────
      let summaryMessage = "";
      if (results.failed === 0) {
        summaryMessage = `✅ Import thành công ${results.success} file 8101!`;
        setMessageType("success");
      } else {
        summaryMessage = `⚠️ Import hoàn tất: ${results.success}/${files.length} file thành công, ${results.failed} file thất bại.\n\n`;
        if (results.duplicates.length > 0) {
          summaryMessage += `📋 Số document bị trùng (${results.duplicates.length}):\n`;
          results.duplicates.forEach((d, idx) => {
            summaryMessage += `${idx + 1}. File: ${d.fileName}\n   → Document: ${d.soDocument}\n`;
          });
        }
        if (results.otherErrors.length > 0) {
          if (results.duplicates.length > 0) summaryMessage += "\n";
          summaryMessage += `❌ Lỗi khác (${results.otherErrors.length}):\n`;
          results.otherErrors.forEach((e, idx) => {
            summaryMessage += `${idx + 1}. ${e.fileName}: ${e.message}\n`;
          });
        }
        setMessageType("error");
      }

      setMessage(summaryMessage);
      setFiles([]);
      if (onSuccess) onSuccess();

      if (results.failed === 0) {
        setTimeout(() => {
          onClose();
          setMessage("");
        }, 1500);
      }
    } catch (error) {
      setMessage(error?.message || "Import thất bại.");
      setMessageType("error");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleClose = () => {
    if (importing) return;
    setFiles([]);
    setMessage("");
    setMessageType("");
    setImportProgress(null);
    onClose();
  };

  const progressPercent = importProgress
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                8101
              </span>
              <h2 className="text-xl font-semibold text-slate-800">
                Import 8101 (INV041)
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Import file .txt INV041 — SKU tự động map tên từ Định Vị
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <h3 className="text-base font-semibold text-slate-800">
                  Chọn file
                </h3>
              </div>
              {files.length > 0 && (
                <button
                  onClick={handleClearFiles}
                  disabled={importing}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium disabled:opacity-50"
                >
                  Xóa hết
                </button>
              )}
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-indigo-200 rounded-xl p-6 hover:border-indigo-400 transition-colors bg-indigo-50/30">
              <input
                type="file"
                accept=".txt"
                multiple
                onChange={handleFileChange}
                disabled={importing}
                className="hidden"
                id="inv041-file-upload"
              />
              <label
                htmlFor="inv041-file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <svg
                  className="w-12 h-12 text-indigo-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm text-slate-600 mb-1">
                  {files.length > 0
                    ? "Click để chọn thêm file"
                    : "Click để chọn file"}
                </p>
                <p className="text-xs text-slate-500">
                  Chỉ hỗ trợ: .txt (INV041) — Chọn nhiều file cùng lúc
                </p>
              </label>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    {files.length} file đã chọn
                  </span>
                  <span className="text-xs text-slate-500">
                    Tổng:{" "}
                    {(
                      files.reduce((s, f) => s + f.size, 0) /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          8101
                        </span>
                        <span className="text-sm text-slate-700 truncate">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          disabled={importing}
                          className="text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            {importProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>
                    Đang import file {importProgress.current}/
                    {importProgress.total}...
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={!files.length || importing}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang import 8101...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Import 8101 {files.length > 0 ? `${files.length} file` : ""}
                </>
              )}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 ${
                messageType === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-rose-50 border border-rose-200"
              }`}
            >
              <svg
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  messageType === "success" ? "text-green-600" : "text-rose-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {messageType === "success" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
              <p
                className={`text-sm whitespace-pre-line ${
                  messageType === "success" ? "text-green-800" : "text-rose-800"
                }`}
              >
                {message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50 sticky bottom-0">
          <button
            onClick={handleClose}
            disabled={importing}
            className="h-10 px-6 rounded-xl bg-slate-600 text-white hover:bg-slate-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default Import8101Modal;
