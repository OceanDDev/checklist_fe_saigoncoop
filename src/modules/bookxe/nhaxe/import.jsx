/* eslint-disable react/prop-types */
import { useState } from "react";
import * as XLSX from "xlsx"; // npm i xlsx (đọc file import)
import ExcelJS from "exceljs"; // npm i exceljs (tạo file template)
import { FileUp, X } from "lucide-react";
import { nhaXeService } from "@/services/bookxe/nhaxe.service"; // chỉnh lại path cho đúng vị trí service thực tế

// ============================================================
// TEMPLATE — file mẫu cho người dùng tải về trước khi import
// ============================================================

// Các cột của template — khớp với model NhaXe.
// Tiêu đề (header) phải nằm trong danh sách alias của import.jsx thì mới đọc được,
// nên nếu đổi tên header ở đây hãy kiểm tra lại HEADER_ALIASES bên import.jsx.
const NHAXE_TEMPLATE_COLUMNS = [
  {
    key: "ma_ch",
    header: "Mã CH",
    width: 14,
    required: true,
    description: "Mã cửa hàng (bắt buộc, dòng thiếu mã sẽ bị bỏ qua)",
    example: "CH001",
  },
  {
    key: "ten_ch",
    header: "Tên CH",
    width: 30,
    description: "Tên cửa hàng",
    example: "Cửa hàng Nguyễn Trãi",
  },
  {
    key: "quan",
    header: "Quận",
    width: 16,
    description: "Quận / khu vực của cửa hàng",
    example: "Quận 1",
  },
  {
    key: "thoi_gian_xuat",
    header: "Thời gian xuất",
    width: 18,
    description: "Giờ xuất hàng, nhập dạng văn bản",
    example: "08:00",
  },
  {
    key: "lich_di_hang",
    header: "Lịch đi hàng",
    width: 24,
    description: "Các ngày đi hàng trong tuần",
    example: "T2 - T4 - T6",
  },
  {
    key: "nvc",
    header: "NVC",
    width: 22,
    description: "Nhà vận chuyển / nhà xe phụ trách",
    example: "Nhà xe A",
  },
  {
    key: "ghi_chu",
    header: "Ghi chú",
    width: 32,
    description: "Ghi chú thêm (không bắt buộc)",
    example: "Giao trước 9h",
  },
];

const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

const styleHeaderCell = (cell, fillArgb) => {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fillArgb },
  };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = THIN_BORDER;
};

// Tạo workbook: sheet 1 "Nhà Xe" (chỉ có dòng tiêu đề, để trống cho người dùng nhập)
// và sheet 2 "Hướng dẫn". Import chỉ đọc sheet đầu tiên nên sheet hướng dẫn không bị import nhầm.
const buildNhaXeTemplateWorkbook = () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Book Xe";
  workbook.created = new Date();

  // ── Sheet 1: dữ liệu ───────────────────────────────────────────────────────
  const ws = workbook.addWorksheet("Nhà Xe", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // numFmt "@" = Text, để giờ "08:00" hay mã có số 0 đầu không bị Excel tự đổi
  ws.columns = NHAXE_TEMPLATE_COLUMNS.map(({ key, header, width }) => ({
    key,
    header,
    width,
    style: { numFmt: "@" },
  }));

  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  NHAXE_TEMPLATE_COLUMNS.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    // cột bắt buộc màu đỏ, còn lại màu xanh
    styleHeaderCell(cell, col.required ? "FFDC2626" : "FF2563EB");
    if (col.required) cell.note = "Bắt buộc phải có";
  });

  // ── Sheet 2: hướng dẫn ─────────────────────────────────────────────────────
  const guide = workbook.addWorksheet("Hướng dẫn");
  guide.columns = [
    { key: "field", width: 18 },
    { key: "required", width: 12 },
    { key: "description", width: 50 },
    { key: "example", width: 24 },
  ];

  guide.mergeCells("A1:D1");
  const titleCell = guide.getCell("A1");
  titleCell.value =
    "Điền dữ liệu ở sheet “Nhà Xe”, bắt đầu từ dòng 2. Không đổi tên hay xóa cột tiêu đề.";
  titleCell.font = { bold: true, color: { argb: "FF1E293B" } };
  titleCell.alignment = { vertical: "middle", wrapText: true };
  guide.getRow(1).height = 32;

  const guideHeader = guide.getRow(3);
  ["Cột", "Bắt buộc", "Mô tả", "Ví dụ"].forEach((text, i) => {
    const cell = guideHeader.getCell(i + 1);
    cell.value = text;
    styleHeaderCell(cell, "FF475569");
  });

  NHAXE_TEMPLATE_COLUMNS.forEach((col, i) => {
    const row = guide.getRow(4 + i);
    row.getCell(1).value = col.header;
    row.getCell(2).value = col.required ? "Có" : "Không";
    row.getCell(3).value = col.description;
    row.getCell(4).value = col.example;
    for (let c = 1; c <= 4; c += 1) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle", wrapText: true };
    }
    if (col.required)
      row.getCell(2).font = { bold: true, color: { argb: "FFDC2626" } };
  });

  return workbook;
};

// Tạo file rồi kích hoạt tải về trình duyệt
const downloadNhaXeTemplate = async (fileName = "template_nha_xe.xlsx") => {
  try {
    const workbook = buildNhaXeTemplateWorkbook();
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Lỗi khi tạo file template nhà xe:", error);
    window.alert("Không tạo được file template, vui lòng thử lại.");
  }
};

// ============================================================
// IMPORT — đọc file Excel
// ============================================================

// Header trong file Excel -> field trong DB. Không phân biệt hoa thường / dấu.
// vd: "Mã CH", "ma_ch", "Mã cửa hàng" đều map về ma_ch
const HEADER_ALIASES = {
  ma_ch: ["ma_ch", "ma_cua_hang", "store_code"],
  ten_ch: ["ten_ch", "ten_cua_hang"],
  quan: ["quan", "district"],
  thoi_gian_xuat: ["thoi_gian_xuat", "gio_xuat", "thoi_gian_xuat_hang"],
  lich_di_hang: ["lich_di_hang", "lich_hang"],
  nvc: ["nvc", "nha_van_chuyen", "nha_xe", "ten_nvc"],
  ghi_chu: ["ghi_chu", "note"],
};

const HEADER_MAP = Object.entries(HEADER_ALIASES).reduce(
  (acc, [field, aliases]) => {
    aliases.forEach((alias) => {
      acc[alias] = field;
    });
    return acc;
  },
  {},
);

const normalizeHeader = (header) =>
  String(header)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const PREVIEW_COLUMNS = NHAXE_TEMPLATE_COLUMNS.map(({ key, header }) => ({
  key,
  label: header,
}));

const ImportNhaXeModal = ({ open, onClose, onImported }) => {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [skipped, setSkipped] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const reset = () => {
    setFileName("");
    setRows([]);
    setSkipped(0);
    setError("");
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose?.();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file
    if (!file) return;

    reset();
    setFileName(file.name);
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // raw: false -> lấy text đã format (giờ "08:00" không bị thành số thập phân)
      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      const parsed = rawRows
        .map((row) => {
          const obj = {};
          Object.entries(row).forEach(([header, value]) => {
            const field = HEADER_MAP[normalizeHeader(header)];
            if (field) obj[field] = String(value).trim();
          });
          return obj;
        })
        .filter((obj) => Object.values(obj).some(Boolean));

      if (parsed.length === 0) {
        setError(
          "Không đọc được dữ liệu. Kiểm tra dòng đầu tiên có các cột: Mã CH, Tên CH, Quận, Thời gian xuất, Lịch đi hàng, NVC, Ghi chú.",
        );
        return;
      }

      const valid = parsed.filter((obj) => obj.ma_ch);
      setRows(valid);
      setSkipped(parsed.length - valid.length);
      if (valid.length === 0) {
        setError("Không có dòng nào có Mã CH.");
      }
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setError("Không đọc được file Excel này.");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setError("");
    try {
      await nhaXeService.importManyNhaXe(rows);
      reset();
      onImported?.();
      onClose?.();
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Import thất bại",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">
            Import Nhà Xe từ Excel
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <FileUp size={14} />
              Chọn file Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => downloadNhaXeTemplate()}
              className="ml-3 text-sm text-blue-600 hover:underline"
            >
              Tải file mẫu
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Dòng đầu là tiêu đề cột: Mã CH, Tên CH, Quận, Thời gian xuất, Lịch
              đi hàng, NVC, Ghi chú. Mã CH là bắt buộc.
            </p>
            {fileName && (
              <p className="mt-2 text-sm text-slate-600">{fileName}</p>
            )}
          </div>

          {parsing && (
            <p className="text-sm text-slate-500">Đang đọc file...</p>
          )}

          {rows.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-slate-600">
                Sẵn sàng import{" "}
                <span className="font-semibold text-slate-800">
                  {rows.length}
                </span>{" "}
                bản ghi
                {skipped > 0 && (
                  <span className="text-amber-600">
                    {" "}
                    (bỏ qua {skipped} dòng thiếu Mã CH)
                  </span>
                )}
                . Xem trước 5 dòng đầu:
              </p>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {PREVIEW_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-left font-medium text-slate-600"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {PREVIEW_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className="max-w-[160px] truncate px-3 py-2 text-slate-600"
                          >
                            {row[col.key] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="rounded-md border border-slate-300 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || rows.length === 0}
            className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing
              ? "Đang import..."
              : `Import ${rows.length || ""}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportNhaXeModal;
