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
      const matched = cuahangs.find((ch) => ch.maCH === value.trim());
      setFormData((prev) => ({
        ...prev,
        maCH: value,
        tenCH: matched ? matched.tenCH : "",
      }));
      if (!matched && value.trim()) {
        toast.warn("⚠️ Mã cửa hàng không tồn tại");
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="default">➕ Thêm kiện rớt</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Thêm thông tin kiện rớt</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <Input
                name="maCH"
                placeholder="Mã cửa hàng"
                value={formData.maCH}
                onChange={handleChange}
              />
              <Input
                name="tenCH"
                placeholder="Tên cửa hàng"
                value={formData.tenCH}
                onChange={handleChange}
                disabled
              />
              <Input
                name="soKienRot"
                placeholder="Số kiện rớt"
                type="number"
                value={formData.soKienRot}
                onChange={handleChange}
              />
              <Input
                name="soSoda"
                placeholder="Số soda"
                value={formData.soSoda}
                onChange={handleChange}
              />
              <Input
                name="ngayRotKien"
                type="date"
                value={formData.ngayRotKien}
                onChange={handleChange}
              />
              <Textarea
                name="ghiChu"
                placeholder="Ghi chú"
                value={formData.ghiChu}
                onChange={handleChange}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSubmit}>Lưu</Button>
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
