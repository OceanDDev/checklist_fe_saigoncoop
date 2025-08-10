import { useEffect, useState } from "react";
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

const ToolRotKien = () => {
  const [viewMode, setViewMode] = useState("chua");
  const [data, setData] = useState([]);
  const [cuahangs, setCuahangs] = useState([]);
  const [open, setOpen] = useState(false);

  const [searchMaCH, setSearchMaCH] = useState("");
  const [filterNgayRotKien, setFilterNgayRotKien] = useState("");

  const [formData, setFormData] = useState({
    maCH: "",
    tenCH: "",
    soKienRot: "",
    soSoda: "",
    ngayRotKien: "",
    ghiChu: "",
  });

  // --- GỢI Ý MÃ CỬA HÀNG ---
  const [suggests, setSuggests] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const buildSuggests = (q) => {
    const key = q.trim().toLowerCase();
    if (key.length >= 3) {
      const list = cuahangs
        .filter((ch) => ch.maCH.toLowerCase().includes(key))
        .slice(0, 12);
      setSuggests(list);
      setShowSuggest(true);
      setActiveIndex(list.length ? 0 : -1);
    } else {
      setSuggests([]);
      setShowSuggest(false);
      setActiveIndex(-1);
    }
  };

  const selectSuggest = (ch) => {
    setFormData((prev) => ({ ...prev, maCH: ch.maCH, tenCH: ch.tenCH }));
    setShowSuggest(false);
    setActiveIndex(-1);
  };
  // --- /GỢI Ý ---

  const filteredDataChuaHT = data
    .filter((item) => !item.trangThai)
    .filter(
      (item) =>
        item.maCH.toLowerCase().includes(searchMaCH.toLowerCase()) &&
        (!filterNgayRotKien ||
          item.ngayRotKien?.slice(0, 10) === filterNgayRotKien)
    );

  const filteredDataDaHT = data
    .filter((item) => item.trangThai)
    .filter(
      (item) =>
        item.maCH.toLowerCase().includes(searchMaCH.toLowerCase()) &&
        (!filterNgayRotKien ||
          item.ngayRotKien?.slice(0, 10) === filterNgayRotKien)
    );

  useEffect(() => {
    fetchData();
    fetchCuahangs();
  }, []);

  const fetchData = async () => {
    try {
      const res = await rotKienService.getAllRotKien();
      setData(res);
    } catch (err) {
      console.error("Lỗi khi fetch RotKien:", err);
    }
  };

  const fetchCuahangs = async () => {
    try {
      const res = await cuaHangService.getAllCuaHang();
      setCuahangs(res);
    } catch (err) {
      console.error("Lỗi khi fetch cửa hàng:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "maCH") {
      // Gợi ý theo 3 ký tự
      buildSuggests(value);

      const matched = cuahangs.find((ch) => ch.maCH === value.trim());
      setFormData((prev) => ({
        ...prev,
        maCH: value,
        tenCH: matched ? matched.tenCH : "",
      }));
      // Không warn khi đang gõ để tránh ồn; kiểm tra khi submit
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa mục này?")) return;
    try {
      await rotKienService.deleteRotKienById(id);
      fetchData();
    } catch (err) {
      console.error("Lỗi khi xóa kiện rớt:", err);
    }
  };

  const handleComplete = async (id) => {
    try {
      await rotKienService.updateRotKien(id, { trangThai: true });
      fetchData();
    } catch (error) {
      console.error("Cập nhật trạng thái thất bại:", error);
    }
  };

  const handleUncomplete = async (id) => {
    try {
      await rotKienService.updateRotKien(id, { trangThai: false });
      fetchData();
    } catch (error) {
      console.error("Hoàn tác trạng thái thất bại:", error);
    }
  };

  const handleSubmit = async () => {
    const matched = cuahangs.find((ch) => ch.maCH === formData.maCH.trim());
    if (!matched) {
      toast.error("❌ Mã cửa hàng không tồn tại!");
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
        ngayRotKien: "",
        ghiChu: "",
      });
      setSuggests([]);
      setShowSuggest(false);
      setActiveIndex(-1);
      fetchData();
      toast.success("✅ Thêm kiện rớt thành công!");
    } catch (err) {
      console.error("Lỗi tạo kiện rớt:", err);
      toast.error("❌ Lỗi tạo kiện rớt");
    }
  };

  const handleClearFilter = () => {
    setSearchMaCH("");
    setFilterNgayRotKien("");
  };

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Tiêu đề */}
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">
        TOOL RỚT KIỆN
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

      {/* Bộ lọc và thêm */}
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

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowSuggest(false); } }}>
          <DialogTrigger asChild>
            <Button variant="default">➕ Thêm kiện rớt</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] text-[15px] md:text-base">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Thêm thông tin kiện rớt
              </DialogTitle>
              <p className="mt-1 text-sm text-slate-600">
                <span className="text-rose-600 font-semibold">*</span> Mã CH và Ngày rớt kiện là bắt buộc.
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
                    onFocus={() => buildSuggests(formData.maCH)}
                    onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
                    onKeyDown={(e) => {
                      if (!showSuggest || !suggests.length) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.min(i + 1, suggests.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter") {
                        if (activeIndex >= 0) {
                          e.preventDefault();
                          selectSuggest(suggests[activeIndex]);
                        }
                      } else if (e.key === "Escape") {
                        setShowSuggest(false);
                      }
                    }}
                    className="h-11 text-[15px] text-slate-900 placeholder:text-slate-400"
                  />

                  {/* Dropdown gợi ý */}
                  {showSuggest && (
                    <div className="absolute left-0 right-0 mt-1 z-[60] rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 overflow-auto">
                      {suggests.length ? (
                        suggests.map((ch, idx) => (
                          <button
                            key={ch.maCH}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectSuggest(ch)}
                            className={[
                              "w-full flex items-center gap-2 px-3 py-2 text-left",
                              idx === activeIndex ? "bg-sky-50" : "hover:bg-slate-50",
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

                <p className="text-xs md:text-sm text-slate-600">
                  Nhập đúng mã, tên cửa hàng sẽ tự điền.
                </p>
              </div>

              {/* Tên CH (tự fill) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Tên cửa hàng</label>
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
                  <label className="text-sm font-semibold text-slate-800">Số kiện rớt</label>
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
                  <label className="text-sm font-semibold text-slate-800">Số soda</label>
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
                    Ngày rớt kiện <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    name="ngayRotKien"
                    type="date"
                    value={formData.ngayRotKien}
                    onChange={handleChange}
                    className="h-11 text-[15px] text-slate-900"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Ghi chú</label>
                <Textarea
                  name="ghiChu"
                  placeholder="Ví dụ: rớt khi bốc dỡ, đã xử lý..."
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
              <Button onClick={handleSubmit} className="h-11 px-6 text-[15px] font-semibold">
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
                <th className="px-4 py-3 font-semibold">Mã CH</th>
                <th className="px-4 py-3 font-semibold">Tên CH</th>
                <th className="px-4 py-3 font-semibold">Số kiện rớt</th>
                <th className="px-4 py-3 font-semibold">Số soda</th>
                <th className="px-4 py-3 font-semibold">Ngày rớt kiện</th>
                <th className="px-4 py-3 font-semibold">Ghi chú</th>
                <th className="px-4 py-3 font-semibold">Chức năng</th>
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
                    onDelete={handleDelete}
                    onComplete={handleComplete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <KienHT
          data={filteredDataDaHT}
          onDelete={handleDelete}
          onUncomplete={handleUncomplete}
        />
      )}
    </div>
  );
};

export default ToolRotKien;
