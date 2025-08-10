import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import RotKienRow from "./RotKienRow";
import { rotKienService } from "@/services/dieuvan/rotkien.service";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import KienHT from "./rotKienRow/kienHT";
import ExcelJS from "exceljs";

// Helper: YYYY-MM-DD (local timezone)
const toDateInputValue = (d = new Date()) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
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
  const [open, setOpen] = useState(false);

  const [searchMaCH, setSearchMaCH] = useState("");
  const debouncedSearch = useDebouncedValue(searchMaCH, 200);
  const [filterNgayRotKien, setFilterNgayRotKien] = useState("");

  const [formData, setFormData] = useState({
    maCH: "",
    tenCH: "",
    soKienRot: "",
    soSoda: "",
    ngayRotKien: toDateInputValue(), // mặc định hôm nay
    ghiChu: "",
  });

  // --- Suggestion state ---
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // --- Validation state ---
  const [errors, setErrors] = useState({}); // { maCH?: string, ngayRotKien?: string }

  // Map tra cứu nhanh cửa hàng theo mã
  const cuahangByCode = useMemo(() => {
    const map = new Map();
    cuahangs.forEach((ch) => map.set((ch.maCH || "").trim(), ch));
    return map;
  }, [cuahangs]);

  // Gợi ý theo mã (khi người dùng gõ ≥ 3 ký tự)
  const suggestions = useMemo(() => {
    const key = formData.maCH.trim().toLowerCase();
    if (key.length < 3) return [];
    return cuahangs
      .filter((ch) => (ch.maCH || "").toLowerCase().includes(key))
      .slice(0, 12);
  }, [formData.maCH, cuahangs]);

  // Lọc dữ liệu (memoized)
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

  // Handlers (ổn định bằng useCallback)
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setErrors((prev) => ({ ...prev, [name]: undefined }));

      if (name === "maCH") {
        const trimmed = value.trim();
        setShowSuggest(trimmed.length >= 3);
        if (trimmed.length >= 3 && !suggestions.length) setActiveIndex(-1);
        const matched = cuahangByCode.get(trimmed);
        setFormData((prev) => ({
          ...prev,
          maCH: value,
          tenCH: matched ? matched.tenCH : "",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [cuahangByCode, suggestions.length]
  );

  const selectSuggest = useCallback((ch) => {
    setFormData((prev) => ({ ...prev, maCH: ch.maCH, tenCH: ch.tenCH }));
    setShowSuggest(false);
    setActiveIndex(-1);
    setErrors((e) => ({ ...e, maCH: undefined }));
  }, []);

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

  const handleSubmit = useCallback(async () => {
    const errs = {};
    const matched = cuahangByCode.get(formData.maCH.trim());
    if (!matched) errs.maCH = "Mã cửa hàng không tồn tại";
    if (!formData.ngayRotKien) errs.ngayRotKien = "Vui lòng chọn ngày";

    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error("❌ Vui lòng kiểm tra lại thông tin bắt buộc!");
      return;
    }

    try {
      await rotKienService.createRotKien({ ...formData, trangThai: false });

      setOpen(false);
      setFormData({
        maCH: "",
        tenCH: "",
        soKienRot: "",
        soSoda: "",
        ngayRotKien: toDateInputValue(), // reset về hôm nay
        ghiChu: "",
      });
      setShowSuggest(false);
      setActiveIndex(-1);
      setErrors({});

      const list = await rotKienService.getAllRotKien();
      setData(list || []);
      toast.success("✅ Thêm kiện thành công!");
    } catch (err) {
      console.error("Lỗi tạo kiện:", err);
      toast.error("❌ Lỗi tạo kiện ");
    }
  }, [cuahangByCode, formData]);

  const handleClearFilter = useCallback(() => {
    setSearchMaCH("");
    setFilterNgayRotKien("");
  }, []);

  // ===== Excel helpers =====
  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  const mapRowsForExcel = (rows) =>
    rows.map((item, i) => ({
      STT: i + 1,
      "Mã CH": item?.maCH || "",
      "Tên CH": item?.tenCH || "",
      "Số kiện": item?.soKienRot ?? "",
      "Số soda - hóa đơn": item?.soSoda ?? "",
      "Ngày cập nhập": item?.ngayRotKien
        ? new Date(item.ngayRotKien).toLocaleDateString("vi-VN")
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

    // Header style
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.alignment = { vertical: "middle", horizontal: "center" };
    header.height = 22;
    header.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F2937" },
      }; // slate-800
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    // Body style
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
      {/* Tiêu đề */}
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

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) {
              setFormData((prev) => ({
                ...prev,
                ngayRotKien: prev.ngayRotKien || toDateInputValue(),
              }));
              setErrors({});
            } else {
              setShowSuggest(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="default">➕ Thêm kiện</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[600px] text-[15px] md:text-base">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Thêm thông tin kiện
              </DialogTitle>
              <p className="mt-1 text-sm text-slate-600">
                <span className="text-rose-600 font-semibold">*</span> Mã CH và
                Ngày cập nhập là bắt buộc.
              </p>
            </DialogHeader>

            <div className="grid gap-5 py-2">
              {/* Mã CH + Gợi ý */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Mã cửa hàng <span className="text-rose-600">*</span>
                </label>

                <div className="relative">
                  <Input
                    name="maCH"
                    placeholder="VD: 2001 / CH00123 (gõ ≥ 3 ký tự để gợi ý)"
                    value={formData.maCH}
                    onChange={handleChange}
                    onFocus={() =>
                      setShowSuggest(formData.maCH.trim().length >= 3)
                    }
                    onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
                    onKeyDown={(e) => {
                      if (!showSuggest || !suggestions.length) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveIndex((i) =>
                          Math.min(i + 1, suggestions.length - 1)
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter") {
                        if (activeIndex >= 0) {
                          e.preventDefault();
                          selectSuggest(suggestions[activeIndex]);
                        }
                      } else if (e.key === "Escape") {
                        setShowSuggest(false);
                      }
                    }}
                    className={[
                      "h-11 text-[15px] text-slate-900 placeholder:text-slate-400",
                      errors.maCH ? "border-rose-500 ring-2 ring-rose-500" : "",
                    ].join(" ")}
                  />

                  {/* Dropdown gợi ý */}
                  {showSuggest && (
                    <div className="absolute left-0 right-0 mt-1 z-[60] rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 overflow-auto">
                      {suggestions.length ? (
                        suggestions.map((ch, idx) => (
                          <button
                            key={ch.maCH}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectSuggest(ch)}
                            className={[
                              "w-full flex items-center gap-2 px-3 py-2 text-left",
                              idx === activeIndex
                                ? "bg-sky-50"
                                : "hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <span className="inline-flex items-center font-mono text-xs rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700">
                              {ch.maCH}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {ch.tenCH}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-500">
                          Không tìm thấy cửa hàng phù hợp
                        </div>
                      )}
                      <div className="sticky bottom-0 border-t bg-slate-50 px-3 py-1 text-[11px] text-slate-500">
                        Mẹo: dùng ↑/↓ để chọn, Enter để xác nhận
                      </div>
                    </div>
                  )}
                </div>

                {errors.maCH && (
                  <p className="text-sm text-rose-600">{errors.maCH}</p>
                )}
                <p className="text-xs md:text-sm text-slate-600">
                  Nhập đúng mã, tên cửa hàng sẽ tự điền.
                </p>
              </div>

              {/* Tên CH (tự fill) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Tên cửa hàng
                </label>
                <Input
                  name="tenCH"
                  placeholder="Tự động điền từ mã CH"
                  value={formData.tenCH}
                  readOnly
                  className="h-11 text-[15px] text-slate-900 bg-slate-50 font-bold tracking-wide"
                />
              </div>

              {/* Số & Ngày */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Số kiện
                  </label>
                  <Input
                    name="soKienRot"
                    placeholder="0"
                    type="number"
                    value={formData.soKienRot}
                    onChange={handleChange}
                    className="h-11 text-[15px] text-right tabular-nums text-slate-900 placeholder:text-slate-400"
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Số soda - hóa đơn
                  </label>
                  <Input
                    name="soSoda"
                    placeholder="0"
                    value={formData.soSoda}
                    onChange={handleChange}
                    className="h-11 text-[15px] text-right tabular-nums text-slate-900 placeholder:text-slate-400"
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Ngày cập nhập <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    name="ngayRotKien"
                    type="date"
                    value={formData.ngayRotKien}
                    onChange={handleChange}
                    max={toDateInputValue()} // khoá tương lai (xoá nếu muốn cho phép)
                    className={[
                      "h-11 text-[15px] text-slate-900",
                      errors.ngayRotKien
                        ? "border-rose-500 ring-2 ring-rose-500"
                        : "",
                    ].join(" ")}
                  />
                  {errors.ngayRotKien && (
                    <p className="text-sm text-rose-600">
                      {errors.ngayRotKien}
                    </p>
                  )}
                </div>
              </div>

              {/* Ghi chú */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Ghi chú
                </label>
                <Textarea
                  name="ghiChu"
                  placeholder="Ví dụ: khi bốc dỡ, đã xử lý..."
                  value={formData.ghiChu}
                  onChange={handleChange}
                  className="min-h-[110px] text-[15px] text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 px-5 text-[15px] font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                className="h-11 px-6 text-[15px] font-semibold"
              >
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <th className="px-4 py-3 font-semibold">NGÀY CẬP NHẬP</th>
                <th className="px-4 py-3 font-semibold">GHI CHÚ</th>
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
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <KienHT data={filteredDataDaHT} onUncomplete={handleUncomplete} />
      )}
    </div>
  );
};

export default ToolRotKien;
