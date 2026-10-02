// pages/kehoachxe/import.jsx
/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import {
  Loader2,
  XCircle,
  X,
  FileCheck2,
  Download,
  UploadCloud,
} from "lucide-react";
import { parseKeHoachXeFile } from "@/utils/parsekehoachxe";
import { keHoachXeService } from "@/services/xuathang/kehoachxe.service";

// Header đúng như file gốc (giữ nguyên "Nhã" để trùng file người dùng đang có;
// parser nhận cả "Nhà")
const HEADER_ROW = [
  "Tên kế hoạch",
  "Ghi chú kế hoạch",
  "Ngày xe vào kho đầu (yêu cầu)",
  "Thời gian xe vào kho đầu (yêu cầu)",
  "Kho",
  "Siêu thị",
  "Tỉ lệ",
  "Nhã vận chuyển (Code)",
  "Loại hàng (code)",
  "Trọng tải nhỏ nhất",
  "Trọng tải lớn nhất",
  "Tổng khối lượng hàng",
  "Loại xe (Code)",
  "Hình thức giao nhận",
  "Số lượng xe",
  "GHI CHÚ BOOKING",
];

const downloadTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");

  const headerRow = sheet.getRow(1);
  headerRow.values = HEADER_ROW;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  });
  headerRow.height = 32;

  // Dòng ví dụ — xóa trước khi import thật.
  // Tên kế hoạch chỉ cần điền ở dòng đầu, các dòng sau để trống.
  const example = sheet.getRow(2);
  example.values = [
    "KHX 24/09/2026",
    1,
    new Date(Date.UTC(2026, 8, 24)),
    7.5 / 24, // 07:30
    810,
    "CH00244",
    100,
    "04-TP",
    "KHO",
    2,
    2.3,
    null,
    "XETAI",
    "Giao Xá",
    1,
    "",
  ];
  example.getCell(3).numFmt = "dd/mm/yyyy";
  example.getCell(4).numFmt = "hh:mm";

  sheet.columns.forEach((col) => {
    col.width = 18;
  });
  sheet.getColumn(1).width = 20;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(4).width = 22;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Ke_Hoach_Xe.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const KeHoachXeImportModal = ({ onClose, onImported }) => {
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setSubmitError(null);
    setLoading(true);
    setFileName(file.name);
    setItems(null);

    try {
      const parsed = await parseKeHoachXeFile(file);
      if (!parsed.length) {
        setError("File không có dữ liệu hợp lệ (thiếu Kho và Siêu thị ở tất cả các dòng)");
      } else {
        setItems(parsed);
      }
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setError("Lỗi đọc file: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!items?.length) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await keHoachXeService.importNhieu(items);
      onImported({
        success: true,
        message: res?.message || `Import thành công ${items.length} dòng`,
      });
    } catch (err) {
      console.error("Lỗi import:", err);
      setSubmitError(err?.response?.data?.message || "Import thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const planNames = items
    ? [...new Set(items.map((i) => i.ten_ke_hoach).filter(Boolean))]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import Kế Hoạch Xe
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-auto p-5">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Download size={16} />
            Tải Template Excel
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <div className="min-w-0 flex-1">
              {loading ? (
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Đang đọc file...
                </span>
              ) : error ? (
                <span className="flex items-center gap-1.5 text-sm text-red-600">
                  <XCircle size={14} /> {error}
                </span>
              ) : items ? (
                <span className="flex items-center gap-1.5 truncate text-sm text-emerald-700">
                  <FileCheck2 size={14} className="shrink-0" />
                  <span className="truncate">{fileName}</span>
                  <span className="shrink-0 text-slate-400">
                    ({items.length} dòng)
                  </span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">Chưa chọn file</span>
              )}
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handlePickFile}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <UploadCloud size={14} />
              {items ? "Đổi file" : "Chọn file"}
            </button>
          </div>

          {planNames.length > 0 && (
            <p className="text-xs text-slate-500">
              Kế hoạch: <span className="font-medium">{planNames.join(", ")}</span>
              . Import lại cùng kế hoạch sẽ cập nhật các dòng cũ (theo Tên kế
              hoạch + Ghi chú kế hoạch), không tạo trùng.
            </p>
          )}

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <XCircle size={16} />
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <span className="text-sm text-slate-500">
            {items?.length ? `${items.length} dòng sẵn sàng import` : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={!items?.length || submitting || loading}
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Xác nhận Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeHoachXeImportModal;