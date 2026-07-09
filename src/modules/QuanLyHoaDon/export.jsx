/* eslint-disable react/prop-types */
import { useState } from "react";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { FileDown } from "lucide-react";
import { quanlyhdService } from "@/services/quanlyhd.service";

// Giới hạn số dòng / lần gọi API khi gom dữ liệu để xuất -> tránh 1 request quá nặng.
// Backend hiện đang clamp tối đa SHOW_ALL_MAX_LIMIT (500) cho limit, để 500 khớp với đó;
// nếu backend đã nới lên 5000 thì đổi số này theo cho ít round-trip hơn.
const FETCH_PAGE_SIZE = 500;
// Chặn cứng phía FE để tránh người dùng vô tình export hàng trăm nghìn dòng làm treo trình duyệt
const MAX_EXPORT_ROWS = 20000;

const TRANG_THAI_COLOR_ARGB = {
  "Chưa có hóa đơn": "FF64748B", // slate-500
  "Không khớp lượng": "FFDC2626", // red-600
  "Hoàn thành": "FF059669", // emerald-600
  "Đã xử lý": "FF2563EB", // blue-600
};
const MISMATCH_ARGB = "FFDC2626";

const COLUMNS = [
  { header: "Mã CH", key: "ma_ch", width: 12 },
  { header: "SKU", key: "sku", width: 14 },
  { header: "Tên hàng", key: "name", width: 32 },
  { header: "Số hóa đơn", key: "so_hoa_don", width: 16 },
  { header: "Tên CH (WMS)", key: "ten_ch_wms", width: 26 },
  { header: "Tên CH (HĐ)", key: "ten_ch_hd", width: 26 },
  { header: "Lượng WMS", key: "luong_wms", width: 12 },
  { header: "Lượng HĐ", key: "luong_hd", width: 12 },
  { header: "Số phiếu WMS", key: "tf_sd_wms", width: 16 },
  { header: "Số phiếu HĐ", key: "tf_sd_hd", width: 16 },
  { header: "Trạng thái", key: "trangThai", width: 18 },
  { header: "Ngày hóa đơn", key: "ngay_hoa_don", width: 14 },
  { header: "Ngày import", key: "ngay_import", width: 18 },
  { header: "Thời gian xử lý", key: "ngay_xu_ly", width: 18 },
];

/**
 * Gom TOÀN BỘ dữ liệu khớp filter hiện tại bằng cách gọi lại API list theo từng trang
 * (không cần endpoint export riêng ở backend). Dừng khi đã lấy đủ `total` hoặc chạm
 * MAX_EXPORT_ROWS để tránh treo trình duyệt nếu filter quá rộng.
 */
async function fetchAllMatching(filters, onProgress) {
  const rows = [];
  let page = 1;
  let total = Infinity;

  while (rows.length < total && rows.length < MAX_EXPORT_ROWS) {
    const res = await quanlyhdService.getDanhSach({
      ...filters,
      page,
      limit: FETCH_PAGE_SIZE,
    });
    const data = res.data || [];
    total = Number(res.pagination?.total ?? data.length);
    rows.push(...data);
    onProgress?.(Math.min(rows.length, total), total);
    if (data.length === 0) break; // an toàn, tránh loop vô hạn nếu backend trả thiếu total
    page += 1;
  }

  return rows;
}

function buildRowValue(doc) {
  return {
    ma_ch: doc.ma_ch,
    sku: doc.sku,
    name: doc.name || "",
    so_hoa_don: doc.so_hoa_don || "",
    ten_ch_wms: doc.ten_ch_wms || "",
    ten_ch_hd: doc.ten_ch_hd || "",
    luong_wms: doc.luong_wms ?? 0,
    luong_hd: doc.luong_hd ?? 0,
    tf_sd_wms: doc.tf_sd_wms || "",
    tf_sd_hd: doc.tf_sd_hd || "",
    trangThai: doc.trangThai || "",
    ngay_hoa_don: doc.ngay_hoa_don
      ? dayjs(doc.ngay_hoa_don).format("DD/MM/YYYY")
      : "",
    ngay_import: doc.ngay_import
      ? dayjs(doc.ngay_import).format("DD/MM/YYYY HH:mm")
      : "",
    ngay_xu_ly: doc.ngay_xu_ly
      ? dayjs(doc.ngay_xu_ly).format("DD/MM/YYYY HH:mm")
      : "",
  };
}

/**
 * Build workbook exceljs trong bộ nhớ (toàn bộ dữ liệu đã có sẵn, không cần streaming)
 * rồi trả về Buffer để tạo Blob tải xuống.
 */
async function buildWorkbookBuffer(docs) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QuanLyHD";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Đối chiếu HĐ-WMS", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = COLUMNS;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" }, // slate-700, khớp header bảng trên FE
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  for (const doc of docs) {
    const soPhieuMismatch =
      doc.so_phieu_wms &&
      doc.so_phieu_hd &&
      String(doc.so_phieu_wms).trim() !== String(doc.so_phieu_hd).trim();
    const luongMismatch =
      doc.luong_hd !== undefined &&
      doc.luong_hd !== null &&
      Number(doc.luong_wms) !== Number(doc.luong_hd);

    const row = sheet.addRow(buildRowValue(doc));

    if (luongMismatch) {
      row.getCell("luong_wms").font = { color: { argb: MISMATCH_ARGB }, bold: true };
      row.getCell("luong_hd").font = { color: { argb: MISMATCH_ARGB }, bold: true };
    }
    if (soPhieuMismatch) {
      row.getCell("tf_sd_wms").font = { color: { argb: MISMATCH_ARGB } };
      row.getCell("tf_sd_hd").font = { color: { argb: MISMATCH_ARGB } };
    }
    const trangThaiColor = TRANG_THAI_COLOR_ARGB[doc.trangThai];
    if (trangThaiColor) {
      row.getCell("trangThai").font = { color: { argb: trangThaiColor }, bold: true };
    }
  }

  // Kẻ viền nhẹ cho toàn bộ vùng dữ liệu để giống bảng có border trên FE
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  return workbook.xlsx.writeBuffer();
}

function downloadBuffer(buffer, fileName) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Nút xuất Excel, hoàn toàn xử lý ở FE bằng exceljs.
 * props:
 * - filters: object filter hiện tại của bảng (dùng lại đúng service getDanhSach để gom hết dữ liệu khớp)
 * - fileNamePrefix: tiền tố tên file (mặc định "doi-chieu-hd-wms")
 */
const ExportExcelButton = ({ filters, fileNamePrefix = "doi-chieu-hd-wms" }) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total } | null

  const handleExport = async () => {
    setExporting(true);
    setProgress(null);
    try {
      const docs = await fetchAllMatching(filters, (current, total) =>
        setProgress({ current, total }),
      );

      if (docs.length === 0) {
        alert("Không có dữ liệu khớp bộ lọc hiện tại để xuất.");
        return;
      }

      const buffer = await buildWorkbookBuffer(docs);
      const fileName = `${fileNamePrefix}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
      downloadBuffer(buffer, fileName);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      alert("Xuất Excel thất bại, vui lòng thử lại.");
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      title="Xuất Excel theo bộ lọc hiện tại"
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-md active:scale-95 disabled:opacity-60"
    >
      <FileDown size={16} />
      {exporting
        ? progress
          ? `Đang gom dữ liệu... ${progress.current}/${progress.total}`
          : "Đang xuất..."
        : "Xuất Excel"}
    </button>
  );
};

export default ExportExcelButton;