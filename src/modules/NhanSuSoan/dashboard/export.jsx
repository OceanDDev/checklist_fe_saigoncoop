/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/ExportExcelButton.jsx
//
// ✅ Component RIÊNG cho nút "Xuất Excel" của bảng năng suất (Tổng / CF / CS).
// Dùng thư viện ExcelJS (không phải xlsx/SheetJS) để có thể tô màu ô theo
// đúng màu KPI đang hiển thị trên bảng web (xanh lá/dương/cam/đỏ), merge
// cell tiêu đề, style header — không đụng vào file nhansu.jsx gốc.
//
// Cần cài thêm thư viện:
//   npm install exceljs file-saver
//
import { useCallback, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const KPI_STATUS_LABEL = {
  dat: "Đạt",
  "chua-dat": "Chưa đạt",
  "khong-tinh-kpi": "Mã phụ",
  "chua-hoan-tat": "Chưa hoàn tất",
  "chua-bat-dau": "Chưa bắt đầu",
  "khong-ap-dung": "—",
};

// ✅ Màu tô nền cho từng tier/status KPI — tương ứng với KPI_TIER_BG /
// getRowKpiBg trong nhansu.jsx (đã đổi từ class Tailwind sang mã hex ARGB
// cho ExcelJS). Chỉ áp dụng cho 4 cột nhóm "Tổng" (Phiếu/Kiện/Dòng/KPI).
const KPI_FILL_HEX = {
  dat_0: "FFA7F3D0", // tier 0 - xanh lá đậm (đạt đầy đủ)
  dat_1: "FFBFDBFE", // tier 1 - xanh dương đậm (case1 ~95%)
  dat_2: "FFFED7AA", // tier 2 - cam đậm (case2 cộng chéo)
  "chua-dat_3": "FFFECDD3", // tier 3 - đỏ đậm (chưa đạt)
  "khong-tinh-kpi": "FFA7F3D0", // mã phụ - xanh lá, giống tier 0
};

const getKpiFillHex = (rowEval) => {
  if (rowEval.status === "dat" || rowEval.status === "chua-dat") {
    return KPI_FILL_HEX[`${rowEval.status}_${rowEval.tier}`] || null;
  }
  if (rowEval.status === "khong-tinh-kpi") return KPI_FILL_HEX["khong-tinh-kpi"];
  return null; // chưa hoàn tất / chưa bắt đầu / không áp dụng -> để trắng
};

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
const GROUP_FILL = {
  tong: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } },
  cf: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } },
  cs: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } },
};

const THIN_BORDER = { style: "thin", color: { argb: "FFCBD5E1" } };

/**
 * Props:
 * - rows: mảng mergedRows ĐANG HIỂN THỊ trên bảng (đã áp filter/search) —
 *   mỗi phần tử { maNhanVien, tenNhanVien, chucVu, tong, cf, cs }
 * - evaluateKpiRow: hàm evaluateKpiRow đang dùng trong nhansu.jsx, truyền
 *   thẳng vào để không phải viết lại / import chéo logic KPI
 * - isSingleDay, kpi: truyền y hệt như đang truyền cho MergedProductivityTable
 * - vaiTroLabel: "Soạn" | "Kiểm chéo (KC)" — hiển thị lên tiêu đề file Excel
 * - vaiTro: "soan" | "kc" — dùng đặt tên file
 * - tuNgay, denNgay: khoảng ngày đang lọc (string YYYY-MM-DD)
 * - selectedBoPhan, selectedChucVu: bộ lọc đang chọn — hiển thị trong file
 *   + dùng đặt tên file
 * - disabled: (tuỳ chọn) ép disable nút từ ngoài, ví dụ khi đang loading
 */
export default function ExportExcelButton({
  rows,
  evaluateKpiRow,
  isSingleDay,
  kpi,
  vaiTroLabel,
  vaiTro,
  tuNgay,
  denNgay,
  selectedBoPhan,
  selectedChucVu,
  disabled = false,
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!rows || !rows.length || exporting) return;

    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Hệ thống Phiếu Soạn";
      wb.created = new Date();

      const ws = wb.addWorksheet("Năng suất", {
        views: [{ state: "frozen", ySplit: 5 }], // ✅ giữ cố định 5 dòng header khi cuộn
      });

      const COLS = [
        { header: "Chức danh", width: 16 },
        { header: "Mã NV", width: 10 },
        { header: "Tên NV", width: 24 },
        { header: "Phiếu", width: 9 }, // Tổng
        { header: "Kiện", width: 9 },
        { header: "Dòng", width: 9 },
        { header: "KPI", width: 12 },
        { header: "Phiếu", width: 9 }, // CF
        { header: "Kiện", width: 9 },
        { header: "Dòng", width: 9 },
        { header: "Phiếu", width: 9 }, // CS
        { header: "Kiện", width: 9 },
        { header: "Dòng", width: 9 },
      ];
      ws.columns = COLS.map((c) => ({ width: c.width }));

      const lastCol = COLS.length;

      /* ---------- Dòng 1: Tiêu đề ---------- */
      ws.mergeCells(1, 1, 1, lastCol);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `NĂNG SUẤT ${vaiTroLabel.toLocaleUpperCase("vi-VN")}`;
      titleCell.font = { bold: true, size: 14, color: { argb: "FF1E293B" } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 22;

      /* ---------- Dòng 2: Bộ lọc đang áp dụng ---------- */
      ws.mergeCells(2, 1, 2, lastCol);
      const filterParts = [];
      if (selectedBoPhan) filterParts.push(`Bộ phận: ${selectedBoPhan}`);
      if (selectedChucVu) filterParts.push(`Chức vụ: ${selectedChucVu}`);
      filterParts.push(
        `Khoảng ngày: ${dayjs(tuNgay).format("DD/MM/YYYY")} - ${dayjs(
          denNgay,
        ).format("DD/MM/YYYY")}`,
      );
      const filterCell = ws.getCell(2, 1);
      filterCell.value = filterParts.join("   |   ");
      filterCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };

      /* ---------- Dòng 4-5: Header nhóm (Tổng / CF / CS) ---------- */
      const HEADER_ROW1 = 4;
      const HEADER_ROW2 = 5;
      ws.mergeCells(HEADER_ROW1, 1, HEADER_ROW2, 1); // Chức danh
      ws.mergeCells(HEADER_ROW1, 2, HEADER_ROW2, 2); // Mã NV
      ws.mergeCells(HEADER_ROW1, 3, HEADER_ROW2, 3); // Tên NV
      ws.mergeCells(HEADER_ROW1, 4, HEADER_ROW1, 7); // TỔNG
      ws.mergeCells(HEADER_ROW1, 8, HEADER_ROW1, 10); // CF
      ws.mergeCells(HEADER_ROW1, 11, HEADER_ROW1, 13); // CS

      const groupHeaders = [
        { col: 1, text: "Chức danh" },
        { col: 2, text: "Mã NV" },
        { col: 3, text: "Tên NV" },
        { col: 4, text: "TỔNG (CF + CS)", fill: GROUP_FILL.tong },
        { col: 8, text: "CO.OP FOOD / CF", fill: GROUP_FILL.cf },
        { col: 11, text: "CO.OP SMILE / CS", fill: GROUP_FILL.cs },
      ];
      groupHeaders.forEach(({ col, text, fill }) => {
        const cell = ws.getCell(HEADER_ROW1, col);
        cell.value = text;
        cell.font = { bold: true, size: 10, color: { argb: "FF334155" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = fill || HEADER_FILL;
      });

      const subHeaders = [
        "Phiếu", "Kiện", "Dòng", "KPI", // Tổng
        "Phiếu", "Kiện", "Dòng", // CF
        "Phiếu", "Kiện", "Dòng", // CS
      ];
      subHeaders.forEach((text, i) => {
        const col = 4 + i;
        const cell = ws.getCell(HEADER_ROW2, col);
        cell.value = text;
        cell.font = { bold: true, size: 9, color: { argb: "FF64748B" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill =
          col <= 7 ? GROUP_FILL.tong : col <= 10 ? GROUP_FILL.cf : GROUP_FILL.cs;
      });

      // Viền cho toàn bộ vùng header
      for (let r = HEADER_ROW1; r <= HEADER_ROW2; r += 1) {
        for (let c = 1; c <= lastCol; c += 1) {
          ws.getCell(r, c).border = {
            top: THIN_BORDER,
            bottom: THIN_BORDER,
            left: THIN_BORDER,
            right: THIN_BORDER,
          };
        }
      }

      /* ---------- Dữ liệu từng nhân viên ---------- */
      let dataRowIndex = HEADER_ROW2 + 1;
      const totals = {
        tongPhieu: 0, tongKien: 0, tongDong: 0,
        cfPhieu: 0, cfKien: 0, cfDong: 0,
        csPhieu: 0, csKien: 0, csDong: 0,
      };

      rows.forEach((r) => {
        const rowEval = evaluateKpiRow(r, isSingleDay, kpi);
        const fillHex = getKpiFillHex(rowEval);

        const values = [
          r.chucVu || "",
          r.maNhanVien || "",
          r.tenNhanVien || "",
          r.tong.totalPhieu || 0,
          rowEval.kien.display || 0,
          rowEval.dong.display || 0,
          KPI_STATUS_LABEL[rowEval.status] || "",
          r.cf.totalPhieu || 0,
          r.cf.totalKien || 0,
          r.cf.totalDong || 0,
          r.cs.totalPhieu || 0,
          r.cs.totalKien || 0,
          r.cs.totalDong || 0,
        ];

        values.forEach((val, i) => {
          const col = i + 1;
          const cell = ws.getCell(dataRowIndex, col);
          cell.value = val;
          cell.border = {
            top: { style: "hair", color: { argb: "FFE2E8F0" } },
            bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
            left: THIN_BORDER,
            right: THIN_BORDER,
          };
          cell.alignment =
            col <= 3
              ? { horizontal: "left", vertical: "middle" }
              : { horizontal: "center", vertical: "middle" };
          // ✅ Chỉ tô màu KPI cho 4 cột nhóm "Tổng" (Phiếu/Kiện/Dòng/KPI = cột 4-7)
          if (col >= 4 && col <= 7 && fillHex) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillHex } };
          }
        });

        totals.tongPhieu += r.tong.totalPhieu || 0;
        totals.tongKien += r.tong.totalKien || 0;
        totals.tongDong += r.tong.totalDong || 0;
        totals.cfPhieu += r.cf.totalPhieu || 0;
        totals.cfKien += r.cf.totalKien || 0;
        totals.cfDong += r.cf.totalDong || 0;
        totals.csPhieu += r.cs.totalPhieu || 0;
        totals.csKien += r.cs.totalKien || 0;
        totals.csDong += r.cs.totalDong || 0;

        dataRowIndex += 1;
      });

      /* ---------- Dòng Total ---------- */
      ws.mergeCells(dataRowIndex, 1, dataRowIndex, 3);
      const totalValues = [
        "TOTAL", null, null,
        totals.tongPhieu, totals.tongKien, totals.tongDong, "",
        totals.cfPhieu, totals.cfKien, totals.cfDong,
        totals.csPhieu, totals.csKien, totals.csDong,
      ];
      totalValues.forEach((val, i) => {
        const col = i + 1;
        if (col === 2 || col === 3) return; // đã merge với cột 1
        const cell = ws.getCell(dataRowIndex, col);
        cell.value = val;
        cell.font = { bold: true, color: { argb: "FF1E293B" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        cell.border = {
          top: { style: "medium", color: { argb: "FF94A3B8" } },
          bottom: { style: "medium", color: { argb: "FF94A3B8" } },
          left: THIN_BORDER,
          right: THIN_BORDER,
        };
        cell.alignment =
          col === 1
            ? { horizontal: "left", vertical: "middle" }
            : { horizontal: "center", vertical: "middle" };
      });

      /* ---------- Xuất file ---------- */
      const vaiTroSlug = vaiTro === "kc" ? "KC" : "Soan";
      const boPhanSlug = (selectedChucVu || selectedBoPhan || "TatCa").replace(
        /\s+/g,
        "",
      );
      const fileName = `NangSuat-${vaiTroSlug}-${boPhanSlug}-${dayjs().format(
        "YYYYMMDD-HHmmss",
      )}.xlsx`;

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/octet-stream",
        }),
        fileName,
      );
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      alert("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  }, [
    rows,
    evaluateKpiRow,
    isSingleDay,
    kpi,
    vaiTroLabel,
    vaiTro,
    tuNgay,
    denNgay,
    selectedBoPhan,
    selectedChucVu,
    exporting,
  ]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || !rows?.length || exporting}
      title="Xuất bảng năng suất (Tổng / CF / CS) ra file Excel, giữ nguyên màu KPI"
      className="flex h-[42px] items-center gap-2 rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 text-sm font-semibold text-blue-700 shadow-sm outline-none transition-all hover:from-blue-100 hover:to-indigo-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      {exporting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileSpreadsheet size={16} />
      )}
      {exporting ? "Đang xuất..." : "Xuất Excel"}
    </button>
  );
}