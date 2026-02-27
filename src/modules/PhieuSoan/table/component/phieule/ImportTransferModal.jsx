/* eslint-disable react/prop-types */
import { useState } from "react";
import { phieuLeService } from "@/services/phieusoan/phieule.service";
import * as XLSX from "xlsx";

const ImportProcessModal = ({ isOpen, onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [importProgress, setImportProgress] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = selectedFiles.filter(
          (f) => !existingNames.has(f.name),
        );
        return [...prev, ...newFiles];
      });
      setMessage("");
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearFiles = () => setFiles([]);

  // ===== Helper: Parse Excel file thành data array =====
  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          const transformedData = transformExcelData(jsonData);
          resolve(transformedData);
        } catch (error) {
          reject(new Error(`Parse Excel thất bại: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error("Không thể đọc file"));
      reader.readAsArrayBuffer(file);
    });
  };

  // ===== Helper: Transform Excel data sang format PhieuLe =====
  const transformExcelData = (jsonData) => {
    const grouped = {};

    jsonData.forEach((row) => {
      const soDoc = row.so_document || row["Số Document"] || row["Document No"];

      if (!soDoc) return;

      if (!grouped[soDoc]) {
        grouped[soDoc] = {
          so_document: parseInt(soDoc),
          chi_tiet: [],
          trang_thai: "Chờ xử lý",
        };
      }

      grouped[soDoc].chi_tiet.push({
        seq: row.seq || row.Seq || 0,
        slot: row.slot || row.Slot || "",
        sku: parseInt(row.sku || row.SKU || 0),
        vendor: parseInt(row.vendor || row.Vendor || 0),
        name: row.name || row.Name || row.Description || "",
        quantity: parseFloat(row.quantity || row.Quantity || 0),
        pack_unit: parseInt(row.pack_unit || row["Pack Unit"] || 0),
        pck_um: row.pck_um || row["Pck U/M"] || "",
        packs_to_pick: parseFloat(
          row.packs_to_pick || row["Packs To Pick"] || 0,
        ),
        store: parseInt(row.store || row.Store || 0),
      });
    });

    return Object.values(grouped);
  };

  const handleImport = async () => {
    if (files.length === 0) {
      setMessage("Vui lòng chọn ít nhất 1 file để import");
      setMessageType("error");
      return;
    }

    setImporting(true);
    setMessage("");
    setImportProgress({ current: 0, total: files.length });

    const results = {
      success: 0,
      failed: 0,
      duplicates: [], // ✅ Mảng lưu số document trùng
      otherErrors: [], // ✅ Mảng lưu lỗi khác
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          if (file.name.endsWith(".txt")) {
            // TXT → gửi thẳng backend
            await phieuLeService.importTxtPhieuLe(file);
          } else if (/\.(xlsx|xls)$/i.test(file.name)) {
            // EXCEL → parse trước rồi import
            const parsedData = await parseExcelFile(file);
            await phieuLeService.importManyPhieuLe(parsedData);
          } else {
            throw new Error("File type không được hỗ trợ");
          }

          results.success++;
        } catch (err) {
          results.failed++;

          // ✅ Phân tích lỗi backend trả về
          const errMsg =
            err?.response?.data?.message || err?.message || "Không xác định";

          // ✅ KIỂM TRA LỖI TRÙNG SỐ DOCUMENT
          if (/trùng|duplicate|exists|đã tồn tại/i.test(errMsg)) {
            // ✅ Trích xuất số document từ tên file hoặc error message
            let soDocument = null;

            // Thử extract từ error message (ví dụ: "Số document 12345 đã tồn tại")
            const docMatch = errMsg.match(/document\s*(\d+)/i);
            if (docMatch) {
              soDocument = docMatch[1];
            } else {
              // Thử extract từ tên file (ví dụ: "12345.txt" hoặc "Document_12345.txt")
              const fileMatch = file.name.match(/(\d{4,})/);
              if (fileMatch) {
                soDocument = fileMatch[1];
              }
            }

            results.duplicates.push({
              fileName: file.name,
              soDocument: soDocument || "Không xác định",
              message: errMsg,
            });
          } else {
            // ✅ Lỗi khác (không phải trùng)
            results.otherErrors.push({
              fileName: file.name,
              message: errMsg,
            });
          }
        }

        // ✅ Cập nhật progress
        setImportProgress({ current: i + 1, total: files.length });
      }

      // ✅ Tổng kết kết quả hiển thị với phân loại chi tiết
      let summaryMessage = "";

      if (results.failed === 0) {
        summaryMessage = `✅ Import thành công ${results.success} file!`;
        setMessageType("success");
      } else {
        summaryMessage = `⚠️ Import hoàn tất: ${results.success}/${files.length} file thành công, ${results.failed} file thất bại.\n\n`;

        // ✅ Hiển thị danh sách document trùng
        if (results.duplicates.length > 0) {
          summaryMessage += `📋 Số document bị trùng (${results.duplicates.length}):\n`;
          results.duplicates.forEach((dup, idx) => {
            summaryMessage += `${idx + 1}. File: ${dup.fileName}\n   → Document: ${dup.soDocument}\n`;
          });
        }

        // ✅ Hiển thị lỗi khác
        if (results.otherErrors.length > 0) {
          if (results.duplicates.length > 0) summaryMessage += "\n";
          summaryMessage += `❌ Lỗi khác (${results.otherErrors.length}):\n`;
          results.otherErrors.forEach((err, idx) => {
            summaryMessage += `${idx + 1}. ${err.fileName}: ${err.message}\n`;
          });
        }

        setMessageType("error");
      }

      setMessage(summaryMessage);
      setFiles([]);
      if (onSuccess) onSuccess();

      // ✅ Tự động đóng modal nếu tất cả OK
      if (results.failed === 0) {
        setTimeout(() => {
          onClose();
          setMessage("");
        }, 1500);
      }
    } catch (error) {
      console.error("Import error:", error);
      setMessage(error?.message || "Import thất bại.");
      setMessageType("error");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFiles([]);
      setMessage("");
      setMessageType("");
      setImportProgress(null);
      onClose();
    }
  };

  const progressPercent = importProgress
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              Import phiếu soạn
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Import .txt hoặc .xlsx — tự xử lí khi import
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
                  className="w-5 h-5 text-blue-600"
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
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.txt"
                multiple
                onChange={handleFileChange}
                disabled={importing}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <svg
                  className="w-12 h-12 text-slate-400 mb-3"
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
                  Hỗ trợ: .txt, .xlsx, .xls — Chọn nhiều file cùng lúc
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
                      files.reduce((sum, f) => sum + f.size, 0) /
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
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${file.name.endsWith(".txt") ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                        >
                          {file.name.endsWith(".txt") ? "TXT" : "XLS"}
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
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={files.length === 0 || importing}
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  Đang import...
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
                  Import {files.length > 0 ? `${files.length} file` : ""}
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
                  : messageType === "error"
                    ? "bg-rose-50 border border-rose-200"
                    : "bg-blue-50 border border-blue-200"
              }`}
            >
              <svg
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  messageType === "success"
                    ? "text-green-600"
                    : messageType === "error"
                      ? "text-rose-600"
                      : "text-blue-600"
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
                  messageType === "success"
                    ? "text-green-800"
                    : messageType === "error"
                      ? "text-rose-800"
                      : "text-blue-800"
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

export default ImportProcessModal;
