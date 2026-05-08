/* eslint-disable react/prop-types */
import { useState, useCallback, useRef } from "react";
import { phieuLeService } from "@/services/phieusoan/phieule.service";
import { dinhViService } from "@/services/phieusoan/dinhvi.service";

// =============================================================================
// PARSE INV041 (UTF-16LE)
// =============================================================================
const parseINV041 = (rawText) => {
  const normalized = rawText.replace(/[ \t]+/g, " ").trim();
  const lines = normalized.split(/\r?\n/);

  let so_document = null;
  let sd_tf = null;
  let mach = null;
  let tench = null;
  const items = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!so_document) {
      const m = line.match(/MBR\s+Name\s*:\s*R0*(\d+)/i);
      if (m) {
        so_document = parseInt(m[1], 10);
        continue;
      }
    }

    if (!mach) {
      const m = line.match(/Store\s*:\s*(\d+)\s+(.+)/i);
      if (m) {
        mach = m[1].trim();
        tench = m[2].trim();
        continue;
      }
    }

    if (!line.includes("On Order - Transfer")) continue;
    if (/^\d+\s+On Order\s+-\s+Transfer\s*$/.test(line)) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 10) continue;
    if (!/^\d{7}$/.test(parts[0])) continue;

    const sku = parseInt(parts[0], 10);
    const refStr = parts[parts.length - 1];
    if (!/^\d{6,}$/.test(refStr)) continue;
    if (!sd_tf) sd_tf = parseInt(refStr, 10);

    const dateIdx = parts.findIndex((p) => /^\d{1,2}\/\d{2}\/\d{2,4}$/.test(p));
    if (dateIdx === -1 || dateIdx + 1 >= parts.length) continue;

    const qtyStr = parts[dateIdx + 1];
    if (!/^\d+\.\d{2}$/.test(qtyStr)) continue;

    const quantity = parseFloat(qtyStr);
    if (quantity <= 0) continue;

    items.push({ sku, quantity });
  }

  return { so_document, sd_tf, mach, tench, items };
};

// =============================================================================
// PARSE TRF031 (UTF-8)
// =============================================================================
const parseTRF031 = (rawText) => {
  const normalized = rawText.replace(/[ \t]+/g, " ").trim();
  const lines = normalized.split(/\r?\n/);

  const blocks = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const batchMatch = line.match(/Batch\s+Name\s*:\s*(\d+)/i);
    if (batchMatch) {
      if (current) blocks.push(current);
      current = {
        sd_tf: parseInt(batchMatch[1], 10),
        mach: null,
        tench: null,
        items: [],
      };
      continue;
    }

    if (!current) continue;

    if (!current.mach) {
      const toMatch = line.match(/^To\s*:\s*(\d+)\s+(.+)/i);
      if (toMatch) {
        current.mach = toMatch[1].trim();
        current.tench = toMatch[2]
          .replace(/\s*Allocated\s*\/?\s*Released.*/i, "")
          .trim();
        continue;
      }
    }

    if (!/^\d{7}\s/.test(line)) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;

    const sku = parseInt(parts[0], 10);

    let vendorIdx = -1;
    for (let i = 1; i < parts.length; i++) {
      if (/^\d{5,}$/.test(parts[i])) {
        vendorIdx = i;
        break;
      }
    }

    const name =
      vendorIdx > 1 ? parts.slice(1, vendorIdx).join(" ") : `SKU ${sku}`;

    const nums = parts.filter((p) => /^\d+\.\d{2}$/.test(p));
    const allocated =
      nums.length >= 2
        ? parseFloat(nums[1])
        : nums.length === 1
          ? parseFloat(nums[0])
          : null;

    if (!allocated || allocated <= 0) continue;

    current.items.push({ sku, name, quantity: allocated });
  }

  if (current) blocks.push(current);
  return blocks.filter((b) => b.sd_tf && b.mach && b.items.length > 0);
};

// =============================================================================
// UTILS
// =============================================================================

// Đọc file: UTF-8 trước (TRF031), fallback UTF-16 (INV041)
const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Không đọc được file"));
    r.onload = (e) => {
      const utf8Text = e.target.result;
      if (/Batch\s+Name/i.test(utf8Text)) {
        resolve(utf8Text);
      } else {
        const r2 = new FileReader();
        r2.onerror = () => reject(new Error("Không đọc được file"));
        r2.onload = (e2) => resolve(e2.target.result);
        r2.readAsText(file, "utf-16");
      }
    };
    r.readAsText(file, "utf-8");
  });

// Fetch SKU names song song, batch size giới hạn để tránh quá tải
const fetchSkuNames = async (skuList) => {
  const nameMap = {};
  const BATCH = 5;

  for (let i = 0; i < skuList.length; i += BATCH) {
    const chunk = skuList.slice(i, i + BATCH);
    await Promise.allSettled(
      chunk.map(async (sku) => {
        try {
          const res = await dinhViService.getAllDinhVi({
            page: 1,
            limit: 1,
            sku: String(sku), // ← fix chính: parse ra number, cần ép về string
            name: "",
            slot: "",
            search: "",
          });

          const data = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];

          const record = data[0];
          nameMap[sku] = record?.name?.trim() || `SKU ${sku}`;
        } catch {
          nameMap[sku] = `SKU ${sku}`;
        }
      }),
    );
  }

  return nameMap;
};

// =============================================================================
// COMPONENT
// =============================================================================
const Import8101Modal = ({ isOpen, onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [importProgress, setImportProgress] = useState(null); // { current, total, label }
  const abortRef = useRef(false);

  const handleFileChange = useCallback((e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...selected.filter((f) => !existing.has(f.name))];
    });
    setMessage("");
    // Reset input để có thể chọn lại cùng file
    e.target.value = "";
  }, []);

  const handleRemoveFile = useCallback(
    (index) => setFiles((prev) => prev.filter((_, i) => i !== index)),
    [],
  );

  const handleClearFiles = useCallback(() => setFiles([]), []);

  if (!isOpen) return null;

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!files.length) {
      setMessage("Vui lòng chọn ít nhất 1 file để import");
      setMessageType("error");
      return;
    }

    setImporting(true);
    setMessage("");
    abortRef.current = false;

    const results = { success: 0, failed: 0, duplicates: [], otherErrors: [] };

    // Helper ghi lỗi
    const recordError = (fileName, errMsg) => {
      results.failed++;
      if (/trùng|duplicate|exists|đã tồn tại/i.test(errMsg)) {
        const docMatch = errMsg.match(/document\s*(\d+)/i);
        const fileMatch = fileName.match(/(\d{4,})/);
        results.duplicates.push({
          fileName,
          soDocument: docMatch?.[1] || fileMatch?.[1] || "?",
          message: errMsg,
        });
      } else {
        results.otherErrors.push({ fileName, message: errMsg });
      }
    };

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;

      const file = files[i];
      setImportProgress({
        current: i + 1,
        total: files.length,
        label: file.name,
      });

      try {
        const text = await readFileAsText(file);
        const isTRF031 = /Batch\s+Name/i.test(text);

        if (isTRF031) {
          // ── TRF031: mỗi block = 1 phiếu, xử lý độc lập ──────────────────
          const blocks = parseTRF031(text);
          if (!blocks.length)
            throw new Error("Không parse được dữ liệu TRF031.");

          // Import song song tất cả blocks trong 1 file
          await Promise.allSettled(
            blocks.map(async (block) => {
              try {
                await phieuLeService.import8101PhieuLe({
                  loai_phieu: "8101",
                  trang_thai: "Chờ xử lý",
                  sd_tf: block.sd_tf,
                  mach: block.mach,
                  chi_tiet: block.items.map((item, idx) => ({
                    seq: idx + 1,
                    slot: "8101",
                    sku: item.sku,
                    name: item.name,
                    quantity: item.quantity,
                  })),
                });
                results.success++;
              } catch (blockErr) {
                const msg =
                  blockErr?.response?.data?.message ||
                  blockErr?.message ||
                  "Không xác định";
                recordError(`${file.name} (batch ${block.sd_tf})`, msg);
              }
            }),
          );
        } else {
          // ── INV041 ────────────────────────────────────────────────────────
          const parsed = parseINV041(text);
          if (!parsed.so_document || !parsed.items.length)
            throw new Error("Không parse được dữ liệu INV041.");

          const skuList = [...new Set(parsed.items.map((item) => item.sku))];
          const nameMap = await fetchSkuNames(skuList);

          await phieuLeService.import8101PhieuLe({
            loai_phieu: "8101",
            trang_thai: "Chờ xử lý",
            sd_tf: parsed.sd_tf,
            mach: parsed.mach,
            chi_tiet: parsed.items.map((item, idx) => ({
              seq: idx + 1,
              slot: "8101",
              sku: item.sku,
              name: nameMap[item.sku] || `SKU ${item.sku}`,
              quantity: item.quantity,
            })),
          });
          results.success++;
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Không xác định";
        recordError(file.name, msg);
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalAttempted = results.success + results.failed;
    let summaryMessage = "";

    if (results.failed === 0) {
      summaryMessage = `✅ Import thành công ${results.success} phiếu!`;
      setMessageType("success");
    } else {
      summaryMessage = `⚠️ Hoàn tất: ${results.success}/${totalAttempted} phiếu thành công, ${results.failed} thất bại.\n\n`;
      if (results.duplicates.length > 0) {
        summaryMessage += `📋 Trùng (${results.duplicates.length}):\n`;
        results.duplicates.forEach((d, i) => {
          summaryMessage += `${i + 1}. ${d.fileName} → Batch ${d.soDocument}\n`;
        });
      }
      if (results.otherErrors.length > 0) {
        if (results.duplicates.length > 0) summaryMessage += "\n";
        summaryMessage += `❌ Lỗi khác (${results.otherErrors.length}):\n`;
        results.otherErrors.forEach((e, i) => {
          summaryMessage += `${i + 1}. ${e.fileName}: ${e.message}\n`;
        });
      }
      setMessageType("error");
    }

    setMessage(summaryMessage);
    setFiles([]);
    setImporting(false);
    setImportProgress(null);
    if (onSuccess) onSuccess();

    if (results.failed === 0) {
      setTimeout(() => {
        onClose();
        setMessage("");
      }, 1500);
    }
  };

  const handleClose = () => {
    if (importing) {
      abortRef.current = true;
      return;
    }
    setFiles([]);
    setMessage("");
    setMessageType("");
    setImportProgress(null);
    onClose();
  };

  const progressPercent = importProgress
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
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
                Import 8101
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Hỗ trợ INV041 (UTF-16) và TRF031 (UTF-8)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
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
              className="flex flex-col items-center justify-center cursor-pointer gap-1"
            >
              <svg
                className="w-10 h-10 text-indigo-300 mb-1"
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
              <p className="text-sm font-medium text-slate-700">
                {files.length > 0
                  ? "Click để chọn thêm file"
                  : "Click để chọn file .txt"}
              </p>
              <p className="text-xs text-slate-400">
                INV041 · TRF031 — chọn nhiều file cùng lúc
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
                <button
                  onClick={handleClearFiles}
                  disabled={importing}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium disabled:opacity-40"
                >
                  Xóa hết
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 flex-shrink-0">
                        TXT
                      </span>
                      <span className="text-sm text-slate-700 truncate">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-xs text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        disabled={importing}
                        className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
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

          {/* Progress */}
          {importProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span className="truncate max-w-[80%]">
                  [{importProgress.current}/{importProgress.total}]{" "}
                  {importProgress.label}
                </span>
                <span className="font-medium text-indigo-600">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
            className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {importing ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
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
                Đang import...
              </>
            ) : (
              <>
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Import 8101{files.length > 0 ? ` (${files.length} file)` : ""}
              </>
            )}
          </button>

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
                  messageType === "success" ? "text-green-500" : "text-rose-500"
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
                className={`text-sm whitespace-pre-line leading-relaxed ${
                  messageType === "success" ? "text-green-800" : "text-rose-800"
                }`}
              >
                {message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50/50 sticky bottom-0">
          <button
            onClick={handleClose}
            className="h-10 px-6 rounded-xl bg-slate-600 text-white hover:bg-slate-700 font-medium transition-colors text-sm"
          >
            {importing ? "Dừng & Đóng" : "Đóng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Import8101Modal;
