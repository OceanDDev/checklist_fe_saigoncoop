/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";

/**
 * Component Import/Export Excel cho Vendor
 * @param {Array} data - Danh sách vendor hiện tại
 * @param {Function} onImport - Callback khi import thành công
 */
const ExcelVendorActions = ({ data = [], onImport }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  // Export Excel
  const handleExport = async () => {
    if (!data?.length) {
      toast.info("Danh sách vendor trống!");
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Vendors");

      ws.columns = [
        { header: "STT", key: "STT", width: 8 },
        { header: "Mã Vendor", key: "vendor", width: 20 },
        { header: "Tên Vendor", key: "vendorName", width: 40 },
        { header: "SKU", key: "sku", width: 20 },
      ];

      data.forEach((item, i) => {
        ws.addRow({
          STT: i + 1,
          vendor: item.vendor,
          vendorName: item.vendorName,
          sku: item.sku || "",
        });
      });

      // Style header
      const header = ws.getRow(1);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F2937" },
      };
      header.alignment = { vertical: "middle", horizontal: "center" };
      header.height = 25;

      // Border cho tất cả cells
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          };
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendors_${stamp()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("✅ Xuất Excel thành công!");
      setShowMenu(false);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      toast.error("❌ Lỗi xuất Excel");
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Vendors_Template");

      ws.columns = [
        { header: "Mã Vendor", key: "vendor", width: 20 },
        { header: "Tên Vendor", key: "vendorName", width: 40 },
        { header: "SKU", key: "sku", width: 20 },
      ];

      // Thêm 3 dòng mẫu
      ws.addRow({ vendor: "VND001", vendorName: "Nhà cung cấp 1", sku: "SKU001" });
      ws.addRow({ vendor: "VND002", vendorName: "Nhà cung cấp 2", sku: "SKU002" });
      ws.addRow({ vendor: "VND003", vendorName: "Nhà cung cấp 3", sku: "SKU003" });

      // Style header
      const header = ws.getRow(1);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      header.alignment = { vertical: "middle", horizontal: "center" };
      header.height = 25;

      // Border
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          };
        });
      });

      // Thêm ghi chú
      ws.addRow([]);
      ws.addRow(["Ghi chú:"]);
      ws.addRow(["- Mã Vendor không được để trống"]);
      ws.addRow(["- Tên Vendor không được để trống"]);
      ws.addRow(["- SKU không được để trống"]);
      ws.addRow(["- Xóa các dòng mẫu trước khi nhập dữ liệu thật"]);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template_vendors_${stamp()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("✅ Tải template thành công!");
      setShowMenu(false);
    } catch (err) {
      console.error("Lỗi tải template:", err);
      toast.error("❌ Lỗi tải template");
    }
  };

  // Import Excel
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input để có thể chọn lại cùng file
    e.target.value = null;

    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);

      const ws = wb.worksheets[0];
      if (!ws) {
        toast.error("❌ File Excel không hợp lệ!");
        return;
      }

      const vendors = [];
      const errors = [];

      // Bắt đầu từ row 2 (bỏ qua header)
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const vendor = row.getCell(1).value;
        const vendorName = row.getCell(2).value;
        const sku = row.getCell(3).value;

        // Validate
        if (!vendor || !vendorName || !sku) {
          errors.push(`Dòng ${rowNumber}: Thiếu dữ liệu (Mã Vendor, Tên Vendor hoặc SKU)`);
          return;
        }

        vendors.push({
          vendor: String(vendor).trim(),
          vendorName: String(vendorName).trim(),
          sku: String(sku).trim(),
        });
      });

      if (errors.length > 0) {
        toast.error(
          <div>
            <div className="font-bold">Có lỗi trong file:</div>
            {errors.slice(0, 5).map((err, i) => (
              <div key={i} className="text-xs">
                {err}
              </div>
            ))}
            {errors.length > 5 && <div className="text-xs">... và {errors.length - 5} lỗi khác</div>}
          </div>,
          { autoClose: 5000 }
        );
        return;
      }

      if (vendors.length === 0) {
        toast.warning("⚠️ Không có dữ liệu để import!");
        return;
      }

      // Gọi callback
      if (onImport) {
        await onImport(vendors);
      }

      setShowMenu(false);
    } catch (err) {
      console.error("Lỗi import Excel:", err);
      toast.error("❌ Lỗi đọc file Excel");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setShowMenu(!showMenu)}
        className="bg-green-600 text-white hover:bg-green-700"
      >
        📊 Excel {showMenu ? "▲" : "▼"}
      </Button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-50">
            <div className="py-1">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <span>⬇️</span>
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={handleDownloadTemplate}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <span>📄</span>
                <span>Tải Template</span>
              </button>

              <hr className="my-1" />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>⬆️</span>
                <span>{importing ? "Đang import..." : "Import Excel"}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};

export default ExcelVendorActions;