import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { productService } from "@/services/dieuvan/product.service";
import { tonKhoService } from "@/services/tonkho.service";
import { toast } from "react-toastify";
import {
  ScanBarcode,
  Search,
  CameraOff,
  MapPin,
  RefreshCw,
  Layers,
  Package,
  Info,
  History,
  Store,
  Tag,
} from "lucide-react";

const ProductLookupMobile = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [product, setProduct] = useState(null);
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const videoRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  // ==========================================
  // LOGIC TRUY VẤN DỮ LIỆU
  // ==========================================
  const handleSearch = async (code) => {
    if (!code || loading) return;
    setLoading(true);
    setProduct(null);
    setInventoryList([]);

    try {
      // 1. Tìm thông tin sản phẩm (Lấy SKU)
      let productInfo = await productService.getProductByUPC(code);
      if (!productInfo)
        productInfo = await productService.getProductBySKU(code);

      if (productInfo) {
        setProduct(productInfo);
        setSearchTerm(code);
        stopScanner();

        // 2. Lấy danh sách tồn kho theo SKU (Hỗ trợ nhiều vị trí)
        const res = await tonKhoService.getTonKhoBySku(productInfo.sku);
        const list = Array.isArray(res) ? res : res ? [res] : [];
        setInventoryList(list);
      } else {
        toast.warn(`Không tìm thấy mã: ${code}`);
      }
    } catch (error) {
      console.error("Search Error:", error);
      toast.error("Lỗi kết nối hệ thống");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // QUẢN LÝ CAMERA
  // ==========================================
  const startScanner = () => {
    setIsScannerOpen(true);
    setProduct(null);
    setInventoryList([]);
    setTimeout(() => {
      codeReader.current.decodeFromConstraints(
        { video: { facingMode: "environment", width: { ideal: 1280 } } },
        videoRef.current,
        (result) => result && handleSearch(result.getText()),
      );
    }, 500);
  };

  const stopScanner = () => {
    codeReader.current.reset();
    setIsScannerOpen(false);
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center font-sans antialiased text-slate-900 pb-10">
      {/* 1. PROFESSIONAL HEADER */}
      <header className="w-full max-w-5xl bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 px-4 py-4 md:rounded-b-3xl md:mt-2 md:shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-blue-200 shadow-lg">
              <ScanBarcode size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-black tracking-tight text-slate-800 uppercase leading-none">
                Inventory <span className="text-blue-600">Hub</span>
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1">
                HỆ THỐNG ĐIỀU VẬN SAIGON CO.OP
              </p>
            </div>
          </div>
          {loading && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <RefreshCw size={14} className="animate-spin text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase">
                Đang tìm...
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-4xl p-4 space-y-6 mt-2">
        {/* 2. SEARCH INTERFACE */}
        <section className="relative">
          {!isScannerOpen ? (
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSearch(searchTerm)
                  }
                  placeholder="Nhập SKU/UPC hoặc nhấn quét..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm md:text-base font-medium"
                />
              </div>
              <button
                onClick={startScanner}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                <ScanBarcode size={24} />
              </button>
            </div>
          ) : (
            /* 3. HI-TECH SCANNER VIEW */
            <div className="relative overflow-hidden rounded-[2.5rem] bg-black aspect-[4/3] md:aspect-video border-4 border-white shadow-2xl animate-in zoom-in-95 duration-300">
              <video
                ref={videoRef}
                className="w-full h-full object-cover opacity-80"
                muted
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-40 md:w-80 md:h-48 border-2 border-blue-500/50 rounded-3xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-bounce"></div>
                </div>
              </div>
              <div className="absolute bottom-6 inset-x-0 flex justify-center px-6">
                <button
                  onClick={stopScanner}
                  className="w-full max-w-xs bg-white/20 backdrop-blur-xl text-white py-3 rounded-2xl border border-white/30 flex items-center justify-center gap-2 hover:bg-red-500 transition-all"
                >
                  <CameraOff size={18} />
                  <span className="font-bold">Đóng Camera</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4. RESULT BENTO GRID */}
        {product && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* PRODUCT HEADER CARD */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1">
                    <Store size={10} /> Mặt hàng
                  </div>
                  <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1">
                    <Tag size={10} /> SKU: {product.sku}
                  </div>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-slate-800 leading-tight">
                  {product.tenHang || product.name}
                </h2>
                <p className="text-xs font-bold text-slate-400 font-mono tracking-widest uppercase">
                  UPC: {product.upc}
                </p>
              </div>
              <div className="hidden md:block p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <Info className="text-slate-300" size={40} />
              </div>
            </div>

            {/* INVENTORY LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers size={14} className="text-blue-500" />
                  Vị trí khả dụng ({inventoryList.length})
                </h3>
              </div>

              {inventoryList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventoryList.map((item, index) => (
                    <div
                      key={index}
                      className="group bg-white hover:bg-blue-600 p-5 rounded-[2.5rem] border border-slate-200 transition-all duration-300 shadow-sm flex flex-col gap-5 cursor-default"
                    >
                      {/* Top Row: Zone & Inventory */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-50 group-hover:bg-white/20 p-3 rounded-2xl transition-colors">
                            <MapPin
                              size={22}
                              className="text-blue-600 group-hover:text-white"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 group-hover:text-blue-100 font-black uppercase mb-1">
                              Khu vực / Slot
                            </p>
                            <p className="text-lg font-black text-slate-800 group-hover:text-white">
                              {item.zone}{" "}
                              <span className="text-slate-300 group-hover:text-white/40 mx-0.5">
                                /
                              </span>{" "}
                              {item.slot}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-5">
                          <div>
                            <p className="text-[10px] text-slate-400 group-hover:text-blue-100 font-black uppercase mb-1">
                              Tồn kho
                            </p>
                            <p className="text-2xl font-black text-slate-900 group-hover:text-white leading-none">
                              {item.onHand ?? 0}
                            </p>
                          </div>
                          <div className="border-l pl-4 border-slate-100 group-hover:border-white/20">
                            <p className="text-[10px] text-slate-400 group-hover:text-blue-100 font-black uppercase mb-1">
                              Pack
                            </p>
                            <p className="text-base font-black text-slate-600 group-hover:text-white leading-none">
                              {item.pack || 1}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Status & Timestamp */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 group-hover:border-white/10">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${item.onHand > 0 ? "bg-emerald-500 group-hover:bg-emerald-300 animate-pulse" : "bg-red-500 group-hover:bg-red-300"}`}
                          ></div>
                          <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-50 uppercase tracking-widest">
                            {item.onHand > 0 ? "Sẵn sàng" : "Hết hàng"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-100">
                          <History size={12} />
                          <span className="text-[10px] font-bold">
                            {item.ngay_ton
                              ? new Date(item.ngay_ton).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white py-16 rounded-[3rem] border border-dashed border-slate-300 text-center space-y-4">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Package className="text-slate-300" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Dữ liệu trống
                    </p>
                    <p className="text-xs text-slate-400 italic font-medium px-10">
                      Sản phẩm này hiện chưa được ghi nhận vị trí tồn kho trong
                      hệ thống.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="pt-6 flex justify-center">
              <button
                onClick={() => {
                  setProduct(null);
                  startScanner();
                }}
                className="group flex items-center gap-3 px-8 py-3 bg-white text-blue-600 rounded-full border-2 border-blue-50 font-black text-[10px] shadow-sm hover:shadow-md active:scale-95 transition-all uppercase tracking-widest"
              >
                <RefreshCw
                  size={14}
                  className="group-hover:rotate-180 transition-transform duration-700"
                />
                Quét mã tiếp theo
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BACKGROUND DECOR */}
      <div className="fixed -bottom-40 -left-40 w-[30rem] h-[30rem] bg-blue-100/30 rounded-full blur-[100px] -z-10"></div>
      <div className="fixed -top-40 -right-40 w-[30rem] h-[30rem] bg-indigo-100/30 rounded-full blur-[100px] -z-10"></div>
    </div>
  );
};

export default ProductLookupMobile;
