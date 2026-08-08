/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/ExportExcelButton.jsx
import { useCallback, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

// Giới hạn "lấy hết" khi xuất toàn bộ dữ liệu khớp filter (không tick chọn
// dòng nào) — giữ đồng bộ với FETCH_ALL_LIMIT bên bảng chính.
const FETCH_ALL_LIMIT = 100000;

const formatDateTime = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Trả về text thuần (mã hiển thị) từ mảng nvSoan/nvKC, dùng cho export Excel
const nhanVienListToText = (list) => {
  if (!list || list.length === 0) return "";
  return list
    .map((nv) => {
      if (nv && typeof nv === "object")
        return nv.ma_hien_thi || nv.ma_nhan_vien || "";
      return nv;
    })
    .filter(Boolean)
    .join(", ");
};

/**
 * Trong cùng 1 nhóm "Số phiếu gộp" (soPhieuGop), đẩy phiếu có Kiện > 0 lên
 * đầu nhóm (Kiện giảm dần) — vì thực tế chỉ 1 phiếu trong nhóm mang Kiện,
 * các phiếu còn lại Kiện = 0. Không đổi vị trí tổng thể của cả nhóm trong
 * danh sách, chỉ đổi thứ tự CÁC DÒNG BÊN TRONG nhóm đó.
 * Các phiếu không thuộc nhóm nào (soPhieuGop trống) giữ nguyên vị trí.
 */
const reorderGroupsByKien = (rows) => {
  const groupItems = new Map(); // soPhieuGop -> danh sách phiếu cùng nhóm

  rows.forEach((item) => {
    const key = (item.soPhieuGop || "").toString().trim();
    if (!key) return;
    if (!groupItems.has(key)) groupItems.set(key, []);
    groupItems.get(key).push(item);
  });

  groupItems.forEach((items, key) => {
    groupItems.set(
      key,
      [...items].sort((a, b) => (b.kien ?? 0) - (a.kien ?? 0)),
    );
  });

  const emittedGroups = new Set();
  const result = [];

  rows.forEach((item) => {
    const key = (item.soPhieuGop || "").toString().trim();
    if (!key) {
      result.push(item);
      return;
    }
    if (emittedGroups.has(key)) return; // nhóm này đã được xuất, bỏ qua dòng trùng
    emittedGroups.add(key);
    result.push(...groupItems.get(key));
  });

  return result;
};

/**
 * Nút "Xuất Excel" cho bảng Nhân Sự Soạn — tách riêng khỏi bảng chính để dễ
 * bảo trì.
 *
 * ── Cột "Dataload" (cột cuối) ───────────────────────────────────────────
 * Xuất dưới dạng CÔNG THỨC Excel (không phải giá trị tĩnh), theo format:
 *   *{Kiện}K-{TTB}T-{NV KC, nếu trống thì lấy NV soạn}
 * Ví dụ: *5K-4T-V14
 *
 * ── Cột "Trang thiết bị" (TTB) ──────────────────────────────────────────
 * Chỉ thêm vào file xuất khi isViewerRole = true (role 58 — view only),
 * nằm ngay cạnh cột Kiện, để TRỐNG cho người dùng tự note tay sau khi mở
 * file. Vì cột Dataload là công thức tham chiếu tới ô TTB, khi người dùng
 * gõ số vào ô TTB, cột Dataload sẽ tự cập nhật theo — không cần xuất lại.
 *
 * Với các role khác (không phải 58): không có cột TTB, phần "T" trong
 * Dataload mặc định là 0.
 */
const ExportExcelButton = ({
  selectedItems = [],
  filters = {},
  isViewerRole = false,
  disabled = false,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      let rowsToExport = selectedItems;

      // Không tick dòng nào -> xuất TOÀN BỘ dữ liệu khớp filter hiện tại
      // (bao gồm cả tuNgay/denNgay), không chỉ trang đang hiển thị trên UI.
      if (rowsToExport.length === 0) {
        const res = await nhanSuSoanService.getAllNhanSuSoan({
          page: 1,
          limit: FETCH_ALL_LIMIT,
          ...filters,
        });
        rowsToExport = res.data || res.items || [];
      }

      if (rowsToExport.length === 0) {
        alert("Không có dữ liệu để xuất Excel.");
        return;
      }

      // Trong cùng 1 nhóm gộp, đẩy phiếu có Kiện > 0 lên đầu.
      rowsToExport = reorderGroupsByKien(rowsToExport);

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SC Logistics";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Phiếu Soạn", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      const baseColumnsBeforeKien = [
        { header: "Số đơn hàng", key: "soDonHang", width: 16 },
        { header: "Số phiếu gộp", key: "soPhieuGop", width: 14 },
        { header: "Mã NXĐ", key: "maNXD", width: 12 },
        { header: "Nơi xuất đến", key: "noiXuatDen", width: 26 },
        { header: "Chuyến", key: "chuyen", width: 10 },
        { header: "Lịch đi hàng", key: "lichDiHang", width: 14 },
        { header: "NV soạn", key: "nvSoan", width: 24 },
        { header: "NV KC", key: "nvKC", width: 24 },
      ];
      const kienColumn = { header: "Kiện", key: "kien", width: 8 };
      // Cột TTB — chỉ thêm cho role view-only (58), để trống cho họ tự note.
      const ttbColumn = { header: "Trang thiết bị", key: "ttb", width: 16 };
      const afterKienColumns = [
        { header: "Dòng", key: "dong", width: 8 },
        { header: "Trạng thái", key: "trangThai", width: 14 },
        { header: "Trạng thái Book Xe", key: "trangThaiBookXe", width: 18 },
        { header: "TG import", key: "tgImport", width: 18 },
        { header: "TG hoàn thành", key: "tgHoanThanh", width: 18 },
        { header: "TG nhận phiếu", key: "tgNhanPhieu", width: 18 },
      ];
      const dataloadColumn = {
        header: "Dataload",
        key: "dataload",
        width: 22,
      };

      sheet.columns = [
        ...baseColumnsBeforeKien,
        kienColumn,
        ...(isViewerRole ? [ttbColumn] : []),
        ...afterKienColumns,
        dataloadColumn,
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FF1E293B" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2E8F0" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
      });

      rowsToExport.forEach((item) => {
        sheet.addRow({
          soDonHang: item.soDonHang || "",
          soPhieuGop: item.soPhieuGop || "",
          maNXD: item.maNXD || "",
          noiXuatDen: item.noiXuatDen || "",
          chuyen: item.chuyen || "",
          lichDiHang: item.lichDiHang || "",
          nvSoan: nhanVienListToText(item.nvSoanChiTiet || item.nvSoan),
          nvKC: nhanVienListToText(item.nvKCChiTiet || item.nvKC),
          kien: item.kien ?? 0,
          ttb: "", // để trống — người dùng tự note tay sau khi mở file
          dong: item.dong ?? 0,
          trangThai: item.trangThai || "",
          trangThaiBookXe: item.trangThaiBookXe || "Chờ Book",
          tgImport: formatDateTime(item.tgImport),
          tgHoanThanh: formatDateTime(item.tgHoanThanh),
          tgNhanPhieu: formatDateTime(item.tgNhanPhieu),
        });
      });

      // ── Cột Dataload: công thức "*"&Kiện&"K-"&[TTB&"T-"]&NV&[hậu tố chuyến] ──
      // Dùng công thức (không phải giá trị tĩnh) để khi người dùng gõ tay
      // vào ô TTB, Dataload tự cập nhật theo ngay trong Excel.
      const kienLetter = sheet.getColumn("kien").letter;
      const nvKCLetter = sheet.getColumn("nvKC").letter;
      const nvSoanLetter = sheet.getColumn("nvSoan").letter;
      const chuyenLetter = sheet.getColumn("chuyen").letter;
      const ttbLetter = isViewerRole ? sheet.getColumn("ttb").letter : null;

      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        // TTB: chỉ hiện "{TTB}T-" khi ô TTB CÓ giá trị (role 58 mới có cột
        // này). Ô TTB trống, hoặc role khác không có cột TTB -> bỏ hẳn
        // phần "T" luôn, không còn "0T-" hay "T-" rỗng.
        const ttbPart = isViewerRole
          ? `IF(${ttbLetter}${rowNumber}<>"",${ttbLetter}${rowNumber}&"T-","")`
          : `""`;

        const nvPart = `IF(${nvKCLetter}${rowNumber}<>"",${nvKCLetter}${rowNumber},${nvSoanLetter}${rowNumber})`;

        // Chuyến = "Phân Bổ" hoặc "GIAO KHÁC" -> note thêm hậu tố "-PB" /
        // "-GK" ở cuối chuỗi Dataload. Chuyến khác -> không thêm gì.
        const chuyenPart = `IF(${chuyenLetter}${rowNumber}="PHÂN BỔ","-PB",IF(${chuyenLetter}${rowNumber}="GIAO KHÁCH","-GK",""))`;

        // Kiện = 0 -> chỉ hiện "*0K", KHÔNG kèm TTB/NV/hậu tố chuyến.
        row.getCell("dataload").value = {
          formula: `IF(${kienLetter}${rowNumber}=0,"*0K","*"&${kienLetter}${rowNumber}&"K-"&${ttbPart}&${nvPart}&${chuyenPart})`,
        };
      });

      // Viền + căn giữa cho toàn bộ dữ liệu (trừ header đã set riêng ở trên)
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell({ includeEmpty: false }, (cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle" };
        });
        // Tô nền vàng nhạt cho ô TTB — báo hiệu đây là ô cần tự note tay.
        if (isViewerRole) {
          const ttbCell = row.getCell("ttb");
          if (ttbCell) {
            ttbCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEF9C3" },
            };
          }
        }
      });

      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PhieuSoan_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      alert("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  }, [selectedItems, filters, isViewerRole]);

  const selectedCount = selectedItems.length;

  return (
    <button
      type="button"
      onClick={handleExportExcel}
      disabled={exporting || disabled}
      title={
        selectedCount > 0
          ? `Xuất Excel ${selectedCount} phiếu đã chọn`
          : "Xuất Excel toàn bộ dữ liệu đang hiển thị"
      }
      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:from-emerald-600 disabled:hover:to-teal-600"
    >
      {exporting ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <FileSpreadsheet size={15} />
      )}
      {exporting
        ? "Đang xuất..."
        : selectedCount > 0
          ? `Xuất Excel (${selectedCount})`
          : "Xuất Excel"}
    </button>
  );
};

export default ExportExcelButton;
