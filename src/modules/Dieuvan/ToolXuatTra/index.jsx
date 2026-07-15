/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback } from "react";
import { xuatTraService } from "@/services/dieuvan/xuattra.service";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import AddXuatTraDialog from "./addXuatTra";
import CustomPagination from "@/components/ui/customPagination";
import XuatTraRow from "./xuatTrarow";
import XuatTraHT from "./xuatTrarow/xuatTraHT";
import TableVendor from "./vendor";
import TableSKU from "./product";

const unwrapArray = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
};

const toDateInputValue = (d = new Date()) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

const formatDateVN = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const getLocalYMD = (d) => {
  return d ? toDateInputValue(new Date(d)) : "";
};

const useDebouncedValue = (value, delay = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const ToolXuatTra = () => {
  const [viewMode, setViewMode] = useState("xuattra");
  const [statusMode, setStatusMode] = useState("chua");
  const [showAllColumns, setShowAllColumns] = useState(false);

  const [data, setData] = useState([]);
  const [cuahangs, setCuahangs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMaCH, setSearchMaCH] = useState("");
  const debouncedSearch = useDebouncedValue(searchMaCH, 300);
  const [filterNgayXuatTra, setFilterNgayXuatTra] = useState("");
  const [filterBoPhan, setFilterBoPhan] = useState("");
  const [filterDuplicate, setFilterDuplicate] = useState(false);

  const pageSize = 10;
  const [pageChua, setPageChua] = useState(0);
  const [pageDa, setPageDa] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [xuattra, ch] = await Promise.all([
        xuatTraService.getAllXuatTra(),
        cuaHangService.getAllCuaHang(),
      ]);
      setData(unwrapArray(xuattra));
      setCuahangs(unwrapArray(ch));
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("❌ Lỗi tải dữ liệu ban đầu!");
      setData([]);
      setCuahangs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const safeData = Array.isArray(data) ? data : [];

  const filteredData = useMemo(() => {
    const q = (debouncedSearch || "").toLowerCase();
    return safeData.filter((item) => {
      const isChuaHT = !item?.trangThai;
      const statusMatch = statusMode === "chua" ? isChuaHT : !isChuaHT;
      if (!statusMatch) return false;

      const passMaCH = (item?.maCH || "").toLowerCase().includes(q);
      const ngayXuatTraDate = getLocalYMD(item?.ngayXuatTra);
      const passNgay =
        !filterNgayXuatTra || ngayXuatTraDate === filterNgayXuatTra;
      const passBoPhan = !filterBoPhan || item?.boPhan === filterBoPhan;
      const passDuplicate = !filterDuplicate || item?.kiem_tra_trung > 1;

      return passMaCH && passNgay && passBoPhan && passDuplicate;
    });
  }, [
    safeData,
    debouncedSearch,
    filterNgayXuatTra,
    filterBoPhan,
    statusMode,
    filterDuplicate,
  ]);

  const filteredDataChuaHT = useMemo(() => {
    return filteredData.filter((item) => !item?.trangThai);
  }, [filteredData]);

  const filteredDataDaHT = useMemo(() => {
    return filteredData.filter((item) => !!item?.trangThai);
  }, [filteredData]);

  // Reset về trang đầu khi filter thay đổi
  useEffect(() => {
    setPageChua(0);
    setPageDa(0);
  }, [
    debouncedSearch,
    filterNgayXuatTra,
    filterBoPhan,
    statusMode,
    filterDuplicate,
  ]);

  const pageCountChua = Math.max(
    0,
    Math.ceil(filteredDataChuaHT.length / pageSize),
  );
  const pageCountDa = Math.max(
    0,
    Math.ceil(filteredDataDaHT.length / pageSize),
  );

  // FIX PAGINATION: clamp lại trang hiện tại nếu data thay đổi (vd: complete/uncomplete)
  // khiến trang đang xem vượt quá số trang thực tế còn lại -> tránh hiển thị trống oan.
  useEffect(() => {
    if (pageChua > 0 && pageChua > pageCountChua - 1) {
      setPageChua(Math.max(0, pageCountChua - 1));
    }
  }, [pageCountChua, pageChua]);

  useEffect(() => {
    if (pageDa > 0 && pageDa > pageCountDa - 1) {
      setPageDa(Math.max(0, pageCountDa - 1));
    }
  }, [pageCountDa, pageDa]);

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

  const handleComplete = useCallback(
    async (id) => {
      try {
        await xuatTraService.updateXuatTra(id, { trangThai: true });
        fetchData();
        toast.success("✅ Đánh dấu hoàn thành!");
      } catch (err) {
        console.error("Lỗi cập nhật:", err);
        toast.error("❌ Lỗi cập nhật");
      }
    },
    [fetchData],
  );

  const handleUncomplete = useCallback(
    async (id) => {
      try {
        await xuatTraService.updateXuatTra(id, { trangThai: false });
        fetchData();
        toast.success("↩ Đã đưa về trạng thái chưa hoàn thành!");
      } catch (err) {
        console.error("Lỗi hoàn tác:", err);
        toast.error("❌ Lỗi hoàn tác");
      }
    },
    [fetchData],
  );

  const handleCreate = useCallback(
    async (payload) => {
      try {
        await xuatTraService.createXuatTra(payload);
        fetchData();
        toast.success("✅ Thêm xuất trả thành công!");
      } catch (err) {
        console.error("Lỗi tạo xuất trả:", err);
        toast.error("❌ Lỗi tạo xuất trả");
      }
    },
    [fetchData],
  );

  const handleClearFilter = useCallback(() => {
    setSearchMaCH("");
    setFilterNgayXuatTra("");
    setFilterBoPhan("");
    setFilterDuplicate(false);
  }, []);

  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
      d.getHours(),
    )}${pad(d.getMinutes())}`;
  };

  const mapRowsForExcel = (rows) => {
    return rows.map((item, i) => ({
      STT: i + 1,
      "Ngày nhập trả": item?.ngayNhapTra ? formatDateVN(item.ngayNhapTra) : "",
      Số: item?.so || "",
      "Tài xế": item?.taiXe || "",
      "Biển số xe": item?.bienSoXe || "",
      "Ngày CH trả NVC": item?.ngayCHTraNVC
        ? formatDateVN(item.ngayCHTraNVC)
        : "",
      "NV nhập trả": item?.nvNhapTra || "",
      "Ký hiệu": item?.kyHieu || "",
      "Số hóa đơn": item?.soHoaDon || "",
      "Số tiền sau thuế": item?.soTienSauThue || "",
      "Ngày hóa đơn": item?.ngayHoaDon ? formatDateVN(item.ngayHoaDon) : "",
      "Mã CH": item?.maCH || "",
      "Tên CH": item?.tenCH || "",
      SKU: item?.sku || "",
      UPC: item?.upc || "",
      "Tên hàng": item?.tenHang || "",
      Lượng: item?.luong ?? "",
      Vendor: item?.vendor || "",
      "Vendor Name": item?.vendorName || "",
      "Ngày BG kế toán": item?.ngayBGKeToan
        ? formatDateVN(item.ngayBGKeToan)
        : "",
      "Số RTV": item?.soRTV || "",
      "NV kế toán nhập trả": item?.nvKeToanNhapTra || "",
      "Ngày BG xuất trả": item?.ngayBGXuatTra
        ? formatDateVN(item.ngayBGXuatTra)
        : "",
      "Ngày sản xuất": item?.ngaySanXuat ? formatDateVN(item.ngaySanXuat) : "",
      "Hạn sử dụng": item?.hanSuDung ? formatDateVN(item.hanSuDung) : "",
      "Ghi chú": item?.ghiChu || "",
      "Kiểm tra trùng": item?.kiem_tra_trung || 1,
      "Trạng thái": item?.trangThai ? "Đã hoàn thành" : "Chưa hoàn thành",
    }));
  };

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
      { header: "Ngày nhập trả", key: "Ngày nhập trả" },
      { header: "Số", key: "Số" },
      { header: "Tài xế", key: "Tài xế" },
      { header: "Biển số xe", key: "Biển số xe" },
      { header: "Ngày CH trả NVC", key: "Ngày CH trả NVC" },
      { header: "NV nhập trả", key: "NV nhập trả" },
      { header: "Ký hiệu", key: "Ký hiệu" },
      { header: "Số hóa đơn", key: "Số hóa đơn" },
      { header: "Số tiền sau thuế", key: "Số tiền sau thuế" },
      { header: "Ngày hóa đơn", key: "Ngày hóa đơn" },
      { header: "Mã CH", key: "Mã CH" },
      { header: "Tên CH", key: "Tên CH" },
      { header: "SKU", key: "SKU" },
      { header: "UPC", key: "UPC" },
      { header: "Tên hàng", key: "Tên hàng" },
      { header: "Lượng", key: "Lượng" },
      { header: "Vendor", key: "Vendor" },
      { header: "Vendor Name", key: "Vendor Name" },
      { header: "Ngày BG kế toán", key: "Ngày BG kế toán" },
      { header: "Số RTV", key: "Số RTV" },
      { header: "NV kế toán nhập trả", key: "NV kế toán nhập trả" },
      { header: "Ngày BG xuất trả", key: "Ngày BG xuất trả" },
      { header: "Ngày sản xuất", key: "Ngày sản xuất" },
      { header: "Hạn sử dụng", key: "Hạn sử dụng" },
      { header: "Kiểm tra trùng", key: "Kiểm tra trùng" },
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
      row.eachCell((cell) => {
        cell.border = { top: { style: "hair" }, bottom: { style: "hair" } };
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
    const visible =
      statusMode === "chua" ? filteredDataChuaHT : filteredDataDaHT;
    const suffix = statusMode === "chua" ? "chuaHT" : "daHT";
    await exportToExcel(visible, `xuat-tra_${suffix}_${stamp()}.xlsx`);
  };

  if (viewMode === "sku") {
    return <TableSKU onBack={() => setViewMode("xuattra")} />;
  }

  if (viewMode === "vendor") {
    return <TableVendor onBack={() => setViewMode("xuattra")} />;
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">TOOL XUẤT TRẢ</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          onClick={() => setViewMode("xuattra")}
          variant={viewMode === "xuattra" ? "default" : "outline"}
        >
          📋 XUẤT TRẢ
        </Button>
        <Button onClick={() => setViewMode("sku")} variant="outline">
          📦 SKU
        </Button>
        <Button onClick={() => setViewMode("vendor")} variant="outline">
          🏢 VENDOR
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Trạng thái:
            </label>
            <select
              value={statusMode}
              onChange={(e) => setStatusMode(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="chua">Chưa hoàn thành</option>
              <option value="da">Đã hoàn thành</option>
            </select>
          </div>

          <Button
            onClick={() => setShowAllColumns(!showAllColumns)}
            variant="outline"
            className="gap-2"
          >
            {showAllColumns ? "🔽 Ẩn chi tiết" : "🔼 Hiện chi tiết"}
          </Button>

          <Button
            onClick={() => setFilterDuplicate(!filterDuplicate)}
            variant={filterDuplicate ? "destructive" : "outline"}
            className="gap-2"
          >
            {filterDuplicate ? "❌ Chỉ hiển thị Trùng lặp" : "🔍 Lọc trùng lặp"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            type="text"
            placeholder="🔍 Tìm theo Mã CH..."
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
          <Button onClick={handleClearFilter} variant="outline">
            🧹 Xóa bộ lọc
          </Button>
          <AddXuatTraDialog onSubmit={handleCreate} cuahangs={cuahangs} />
          <Button onClick={handleExportVisible} variant="outline">
            ⬇️ Xuất Excel
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8">Đang tải dữ liệu...</div>}

      {statusMode === "chua" && !isLoading ? (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    STT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Trùng
                  </th>
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ngày nhập trả
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Số
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Tài xế
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Biển số xe
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ngày CH trả NVC
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      NV nhập trả
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ký hiệu
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Số HĐ
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Số tiền
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ngày HĐ
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Mã CH
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Tên CH
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    UPC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Tên hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Lượng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Vendor
                  </th>
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ngày BG KT
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Số RTV
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      NV KT nhập trả
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ngày BG xuất trả
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      NSX
                    </th>
                  )}
                  {showAllColumns && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      HSD
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Ghi chú
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSliceChua.length === 0 ? (
                  <tr>
                    <td
                      colSpan="100"
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  currentSliceChua.map((item, index) => (
                    <XuatTraRow
                      key={item._id || index}
                      item={item}
                      index={pageChua * pageSize + index}
                      onComplete={handleComplete}
                      showAllColumns={showAllColumns}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <CustomPagination
              pageCount={pageCountChua}
              currentPage={pageChua}
              onPageChange={(selected) => setPageChua(selected)}
              marginPagesDisplayed={2}
              pageRangeDisplayed={3}
              additionalClassname="gap-2 justify-center"
            />
          </div>
        </>
      ) : (
        !isLoading && (
          <>
            <XuatTraHT
              data={currentSliceDa}
              onUncomplete={handleUncomplete}
              showAllColumns={showAllColumns}
              startIndex={pageDa * pageSize}
            />
            <div className="mt-4">
              <CustomPagination
                pageCount={pageCountDa}
                currentPage={pageDa}
                onPageChange={(selected) => setPageDa(selected)}
                marginPagesDisplayed={2}
                pageRangeDisplayed={3}
                additionalClassname="gap-2 justify-center"
              />
            </div>
          </>
        )
      )}
    </div>
  );
};

export default ToolXuatTra;
