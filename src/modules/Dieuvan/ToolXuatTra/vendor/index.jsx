/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { vendorService } from "@/services/dieuvan/vendor.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import CustomPagination from "@/components/ui/customPagination";
import ExcelVendorActions from "./excel";

const unwrapArray = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
};

const useDebouncedValue = (value, delay = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const TableVendor = ({ onBack }) => {
  const [vendors, setVendors] = useState([]);
  const [searchVendor, setSearchVendor] = useState("");
  const debouncedSearchVendor = useDebouncedValue(searchVendor, 200);
  
  const pageSize = 10;
  const [page, setPage] = useState(0);

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showEditVendor, setShowEditVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formVendor, setFormVendor] = useState({ vendor: "", vendorName: "", sku: "" });

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const vend = await vendorService.getAllVendors();
        setVendors(unwrapArray(vend));
      } catch (err) {
        console.error("Fetch error:", err);
        setVendors([]);
      }
    })();
  }, []);

  const filteredVendors = useMemo(() => {
    const q = (debouncedSearchVendor || "").toLowerCase();
    return vendors.filter((item) => {
      const matchCode = (item?.vendor || "").toLowerCase().includes(q);
      const matchName = (item?.vendorName || "").toLowerCase().includes(q);
      const matchSku = (item?.sku || "").toLowerCase().includes(q);
      return matchCode || matchName || matchSku;
    });
  }, [vendors, debouncedSearchVendor]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearchVendor]);

  const pageCount = Math.max(0, Math.ceil(filteredVendors.length / pageSize));

  const currentSlice = useMemo(() => {
    const start = page * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, page]);

  const handleCreateVendor = useCallback(async () => {
    if (!formVendor.vendor || !formVendor.vendorName || !formVendor.sku) {
      toast.error("Vui lòng nhập đầy đủ Mã Vendor, Tên Vendor và SKU!");
      return;
    }

    // Kiểm tra trùng mã vendor
    const exists = vendors.find(v => v.vendor === formVendor.vendor);
    if (exists) {
      toast.error("❌ Mã Vendor đã tồn tại!");
      return;
    }

    try {
      await vendorService.createVendor(formVendor);
      const list = await vendorService.getAllVendors();
      setVendors(unwrapArray(list));
      setFormVendor({ vendor: "", vendorName: "", sku: "" });
      setShowAddVendor(false);
      toast.success("✅ Thêm vendor thành công!");
    } catch (err) {
      console.error("Lỗi tạo vendor:", err);
      toast.error(err?.response?.data?.message || "❌ Lỗi tạo vendor");
    }
  }, [formVendor, vendors]);

  const handleEditVendor = useCallback((vendor) => {
    setEditingVendor(vendor);
    setFormVendor({
      vendor: vendor.vendor,
      vendorName: vendor.vendorName,
      sku: vendor.sku || ""
    });
    setShowEditVendor(true);
  }, []);

  const handleUpdateVendor = useCallback(async () => {
    if (!formVendor.vendorName || !formVendor.sku) {
      toast.error("Vui lòng nhập đầy đủ tên vendor và SKU!");
      return;
    }

    try {
      const payload = {
        vendorName: formVendor.vendorName.trim(),
        sku: formVendor.sku.trim()
      };
      await vendorService.updateVendor(editingVendor._id, payload);
      const list = await vendorService.getAllVendors();
      setVendors(unwrapArray(list));
      setFormVendor({ vendor: "", vendorName: "", sku: "" });
      setEditingVendor(null);
      setShowEditVendor(false);
      toast.success("✅ Cập nhật vendor thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật vendor:", err);
      toast.error("❌ Lỗi cập nhật vendor");
    }
  }, [formVendor, editingVendor]);

  const handleDeleteVendor = useCallback(async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa vendor này?")) return;
    try {
      await vendorService.deleteVendor(id);
      const list = await vendorService.getAllVendors();
      setVendors(unwrapArray(list));
      toast.success("✅ Xóa vendor thành công!");
    } catch (err) {
      console.error("Lỗi xóa vendor:", err);
      toast.error("❌ Lỗi xóa vendor");
    }
  }, []);

  // Handle Import Excel
  const handleImportExcel = useCallback(async (importedVendors) => {
    try {
      // Lấy danh sách mã vendor hiện tại
      const existingVendorCodes = new Set(vendors.map(v => v.vendor));
      
      // Lọc vendor mới (chưa tồn tại)
      const newVendors = importedVendors.filter(
        v => !existingVendorCodes.has(v.vendor)
      );
      
      // Vendor trùng
      const duplicates = importedVendors.filter(
        v => existingVendorCodes.has(v.vendor)
      );

      if (newVendors.length === 0) {
        toast.warning("⚠️ Tất cả vendor đã tồn tại!");
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const errors = [];

      // Thử bulk create trước
      try {
        await vendorService.createManyVendors(newVendors);
        successCount = newVendors.length;
      } catch (bulkErr) {
        // Nếu bulk fail, thử insert từng cái một
        console.warn("Bulk insert failed, trying one by one:", bulkErr);
        
        for (const vendor of newVendors) {
          try {
            await vendorService.createVendor(vendor);
            successCount++;
          } catch (singleErr) {
            failCount++;
            const isDuplicate = singleErr?.response?.data?.error?.code === 11000;
            if (!isDuplicate) {
              errors.push(`${vendor.vendor}: ${singleErr?.response?.data?.message || "Lỗi không xác định"}`);
            }
          }
        }
      }
      
      // Refresh danh sách
      const list = await vendorService.getAllVendors();
      setVendors(unwrapArray(list));

      // Thông báo kết quả
      if (successCount > 0) {
        const parts = [`✅ Thêm ${successCount} vendor`];
        if (duplicates.length > 0) parts.push(`Bỏ qua ${duplicates.length} vendor trùng`);
        if (failCount > 0) parts.push(`${failCount} vendor lỗi`);
        toast.success(parts.join(". "), { autoClose: 3000 });
      }

      if (errors.length > 0) {
        toast.error(
          <div>
            <div className="font-bold">Một số vendor gặp lỗi:</div>
            {errors.slice(0, 3).map((err, i) => (
              <div key={i} className="text-xs">{err}</div>
            ))}
            {errors.length > 3 && <div className="text-xs">... và {errors.length - 3} lỗi khác</div>}
          </div>,
          { autoClose: 5000 }
        );
      }
    } catch (err) {
      console.error("Lỗi import:", err);
      toast.error(err?.response?.data?.message || "❌ Lỗi import vendor");
    }
  }, [vendors]);

  return (
    <div className="px-4 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={onBack} variant="outline">
          ← Quay lại
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">QUẢN LÝ VENDOR</h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <Input
          type="text"
          placeholder="🔍 Tìm mã vendor, tên hoặc SKU..."
          value={searchVendor}
          onChange={(e) => setSearchVendor(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button variant="secondary" onClick={() => setSearchVendor("")}>
          🧹 Xóa bộ lọc
        </Button>
        
        {/* Excel Actions Component */}
        <ExcelVendorActions 
          data={filteredVendors} 
          onImport={handleImportExcel}
        />
        
        <Button onClick={() => setShowAddVendor(true)} className="bg-blue-600 text-white hover:bg-blue-700">
          ➕ Thêm Vendor
        </Button>
      </div>

      <div className="overflow-x-auto shadow border rounded">
        <table className="w-full text-sm text-left bg-white">
          <thead className="text-xs bg-gray-50 border-b text-center">
            <tr>
              <th className="px-4 py-3 font-semibold">STT</th>
              <th className="px-4 py-3 font-semibold">MÃ VENDOR</th>
              <th className="px-4 py-3 font-semibold">TÊN VENDOR</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody>
            {currentSlice.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-5 text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              currentSlice.map((item, index) => (
                <tr key={item._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">{page * pageSize + index + 1}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.vendor}</td>
                  <td className="px-4 py-3">{item.vendorName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center font-mono text-[11px] rounded border bg-blue-50 border-blue-200 px-1.5 py-0.5 text-blue-700">
                      {item.sku || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditVendor(item)}
                      >
                        ✏️ Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteVendor(item._id)}
                      >
                        🗑️ Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-center">
        <CustomPagination
          pageCount={pageCount}
          forcePage={page}
          onPageChange={({ selected }) => setPage(selected)}
          marginPagesDisplayed={2}
          pageRangeDisplayed={3}
        />
      </div>

      {/* Dialog Thêm Vendor */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Thêm vendor mới</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Mã Vendor *</label>
                <Input
                  type="text"
                  placeholder="Nhập mã vendor"
                  value={formVendor.vendor}
                  onChange={(e) => setFormVendor({ ...formVendor, vendor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên Vendor *</label>
                <Input
                  type="text"
                  placeholder="Nhập tên vendor"
                  value={formVendor.vendorName}
                  onChange={(e) => setFormVendor({ ...formVendor, vendorName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SKU *</label>
                <Input
                  type="text"
                  placeholder="Nhập SKU"
                  value={formVendor.sku}
                  onChange={(e) => setFormVendor({ ...formVendor, sku: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreateVendor} className="flex-1">Thêm</Button>
              <Button variant="outline" onClick={() => {
                setShowAddVendor(false);
                setFormVendor({ vendor: "", vendorName: "", sku: "" });
              }} className="flex-1">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Sửa Vendor */}
      {showEditVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Sửa vendor</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Mã Vendor</label>
                <Input
                  type="text"
                  value={formVendor.vendor}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Không thể thay đổi mã vendor</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên Vendor *</label>
                <Input
                  type="text"
                  placeholder="Nhập tên vendor"
                  value={formVendor.vendorName}
                  onChange={(e) => setFormVendor({ ...formVendor, vendorName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SKU *</label>
                <Input
                  type="text"
                  placeholder="Nhập SKU"
                  value={formVendor.sku}
                  onChange={(e) => setFormVendor({ ...formVendor, sku: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleUpdateVendor} className="flex-1">Cập nhật</Button>
              <Button variant="outline" onClick={() => {
                setShowEditVendor(false);
                setEditingVendor(null);
                setFormVendor({ vendor: "", vendorName: "", sku: "" });
              }} className="flex-1">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableVendor;