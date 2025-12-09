/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback, useRef } from "react";
import { productService } from "@/services/dieuvan/product.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import CustomPagination from "@/components/ui/customPagination";
import ExcelProductActions from "./excel";

const useDebouncedValue = (value, delay = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const TableSKU = ({ onBack }) => {
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchSKU, setSearchSKU] = useState("");
  const debouncedSearchSKU = useDebouncedValue(searchSKU, 200);
  
  const pageSize = 50; // Backend mặc định
  const [page, setPage] = useState(0);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formProduct, setFormProduct] = useState({ sku: "", tenHang: "", upc: "" });

  const loadedRef = useRef(false);
  
  // Load products với phân trang
  const loadProducts = useCallback(async (currentPage = 1, search = "") => {
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
      };
      
      if (search) {
        params.search = search;
      }
      
      const response = await productService.getAllProducts(params);
      
      if (response.data) {
        setProducts(response.data);
        setTotalProducts(response.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setProducts([]);
      setTotalProducts(0);
    }
  }, [pageSize]);

  // Load lần đầu
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadProducts(1, "");
  }, [loadProducts]);

  // Khi search thay đổi, load lại từ trang 1
  useEffect(() => {
    setPage(0);
    loadProducts(1, debouncedSearchSKU);
  }, [debouncedSearchSKU, loadProducts]);

  // Khi chuyển trang
  const handlePageChange = useCallback(({ selected }) => {
    setPage(selected);
    loadProducts(selected + 1, debouncedSearchSKU);
  }, [debouncedSearchSKU, loadProducts]);

  const pageCount = Math.ceil(totalProducts / pageSize);

  const handleCreateProduct = useCallback(async () => {
    if (!formProduct.sku || !formProduct.tenHang) {
      toast.error("Vui lòng nhập đầy đủ Mã SKU và Tên hàng!");
      return;
    }
    
    // Chỉ kiểm tra trùng UPC (nếu có)
    if (formProduct.upc) {
      const existsUPC = products.find(p => String(p.upc) === String(formProduct.upc).trim());
      if (existsUPC) {
        toast.error("❌ Mã UPC đã tồn tại!");
        return;
      }
    }
    
    try {
      const payload = {
        sku: Number(formProduct.sku),
        tenHang: formProduct.tenHang.trim()
      };
      
      if (formProduct.upc) {
        payload.upc = formProduct.upc.trim();
      }
      
      await productService.createProduct(payload);
      await loadProducts(page + 1, debouncedSearchSKU); // Reload trang hiện tại
      setFormProduct({ sku: "", tenHang: "", upc: "" });
      setShowAddProduct(false);
      toast.success("✅ Thêm sản phẩm thành công!");
    } catch (err) {
      console.error("Lỗi tạo sản phẩm:", err);
      const errMsg = err?.response?.data?.message || err?.message || "❌ Lỗi tạo sản phẩm";
      toast.error(errMsg);
    }
  }, [formProduct, products, page, debouncedSearchSKU, loadProducts]);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setFormProduct({ 
      sku: product.sku, 
      tenHang: product.tenHang,
      upc: product.upc || ""
    });
    setShowEditProduct(true);
  }, []);

  const handleUpdateProduct = useCallback(async () => {
    if (!formProduct.tenHang) {
      toast.error("Vui lòng nhập tên hàng!");
      return;
    }
    
    if (formProduct.upc && formProduct.upc !== editingProduct.upc) {
      const existsUPC = products.find(
        p => p._id !== editingProduct._id && String(p.upc) === String(formProduct.upc).trim()
      );
      if (existsUPC) {
        toast.error("❌ Mã UPC đã tồn tại!");
        return;
      }
    }
    
    try {
      const payload = {
        tenHang: formProduct.tenHang.trim()
      };
      
      if (formProduct.upc) {
        payload.upc = formProduct.upc.trim();
      }
      
      await productService.updateProduct(editingProduct._id, payload);
      await loadProducts(page + 1, debouncedSearchSKU);
      setFormProduct({ sku: "", tenHang: "", upc: "" });
      setEditingProduct(null);
      setShowEditProduct(false);
      toast.success("✅ Cập nhật sản phẩm thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật sản phẩm:", err);
      const errMsg = err?.response?.data?.message || "❌ Lỗi cập nhật sản phẩm";
      toast.error(errMsg);
    }
  }, [formProduct, editingProduct, products, page, debouncedSearchSKU, loadProducts]);

  const handleDeleteProduct = useCallback(async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    try {
      await productService.deleteProduct(id);
      await loadProducts(page + 1, debouncedSearchSKU);
      toast.success("✅ Xóa sản phẩm thành công!");
    } catch (err) {
      console.error("Lỗi xóa sản phẩm:", err);
      toast.error("❌ Lỗi xóa sản phẩm");
    }
  }, [page, debouncedSearchSKU, loadProducts]);

  // Handle Import Excel
  const handleImportExcel = useCallback(async (importedProducts) => {
    try {
      console.log("📤 Đang gửi:", importedProducts.length, "sản phẩm");
      
      const result = await productService.createManyProducts(importedProducts);
      
      console.log("📥 Kết quả từ server:", result);
      
      // Reload trang 1
      await loadProducts(1, debouncedSearchSKU);
      setPage(0);

      // Hiển thị kết quả
      if (result.partial) {
        toast.success(
          `✅ Import thành công ${result.insertedCount} sản phẩm. Bỏ qua ${result.duplicateCount} sản phẩm trùng lặp.`,
          { autoClose: 4000 }
        );
      } else {
        toast.success(
          `✅ Import thành công ${result.insertedCount || importedProducts.length} sản phẩm!`,
          { autoClose: 3000 }
        );
      }
    } catch (err) {
      console.error("Lỗi import:", err);
      const errMsg = err?.response?.data?.message || "❌ Lỗi import sản phẩm";
      const existingUPCs = err?.response?.data?.existingUPCs;
      
      if (existingUPCs && existingUPCs.length > 0) {
        toast.error(
          <div>
            <div className="font-bold">Một số UPC đã tồn tại:</div>
            {existingUPCs.slice(0, 5).map((upc, i) => (
              <div key={i} className="text-xs">{upc}</div>
            ))}
            {existingUPCs.length > 5 && <div className="text-xs">... và {existingUPCs.length - 5} UPC khác</div>}
          </div>,
          { autoClose: 5000 }
        );
      } else {
        toast.error(errMsg);
      }
    }
  }, [debouncedSearchSKU, loadProducts]);

  return (
    <div className="px-4 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={onBack} variant="outline">
          ← Quay lại
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">QUẢN LÝ SẢN PHẨM (SKU)</h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <Input
          type="text"
          placeholder="🔍 Tìm mã SKU, UPC hoặc tên hàng..."
          value={searchSKU}
          onChange={(e) => setSearchSKU(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button variant="secondary" onClick={() => setSearchSKU("")}>
          🧹 Xóa bộ lọc
        </Button>
        
        {/* Excel Actions Component */}
        <ExcelProductActions 
          data={products} // Chỉ export trang hiện tại hoặc có thể fetch all
          onImport={handleImportExcel}
        />
        
        <Button onClick={() => setShowAddProduct(true)} className="bg-blue-600 text-white hover:bg-blue-700">
          ➕ Thêm sản phẩm
        </Button>
      </div>

      <div className="overflow-x-auto shadow border rounded">
        <table className="w-full text-sm text-left bg-white">
          <thead className="text-xs bg-gray-50 border-b text-center">
            <tr>
              <th className="px-4 py-3 font-semibold">STT</th>
              <th className="px-4 py-3 font-semibold">MÃ SKU</th>
              <th className="px-4 py-3 font-semibold">TÊN HÀNG</th>
              <th className="px-4 py-3 font-semibold">UPC</th>
              <th className="px-4 py-3 font-semibold">HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-5 text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              products.map((item, index) => (
                <tr key={item._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">{page * pageSize + index + 1}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.sku}</td>
                  <td className="px-4 py-3">{item.tenHang}</td>
                  <td className="px-4 py-3 text-center font-mono text-gray-600">
                    {item.upc || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditProduct(item)}
                      >
                        ✏️ Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteProduct(item._id)}
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
          onPageChange={handlePageChange}
          marginPagesDisplayed={2}
          pageRangeDisplayed={3}
        />
      </div>

      {/* Hiển thị thông tin phân trang */}
      <div className="mt-2 text-center text-sm text-gray-600">
        Hiển thị {products.length} / {totalProducts.toLocaleString()} sản phẩm
      </div>

      {/* Dialog Thêm Sản Phẩm */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Thêm sản phẩm mới</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Mã SKU *</label>
                <Input
                  type="number"
                  placeholder="Nhập mã SKU (số)"
                  value={formProduct.sku}
                  onChange={(e) => setFormProduct({ ...formProduct, sku: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên hàng *</label>
                <Input
                  type="text"
                  placeholder="Nhập tên hàng"
                  value={formProduct.tenHang}
                  onChange={(e) => setFormProduct({ ...formProduct, tenHang: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">UPC (không bắt buộc)</label>
                <Input
                  type="text"
                  placeholder="Nhập mã UPC"
                  value={formProduct.upc}
                  onChange={(e) => setFormProduct({ ...formProduct, upc: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">UPC phải là duy nhất nếu nhập</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreateProduct} className="flex-1">Thêm</Button>
              <Button variant="outline" onClick={() => {
                setShowAddProduct(false);
                setFormProduct({ sku: "", tenHang: "", upc: "" });
              }} className="flex-1">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Sửa Sản Phẩm */}
      {showEditProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Sửa sản phẩm</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Mã SKU</label>
                <Input
                  type="number"
                  value={formProduct.sku}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Không thể thay đổi mã SKU</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên hàng *</label>
                <Input
                  type="text"
                  placeholder="Nhập tên hàng"
                  value={formProduct.tenHang}
                  onChange={(e) => setFormProduct({ ...formProduct, tenHang: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">UPC</label>
                <Input
                  type="text"
                  placeholder="Nhập mã UPC"
                  value={formProduct.upc}
                  onChange={(e) => setFormProduct({ ...formProduct, upc: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">UPC phải là duy nhất nếu nhập</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleUpdateProduct} className="flex-1">Cập nhật</Button>
              <Button variant="outline" onClick={() => {
                setShowEditProduct(false);
                setEditingProduct(null);
                setFormProduct({ sku: "", tenHang: "", upc: "" });
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

export default TableSKU;