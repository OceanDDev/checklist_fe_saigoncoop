/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  Loader2,
  XCircle,
  X,
  FileCheck2,
  Download,
  UploadCloud,
} from "lucide-react";
import { xuatHangService } from "@/services/xuathang/xuathang.service";

// ─────────────────────────────────────────────
// Header thật của file export "Bảng tổng hợp Vận chuyển":
// Dòng 1: tiêu đề gộp ô, Dòng 2: trống, Dòng 3: header cột, Dòng 4+: data
// Cột: Stt | Mã kho | Số BB | Mã Booking | Mã LDD |
//      Ngày xe vào TTPP (dd/MM/yyyy) | Giờ xe vào TTPP (hh:mm) |
//      Ngày bắt đầu lên hàng (dd/MM/yyyy) | Giờ bắt đầu lên hàng (hh:mm) |
//      Ngày kết thúc lên hàng (dd/MM/yyyy) | Giờ kết thúc lên hàng (hh:mm) |
//      Mã NVC | NVC | Số kiện | Mã siêu thị | SIÊU THỊ |
//      Nhân viên xuất hàng | Nhân viên xuất phụ | Loại hình vận chuyển |
//      Ngày TTPP yêu cầu xe vào lấy hàng | Giờ TTPP yêu cầu xe vào lấy hàng |
//      Thời gian rời kho cuối | Concept
// ─────────────────────────────────────────────
const HEADER_ROW = [
  "Stt",
  "Mã kho",
  "Số BB",
  "Mã Booking",
  "Mã LDD",
  "Ngày xe vào TTPP\n(dd/MM/yyyy)",
  "Giờ xe vào TTPP\n(hh:mm)",
  "Ngày bắt đầu lên hàng\n(dd/MM/yyyy)",
  "Giờ bắt đầu lên hàng\n(hh:mm)",
  "Ngày kết thúc lên hàng\n(dd/MM/yyyy)",
  "Giờ kết thúc lên hàng\n(hh:mm)",
  "Mã NVC",
  "NVC",
  "Số kiện",
  "Mã siêu thị",
  "SIÊU THỊ",
  "Nhân viên xuất hàng",
  "Nhân viên xuất phụ",
  "Loại hình \nvận chuyển",
  "Ngày TTPP yêu cầu xe vào lấy hàng",
  "Giờ TTPP yêu cầu xe vào lấy hàng",
  "Thời gian rời kho cuối",
  "Concept",
];

// Chuẩn hoá text header để so khớp: gộp xuống dòng/khoảng trắng thừa, lowercase
const normalizeHeader = (s) =>
  String(s ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// Alias khớp CHÍNH XÁC (không dùng includes để tránh "nvc" khớp nhầm "mã nvc")
const EXACT_ALIASES = {
  "mã kho": "ma_kho",
  "số bb": "so_bb",
  "mã booking": "ma_booking",
  "mã ldd": "ma_ldd",
  "mã nvc": "ma_nvc",
  nvc: "ten_nvc",
  "số kiện": "so_kien",
  "mã siêu thị": "ma_ch",
  "siêu thị": "ten_ch",
  "nhân viên xuất hàng": "nhan_vien_xuat_hang",
  "nhân viên xuất phụ": "nhan_vien_xuat_phu",
  concept: "concept",
};

// Các cột có ngoặc đơn vị phía sau ((dd/MM/yyyy), (hh:mm)...) -> so khớp
// bằng startsWith phần chữ trước ngoặc, để không phụ thuộc đúng từng ký tự
// định dạng ngoặc.
const STARTS_WITH_ALIASES = [
  ["ngày xe vào ttpp", "ngay_xe_vao_ttpp_ngay"],
  ["giờ xe vào ttpp", "ngay_xe_vao_ttpp_gio"],
  ["ngày bắt đầu lên hàng", "ngay_bat_dau_len_hang_ngay"],
  ["giờ bắt đầu lên hàng", "ngay_bat_dau_len_hang_gio"],
  ["ngày kết thúc lên hàng", "ngay_ket_thuc_len_hang_ngay"],
  ["giờ kết thúc lên hàng", "ngay_ket_thuc_len_hang_gio"],
  ["loại hình vận chuyển", "loai_hinh_van_chuyen"],
  ["ngày ttpp yêu cầu xe vào lấy hàng", "ngay_ttpp_yc_ngay"],
  ["giờ ttpp yêu cầu xe vào lấy hàng", "ngay_ttpp_yc_gio"],
  ["thời gian rời kho cuối", "thoi_gian_roi_kho_cuoi"],
];

// Dò map { fieldKey: columnIndex } từ 1 dòng header thật trong file
const buildColumnMap = (headerRowArr) => {
  const map = {};
  headerRowArr.forEach((cell, idx) => {
    const norm = normalizeHeader(cell);
    if (!norm) return;

    if (EXACT_ALIASES[norm]) {
      map[EXACT_ALIASES[norm]] = idx;
      return;
    }
    const hit = STARTS_WITH_ALIASES.find(([prefix]) => norm.startsWith(prefix));
    if (hit) map[hit[1]] = idx;
  });
  return map;
};

// Tìm dòng nào trong file là dòng header thật (bỏ qua dòng tiêu đề gộp ô
// và dòng trống phía trên) — nhận diện bằng có đủ "mã kho" + "số bb".
const findHeaderRowIndex = (rows) =>
  rows.findIndex((row) => {
    const norms = row.map(normalizeHeader);
    return norms.includes("mã kho") && norms.includes("số bb");
  });

// ─────────────────────────────────────────────
// Ghép Ngày + Giờ thành 1 Date. Pin theo UTC digits (không phụ thuộc
// timezone máy chạy) — cùng convention với các bảng khác trong hệ thống
// (formatDateOnly/formatDateTime đọc lại bằng getUTC*()).
// ─────────────────────────────────────────────
const excelSerialToYMD = (serial) => {
  const utcMs = Math.round((serial - 25569) * 86400 * 1000);
  const tmp = new Date(utcMs);
  return {
    y: tmp.getUTCFullYear(),
    m: tmp.getUTCMonth() + 1,
    d: tmp.getUTCDate(),
  };
};

const parseDatePart = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return excelSerialToYMD(Math.floor(value));
  if (value instanceof Date) {
    return {
      y: value.getUTCFullYear(),
      m: value.getUTCMonth() + 1,
      d: value.getUTCDate(),
    };
  }
  const str = String(value).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return { d: Number(m[1]), m: Number(m[2]), y: Number(m[3]) };
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      y: parsed.getFullYear(),
      m: parsed.getMonth() + 1,
      d: parsed.getDate(),
    };
  }
  return null;
};

const parseTimePart = (value) => {
  if (value === undefined || value === null || value === "") {
    return { h: 0, mi: 0, s: 0 };
  }
  if (typeof value === "number") {
    const frac = value - Math.floor(value);
    const totalSeconds = Math.round(frac * 86400);
    return {
      h: Math.floor(totalSeconds / 3600),
      mi: Math.floor((totalSeconds % 3600) / 60),
      s: totalSeconds % 60,
    };
  }
  const str = String(value).trim();
  const m = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m)
    return { h: Number(m[1]), mi: Number(m[2]), s: m[3] ? Number(m[3]) : 0 };
  return { h: 0, mi: 0, s: 0 };
};

// Ghép cột Ngày + cột Giờ -> 1 Date duy nhất
const combineDateTime = (dateValue, timeValue) => {
  const datePart = parseDatePart(dateValue);
  if (!datePart) return undefined;
  const timePart = parseTimePart(timeValue);
  return new Date(
    Date.UTC(
      datePart.y,
      datePart.m - 1,
      datePart.d,
      timePart.h,
      timePart.mi,
      timePart.s,
    ),
  );
};

// "Thời gian rời kho cuối" đã là 1 cột gộp sẵn "dd/MM/yyyy HH:mm:ss"
// (hoặc serial số nếu file khác định dạng) -> parse thẳng thành Date
const parseFullDateTime = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") {
    return combineDateTime(Math.floor(value), value);
  }
  const str = String(value).trim();
  const m = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (m) {
    const [, d, mo, y, h, mi, s] = m;
    return new Date(
      Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        s ? Number(s) : 0,
      ),
    );
  }
  const datePart = parseDatePart(str);
  if (datePart)
    return new Date(Date.UTC(datePart.y, datePart.m - 1, datePart.d));
  return undefined;
};

// ─────────────────────────────────────────────
// Đọc file Excel -> dò header thật -> map từng dòng theo field key
// ─────────────────────────────────────────────
const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        const headerIdx = findHeaderRowIndex(rows);
        if (headerIdx === -1) {
          reject(
            new Error(
              'Không tìm thấy dòng header (cần có cột "Mã kho" và "Số BB")',
            ),
          );
          return;
        }

        const colMap = buildColumnMap(rows[headerIdx]);
        const get = (row, key) =>
          colMap[key] !== undefined ? row[colMap[key]] : "";

        const items = rows
          .slice(headerIdx + 1)
          .filter((row) => String(get(row, "so_bb") ?? "").trim() !== "")
          .map((row) => ({
            ma_kho: String(get(row, "ma_kho") ?? "").trim(),
            so_bb: String(get(row, "so_bb") ?? "").trim(),
            ma_booking: String(get(row, "ma_booking") ?? "").trim(),
            ma_ldd: String(get(row, "ma_ldd") ?? "").trim(),
            ngay_xe_vao_ttpp: combineDateTime(
              get(row, "ngay_xe_vao_ttpp_ngay"),
              get(row, "ngay_xe_vao_ttpp_gio"),
            ),
            ngay_bat_dau_len_hang: combineDateTime(
              get(row, "ngay_bat_dau_len_hang_ngay"),
              get(row, "ngay_bat_dau_len_hang_gio"),
            ),
            ngay_ket_thuc_len_hang: combineDateTime(
              get(row, "ngay_ket_thuc_len_hang_ngay"),
              get(row, "ngay_ket_thuc_len_hang_gio"),
            ),
            ma_nvc: String(get(row, "ma_nvc") ?? "").trim(),
            ten_nvc: String(get(row, "ten_nvc") ?? "").trim(),
            so_kien: Number(get(row, "so_kien") || 0),
            ma_ch: String(get(row, "ma_ch") ?? "").trim(),
            ten_ch: String(get(row, "ten_ch") ?? "").trim(),
            nhan_vien_xuat_hang: String(get(row, "nhan_vien_xuat_hang") ?? "")
              .trim()
              .toUpperCase(),
            nhan_vien_xuat_phu: String(get(row, "nhan_vien_xuat_phu") ?? "")
              .trim()
              .toUpperCase(),
            loai_hinh_van_chuyen: String(
              get(row, "loai_hinh_van_chuyen") ?? "",
            ).trim(),
            ngay_ttpp_yeu_cau_vao: combineDateTime(
              get(row, "ngay_ttpp_yc_ngay"),
              get(row, "ngay_ttpp_yc_gio"),
            ),
            thoi_gian_roi_kho_cuoi: parseFullDateTime(
              get(row, "thoi_gian_roi_kho_cuoi"),
            ),
            concept: String(get(row, "concept") ?? "").trim(),
          }));

        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsArrayBuffer(file);
  });

// ─────────────────────────────────────────────
// Xuất Template Excel bằng ExcelJS — đúng layout gốc: dòng tiêu đề gộp ô
// + dòng header, để import lại nhận diện đúng.
// ─────────────────────────────────────────────
const downloadTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");

  sheet.mergeCells(1, 1, 1, HEADER_ROW.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "Bảng tổng hợp Vận chuyển";
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "center" };

  sheet.getRow(2).values = [];

  const headerRow = sheet.getRow(3);
  headerRow.values = HEADER_ROW;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  });
  headerRow.height = 32;

  // 1 dòng ví dụ minh hoạ định dạng — xoá dòng này trước khi import thật
  sheet.getRow(4).values = [
    1,
    "810",
    "8101417938",
    "70-TP-810-31082026-440831",
    "SLL-910941",
    "01/09/2026",
    "06:38",
    "01/09/2026",
    "07:00",
    "01/09/2026",
    "09:30",
    "70-TP",
    "Công ty TNHH Vận tải MTV GELOVEN",
    108,
    "CH00293",
    "CH00293-CHEERS - 22A CAO BA NHA",
    "",
    "",
    "TTTP giao hàng",
    "01/09/2026",
    "07:30",
    "01/09/2026 07:36:59",
    "CoopSmile",
  ];

  sheet.columns.forEach((col) => {
    col.width = 18;
  });
  sheet.getColumn(1).width = 6;
  sheet.getColumn(6).width = 16; // Ngày xe vào TTPP
  sheet.getColumn(7).width = 14; // Giờ xe vào TTPP
  sheet.getColumn(8).width = 16; // Ngày bắt đầu lên hàng
  sheet.getColumn(9).width = 14; // Giờ bắt đầu lên hàng
  sheet.getColumn(10).width = 16; // Ngày kết thúc lên hàng
  sheet.getColumn(11).width = 14; // Giờ kết thúc lên hàng
  sheet.getColumn(20).width = 16; // Ngày TTPP yêu cầu xe vào lấy hàng
  sheet.getColumn(21).width = 14; // Giờ TTPP yêu cầu xe vào lấy hàng
  sheet.getColumn(22).width = 20; // Thời gian rời kho cuối

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Xuat_Hang.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────
// MODAL IMPORT
// ─────────────────────────────────────────────
const XuatHangImportModal = ({ onClose, onImported }) => {
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
      const parsed = await parseExcelFile(file);
      if (!parsed.length) {
        setError(
          "File không có dữ liệu hợp lệ (thiếu Số BB ở tất cả các dòng)",
        );
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
      const res = await xuatHangService.importNhieu(items);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import Xuất Hàng
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
                  <Loader2 size={14} className="animate-spin" /> Đang đọc
                  file...
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

export default XuatHangImportModal;
