/* eslint-disable react/prop-types */
// pages/bookxe/export.jsx
import { useState } from "react";
import ExcelJS from "exceljs";

// ─── Helpers riêng cho file xuất Excel (không phụ thuộc bookxe.utils.js) ────

const NCV_NAME_MAP = {
  "04-TP": "Minh Phú",
  "70-TP": "Geloven",
  "19-TP": "Phan Thành",
  "26-TI": "Thành Đạt",
  "61-TI": "Uy Long",
  "04.2021-TP": "Thuỳ An Hưng",
};

const getTenNVCRutGon = (item) => {
  const maNcv = (item.ma_ncv || "").trim();
  return NCV_NAME_MAP[maNcv] || item.ten_nvc || "";
};

const SLOT_PRESETS = [
  { xuat: "07:30", toi: "09:00", label: "9:00-16:00" },
  { xuat: "08:30", toi: "09:00", label: "9:00-16:00" },
  { xuat: "10:00", toi: "11:00", label: "11:00-16:00" },
  { xuat: "12:30", toi: "13:30", label: "13:30-16:00" },
  { xuat: "13:30", toi: "14:00", label: "14:00-21:00" },
  { xuat: "14:30", toi: "15:00", label: "15:00-21:00" },
  { xuat: "15:30", toi: "17:00", label: "17:00-21:00" },
  { xuat: "17:30", toi: "20:30", label: "20:30-22:00" },
];

const getVNTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const getSlotLabel = (item) => {
  const gioXuat = getVNTime(item.thoi_gian_xuat);
  const gioToi = getVNTime(item.thoi_gian_dk_toi_ch);
  if (!gioXuat) return "";
  const preset = SLOT_PRESETS.find(
    (s) => s.xuat === gioXuat && s.toi === gioToi,
  );
  return preset?.label || "";
};

const formatNgayDiHang = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatNgayOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTimeOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const cleanTenCH = (tenCh, maCh) => {
  if (!tenCh) return tenCh || "";
  let result = tenCh.trim();
  if (maCh) {
    const escaped = maCh.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^(?:${escaped}-\\s*)+`, "i");
    result = result.replace(re, "");
  }
  result = result.replace(/^[A-Za-z]{1,4}\d{3,6}-\s*/, "");
  return result.trim();
};

// Giao khách lên trước; trong mỗi nhóm sắp Giờ Xuất tăng dần (nhỏ -> lớn).
const sortRows = (rows) =>
  [...rows].sort((a, b) => {
    const gkA = a.co_giao_khach ? 1 : 0;
    const gkB = b.co_giao_khach ? 1 : 0;
    if (gkA !== gkB) return gkB - gkA;
    const ta = a.thoi_gian_xuat
      ? new Date(a.thoi_gian_xuat).getTime()
      : Infinity;
    const tb = b.thoi_gian_xuat
      ? new Date(b.thoi_gian_xuat).getTime()
      : Infinity;
    return ta - tb;
  });

const rowToExcelRecord = (item) => {
  const maChArr = String(item.ma_ch || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const tenChArr = String(item.ten_ch || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const tenChClean = tenChArr
    .map((raw, idx) => cleanTenCH(raw, maChArr[idx]))
    .join("+"); // đổi từ "; " sang "+"

  return {
    ngayDiHang: formatNgayDiHang(item.ngay_di_hang),
    gioXuat: formatTimeOnly(item.thoi_gian_xuat),
    duKienToiCh: getSlotLabel(item) || formatDateTime(item.thoi_gian_dk_toi_ch),
    quan: item.quan || "",
    maCh: maChArr.join("+"), // đổi từ item.ma_ch || "" -> ghép bằng "+"
    tenCh: tenChClean,
    maNcv: item.ma_ncv || "",
    tenNvc: getTenNVCRutGon(item),
    lichDiHang: item.lich_di_hang || "",
    kien: item.kien ?? 0,
    kienRot: item.kien_rot ?? 0,
    ghiChu: item.ghi_chu || "",
    trangThai: item.trangThai || "",
    giaoKhach: item.co_giao_khach ? "Có" : "",
    ngayTao: formatNgayOnly(item.thoi_gian_tao),
    ngayHt: formatNgayOnly(item.thoi_gian_hoan_thanh),
  };
};

/**
 * Nút xuất Excel cho BookXeTable, dùng exceljs.
 *
 * Props:
 * - fetchExportRows: async () => item[]  (bắt buộc) — trả về TOÀN BỘ dữ liệu
 *   khớp bộ lọc hiện tại (không phân trang), thường gọi lại service với
 *   limit lớn. Component tự sắp xếp Giờ Xuất tăng dần trước khi ghi file.
 * - fileName: tên file, mặc định "danh-sach-book-xe"
 * - disabled: vô hiệu hoá nút
 */
export default function ExportExcelButton({
  fetchExportRows,
  fileName = "danh-sach-book-xe",
  disabled = false,
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting || disabled) return;
    setExporting(true);
    try {
      const rawRows = await fetchExportRows();
      const rows = sortRows(rawRows || []);

      if (rows.length === 0) {
        alert("Không có dữ liệu phù hợp để xuất Excel.");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "BookXe";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Book Xe");

      sheet.columns = [
        { header: "Ngày Đi Hàng", key: "ngayDiHang", width: 13 },
        { header: "Giờ Xuất", key: "gioXuat", width: 10 },
        { header: "Dự Kiến Tới CH", key: "duKienToiCh", width: 16 },
        { header: "Quận", key: "quan", width: 10 },
        { header: "Mã CH", key: "maCh", width: 16 },
        { header: "Tên CH", key: "tenCh", width: 32 },
        { header: "Mã NCV", key: "maNcv", width: 12 },
        { header: "Tên NVC", key: "tenNvc", width: 16 },
        { header: "Lịch Đi Hàng", key: "lichDiHang", width: 12 },
        { header: "Kiện", key: "kien", width: 8 },
        { header: "Rớt", key: "kienRot", width: 8 },
        { header: "Ghi Chú", key: "ghiChu", width: 22 },
        { header: "Trạng Thái", key: "trangThai", width: 14 },
        { header: "Giao Khách", key: "giaoKhach", width: 12 },
        { header: "Ngày Tạo", key: "ngayTao", width: 14 },
        { header: "Ngày HT", key: "ngayHt", width: 14 },
      ];

      // Style hàng header
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" }, // blue-600
        };
      });

      // Đổ dữ liệu, tô hồng các dòng đang giao khách
      rows.forEach((item) => {
        const row = sheet.addRow(rowToExcelRecord(item));
        if (item.co_giao_khach) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFE4E6" }, // rose-100
            };
          });
        }
      });

      // Border cho toàn bộ bảng + căn phải cột số
      sheet.eachRow((row, rowIndex) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          };
        });
        if (rowIndex > 1) {
          row.getCell("kien").alignment = { horizontal: "right" };
          row.getCell("kienRot").alignment = { horizontal: "right" };
        }
      });

      sheet.autoFilter = { from: "A1", to: "P1" };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Excel error:", error);
      alert("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting || disabled}
      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>📊</span>
      <span>{exporting ? "Đang xuất..." : "Xuất Excel"}</span>
    </button>
  );
}
