/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

import { rotKienService } from "@/services/dieuvan/xuattra.service"; // service xuất trả
import { cuaHangService } from "@/services/dieuvan/cuahang.service";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";

import AddXuatTraDialog from "./addXuatTra";
import CustomPagination from "@/components/ui/customPagination";
import XuatTraRow from "./xuatTrarow";
import XuatTraHT from "./xuatTrarow/xuatTraHT";

// ===== Helpers =====

// Unwrap: đảm bảo luôn trả mảng cho setState
const unwrapArray = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
};

// YYYY-MM-DD (local timezone) — dùng cho <input type="date" />
const toDateInputValue = (d = new Date()) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

// 24h vi-VN, không AM/PM (dùng để hiển thị)
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

// Debounce nhỏ cho search
const useDebouncedValue = (value, delay = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const ToolXuatTra = () => {
  const [viewMode, setViewMode] = useState("chua"); // ⟵ giống ToolRotKien
  const [data, setData] = useState([]);
  const [cuahangs, setCuahangs] = useState([]);

  const [searchMaCH, setSearchMaCH] = useState("");
  const debouncedSearch = useDebouncedValue(searchMaCH, 200);
  const [filterNgayXuatTra, setFilterNgayXuatTra] = useState("");
  const [filterBoPhan, setFilterBoPhan] = useState(""); // ⟵ filter Bộ phận

  // PHÂN TRANG (cố định 10 dòng/trang) — tách đôi cho 2 view
  const pageSize = 10;
  const [pageChua, setPageChua] = useState(0);
  const [pageDa, setPageDa] = useState(0);

  // Fetch (chặn double-fetch ở Strict Mode)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const [xuattra, ch] = await Promise.all([
          rotKienService.getAllXuatTra(),
          cuaHangService.getAllCuaHang(),
        ]);
        setData(unwrapArray(xuattra));
        setCuahangs(unwrapArray(ch));
      } catch (err) {
        console.error("Fetch error:", err);
        setData([]);
        setCuahangs([]);
      }
    })();
  }, []);

  // Safe guard nếu vì lý do gì đó data không phải mảng
  const safeData = Array.isArray(data) ? data : [];

  const getLocalYMD = (d) => (d ? toDateInputValue(new Date(d)) : "");

  // Lọc dữ liệu (tách CHƯA/ĐÃ)
  const filteredDataChuaHT = useMemo(() => {
    const q = (debouncedSearch || "").toLowerCase();
    return safeData
      .filter((item) => !item?.trangThai)
      .filter((item) => {
        const passMaCH = (item?.maCH || "").toLowerCase().includes(q);
        const anyDate =
          item?.ngayXuatTra ??
          item?.ngayCapNhap ??
          item?.updatedAt ??
          item?.createdAt;
        const passNgay =
          !filterNgayXuatTra || getLocalYMD(anyDate) === filterNgayXuatTra;
        const passBoPhan = !filterBoPhan || item?.boPhan === filterBoPhan;
        return passMaCH && passNgay && passBoPhan;
      });
  }, [safeData, debouncedSearch, filterNgayXuatTra, filterBoPhan]);

  const filteredDataDaHT = useMemo(() => {
    const q = (debouncedSearch || "").toLowerCase();
    return safeData
      .filter((item) => !!item?.trangThai)
      .filter((item) => {
        const passMaCH = (item?.maCH || "").toLowerCase().includes(q);
        const anyDate =
          item?.ngayXuatTra ??
          item?.ngayCapNhap ??
          item?.updatedAt ??
          item?.createdAt;
        const passNgay =
          !filterNgayXuatTra || getLocalYMD(anyDate) === filterNgayXuatTra;
        const passBoPhan = !filterBoPhan || item?.boPhan === filterBoPhan;
        return passMaCH && passNgay && passBoPhan;
      });
  }, [safeData, debouncedSearch, filterNgayXuatTra, filterBoPhan]);

  // Reset trang khi đổi filter / view hoặc đổi dữ liệu
  useEffect(() => {
    setPageChua(0);
    setPageDa(0);
  }, [debouncedSearch, filterNgayXuatTra, filterBoPhan, viewMode, safeData.length]);

  // Tính toán phân trang
  const pageCountChua = Math.max(0, Math.ceil(filteredDataChuaHT.length / pageSize));
  const pageCountDa = Math.max(0, Math.ceil(filteredDataDaHT.length / pageSize));

  const currentSliceChua = useMemo(() => {
    const start = pageChua * pageSize;
    const end = start + pageSize;
    return filteredDataChuaHT.slice(start, end);
  }, [filteredDataChuaHT, pageChua]);

  const currentSliceDa = useMemo(() => {
    const start = pageDa * pageSize;
    const end = start + pageSize;
    return filteredDataDaHT.slice(start, end);
  }, [filteredDataDaHT, pageDa]);

  // ===== CRUD Handlers =====
  const handleComplete = useCallback(async (id) => {
    try {
      await rotKienService.updateXuatTra(id, { trangThai: true });
      const list = await rotKienService.getAllXuatTra();
      setData(unwrapArray(list));
      toast.success("✅ Đánh dấu hoàn thành!");
    } catch (err) {
      console.error("Lỗi cập nhật:", err);
      toast.error("❌ Lỗi cập nhật");
    }
  }, []);

  const handleUncomplete = useCallback(async (id) => {
    try {
      await rotKienService.updateXuatTra(id, { trangThai: false });
      const list = await rotKienService.getAllXuatTra();
      setData(unwrapArray(list));
      toast.success("↩ Đã đưa về trạng thái chưa hoàn thành!");
    } catch (err) {
      console.error("Lỗi hoàn tác:", err);
      toast.error("❌ Lỗi hoàn tác");
    }
  }, []);

  // Handler tạo mới (được truyền xuống AddXuatTraDialog)
  const handleCreate = useCallback(async (payload) => {
    try {
      await rotKienService.createXuatTra(payload);
      const list = await rotKienService.getAllXuatTra();
      setData(unwrapArray(list));
      toast.success("✅ Thêm xuất trả thành công!");
    } catch (err) {
      console.error("Lỗi tạo xuất trả:", err);
      toast.error("❌ Lỗi tạo xuất trả");
    }
  }, []);

  const handleClearFilter = useCallback(() => {
    setSearchMaCH("");
    setFilterNgayXuatTra("");
    setFilterBoPhan("");
  }, []);

  // ===== Excel helpers =====
  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  // Map field fallback nhiều tên để tránh undefined khi backend đổi key
  const mapRowsForExcel = (rows) =>
    rows.map((item, i) => {
      const ngay =
        item?.ngayXuatTra ??
        item?.ngayCapNhap ??
        item?.updatedAt ??
        item?.createdAt;
      const soKien = item?.soKien ?? item?.soKienRot ?? "";
      const sku = item?.SKU ?? item?.sku ?? "";
      return {
        STT: i + 1,
        "Mã CH": item?.maCH || "",
        "Tên CH": item?.tenCH || "",
        "Số kiện xuất trả": soKien,
        SKU: sku,
        "Số soda - hóa đơn": item?.soSoda ?? "",
        "Ngày cập nhật": ngay
          ? new Date(ngay).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "",
        "Ghi chú": item?.ghiChu || "",
        "Bộ phận": item?.boPhan || "",
        "Trạng thái": item?.trangThai ? "Đã hoàn thành" : "Chưa hoàn thành",
      };
    });

  const autoFitColumns = (ws) => {
    ws.columns.forEach((col) => {
      let max = col.header ? String(col.header).length : 10;
      col.eachCell?.((cell) => {
        const v = cell.value == null ? "" : String(cell.value);
        max = Math.max(max, v.length);
      });
      col.width = Math.min(Math.max(max + 2, 10), 60);
    });
  };

  const exportToExcel = async (rows, fileName) => {
    if (!rows?.length) {
      toast.info("Danh sách đang trống, không có gì để xuất.");
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("XuatTra");

    ws.columns = [
      { header: "STT", key: "STT" },
      { header: "Mã CH", key: "Mã CH" },
      { header: "Tên CH", key: "Tên CH" },
      { header: "Số kiện xuất trả", key: "Số kiện xuất trả" },
      { header: "SKU", key: "SKU" },
      { header: "Số soda - hóa đơn", key: "Số soda - hóa đơn" },
      { header: "Ngày cập nhật", key: "Ngày cập nhật" },
      { header: "Ghi chú", key: "Ghi chú" },
      { header: "Bộ phận", key: "Bộ phận" },
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
        if (
          headerText === "Số kiện xuất trả" ||
          headerText === "Số soda - hóa đơn" ||
          headerText === "SKU"
        ) {
          cell.alignment = { horizontal: "right" };
        } else if (headerText === "Ngày cập nhật") {
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
    await exportToExcel(visible, `xuat-tra_${suffix}_${stamp()}.xlsx`);
  };

  // ===== Render =====
  return (
    <div className="px-4 sm:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">
        TOOL XUẤT TRẢ
      </h2>

      {/* Trạng thái + Bộ phận (giống ToolRotKien) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
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
          value={filterNgayXuatTra}
          onChange={(e) => setFilterNgayXuatTra(e.target.value)}
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

        {/* Dialog thêm xuất trả */}
        <AddXuatTraDialog cuahangs={cuahangs} onSubmit={handleCreate} />
      </div>

      {/* Bảng dữ liệu + phân trang theo view */}
      {viewMode === "chua" ? (
        <>
          <div className="overflow-x-auto shadow border rounded">
            <table className="w-full text-sm text-left bg-white">
              <thead className="text-xs bg-gray-50 border-b text-center">
                <tr>
                  <th className="px-4 py-3 font-semibold">STT</th>
                  <th className="px-4 py-3 font-semibold">MÃ CH</th>
                  <th className="px-4 py-3 font-semibold">TÊN CH</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">SỐ KIỆN XUẤT TRẢ</th>
                  <th className="px-4 py-3 font-semibold">SỐ SODA - HÓA ĐƠN</th>
                  <th className="px-4 py-3 font-semibold">NGÀY GIỜ CẬP NHẬT</th>
                  <th className="px-4 py-3 font-semibold">GHI CHÚ</th>
                  <th className="px-4 py-3 font-semibold">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {currentSliceChua.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  currentSliceChua.map((item, index) => (
                    <XuatTraRow
                      key={item._id}
                      data={item}
                      index={pageChua * pageSize + index}
                      formatDateTimeVN={formatDateTimeVN}
                      onComplete={handleComplete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <div className="mt-4 flex justify-center">
            <CustomPagination
              pageCount={pageCountChua}
              forcePage={pageChua}
              onPageChange={({ selected }) => setPageChua(selected)}
              marginPagesDisplayed={2}
              pageRangeDisplayed={3}
              additionalClassname="gap-2 justify-center"
            />
          </div>
        </>
      ) : (
        <>
          <XuatTraHT
            data={currentSliceDa}
            onUncomplete={handleUncomplete}
          />

          {/* Footer phân trang */}
          <div className="mt-4 flex justify-center">
            <CustomPagination
              pageCount={pageCountDa}
              forcePage={pageDa}
              onPageChange={({ selected }) => setPageDa(selected)}
              marginPagesDisplayed={2}
              pageRangeDisplayed={3}
              additionalClassname="gap-2 justify-center"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ToolXuatTra;
