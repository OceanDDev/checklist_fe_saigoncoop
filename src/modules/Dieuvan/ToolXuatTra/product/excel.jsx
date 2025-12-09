/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Progress } from "antd";
import ExcelJS from "exceljs";

/**
 * Component Import/Export Excel cho Product (SKU + UPC)
 * @param {Array} data - Danh sách sản phẩm hiện tại
 * @param {Function} onImport - Callback khi import thành công
 */
const ExcelProductActions = ({ data = [], onImport }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, current: 0, total: 0 });
  const fileInputRef = useRef(null);

  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  // Export Excel
  const handleExport = async () => {
    if (!data?.length) {
      toast.info("Danh sách sản phẩm trống!");
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Products");

      ws.columns = [
        { header: "Mã SKU", key: "sku", width: 15 },
        { header: "Tên hàng", key: "tenHang", width: 40 },
        { header: "UPC", key: "upc", width: 20 },
      ];

      data.forEach((item) => {
        ws.addRow({
          sku: item.sku,
          tenHang: item.tenHang,
          upc: item.upc || "",
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
      a.download = `products_${stamp()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("✅ Xuất Excel thành công!");
      setShowMenu(false);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      toast.error("❌ Lỗi xuất Excel");
    }
  };

  // Import Excel với Progress
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input để có thể chọn lại cùng file
    e.target.value = null;

    setImporting(true);
    setProgress({ percent: 0, current: 0, total: 0 });

    // Toast ID để update progress
    const toastId = toast.info("📖 Đang đọc file Excel...", { autoClose: false });

    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);

      const ws = wb.worksheets[0];
      if (!ws) {
        toast.update(toastId, {
          render: "❌ File Excel không hợp lệ!",
          type: "error",
          autoClose: 3000,
        });
        return;
      }

      const products = [];
      const errors = [];
      const totalRows = ws.rowCount - 1; // Trừ header

      toast.update(toastId, {
        render: `📊 Đang đọc ${totalRows.toLocaleString()} dòng...`,
      });

      // Bắt đầu từ row 2 (bỏ qua header)
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const sku = row.getCell(1).value; // Cột A (Mã SKU)
        const tenHang = row.getCell(2).value; // Cột B (Tên hàng)
        const upc = row.getCell(3).value; // Cột C (UPC)

        // Validate - chỉ bắt buộc SKU và tên hàng
        if (!sku || !tenHang) {
          errors.push(`Dòng ${rowNumber}: Thiếu Mã SKU hoặc Tên hàng`);
          return;
        }

        const skuNumber = Number(sku);
        if (isNaN(skuNumber)) {
          errors.push(`Dòng ${rowNumber}: Mã SKU phải là số`);
          return;
        }

        const productData = {
          sku: skuNumber,
          tenHang: String(tenHang).trim(),
        };

        // Thêm UPC nếu có
        if (upc) {
          productData.upc = String(upc).trim();
        }

        products.push(productData);
      });

      if (errors.length > 0) {
        toast.update(toastId, {
          render: (
            <div>
              <div className="font-bold">Có lỗi trong file:</div>
              {errors.slice(0, 5).map((err, i) => (
                <div key={i} className="text-xs">
                  {err}
                </div>
              ))}
              {errors.length > 5 && <div className="text-xs">... và {errors.length - 5} lỗi khác</div>}
            </div>
          ),
          type: "error",
          autoClose: 5000,
        });
        return;
      }

      if (products.length === 0) {
        toast.update(toastId, {
          render: "⚠️ Không có dữ liệu để import!",
          type: "warning",
          autoClose: 3000,
        });
        return;
      }

      // Update toast với số lượng
      toast.update(toastId, {
        render: `⬆️ Đang import ${products.length.toLocaleString()} sản phẩm...`,
      });

      setProgress({ percent: 0, current: 0, total: products.length });

      // Gọi callback với progress tracking
      if (onImport) {
        await onImport(products, (prog) => {
          setProgress({
            percent: prog.percent,
            current: prog.current,
            total: prog.total,
          });

          // Update toast với progress
          toast.update(toastId, {
            render: (
              <div>
                <div className="font-bold mb-2">
                  ⬆️ Đang import: {prog.percent}%
                </div>
                <div className="text-xs mb-2">
                  {prog.current.toLocaleString()} / {prog.total.toLocaleString()} sản phẩm
                </div>
                {prog.batch && (
                  <div className="text-xs text-gray-500">
                    Batch {prog.batch}/{prog.totalBatches}
                  </div>
                )}
              </div>
            ),
          });
        });
      }

      // Success
      toast.update(toastId, {
        render: `✅ Import thành công ${products.length.toLocaleString()} sản phẩm!`,
        type: "success",
        autoClose: 3000,
      });

      setShowMenu(false);
      setProgress({ percent: 0, current: 0, total: 0 });
    } catch (err) {
      console.error("Lỗi import Excel:", err);
      toast.update(toastId, {
        render: `❌ Lỗi import: ${err.message}`,
        type: "error",
        autoClose: 5000,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setShowMenu(!showMenu)}
        className="bg-green-600 text-white hover:bg-green-700"
        disabled={importing}
      >
        📊 Excel {showMenu ? "▲" : "▼"}
      </Button>

      {/* Progress Bar khi đang import */}
      {importing && progress.total > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white p-3 rounded-lg shadow-lg border z-50">
          <div className="text-sm font-medium mb-2">
            Đang import: {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
          </div>
          <Progress
            percent={progress.percent}
            status="active"
            strokeColor={{
              from: '#108ee9',
              to: '#87d068',
            }}
          />
        </div>
      )}

      {showMenu && !importing && (
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

              <hr className="my-1" />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <span>⬆️</span>
                <span>Import Excel</span>
              </button>

              <div className="px-4 py-2 text-xs text-gray-500">
                Hỗ trợ file lớn (700K+ dòng)
              </div>
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

export default ExcelProductActions;