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

// Map name → boPhan
const mapNameToBoPhan = (name) => {
  if (!name) return "";
  const n = name.trim().toUpperCase();
  if (n === "DIEU VAN") return "Điều Vận";
  if (n === "XU LY DON HANG") return "XLĐH";
  return name; // mặc định giữ nguyên
};

const AddXuatTraDialog = ({ cuahangs = [], onSubmit }) => {
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    maCH: "",
    tenCH: "",
    ngayXuatTraDate: toVNDate(),
    ghiChu: "",
    soSoda: "", // Số soda chung cho tất cả
  });

  // State cho các dòng SKU
  const [skuRows, setSkuRows] = useState([
    { id: Date.now(), sku: "", soKien: "" }
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

      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [cuahangByCode, suggestions.length]
  );

  // Handle thay đổi SKU row
  const handleSkuRowChange = useCallback((id, field, value) => {
    setSkuRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
    // Clear errors cho field này
    setErrors(prev => ({ ...prev, [`${field}_${id}`]: undefined }));
  }, []);

  // Thêm dòng SKU mới
  const addSkuRow = useCallback(() => {
    setSkuRows(prev => [...prev, { 
      id: Date.now() + Math.random(), 
      sku: "", 
      soKien: ""
    }]);
  }, []);

  // Xóa dòng SKU
  const removeSkuRow = useCallback((id) => {
    if (skuRows.length > 1) {
      setSkuRows(prev => prev.filter(row => row.id !== id));
      // Clear errors cho dòng này
      setErrors(prev => {
        const newErrors = { ...prev };
        ['sku', 'soKien'].forEach(field => {
          delete newErrors[`${field}_${id}`];
        });
        return newErrors;
      });
    }
  }, [skuRows.length]);

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
    if (!formData.ngayXuatTraDate) errs.ngayXuatTraDate = "Chọn ngày";

    // Validate SKU rows
    skuRows.forEach(row => {
      if (!row.sku.trim()) {
        errs[`sku_${row.id}`] = "SKU không được để trống";
      }
      if (!row.soKien.trim()) {
        errs[`soKien_${row.id}`] = "Số kiện không được để trống";
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [cuahangByCode, formData.maCH, formData.ngayXuatTraDate, skuRows]);

  const handleSave = async () => {
    if (!validate()) return;

    const time = nowVNTimeHHmm();
    const ngayXuatTra = `${formData.ngayXuatTraDate}T${time}`;

    // Lấy user từ localStorage
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
      return;
    }

    // Tạo danh sách các record từ các SKU rows
    const records = skuRows.map(row => ({
      ...formData,
      sku: row.sku,
      soKien: row.soKien,
      soSoda: formData.soSoda, // Sử dụng soSoda chung
      boPhan,
      ngayXuatTra,
      trangThai: false,
    }));

    // Submit từng record một hoặc submit array - tùy thuộc vào API của bạn
    for (const record of records) {
      await onSubmit?.(record);
    }

    // Reset form
    setFormData({
      maCH: "",
      tenCH: "",
      ngayXuatTraDate: toVNDate(),
      ghiChu: "",
      soSoda: "",
    });
    setSkuRows([{ id: Date.now(), sku: "", soKien: "" }]);
    setShowSuggest(false);
    setActiveIndex(-1);
    setErrors({});
    setOpen(false);
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

      <DialogContent className="sm:max-w-[800px] text-[15px] md:text-base max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Thêm thông tin xuất trả
          </DialogTitle>
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
                onFocus={() => setShowSuggest(formData.maCH.trim().length >= 3)}
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
          </div>

          {/* Tên CH */}
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

          {/* Ngày và Số soda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Ngày cập nhật <span className="text-rose-600">*</span>
              </label>
              <Input
                name="ngayXuatTraDate"
                type="date"
                value={formData.ngayXuatTraDate}
                onChange={handleChange}
                max={toVNDate()}
                className={[
                  "h-11 text-[15px] text-slate-900",
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
          </div>

          {/* SKU Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">
                Chi tiết SKU <span className="text-rose-600">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSkuRow}
                className="h-8 px-3 text-xs font-semibold"
              >
                ➕ Thêm dòng
              </Button>
            </div>

            <div className="space-y-3">
              {skuRows.map((row, index) => (
                <div key={row.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
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
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        SKU <span className="text-rose-600">*</span>
                      </label>
                      <Input
                        placeholder="Nhập SKU"
                        value={row.sku}
                        onChange={(e) => handleSkuRowChange(row.id, 'sku', e.target.value)}
                        className={[
                          "h-10 text-sm text-slate-900 placeholder:text-slate-400",
                          errors[`sku_${row.id}`] ? "border-rose-500 ring-1 ring-rose-500" : "",
                        ].join(" ")}
                      />
                      {errors[`sku_${row.id}`] && (
                        <p className="text-xs text-rose-600">{errors[`sku_${row.id}`]}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Số kiện <span className="text-rose-600">*</span>
                      </label>
                      <Input
                        placeholder="0"
                        type="number"
                        value={row.soKien}
                        onChange={(e) => handleSkuRowChange(row.id, 'soKien', e.target.value)}
                        className={[
                          "h-10 text-sm text-right tabular-nums text-slate-900 placeholder:text-slate-400",
                          errors[`soKien_${row.id}`] ? "border-rose-500 ring-1 ring-rose-500" : "",
                        ].join(" ")}
                        inputMode="numeric"
                      />
                      {errors[`soKien_${row.id}`] && (
                        <p className="text-xs text-rose-600">{errors[`soKien_${row.id}`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">
              Ghi chú
            </label>
            <Textarea
              name="ghiChu"
              placeholder="Ví dụ: khi xuất trả, đã xử lý..."
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
            onClick={handleSave}
            className="h-11 px-6 text-[15px] font-semibold"
          >
            Lưu ({skuRows.length} dòng)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddXuatTraDialog;