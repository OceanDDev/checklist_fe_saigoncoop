// components/phieusoan/NhanSuSoan/updatekiendukien.jsx
/* eslint-disable react/prop-types */
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import {
  PackageCheck,
  X,
  Download,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

const TEMPLATE_HEADERS = ["Số đơn hàng", "Kiện dự kiến"];

// Chuẩn hoá tên cột (bỏ dấu, thường hoá, bỏ khoảng trắng) để nhận diện
// header linh hoạt dù người dùng gõ "Số đơn hàng", "soDonHang", "SODONHANG"...
const normalizeHeader = (h) =>
  (h || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d") // ✅ "đ" không tự tách dấu qua NFD như các ký tự khác — cần thay tay
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

const HEADER_MAP = {
  sodonhang: "soDonHang",
  kiendukien: "kien_du_kien",
  kienduk: "kien_du_kien",
};

// ─── Tải file mẫu bằng ExcelJS ─────────────────────────────────────────────
const downloadTemplate = async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("KienDuKien");

  ws.columns = [
    { header: TEMPLATE_HEADERS[0], key: "soDonHang", width: 22 },
    { header: TEMPLATE_HEADERS[1], key: "kien_du_kien", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };

  ws.addRow({ soDonHang: "SO12345678", kien_du_kien: 10 });
  ws.addRow({ soDonHang: "TO87654321", kien_du_kien: 5 });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Mau_Update_Kien_Du_Kien.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─── Đọc file Excel người dùng tải lên bằng ExcelJS ────────────────────────
const parseExcelFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  // Đọc hàng header (hàng 1) để map cột -> key chuẩn
  const headerRow = sheet.getRow(1);
  const colIndexToKey = {};
  headerRow.eachCell((cell, colNumber) => {
    const norm = normalizeHeader(cell.value);
    if (HEADER_MAP[norm]) colIndexToKey[colNumber] = HEADER_MAP[norm];
  });

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // bỏ qua header

    const out = { soDonHang: "", kien_du_kien: "" };
    let hasAnyValue = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = colIndexToKey[colNumber];
      if (!key) return;
      let v = cell.value;
      // ExcelJS trả về object cho công thức/rich-text -> lấy .result / .text
      if (v && typeof v === "object") {
        v = v.result ?? v.text ?? "";
      }
      if (v !== null && v !== undefined && v !== "") hasAnyValue = true;
      out[key] = v ?? "";
    });

    if (hasAnyValue) rows.push(out);
  });

  return rows;
};

const UpdateKienDuKien = ({ onImported }) => {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]); // [{ soDonHang, kien_du_kien }]
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState(null); // { message, modifiedCount, matchedCount, skipped }
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFileName("");
    setRows([]);
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    resetState();
  };

  const handleDownloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      await downloadTemplate();
    } catch (err) {
      console.error("Lỗi tạo file mẫu:", err);
      alert("Không tạo được file mẫu. Vui lòng thử lại.");
    } finally {
      setDownloadingTemplate(false);
    }
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setResult(null);

    try {
      const parsed = await parseExcelFile(file);

      // Lọc dòng rỗng hoàn toàn (không có soDonHang)
      const cleaned = parsed.filter(
        (r) => (r.soDonHang || "").toString().trim() !== "",
      );

      if (cleaned.length === 0) {
        setParseError(
          "Không tìm thấy dữ liệu hợp lệ. Vui lòng dùng đúng file mẫu với cột 'Số đơn hàng' và 'Kiện dự kiến'.",
        );
        setRows([]);
        return;
      }

      setRows(cleaned);
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setParseError("Không đọc được file. Vui lòng kiểm tra lại định dạng.");
      setRows([]);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rows.length === 0) return;
    setSubmitting(true);
    setResult(null);
    try {
      const payload = rows.map((r) => ({
        soDonHang: (r.soDonHang || "").toString().trim(),
        kien_du_kien: r.kien_du_kien,
      }));
      const res = await nhanSuSoanService.updateManyKienDuKien(payload);
      setResult(res);
      onImported?.();
    } catch (err) {
      console.error("Lỗi update Kiện dự kiến:", err);
      setResult({
        message: "Cập nhật thất bại. Vui lòng thử lại.",
        error: true,
      });
    } finally {
      setSubmitting(false);
    }
  }, [rows, onImported]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-fuchsia-700 hover:shadow-md active:scale-95"
      >
        <PackageCheck size={15} />
        Update Kiện DK
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <PackageCheck size={18} className="text-purple-600" />
                  Cập nhật Kiện Dự Kiến
                </h3>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <p className="text-sm text-slate-500">
                  Tải file mẫu, điền <b className="text-slate-700">Số đơn hàng</b>{" "}
                  và <b className="text-slate-700">Kiện dự kiến</b> tương ứng,
                  sau đó tải lên để cập nhật hàng loạt.
                </p>

                {/* Tải template */}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-purple-300 bg-purple-50/60 px-4 py-3 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50"
                >
                  {downloadingTemplate ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Tải file mẫu (.xlsx)
                </button>

                {/* Upload file */}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50/50">
                  <UploadCloud size={20} className="text-slate-400" />
                  <span>
                    {fileName ? (
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <FileSpreadsheet size={14} className="text-emerald-500" />
                        {fileName}
                      </span>
                    ) : (
                      "Chọn file Excel đã điền dữ liệu"
                    )}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                </label>

                {fileName && (
                  <button
                    type="button"
                    onClick={resetState}
                    disabled={submitting}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-500 disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                    Xoá file, chọn lại
                  </button>
                )}

                {parseError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    {parseError}
                  </div>
                )}

                {/* Preview dữ liệu đã đọc được */}
                {rows.length > 0 && !result && (
                  <div className="rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      <span>Xem trước ({rows.length} dòng)</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-slate-100 text-slate-400">
                            <th className="px-3 py-1.5 text-left font-semibold">
                              Số đơn hàng
                            </th>
                            <th className="px-3 py-1.5 text-left font-semibold">
                              Kiện dự kiến
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 200).map((r, idx) => (
                            <tr key={idx} className="border-b border-slate-50">
                              <td className="px-3 py-1.5 font-medium text-slate-700">
                                {r.soDonHang}
                              </td>
                              <td className="px-3 py-1.5 text-slate-600">
                                {r.kien_du_kien}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rows.length > 200 && (
                        <div className="px-3 py-2 text-center text-[11px] text-slate-400">
                          ... và {rows.length - 200} dòng khác
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Kết quả sau khi submit */}
                {result && (
                  <div
                    className={`space-y-2 rounded-xl px-3 py-3 text-sm ring-1 ${
                      result.error
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    }`}
                  >
                    <div className="flex items-start gap-2 font-semibold">
                      {result.error ? (
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                      )}
                      {result.message}
                    </div>

                    {Array.isArray(result.skipped) &&
                      result.skipped.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-lg bg-white/70 ring-1 ring-black/5">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400">
                                <th className="px-2.5 py-1.5 text-left font-semibold">
                                  Số đơn hàng
                                </th>
                                <th className="px-2.5 py-1.5 text-left font-semibold">
                                  Lý do bỏ qua
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.skipped.map((s, idx) => (
                                <tr key={idx} className="border-b border-slate-50">
                                  <td className="px-2.5 py-1.5 font-medium text-slate-700">
                                    {s.soDonHang}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-500">
                                    {s.reason}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
                >
                  {result && !result.error ? "Đóng" : "Huỷ"}
                </button>
                {!(result && !result.error) && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || rows.length === 0}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Đang cập nhật...
                      </>
                    ) : (
                      <>
                        <PackageCheck size={15} />
                        Cập nhật ({rows.length})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default UpdateKienDuKien;