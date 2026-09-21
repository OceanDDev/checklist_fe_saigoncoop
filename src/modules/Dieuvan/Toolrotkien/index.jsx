/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

import { rotKienService } from "@/services/dieuvan/rotkien.service";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";

import AddKienDialog from "./addKien";
import CustomPagination from "@/components/ui/customPagination";
import AddCuaHangDialog from "./addCuaHang/AddCuaHangDialog";
import RotKienRow from "./rotKienRow/RotKienRow";
import KienHT from "./rotKienRow/KienHT";
import AddPhanBoDialog from "./addKien/AddPhanBoDialog";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import { CalendarDays, X } from "lucide-react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

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
const DateRangeFilter = ({
  label,
  startValue,
  endValue,
  onChange,
  onClear,
}) => {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : null,
      endDate: endValue ? new Date(endValue) : null,
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  // Đồng bộ khi bấm "Xóa bộ lọc" ở ngoài
  useEffect(() => {
    setRange([
      {
        startDate: startValue ? new Date(startValue) : null,
        endDate: endValue ? new Date(endValue) : null,
        key: "selection",
      },
    ]);
  }, [startValue, endValue]);

  // Click ra ngoài thì đóng
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !wrapRef.current?.contains(e.target) &&
        !popupRef.current?.contains(e.target)
      ) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cuộn trang / resize thì đóng, tránh popup trôi sai vị trí
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [show]);

  const openPopup = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 320;
      let left = rect.left;
      const maxLeft = window.innerWidth - popupWidth - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8) left = 8;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  const handleRangeChange = (item) => {
    const { startDate, endDate } = item.selection;
    setRange([item.selection]);
    onChange(
      startDate ? dayjs(startDate).format("YYYY-MM-DD") : "",
      endDate ? dayjs(endDate).format("YYYY-MM-DD") : "",
    );
  };

  const handleClear = () => {
    setRange([{ startDate: null, endDate: null, key: "selection" }]);
    onClear();
    setShow(false);
  };

  const hasValue = range[0].startDate && range[0].endDate;

  return (
    <div className="relative w-full sm:w-60" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={
          hasValue
            ? `${dayjs(range[0].startDate).format("DD/MM/YYYY")} - ${dayjs(range[0].endDate).format("DD/MM/YYYY")}`
            : ""
        }
        placeholder={label}
        className="h-10 w-full cursor-pointer rounded-md border border-blue-300 bg-blue-50 px-3 pl-9 pr-8 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 hover:bg-blue-100 focus:ring-2 focus:ring-blue-300"
      />
      <CalendarDays
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          title="Xóa lọc ngày"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <X size={14} />
        </button>
      )}
      {show &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <DateRange
              ranges={range}
              onChange={handleRangeChange}
              showDateDisplay={false}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
const ToolRotKien = () => {
  const [viewMode, setViewMode] = useState("chua");
  const [data, setData] = useState([]);
  const [cuahangs, setCuahangs] = useState([]);

  const [searchMaCH, setSearchMaCH] = useState("");
  const debouncedSearch = useDebouncedValue(searchMaCH, 200);
  const [filterBoPhan, setFilterBoPhan] = useState(""); // <— NEW
  const [filterSoSoda, setFilterSoSoda] = useState("");
  // PHÂN TRANG (cố định 10 dòng/trang)
  const pageSize = 10;
  const [pageChua, setPageChua] = useState(0);
  const [pageDa, setPageDa] = useState(0);

  const [filterTuNgay, setFilterTuNgay] = useState("");
  const [filterDenNgay, setFilterDenNgay] = useState("");
  // Fetch (chặn double-fetch ở Strict Mode)
  const loadedRef = useRef(false);
  // Đếm số lần mỗi mã soda đã xuất hiện trong TOÀN BỘ dữ liệu
  // (data đã gồm cả chưa hoàn thành lẫn đã hoàn thành - KienHT)
  const existingSodaCodeCounts = useMemo(() => {
    const counts = {};
    data.forEach((item) => {
      (item.soSoda || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((code) => {
          counts[code] = (counts[code] || 0) + 1;
        });
    });
    return counts;
  }, [data]);

  const existingSodaCodes = useMemo(
    () => Object.keys(existingSodaCodeCounts),
    [existingSodaCodeCounts],
  );

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const rotkien = await rotKienService.getAllRotKien();
        setData(rotkien || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    })();
  }, []);
  const { filteredDataChuaHT, filteredDataDaHT } = useMemo(() => {
    const q = (debouncedSearch || "").toLowerCase();
    const soda = filterSoSoda.trim();

    const match = (item) => {
      if (!(item.maCH || "").toLowerCase().includes(q)) return false;
      if (filterBoPhan && item.boPhan !== filterBoPhan) return false;
      if (soda && !String(item.soSoda || "").includes(soda)) return false;

      if (filterTuNgay || filterDenNgay) {
        if (!item.ngayRotKien) return false;
        const day = dayjs(item.ngayRotKien).format("YYYY-MM-DD"); // theo giờ máy
        if (filterTuNgay && day < filterTuNgay) return false;
        if (filterDenNgay && day > filterDenNgay) return false;
      }
      return true;
    };

    return {
      filteredDataChuaHT: data.filter((i) => !i.trangThai && match(i)),
      filteredDataDaHT: data.filter((i) => i.trangThai && match(i)),
    };
  }, [
    data,
    debouncedSearch,
    filterTuNgay,
    filterDenNgay,
    filterBoPhan,
    filterSoSoda,
  ]);

  useEffect(() => {
    setPageChua(0);
    setPageDa(0);
  }, [
    debouncedSearch,
    filterTuNgay,
    filterDenNgay,
    filterBoPhan,
    filterSoSoda,
    viewMode,
    data.length,
  ]);
  const handleUpdate = useCallback(async (id, payload) => {
    try {
      await rotKienService.updateRotKien(id, payload);
      const list = await rotKienService.getAllRotKien();
      setData(list || []);
      toast.success("✅ Cập nhật thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật kiện:", err);
      toast.error("❌ Lỗi cập nhật kiện");
    }
  }, []);
  // Tính toán phân trang
  const pageCountChua = Math.max(
    0,
    Math.ceil(filteredDataChuaHT.length / pageSize),
  );
  const pageCountDa = Math.max(
    0,
    Math.ceil(filteredDataDaHT.length / pageSize),
  );

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
  const handleCreateCuaHang = useCallback(
    async (payload) => {
      try {
        // Kiểm tra trùng mã CH trước khi gọi service (client-side validation)
        const existingCH = cuahangs.find(
          (ch) => ch.maCH?.toLowerCase() === payload.maCH?.toLowerCase(),
        );
        if (existingCH) {
          toast.error(`❌ Mã cửa hàng "${payload.maCH}" đã tồn tại!`);
          throw new Error(`Mã cửa hàng "${payload.maCH}" đã tồn tại`);
        }

        await cuaHangService.addCuaHang(payload);
        const list = await cuaHangService.getAllCuaHang();
        setCuahangs(list || []);
        toast.success("✅ Thêm cửa hàng thành công!");
      } catch (err) {
        console.error("Lỗi tạo cửa hàng:", err);

        // Xử lý các loại lỗi khác nhau
        const errorMessage = err.response?.data?.message || err.message || "";

        if (
          err.response?.status === 409 ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("exists") ||
          errorMessage.includes("tồn tại") ||
          errorMessage.includes("E11000")
        ) {
          // MongoDB duplicate key error
          toast.error(`❌ Mã cửa hàng "${payload.maCH}" đã tồn tại!`);
        } else if (err.response?.status === 400) {
          toast.error(`❌ ${errorMessage || "Dữ liệu không hợp lệ!"}`);
        } else if (err.response?.status === 500) {
          toast.error("❌ Lỗi server, vui lòng thử lại!");
        } else if (!errorMessage.includes("tồn tại")) {
          toast.error("❌ Lỗi tạo cửa hàng");
        }

        throw err; // Ném lại error để component con xử lý
      }
    },
    [cuahangs],
  );

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
    setFilterTuNgay("");
    setFilterDenNgay("");
    setFilterBoPhan("");
    setFilterSoSoda("");
  }, []);
  // ===== Excel helpers =====
  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  const mapRowsForExcel = (rows) =>
    rows.map((item, i) => ({
      STT: i + 1,
      "Mã CH": item?.maCH || "",
      "Tên CH": item?.tenCH || "",
      "Số kiện": item?.soKienRot ?? "",
      "Số soda - hóa đơn": item?.soSoda ?? "",
      "Ngày cập nhật": item?.ngayRotKien
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
      // Nếu muốn export cả Bộ phận, có thể thêm:
      // "Bộ phận": item?.boPhan || "",
    }));

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
    const ws = wb.addWorksheet("BaoKien");

    ws.columns = [
      { header: "STT", key: "STT" },
      { header: "Mã CH", key: "Mã CH" },
      { header: "Tên CH", key: "Tên CH" },
      { header: "Số kiện", key: "Số kiện" },
      { header: "Số soda - hóa đơn", key: "Số soda - hóa đơn" },
      { header: "Ngày cập nhật", key: "Ngày cập nhật" },
      { header: "Ghi chú", key: "Ghi chú" },
      { header: "Trạng thái", key: "Trạng thái" },
      // Nếu muốn export cả Bộ phận, mở khóa dòng dưới:
      // { header: "Bộ phận", key: "Bộ phận" },
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
    await exportToExcel(visible, `bao-kien_${suffix}_${stamp()}.xlsx`);
  };

  return (
    <div className="px-4 sm:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">
        TOOL BÁO KIỆN
      </h2>

      {/* Trạng thái + Bộ phận */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="viewMode"
            className="text-sm font-medium text-gray-700"
          >
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
        <div className="flex items-center gap-2">
          <label
            htmlFor="filterBoPhan"
            className="text-sm font-medium text-gray-700"
          >
            Bộ phận:
          </label>
          <select
            id="filterBoPhan"
            value={filterBoPhan}
            onChange={(e) => setFilterBoPhan(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="XLĐH">XLĐH</option>
            <option value="Điều Vận">Điều Vận</option>
          </select>
        </div>
        <Input
          type="text"
          placeholder="🔍 Mã cửa hàng..."
          value={searchMaCH}
          onChange={(e) => setSearchMaCH(e.target.value)}
          className="w-full sm:w-48"
        />
        <Input
          type="text"
          placeholder="🔎 Số soda - hóa đơn..."
          value={filterSoSoda}
          onChange={(e) => setFilterSoSoda(e.target.value)}
          className="w-full sm:w-48"
        />
        <DateRangeFilter
          label="Lọc theo ngày cập nhật"
          startValue={filterTuNgay}
          endValue={filterDenNgay}
          onChange={(start, end) => {
            setFilterTuNgay(start);
            setFilterDenNgay(end);
          }}
          onClear={() => {
            setFilterTuNgay("");
            setFilterDenNgay("");
          }}
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
        {/* Dialog thêm cửa hàng MỚI */}
        <AddCuaHangDialog onSubmit={handleCreateCuaHang} />
        {/* Dialog thêm kiện */}
        <AddKienDialog
          cuahangs={cuahangs}
          onSubmit={handleCreate}
          existingSodaCodes={existingSodaCodes}
          existingSodaCodeCounts={existingSodaCodeCounts}
        />
        <AddPhanBoDialog
          onSubmit={handleCreate}
          existingSodaCodes={existingSodaCodes}
          existingSodaCodeCounts={existingSodaCodeCounts}
        />
      </div>

      {/* Bảng dữ liệu + phân trang */}
      {viewMode === "chua" ? (
        <>
          <div className="overflow-x-auto shadow border rounded">
            <table className="w-full text-sm text-left bg-white">
              <thead className="text-xs bg-gray-50 border-b text-center">
                <tr>
                  <th className="px-4 py-3 font-semibold">STT</th>
                  <th className="px-4 py-3 font-semibold">MÃ CH</th>
                  <th className="px-4 py-3 font-semibold">TÊN CH</th>
                  <th className="px-4 py-3 font-semibold">SỐ KIỆN</th>
                  <th className="px-4 py-3 font-semibold">SỐ SODA - HÓA ĐƠN</th>
                  <th className="px-4 py-3 font-semibold">NGÀY GIỜ CẬP NHẬT</th>
                  <th className="px-4 py-3 font-semibold">GHI CHÚ</th>
                  <th className="px-4 py-3 font-semibold">BỘ PHẬN</th>
                  <th className="px-4 py-3 font-semibold">CHỨC NĂNG</th>
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
                    <RotKienRow
                      key={item._id}
                      data={item}
                      index={pageChua * pageSize + index}
                      onComplete={handleComplete}
                      onUpdate={handleUpdate}
                      existingSodaCodes={existingSodaCodes}
                      existingSodaCodeCounts={existingSodaCodeCounts}
                      formatDateTimeVN={formatDateTimeVN}
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
          <KienHT
            data={currentSliceDa}
            onUncomplete={handleUncomplete}
            onUpdate={handleUpdate}
            existingSodaCodes={existingSodaCodes}
            existingSodaCodeCounts={existingSodaCodeCounts}
            formatDateTimeVN={formatDateTimeVN}
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

export default ToolRotKien;
