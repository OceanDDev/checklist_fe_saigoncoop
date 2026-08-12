/* eslint-disable react/prop-types */
// pages/chamcong/xuatExcelNhanVien.jsx
import ExcelJS from "exceljs";

export default function XuatExcelButton({ data = [], fileName = "DanhSachNhanVien" }) {
  const handleExport = async () => {
    if (!data.length) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Hệ thống chấm công";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Nhân viên");

    sheet.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Mã NV", key: "ma_nhan_vien", width: 14 },
      { header: "Mã Phụ", key: "ma_phu", width: 14 },
      { header: "Tên Nhân Viên", key: "ten_nhan_vien", width: 26 },
      { header: "Bộ Phận", key: "bo_phan", width: 18 },
      { header: "Chức Vụ", key: "chuc_vu", width: 18 },
      { header: "Số ĐT", key: "so_dien_thoai", width: 16 },
      { header: "Trạng Thái", key: "trang_thai", width: 14 },
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
        fgColor: { argb: "FF10B981" }, // emerald-500
      };
    });

    // Đổ dữ liệu
    data.forEach((r, i) => {
      sheet.addRow({
        stt: i + 1,
        ma_nhan_vien: r.ma_nhan_vien,
        ma_phu: r.ma_phu || "",
        ten_nhan_vien: r.ten_nhan_vien,
        bo_phan: r.bo_phan,
        chuc_vu: r.chuc_vu || "",
        so_dien_thoai: r.so_dien_thoai || "",
        trang_thai: r.active ? "Hoạt động" : "Bị khóa",
      });
    });

    // Border + căn giữa cột STT
    sheet.eachRow((row, rowIndex) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFDDDDDD" } },
          left: { style: "thin", color: { argb: "FFDDDDDD" } },
          bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
          right: { style: "thin", color: { argb: "FFDDDDDD" } },
        };
      });
      if (rowIndex > 1) row.getCell("stt").alignment = { horizontal: "center" };
    });

    sheet.autoFilter = { from: "A1", to: "H1" };
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
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2.5 border border-border bg-card hover:bg-muted/60 text-foreground text-sm font-semibold rounded-xl transition-colors"
    >
      <span>📊</span>
      <span>Xuất Excel</span>
    </button>
  );
}