import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import RotKienRow from "./RotKienRow";
import KienHT from "./rotKienRow/kienHT";

import { rotKienService } from "@/services/dieuvan/rotkien.service";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

import ExcelJS from "exceljs";
import AddKienDialog from "./addKien";

// Helper: YYYY-MM-DD (local timezone)
const toDateInputValue = (d = new Date()) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

// 24h vi-VN, không AM/PM
const formatDateTimeVN = (value) => {
  if (!value) return "";
  return new Date(value)
    .toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
};

// Small debounce hook
const useDebouncedValue = (value, delay = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const ToolRotKien = () => {
  const [viewMode, setViewMode] = useState("chua");
  const [data, setData] = useState([]);
  const [cuahangs, setCuahangs] = useState([]);

  const [searchMaCH, setSearchMaCH] = useState("");
  const debouncedSearch = useDebouncedValue(searchMaCH, 200);
  const [filterNgayRotKien, setFilterNgayRotKien] = useState("");

  // Fetch (chặn double-fetch ở Strict Mode)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const [rotkien, ch] = await Promise.all([
          rotKienService.getAllRotKien(),
          cuaHangService.getAllCuaHang(),
        ]);
        setData(rotkien || []);
        setCuahangs(ch || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    })();
  }, []);

  // Lọc dữ liệu
  const filteredDataChuaHT = useMemo(() => {
    const q = (debouncedSearch || "").toLowerCase();
    return data
      .filter((item) => !item.trangThai)
      .filter(
        (item) =>
          (item.maCH || "").toLowerCase().includes(q) &&
          (!filterNgayRotKien ||
            item.ngayRotKien?.slice(0, 10) === filterNgayRotKien)
      );
  }, [data, debouncedSearch, filterNgayRotKien]);

  const filteredDataDaHT = useMemo(() => {
    const q = (debouncedSearch || "").toLowerCase();
    return data
      .filter((item) => item.trangThai)
      .filter(
        (item) =>
          (item.maCH || "").toLowerCase().includes(q) &&
          (!filterNgayRotKien ||
            item.ngayRotKien?.slice(0, 10) === filterNgayRotKien)
      );
  }, [data, debouncedSearch, filterNgayRotKien]);

  // Handlers trạng thái
  const handleComplete = useCallback(async (id) => {
    try {
      await rotKienService.updateRotKien(id, { trangThai: true });
      const list = await rotKienService.getAllRotKien();
      setData(list || []);
    } catch (error) {
      console.error("Cập nhật trạng thái thất bại:", error);
    }
  }, []);

  const handleUncomplete = useCallback(async (id) => {
    try {
      await rotKienService.updateRotKien(id, { trangThai: false });
      const list = await rotKienService.getAllRotKien();
      setData(list || []);
    } catch (error) {
      console.error("Hoàn tác trạng thái thất bại:", error);
    }
  }, []);

  // Handler tạo mới (được truyền xuống AddKienDialog)
  const handleCreate = useCallback(async (payload) => {
    try {
      await rotKienService.createRotKien(payload);
      const list = await rotKienService.getAllRotKien();
      setData(list || []);
      toast.success("✅ Thêm kiện thành công!");
    } catch (err) {
      console.error("Lỗi tạo kiện:", err);
      toast.error("❌ Lỗi tạo kiện");
    }
  }, []);

  const handleClearFilter = useCallback(() => {
    setSearchMaCH("");
    setFilterNgayRotKien("");
  }, []);

  // ===== Excel helpers =====
  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
      d.getHours()
    )}${pad(d.getMinutes())}`;
  };

  const mapRowsForExcel = (rows) =>
    rows.map((item, i) => ({
      STT: i + 1,
      "Mã CH": item?.maCH || "",
      "Tên CH": item?.tenCH || "",
      "Số kiện": item?.soKienRot ?? "",
      "Số soda - hóa đơn": item?.soSoda ?? "",
      "Ngày cập nhập": item?.ngayRotKien
        ? new Date(item.ngayRotKien).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "",
      "Ghi chú": item?.ghiChu || "",
      "Trạng thái": item?.trangThai ? "Đã hoàn thành" : "Chưa hoàn thành",
    }));

  const autoFitColumns = (ws) => {
    ws.columns.forEach((col) => {
      let max = col.header ? String(col.header).length : 10;
      col.eachCell?.((cell) => {
        const v = cell.value == null ? "" : String(cell.value);
        max = Math.max(max, v.length);
      });
      col.width = Math.min(Math.max(max + 2, 10), 60); // min 10, max 60
    });
  };

  const exportToExcel = async (rows, fileName) => {
    if (!rows?.length) {
      toast.info("Danh sách đang trống, không có gì để xuất.");
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("BaoKien");

    ws.columns = [
      { header: "STT", key: "STT" },
      { header: "Mã CH", key: "Mã CH" },
      { header: "Tên CH", key: "Tên CH" },
      { header: "Số kiện", key: "Số kiện" },
      { header: "Số soda - hóa đơn", key: "Số soda - hóa đơn" },
      { header: "Ngày cập nhập", key: "Ngày cập nhập" },
      { header: "Ghi chú", key: "Ghi chú" },
      { header: "Trạng thái", key: "Trạng thái" },
    ];

    const rowsMapped = mapRowsForExcel(rows);
    rowsMapped.forEach((r) => ws.addRow(r));

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.alignment = { vertical: "middle", horizontal: "center" };
    header.height = 22;
    header.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F2937" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell, colNumber) => {
        cell.border = { top: { style: "hair" }, bottom: { style: "hair" } };
        const headerText = ws.getColumn(colNumber).header;
        if (headerText === "Số kiện" || headerText === "Số soda - hóa đơn") {
          cell.alignment = { horizontal: "right" };
        } else if (headerText === "Ngày cập nhập") {
          cell.alignment = { horizontal: "center" };
        }
      });
    });

    autoFitColumns(ws);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportVisible = async () => {
    const visible = viewMode === "chua" ? filteredDataChuaHT : filteredDataDaHT;
    const suffix = viewMode === "chua" ? "chuaHT" : "daHT";
    await exportToExcel(visible, `bao-kien_${suffix}_${stamp()}.xlsx`);
  };

  return (
    <div className="px-4 sm:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">
        TOOL BÁO KIỆN
      </h2>

      {/* Trạng thái */}
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="viewMode" className="text-sm font-medium text-gray-700">
          Trạng thái:
        </label>
        <select
          id="viewMode"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="chua">Chưa hoàn thành</option>
          <option value="hoan">Đã hoàn thành</option>
        </select>
      </div>

      {/* Bộ lọc & thêm */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <Input
          type="text"
          placeholder="🔍 Mã cửa hàng..."
          value={searchMaCH}
          onChange={(e) => setSearchMaCH(e.target.value)}
          className="w-full sm:w-48"
        />

        <Input
          type="date"
          value={filterNgayRotKien}
          onChange={(e) => setFilterNgayRotKien(e.target.value)}
          max={toDateInputValue()}
          className="w-full sm:w-48"
        />

        <Button variant="secondary" onClick={handleClearFilter}>
          🧹 Xóa bộ lọc
        </Button>

        <Button
          onClick={handleExportVisible}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Xuất đúng nội dung đang hiển thị (đã lọc)"
        >
          ⬇️ Xuất Excel
        </Button>

        {/* Dialog thêm kiện */}
        <AddKienDialog cuahangs={cuahangs} onSubmit={handleCreate} />
      </div>

      {/* Bảng dữ liệu */}
      {viewMode === "chua" ? (
        <div className="overflow-x-auto shadow border rounded">
          <table className="w-full text-sm text-left bg-white">
            <thead className="text-xs bg-gray-50 border-b text-center">
              <tr>
                <th className="px-4 py-3 font-semibold">STT</th>
                <th className="px-4 py-3 font-semibold">MÃ CH</th>
                <th className="px-4 py-3 font-semibold">TÊN CH</th>
                <th className="px-4 py-3 font-semibold">SỐ KIỆN</th>
                <th className="px-4 py-3 font-semibold">SỐ SODA - HÓA ĐƠN</th>
                <th className="px-4 py-3 font-semibold">NGÀY GIỜ CẬP NHẬP</th>
                <th className="px-4 py-3 font-semibold">GHI CHÚ</th>
                 <th className="px-4 py-3 font-semibold">BỘ PHẬN</th>

                <th className="px-4 py-3 font-semibold">CHỨC NĂNG</th>

              </tr>
            </thead>
            <tbody>
              {filteredDataChuaHT.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredDataChuaHT.map((item, index) => (
                  <RotKienRow
                    key={item._id}
                    data={item}
                    index={index}
                    onComplete={handleComplete}
                    formatDateTimeVN={formatDateTimeVN}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <KienHT
          data={filteredDataDaHT}
          onUncomplete={handleUncomplete}
          formatDateTimeVN={formatDateTimeVN}
        />
      )}
    </div>
  );
};

export default ToolRotKien;
