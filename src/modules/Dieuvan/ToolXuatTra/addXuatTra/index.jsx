/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { productService } from "@/services/dieuvan/product.service";
import { vendorService } from "@/services/dieuvan/vendor.service";
import { Switch } from "@/components/ui/switch";

// Helpers VN time (UTC+7)
const toVNDate = (d = new Date()) => {
  const VN_OFFSET = 7 * 60;
  const localOffset = d.getTimezoneOffset();
  const vn = new Date(d.getTime() + (VN_OFFSET + localOffset) * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${vn.getFullYear()}-${pad(vn.getMonth() + 1)}-${pad(vn.getDate())}`;
};

const nowVNTimeHHmm = (d = new Date()) => {
  const VN_OFFSET = 7 * 60;
  const localOffset = d.getTimezoneOffset();
  const vn = new Date(d.getTime() + (VN_OFFSET + localOffset) * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(vn.getHours())}:${pad(vn.getMinutes())}`;
};

const mapNameToBoPhan = (name) => {
  if (!name) return "";
  const n = name.trim().toUpperCase();
  if (n === "DIEU VAN") return "Điều Vận";
  if (n === "XU LY DON HANG") return "XLĐH";
  return name;
};

const unwrapResult = (res) => {
  if (!res) return null;
  if (res.data) return res.data;
  if (res.results) return res.results;
  return res;
};

// Độ dài tối thiểu để kích hoạt tìm kiếm UPC/SKU
const MIN_SEARCH_LENGTH = 3;

const AddXuatTraDialog = ({ cuahangs = [], onSubmit }) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Toggles để ẩn hiện các khối nhập liệu phức tạp
  const [showAdvancedInput, setShowAdvancedInput] = useState(false);
  const [showAccountingInput, setShowAccountingInput] = useState(false);

  const [formData, setFormData] = useState({
    maCH: "",
    tenCH: "",
    ngayXuatTraDate: toVNDate(),
    soSoda: "",
    ghiChu: "",

    // Các trường bổ sung từ Schema
    so: "",
    taiXe: "",
    bienSoXe: "",
    nvNhapTra: "",
    kyHieu: "",
    ngayNhapTraDate: "", // Ngày nhập trả (nếu khác ngày xuất trả)
    ngayCHTraNVCDate: "", // Ngày cửa hàng trả NVC
    soHoaDon: "",
    soTienSauThue: "",
    ngayHoaDonDate: "",
    ngayBGKeToanDate: "",
    soRTV: "",
    nvKeToanNhapTra: "",
    ngayBGXuatTraDate: "",
  });

  const [skuRows, setSkuRows] = useState([
    {
      id: Date.now(),
      upc: "",
      sku: "",
      tenHang: "",
      luong: "",
      vendor: "",
      vendorName: "",
      ngaySanXuat: "",
      hanSuDung: "",
      isLoading: false,
    },
  ]);

  const [errors, setErrors] = useState({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const cuahangByCode = useMemo(() => {
    const map = new Map();
    cuahangs.forEach((ch) => map.set((ch.maCH || "").trim(), ch));
    return map;
  }, [cuahangs]);

  const suggestions = useMemo(() => {
    const key = formData.maCH.trim().toLowerCase();
    if (key.length < 3) return [];
    return cuahangs
      .filter((ch) => (ch.maCH || "").toLowerCase().includes(key))
      .slice(0, 12);
  }, [formData.maCH, cuahangs]);

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

      // Xử lý số tiền
      if (name === "soTienSauThue") {
        const numValue = value.replace(/[^0-9]/g, ""); // Chỉ giữ lại số
        setFormData((prev) => ({ ...prev, [name]: numValue }));
        return;
      }

      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [cuahangByCode, suggestions.length]
  );

  const searchVendorBySKU = useCallback(async (sku) => {
    const trimmedSKU = String(sku).trim().toUpperCase();

    const vendorResults = await vendorService.getAllVendors({
      sku: trimmedSKU,
      limit: 10, // Lấy nhiều hơn để tìm chính xác
    });

    const vendors = Array.isArray(unwrapResult(vendorResults))
      ? unwrapResult(vendorResults)
      : [];

    // Tìm vendor có SKU khớp CHÍNH XÁC
    const exactMatch = vendors.find(
      (v) =>
        String(v.sku || "")
          .trim()
          .toUpperCase() === trimmedSKU
    );

    if (exactMatch) {
      return {
        vendor: exactMatch.vendor || "",
        vendorName: exactMatch.vendorName || "",
      };
    }

    // Nếu không tìm thấy chính xác, trả về rỗng thay vì lấy kết quả đầu tiên
    return {
      vendor: "",
      vendorName: "",
    };
  }, []);

  // --- Hàm chỉ dùng để cập nhật giá trị trong ô input (ON CHANGE) ---
  const handleSkuRowChange = useCallback((id, field, value) => {
    setSkuRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          [field]: value,
        };
      })
    );
    setErrors((prev) => ({ ...prev, [`${field}_${id}`]: undefined }));
  }, []);

  // --- Hàm dùng để tìm kiếm (ON BLUR) ---
  const handleSearchProduct = useCallback(
    async (id, field, value) => {
      // Nếu không phải UPC hoặc SKU thì bỏ qua
      if (field !== "upc" && field !== "sku") return;

      const trimmedValue = value.trim().toUpperCase();

      // 1. Kiểm tra điều kiện tìm kiếm: KHÔNG RỖNG VÀ ĐỦ ĐỘ DÀI
      if (!trimmedValue || trimmedValue.length < MIN_SEARCH_LENGTH) {
        // Nếu chuỗi rỗng hoặc quá ngắn, xóa thông tin tự động điền và tắt loading
        setSkuRows((prev) =>
          prev.map((row) => {
            if (row.id !== id) return row;
            let updateData = {
              tenHang: "",
              vendor: "",
              vendorName: "",
              isLoading: false,
            };
            if (field === "upc") updateData.sku = "";
            return { ...row, ...updateData };
          })
        );
        setErrors((prev) => ({ ...prev, [`${field}_${id}`]: undefined }));

        if (
          trimmedValue.length > 0 &&
          trimmedValue.length < MIN_SEARCH_LENGTH
        ) {
          setErrors((prev) => ({
            ...prev,
            [`${field}_${id}`]: `Mã ${field.toUpperCase()} cần ít nhất ${MIN_SEARCH_LENGTH} ký tự.`,
          }));
        }
        return;
      }

      // 2. Bật trạng thái tải (Loading)
      setSkuRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, isLoading: true } : row))
      );
      setErrors((prev) => ({ ...prev, [`${field}_${id}`]: undefined }));

      let productData = null;
      let foundSKU = null;

      try {
        if (field === "upc") {
          // TÌM BẰNG UPC -> PHẢI RA SKU
          const productResults = await productService.getProductByUPC(
            trimmedValue
          );
          productData = unwrapResult(productResults);

          if (
            productData &&
            String(productData.upc).trim().toUpperCase() === trimmedValue &&
            productData.sku
          ) {
            foundSKU = String(productData.sku).trim().toUpperCase();
          }
        } else if (field === "sku") {
          // TÌM BẰNG SKU -> KHÔNG CẦN RA UPC
          const productResults = await productService.getProductBySKU(
            trimmedValue
          );
          productData = unwrapResult(productResults);

          if (
            productData &&
            String(productData.sku).trim().toUpperCase() === trimmedValue
          ) {
            foundSKU = trimmedValue;
          }
        }

        let vendorInfo = {};

        if (foundSKU) {
          vendorInfo = await searchVendorBySKU(foundSKU);

          setSkuRows((prev) =>
            prev.map((row) => {
              if (row.id !== id) return row;

              const newUpc = field === "upc" ? trimmedValue : row.upc;

              return {
                ...row,
                isLoading: false,
                upc: newUpc,
                sku: foundSKU,
                tenHang: productData?.tenHang || "",
                vendor: vendorInfo.vendor,
                vendorName: vendorInfo.vendorName,
              };
            })
          );
        } else {
          // Xử lý không tìm thấy/không khớp
          setSkuRows((prev) =>
            prev.map((row) => {
              if (row.id !== id) return row;

              let updateData = {
                isLoading: false,
                tenHang: "",
                vendor: "",
                vendorName: "",
              };

              if (field === "upc") {
                updateData.sku = "";
              }

              return { ...row, ...updateData };
            })
          );

          setErrors((prev) => ({
            ...prev,
            [`${field}_${id}`]: `Mã ${field.toUpperCase()} không tìm thấy hoặc không khớp.`,
          }));
        }
      } catch (error) {
        console.error("❌ Error searching:", error);
        setErrors((prev) => ({
          ...prev,
          [`${field}_${id}`]: `Lỗi kết nối khi tìm kiếm ${field.toUpperCase()}.`,
        }));
        setSkuRows((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, isLoading: false } : row
          )
        );
      }
    },
    [searchVendorBySKU]
  );

  const addSkuRow = useCallback(() => {
    setSkuRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        upc: "",
        sku: "",
        tenHang: "",
        luong: "",
        vendor: "",
        vendorName: "",
        ngaySanXuat: "",
        hanSuDung: "",
        isLoading: false,
      },
    ]);
  }, []);

  const removeSkuRow = useCallback(
    (id) => {
      if (skuRows.length > 1) {
        setSkuRows((prev) => prev.filter((row) => row.id !== id));
        setErrors((prev) => {
          const newErrors = { ...prev };
          ["upc", "sku", "tenHang", "luong"].forEach((field) => {
            delete newErrors[`${field}_${id}`];
          });
          return newErrors;
        });
      }
    },
    [skuRows.length]
  );

  const selectSuggest = useCallback((ch) => {
    setFormData((prev) => ({ ...prev, maCH: ch.maCH, tenCH: ch.tenCH }));
    setShowSuggest(false);
    setActiveIndex(-1);
    setErrors((e) => ({ ...e, maCH: undefined }));
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    const matched = cuahangByCode.get(formData.maCH.trim());
    if (!matched) errs.maCH = "Mã cửa hàng không tồn tại";
    if (!formData.ngayXuatTraDate) errs.ngayXuatTraDate = "Chọn ngày xuất trả";

    // Validate các trường bắt buộc khác
    if (formData.so && !/^\d+$/.test(formData.so)) errs.so = "Số phải là số";

    skuRows.forEach((row) => {
      if (!row.isLoading && !row.sku.trim()) {
        errs[`sku_${row.id}`] = "SKU không được để trống";
      }
      if (
        !row.luong.trim() ||
        isNaN(Number(row.luong)) ||
        Number(row.luong) <= 0
      ) {
        errs[`luong_${row.id}`] = "Lượng phải là số dương";
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [cuahangByCode, formData, skuRows]);

  const handleSave = async () => {
    if (!validate()) return;

    // Đảm bảo không còn dòng nào đang loading
    if (skuRows.some((row) => row.isLoading)) {
      alert("Vui lòng đợi quá trình tìm kiếm UPC/SKU hoàn tất trước khi lưu.");
      return;
    }

    setIsSaving(true);

    try {
      const time = nowVNTimeHHmm();

      // Chuyển đổi các trường Date thành ISO format (ngayCapNhap tự sinh)
      const ngayXuatTra = `${formData.ngayXuatTraDate}T${time}`;
      const ngayNhapTra = formData.ngayNhapTraDate
        ? `${formData.ngayNhapTraDate}T${time}`
        : null;
      const ngayCHTraNVC = formData.ngayCHTraNVCDate
        ? `${formData.ngayCHTraNVCDate}T${time}`
        : null;
      const ngayHoaDon = formData.ngayHoaDonDate
        ? `${formData.ngayHoaDonDate}T${time}`
        : null;
      const ngayBGKeToan = formData.ngayBGKeToanDate
        ? `${formData.ngayBGKeToanDate}T${time}`
        : null;
      const ngayBGXuatTra = formData.ngayBGXuatTraDate
        ? `${formData.ngayBGXuatTraDate}T${time}`
        : null;

      let storedUser;
      try {
        storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      } catch {
        storedUser = {};
      }

      const boPhan = mapNameToBoPhan(storedUser.name || "");

      if (!boPhan) {
        setErrors((prev) => ({
          ...prev,
          boPhan: "Không xác định được bộ phận. Vui lòng đăng nhập lại.",
        }));
        setIsSaving(false);
        return;
      }

      const commonData = {
        maCH: formData.maCH,
        tenCH: formData.tenCH,
        ghiChu: formData.ghiChu,
        soSoda: formData.soSoda || null,
        boPhan,
        ngayXuatTra, // Ngày chính

        // Các trường bổ sung
        so: formData.so || null,
        taiXe: formData.taiXe || null,
        bienSoXe: formData.bienSoXe || null,
        nvNhapTra: formData.nvNhapTra || null,
        kyHieu: formData.kyHieu || null,
        ngayNhapTra: ngayNhapTra,
        ngayCHTraNVC: ngayCHTraNVC,
        soHoaDon: formData.soHoaDon || null,
        soTienSauThue: Number(formData.soTienSauThue) || null,
        ngayHoaDon: ngayHoaDon,
        ngayBGKeToan: ngayBGKeToan,
        soRTV: formData.soRTV || null,
        nvKeToanNhapTra: formData.nvKeToanNhapTra || null,
        ngayBGXuatTra: ngayBGXuatTra,
        trangThai: false,
      };

      const records = skuRows.map((row) => ({
        ...commonData,
        upc: row.upc.trim().toUpperCase() || null,
        sku: row.sku.trim().toUpperCase(),
        tenHang: row.tenHang,
        luong: Number(row.luong),
        vendor: row.vendor.trim() || null,
        vendorName: row.vendorName,
        ngaySanXuat: row.ngaySanXuat || null,
        hanSuDung: row.hanSuDung || null,
      }));

      // Gửi từng bản ghi
      for (const record of records) {
        await onSubmit?.(record);
      }

      // Reset form
      setFormData({
        maCH: "",
        tenCH: "",
        ngayXuatTraDate: toVNDate(),
        soSoda: "",
        ghiChu: "",
        so: "",
        taiXe: "",
        bienSoXe: "",
        nvNhapTra: "",
        kyHieu: "",
        ngayNhapTraDate: "",
        ngayCHTraNVCDate: "",
        soHoaDon: "",
        soTienSauThue: "",
        ngayHoaDonDate: "",
        ngayBGKeToanDate: "",
        soRTV: "",
        nvKeToanNhapTra: "",
        ngayBGXuatTraDate: "",
      });
      setSkuRows([
        {
          id: Date.now(),
          upc: "",
          sku: "",
          tenHang: "",
          luong: "",
          vendor: "",
          vendorName: "",
          ngaySanXuat: "",
          hanSuDung: "",
          isLoading: false,
        },
      ]);
      setErrors({});
      setOpen(false);
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu:", error);
      alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra console.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        ngayXuatTraDate: prev.ngayXuatTraDate || toVNDate(),
      }));
      setErrors({});
    } else {
      setShowSuggest(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">➕ Thêm xuất trả</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[950px] text-[15px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            📝 Thêm thông tin xuất trả
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* PHẦN 1: THÔNG TIN CỬA HÀNG VÀ NGÀY CƠ BẢN */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-700 border-b pb-1">
              Thông tin cơ bản
            </h3>

            {/* Mã CH + Tên CH */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Mã cửa hàng <span className="text-rose-600">*</span>
                </label>
                {/* Input Mã CH và Gợi ý */}
                <div className="relative">
                  <Input
                    name="maCH"
                    placeholder="VD: 2001 / CH00123"
                    value={formData.maCH}
                    onChange={handleChange}
                    onFocus={() =>
                      setShowSuggest(formData.maCH.trim().length >= 3)
                    }
                    onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
                    className={[
                      "h-11 text-[15px]",
                      errors.maCH ? "border-rose-500 ring-2 ring-rose-500" : "",
                    ].join(" ")}
                  />
                  {/* ... Logic Gợi ý (suggestions) ... */}
                  {showSuggest &&
                    suggestions.length > 0 /* Rút gọn logic gợi ý */ && (
                      <div className="absolute left-0 right-0 mt-1 z-[60] rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-auto">
                        {suggestions.map((ch, idx) => (
                          <button
                            key={ch.maCH}
                            type="button"
                            onClick={() => selectSuggest(ch)}
                            className={`w-full px-3 py-2 text-left hover:bg-slate-50 ${
                              idx === activeIndex ? "bg-sky-50" : ""
                            }`}
                          >
                            <span className="font-semibold text-slate-800 truncate">
                              [{ch.maCH}] {ch.tenCH}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                {errors.maCH && (
                  <p className="text-sm text-rose-600">{errors.maCH}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Tên cửa hàng
                </label>
                <Input
                  name="tenCH"
                  placeholder="Tự động điền"
                  value={formData.tenCH}
                  readOnly
                  className="h-11 text-[15px] text-slate-900 bg-slate-100 font-bold tracking-wide"
                />
              </div>
            </div>

            {/* Ngày Xuất Trả + Số SODA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Ngày xuất trả <span className="text-rose-600">*</span>
                </label>
                <Input
                  name="ngayXuatTraDate"
                  type="date"
                  value={formData.ngayXuatTraDate}
                  onChange={handleChange}
                  max={toVNDate()}
                  className={[
                    "h-11 text-[15px]",
                    errors.ngayXuatTraDate
                      ? "border-rose-500 ring-2 ring-rose-500"
                      : "",
                  ].join(" ")}
                />
                {errors.ngayXuatTraDate && (
                  <p className="text-sm text-rose-600">
                    {errors.ngayXuatTraDate}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Số SODA
                </label>
                <Input
                  name="soSoda"
                  placeholder="0"
                  value={formData.soSoda}
                  onChange={handleChange}
                  inputMode="numeric"
                  className="h-11 text-[15px] text-right tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Số phiếu (nếu có)
                </label>
                <Input
                  name="so"
                  placeholder="Số"
                  value={formData.so}
                  onChange={handleChange}
                  className={[
                    "h-11 text-[15px]",
                    errors.so ? "border-rose-500 ring-2 ring-rose-500" : "",
                  ].join(" ")}
                />
                {errors.so && (
                  <p className="text-sm text-rose-600">{errors.so}</p>
                )}
              </div>
            </div>

            {/* Toggle Advanced */}
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="advanced-mode"
                checked={showAdvancedInput}
                onCheckedChange={setShowAdvancedInput}
              />
              <Label
                htmlFor="advanced-mode"
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                Thêm thông tin Xử lý/Vận chuyển (Tài xế, Hóa đơn,...)
              </Label>
            </div>
          </section>

          {/* PHẦN 2: THÔNG TIN XỬ LÝ VÀ VẬN CHUYỂN (ẨN/HIỆN) */}
          {showAdvancedInput && (
            <section className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-bold text-slate-700 border-b pb-1">
                Chi tiết Xử lý & Vận chuyển
              </h3>

              {/* Xe và Tài xế */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Biển số xe
                  </label>
                  <Input
                    name="bienSoXe"
                    value={formData.bienSoXe}
                    onChange={handleChange}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Tài xế
                  </label>
                  <Input
                    name="taiXe"
                    value={formData.taiXe}
                    onChange={handleChange}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    NV nhập trả (Vận chuyển)
                  </label>
                  <Input
                    name="nvNhapTra"
                    value={formData.nvNhapTra}
                    onChange={handleChange}
                    className="h-11 text-[15px]"
                  />
                </div>
              </div>

              {/* Ngày tháng xử lý */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Ngày nhập trả
                  </label>
                  <Input
                    name="ngayNhapTraDate"
                    type="date"
                    value={formData.ngayNhapTraDate}
                    onChange={handleChange}
                    max={toVNDate()}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Ngày CH trả NVC
                  </label>
                  <Input
                    name="ngayCHTraNVCDate"
                    type="date"
                    value={formData.ngayCHTraNVCDate}
                    onChange={handleChange}
                    max={toVNDate()}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Ngày BG Xuất Trả
                  </label>
                  <Input
                    name="ngayBGXuatTraDate"
                    type="date"
                    value={formData.ngayBGXuatTraDate}
                    onChange={handleChange}
                    max={toVNDate()}
                    className="h-11 text-[15px]"
                  />
                </div>
              </div>

              {/* Hóa đơn/Ký hiệu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Ký hiệu
                  </label>
                  <Input
                    name="kyHieu"
                    value={formData.kyHieu}
                    onChange={handleChange}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Số hóa đơn
                  </label>
                  <Input
                    name="soHoaDon"
                    value={formData.soHoaDon}
                    onChange={handleChange}
                    className="h-11 text-[15px]"
                  />
                </div>
              </div>

              {/* Toggle Accounting */}
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="accounting-mode"
                  checked={showAccountingInput}
                  onCheckedChange={setShowAccountingInput}
                />
                <Label
                  htmlFor="accounting-mode"
                  className="text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Thêm thông tin Kế toán (Số tiền, RTV,...)
                </Label>
              </div>
            </section>
          )}

          {/* PHẦN 3: THÔNG TIN KẾ TOÁN (ẨN/HIỆN) */}
          {showAccountingInput && (
            <section className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-bold text-slate-700 border-b pb-1">
                Chi tiết Kế toán
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Số tiền sau thuế
                  </label>
                  <Input
                    name="soTienSauThue"
                    value={formData.soTienSauThue}
                    onChange={handleChange}
                    inputMode="numeric"
                    placeholder="VD: 1,000,000"
                    className="h-11 text-[15px] text-right tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Ngày Hóa đơn
                  </label>
                  <Input
                    name="ngayHoaDonDate"
                    type="date"
                    value={formData.ngayHoaDonDate}
                    onChange={handleChange}
                    max={toVNDate()}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Ngày BG Kế toán
                  </label>
                  <Input
                    name="ngayBGKeToanDate"
                    type="date"
                    value={formData.ngayBGKeToanDate}
                    onChange={handleChange}
                    max={toVNDate()}
                    className="h-11 text-[15px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Số RTV
                  </label>
                  <Input
                    name="soRTV"
                    value={formData.soRTV}
                    onChange={handleChange}
                    className="h-11 text-[15px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    NV Kế toán nhập trả
                  </label>
                  <Input
                    name="nvKeToanNhapTra"
                    value={formData.nvKeToanNhapTra}
                    onChange={handleChange}
                    className="h-11 text-[15px]"
                  />
                </div>
              </div>
            </section>
          )}

          {/* PHẦN 4: CHI TIẾT SẢN PHẨM */}
          <section className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-slate-700">
                Chi tiết sản phẩm <span className="text-rose-600">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSkuRow}
                className="h-8 px-3 text-xs font-semibold"
                disabled={isSaving}
              >
                ➕ Thêm dòng
              </Button>
            </div>

            <div className="space-y-4">
              {skuRows.map((row, index) => (
                <div
                  key={row.id}
                  className="relative border border-slate-200 rounded-lg p-4 bg-white shadow-sm"
                >
                  {row.isLoading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
                      <span className="text-sm font-semibold text-sky-600 animate-pulse">
                        Đang tìm kiếm...
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">
                      Dòng {index + 1}
                    </span>
                    {skuRows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkuRow(row.id)}
                        className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        disabled={isSaving || row.isLoading}
                      >
                        ✕
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {/* UPC */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        UPC
                      </label>
                      <Input
                        placeholder="Nhập UPC"
                        value={row.upc}
                        onChange={(e) =>
                          handleSkuRowChange(row.id, "upc", e.target.value)
                        }
                        onBlur={(e) => {
                          handleSearchProduct(row.id, "upc", e.target.value);
                        }}
                        disabled={isSaving || row.isLoading}
                        className="h-10 text-sm font-mono"
                      />
                      {errors[`upc_${row.id}`] && (
                        <p className="text-xs text-rose-600">
                          {errors[`upc_${row.id}`]}
                        </p>
                      )}
                    </div>

                    {/* SKU */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        SKU <span className="text-rose-600">*</span>
                      </label>
                      <Input
                        placeholder="Nhập SKU"
                        value={row.sku}
                        onChange={(e) =>
                          handleSkuRowChange(row.id, "sku", e.target.value)
                        }
                        onBlur={(e) => {
                          handleSearchProduct(row.id, "sku", e.target.value);
                        }}
                        disabled={isSaving || row.isLoading}
                        className={[
                          "h-10 text-sm font-mono",
                          errors[`sku_${row.id}`]
                            ? "border-rose-500 ring-1 ring-rose-500"
                            : "",
                        ].join(" ")}
                      />
                      {errors[`sku_${row.id}`] && (
                        <p className="text-xs text-rose-600">
                          {errors[`sku_${row.id}`]}
                        </p>
                      )}
                    </div>

                    {/* Tên hàng */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
                      <label className="text-xs font-medium text-slate-600">
                        Tên hàng
                      </label>
                      <Input
                        placeholder="Tự động điền"
                        value={row.tenHang}
                        onChange={(e) =>
                          handleSkuRowChange(row.id, "tenHang", e.target.value)
                        }
                        disabled={isSaving || row.isLoading}
                        className="h-10 text-sm bg-slate-50"
                      />
                    </div>

                    {/* Lượng */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Lượng <span className="text-rose-600">*</span>
                      </label>
                      <Input
                        placeholder="0"
                        type="number"
                        value={row.luong}
                        onChange={(e) =>
                          handleSkuRowChange(row.id, "luong", e.target.value)
                        }
                        disabled={isSaving || row.isLoading}
                        inputMode="numeric"
                        className={[
                          "h-10 text-sm text-right tabular-nums",
                          errors[`luong_${row.id}`]
                            ? "border-rose-500 ring-1 ring-rose-500"
                            : "",
                        ].join(" ")}
                      />
                      {errors[`luong_${row.id}`] && (
                        <p className="text-xs text-rose-600">
                          {errors[`luong_${row.id}`]}
                        </p>
                      )}
                    </div>

                    {/* Vendor */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Vendor
                      </label>
                      <Input
                        placeholder="Tự động"
                        value={row.vendor}
                        readOnly
                        disabled={isSaving || row.isLoading}
                        className="h-10 text-sm bg-slate-50 font-mono"
                      />
                    </div>

                    {/* Vendor Name */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <label className="text-xs font-medium text-slate-600">
                        Vendor Name
                      </label>
                      <Input
                        placeholder="Tự động"
                        value={row.vendorName}
                        readOnly
                        disabled={isSaving || row.isLoading}
                        className="h-10 text-sm bg-slate-50"
                      />
                    </div>

                    {/* Ngày sản xuất */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Ngày sản xuất
                      </label>
                      <Input
                        type="date"
                        value={row.ngaySanXuat}
                        onChange={(e) =>
                          handleSkuRowChange(
                            row.id,
                            "ngaySanXuat",
                            e.target.value
                          )
                        }
                        max={toVNDate()}
                        disabled={isSaving || row.isLoading}
                        className="h-10 text-sm"
                      />
                    </div>

                    {/* Hạn sử dụng */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Hạn sử dụng
                      </label>
                      <Input
                        type="date"
                        value={row.hanSuDung}
                        onChange={(e) =>
                          handleSkuRowChange(
                            row.id,
                            "hanSuDung",
                            e.target.value
                          )
                        }
                        disabled={isSaving || row.isLoading}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PHẦN 5: GHI CHÚ */}
          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-semibold text-slate-800">
              Ghi chú
            </label>
            <Textarea
              name="ghiChu"
              placeholder="Ví dụ: khi xuất trả, đã xử lý..."
              value={formData.ghiChu}
              onChange={handleChange}
              disabled={isSaving}
              className="min-h-[110px] text-[15px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-11 px-5 text-[15px] font-semibold"
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            className="h-11 px-6 text-[15px] font-semibold"
            disabled={isSaving || skuRows.some((row) => row.isLoading)}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">Đang lưu...</span>
            ) : (
              `Lưu (${skuRows.length} dòng)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddXuatTraDialog;
