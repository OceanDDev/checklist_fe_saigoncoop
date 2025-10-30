/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useTxtProcessor } from "./component/useTxtProcessorCS";
import useTxtProcessorCF from "./component/useTxtProcessorCF";

const TxtUploadModal = ({ open, onClose, onProcessTxt }) => {
  const [activeTab, setActiveTab] = useState("CS"); // CS or CF
  const [dragActive, setDragActive] = useState(false);
  const modalRef = useRef(null);

  // ✅ Gọi cả 2 hook, chọn API theo tab (không gọi có điều kiện)
  const cs = useTxtProcessor();
  const cf = useTxtProcessorCF();
  const api = activeTab === "CS" ? cs : cf;

  const {
    fileA,
    fileB,
    processing,
    setFileA,
    setFileB,
    processFiles,
    reset,
    yyyymmdd,
  } = api;

  // Keyboard handler
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !processing) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, processing, onClose]);

  if (!open) return null;

  /** ===================== Handlers ===================== */
  const handleSubmit = async () => {
    if (!fileA && !fileB) {
      alert("⚠️ Vui lòng chọn ít nhất 1 file TXT!");
      return;
    }

    try {
      await processFiles(onProcessTxt);
      reset();
      onClose?.();
    } catch (error) {
      console.error("Lỗi xử lý file:", error);
      alert(
        "❌ " +
          (error?.message ||
            "Lỗi xử lý file TXT.\n- Lưu file về Desktop (không kéo trực tiếp từ email/đám mây)\n- Đóng app đang mở file\n- Thử chọn lại.")
      );
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      e.dataTransfer && (e.dataTransfer.dropEffect = "copy");
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    let picked = [];
    if (e.dataTransfer?.items?.length) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f && f.name?.toLowerCase().endsWith(".txt")) picked.push(f);
        }
      }
    } else if (e.dataTransfer?.files?.length) {
      picked = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.toLowerCase().endsWith(".txt")
      );
    }

    if (!picked.length) {
      alert(
        "⚠️ Vui lòng chỉ thả file .txt (đừng kéo trực tiếp từ email/Outlook)."
      );
      return;
    }

    if (!fileA && picked[0]) setFileA(picked[0]);
    if (!fileB && picked[1]) setFileB(picked[1]);
    if (fileA && !fileB && picked[0]) setFileB(picked[0]);
  };

  const handleFileChangeA = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".txt"))
      return alert("⚠️ Vui lòng chỉ chọn file .txt");
    setFileA(f);
  };

  const handleFileChangeB = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".txt"))
      return alert("⚠️ Vui lòng chỉ chọn file .txt");
    setFileB(f);
  };

  const handleClose = () => {
    if (processing) return;
    reset();
    setActiveTab("CS"); // Reset về tab mặc định
    onClose?.();
  };

  const handleTabChange = (tab) => {
    if (processing) return; // Không cho đổi tab khi đang xử lý
    setActiveTab(tab);
    // reset của API hiện tại đã gọi trong UI khi đổi tab
    reset();
  };

  /** ===================== Tab Content Components ===================== */
  const CSTabContent = () => (
    <>
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors
          ${
            dragActive
              ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
              : "border-slate-300 hover:border-slate-400 dark:border-slate-700"
          }
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="h-12 w-12 text-slate-400 dark:text-slate-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm">Kéo thả 1–2 file .txt vào đây</p>
        </div>
      </div>

      {/* File Pickers */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* File 1 */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <input
            id="txt-file-input-a"
            className="hidden"
            type="file"
            accept=".txt"
            onChange={handleFileChangeA}
            disabled={processing}
          />
          <label
            htmlFor="txt-file-input-a"
            className="inline-flex select-none items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
          >
            Chọn file 1
          </label>
          <div className="min-w-0 flex-1">
            {fileA ? (
              <div className="truncate text-sm">
                {fileA.name}{" "}
                <span className="text-xs text-slate-500">
                  ({(fileA.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Chưa chọn</span>
            )}
          </div>
          {fileA && (
            <button
              onClick={() => setFileA(null)}
              disabled={processing}
              className="text-red-500 hover:text-red-600 disabled:opacity-50"
              title="Bỏ file 1"
            >
              ✕
            </button>
          )}
        </div>

        {/* File 2 */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <input
            id="txt-file-input-b"
            className="hidden"
            type="file"
            accept=".txt"
            onChange={handleFileChangeB}
            disabled={processing}
          />
          <label
            htmlFor="txt-file-input-b"
            className="inline-flex select-none items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 cursor-pointer"
          >
            Chọn file 2
          </label>
          <div className="min-w-0 flex-1">
            {fileB ? (
              <div className="truncate text-sm">
                {fileB.name}{" "}
                <span className="text-xs text-slate-500">
                  ({(fileB.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Không bắt buộc</span>
            )}
          </div>
          {fileB && (
            <button
              onClick={() => setFileB(null)}
              disabled={processing}
              className="text-red-500 hover:text-red-600 disabled:opacity-50"
              title="Bỏ file 2"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tips CS */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            File 1: xuất <b>Phiếu</b> (Order/SKU/Description/Qty).
          </li>
          <li>
            File 2: xuất <b>3 cột</b> (SODA ID, Location ID, Address) theo từng
            dòng hàng.
          </li>
          <li>
            Có đủ 2 file sẽ tự tạo <b>DONHANG_{yyyymmdd()}</b>: STORE, TYPE,
            SODA_TRANSFER, SKU, NAME, LUONG, NGAY_IMPORT.
          </li>
          <li>Tự nhận UTF-16, fallback UTF-8; chống NotReadableError.</li>
        </ul>
      </div>
    </>
  );

  const CFTabContent = () => (
    <>
      {/* Drop zone dùng chung */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors
          ${
            dragActive
              ? "border-green-500 bg-green-50/60 dark:bg-green-500/10"
              : "border-slate-300 hover:border-slate-400 dark:border-slate-700"
          }
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="h-12 w-12 text-slate-400 dark:text-slate-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm">Kéo thả file .txt CF vào đây</p>
        </div>
      </div>

      {/* File Picker CF (chỉ cần file 1) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <input
            id="cf-file-input-a"
            className="hidden"
            type="file"
            accept=".txt"
            onChange={handleFileChangeA}
            disabled={processing}
          />
          <label
            htmlFor="cf-file-input-a"
            className="inline-flex select-none items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 cursor-pointer"
          >
            Chọn file CF
          </label>
          <div className="min-w-0 flex-1">
            {fileA ? (
              <div className="truncate text-sm">
                {fileA.name}{" "}
                <span className="text-xs text-slate-500">
                  ({(fileA.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Chưa chọn</span>
            )}
          </div>
          {fileA && (
            <button
              onClick={() => setFileA(null)}
              disabled={processing}
              className="text-red-500 hover:text-red-600 disabled:opacity-50"
              title="Bỏ file"
            >
              ✕
            </button>
          )}
        </div>

        {/* Slot trống giữ layout cân đối */}
        <div className="hidden sm:block" />
      </div>

      {/* Tips CF */}
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Định dạng dòng CF:{" "}
            <code>TransferNumber Status InitiationDate SKU Item ... 3 số cuối</code>
          </li>
          <li>
            Ví dụ:{" "}
            <code>
              16467125 C 25/10/18 3359027 Bot5loaidau ... 10.00 10.00 10.00
            </code>
          </li>
          <li>
            Xuất Excel: <b>CF_{yyyymmdd()}</b> với cột: Transfer Number, Status,
            Initiation Date, SKU, Item Description, Quantity Request/Allocate/Ship.
          </li>
          <li>
            Hỗ trợ số dạng <code>1,234.50</code> và <code>.00</code> → 0; tự
            nhận UTF-16/UTF-8.
          </li>
        </ul>
      </div>
    </>
  );

  /** ===================== UI ===================== */
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={processing ? undefined : handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200 transition-all
                   dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
      >
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">Xử lý File TXT</h2>

            </div>
            <button
              onClick={handleClose}
              disabled={processing}
              className="inline-grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50
                         dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
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

          {/* Tabs */}
          <div className="flex gap-1 px-6">
            <button
              onClick={() => handleTabChange("CS")}
              disabled={processing}
              className={`relative px-4 py-2 text-sm font-medium transition-colors
                ${
                  activeTab === "CS"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              Co.op Smile 
              {activeTab === "CS" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>

            <button
              onClick={() => handleTabChange("CF")}
              disabled={processing}
              className={`relative px-4 py-2 text-sm font-medium transition-colors
                ${
                  activeTab === "CF"
                    ? "text-green-600 dark:text-green-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              Co.op Food 
              {activeTab === "CF" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-400" />
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {activeTab === "CS" ? <CSTabContent /> : <CFTabContent />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            onClick={handleClose}
            disabled={processing}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50
                       dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={processing || !fileA} // CF chỉ cần fileA; CS vẫn hoạt động với 1 hoặc 2 file
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50
              ${activeTab === "CS" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
            `}
          >
            {processing ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang xử lý & xuất file...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {activeTab === "CS"
                  ? `Xử lý ${fileA && fileB ? "2 file (+DONHANG)" : "1 file"}`
                  : "Xử lý & Xuất CF"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TxtUploadModal;
