/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback, useMemo } from "react";
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
import { dataCHService } from "@/services/phieusoan/dataCH.service";
import SoSodaScanInput from "./SoSodaScanInput";
import { toast } from "react-toastify";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

const GHI_CHU_CO_DINH = "Rớt Kiện";
const LAN_2_LABEL = "Rớt lần 2";

// ISO string -> "YYYY-MM-DDTHH:mm" theo giờ VN, dùng cho input datetime-local
const toVNDateTimeLocal = (isoStr) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const VN_OFFSET = 7 * 60;
  const localOffset = d.getTimezoneOffset();
  const vn = new Date(d.getTime() + (VN_OFFSET + localOffset) * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${vn.getFullYear()}-${pad(vn.getMonth() + 1)}-${pad(vn.getDate())}T${pad(
    vn.getHours(),
  )}:${pad(vn.getMinutes())}`;
};

// Tách tag cố định ra khỏi chuỗi ghiChu để hiển thị lại đúng vào form
const parseGhiChu = (ghiChu) => {
  if (!ghiChu) return { coRotLan2: false, ghiChuThem: "" };
  const parts = ghiChu.split(" - ");
  let idx = 0;
  let coRotLan2 = false;
  if (parts[idx] === GHI_CHU_CO_DINH) idx++;
  if (parts[idx] === LAN_2_LABEL) {
    coRotLan2 = true;
    idx++;
  }
  return { coRotLan2, ghiChuThem: parts.slice(idx).join(" - ") };
};

const parseSodaCodes = (soSoda) =>
  (soSoda || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * data: bản ghi RotKien đang sửa (bắt buộc, cần có _id)
 * existingSodaCodes / existingSodaCodeCounts: tính trên TOÀN BỘ dữ liệu (giống AddKienDialog)
 *   — component này sẽ tự loại trừ phần thuộc về chính bản ghi đang sửa.
 * onSubmit(id, payload)
 */
const EditKienDialog = ({
  data,
  onSubmit,
  existingSodaCodes = [],
  existingSodaCodeCounts = {},
}) => {
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    maCH: "",
    tenCH: "",
    soKienRot: "",
    ngayRotKienDateTime: "",
    ghiChuThem: "",
  });
  const [soSodaCodes, setSoSodaCodes] = useState([]);
  const [soSodaHasError, setSoSodaHasError] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [coRotLan2, setCoRotLan2] = useState(false);

  // Nạp dữ liệu ban đầu mỗi khi mở dialog
  useEffect(() => {
    if (!open || !data) return;
    const { coRotLan2: initialLan2, ghiChuThem } = parseGhiChu(data.ghiChu);
    setFormData({
      maCH: data.maCH || "",
      tenCH: data.tenCH || "",
      soKienRot: data.soKienRot ?? "",
      ngayRotKienDateTime: toVNDateTimeLocal(data.ngayRotKien),
      ghiChuThem,
    });
    setSoSodaCodes(parseSodaCodes(data.soSoda));
    setCoRotLan2(initialLan2);
    setSoSodaHasError(false);
    setErrors({});
  }, [open, data]);

  // Mã soda vốn đã thuộc về chính bản ghi này -> không được tính là "trùng"
  const ownCodes = useMemo(() => parseSodaCodes(data?.soSoda), [data]);

  const adjustedExistingCodeCounts = useMemo(() => {
    const counts = { ...existingSodaCodeCounts };
    ownCodes.forEach((code) => {
      if (counts[code]) {
        counts[code] = counts[code] - 1;
        if (counts[code] <= 0) delete counts[code];
      }
    });
    return counts;
  }, [existingSodaCodeCounts, ownCodes]);

  const adjustedExistingCodes = useMemo(
    () => existingSodaCodes.filter((c) => !ownCodes.includes(c) || adjustedExistingCodeCounts[c] > 0),
    [existingSodaCodes, ownCodes, adjustedExistingCodeCounts],
  );

  useEffect(() => {
    const key = formData.maCH.trim();
    if (key.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await dataCHService.getAllDataCH({ search: key, limit: 20 });
        const list = res?.data || [];
        setSuggestions(
          list.map((item) => ({
            ...item,
            maCH: item.mach || "",
            tenCH: item.tench || "",
          })),
        );
      } catch (err) {
        console.error("Lỗi search cửa hàng:", err);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [formData.maCH]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === "maCH") {
      setFormData((prev) => ({ ...prev, maCH: value, tenCH: "" }));
      setShowSuggest(value.trim().length >= 3);
      setActiveIndex(-1);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const selectSuggest = useCallback((ch) => {
    setFormData((prev) => ({ ...prev, maCH: ch.maCH, tenCH: ch.tenCH }));
    setShowSuggest(false);
    setActiveIndex(-1);
    setErrors((e) => ({ ...e, maCH: undefined }));
  }, []);

  const validate = useCallback(async () => {
    const errs = {};
    const key = formData.maCH.trim();
    if (!key) {
      errs.maCH = "Nhập mã cửa hàng";
    } else {
      try {
        const res = await dataCHService.getAllDataCH({ search: key, limit: 20 });
        const list = res?.data || [];
        const matched = list.find((ch) => ch.mach === key);
        if (!matched) {
          errs.maCH = "Mã cửa hàng không tồn tại";
        } else {
          setFormData((prev) => ({ ...prev, tenCH: matched.tench || "" }));
        }
      } catch (err) {
        console.error("Lỗi kiểm tra mã cửa hàng:", err);
        errs.maCH = "Không kiểm tra được mã cửa hàng, thử lại";
      }
    }
    if (!formData.ngayRotKienDateTime) errs.ngayRotKienDateTime = "Chọn ngày giờ";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData.maCH, formData.ngayRotKienDateTime]);

  const handleSave = async () => {
    if (!data?._id) return;
    if (!(await validate())) return;
    if (soSodaHasError) {
      toast.error("❌ Có mã soda bị trùng, vui lòng kiểm tra lại!");
      return;
    }

    const tags = [GHI_CHU_CO_DINH, ...(coRotLan2 ? [LAN_2_LABEL] : [])];
    const ghiChu = formData.ghiChuThem.trim()
      ? `${tags.join(" - ")} - ${formData.ghiChuThem.trim()}`
      : tags.join(" - ");

    await onSubmit?.(data._id, {
      maCH: formData.maCH,
      tenCH: formData.tenCH,
      soKienRot: formData.soKienRot,
      soSoda: soSodaCodes.join(", "),
      ngayRotKien: formData.ngayRotKienDateTime, // "YYYY-MM-DDTHH:mm"
      ghiChu,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-medium border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
          title="Chỉnh sửa"
        >
          ✎ Sửa
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[640px] text-[15px] md:text-base max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Chỉnh sửa thông tin kiện
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 px-6 py-2 overflow-y-auto flex-1 min-h-0">
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
                    setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
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
                  {searching ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Đang tìm...</div>
                  ) : suggestions.length ? (
                    suggestions.map((ch, idx) => (
                      <button
                        key={ch._id || ch.maCH}
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
                        <span className="font-semibold text-slate-800 truncate">{ch.tenCH}</span>
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
            {errors.maCH && <p className="text-sm text-rose-600">{errors.maCH}</p>}
          </div>

          {/* Tên CH */}
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

          {/* Số kiện + Ngày giờ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Số kiện</label>
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
                Ngày giờ cập nhật <span className="text-rose-600">*</span>
              </label>
              <Input
                name="ngayRotKienDateTime"
                type="datetime-local"
                value={formData.ngayRotKienDateTime}
                onChange={handleChange}
                className={[
                  "h-11 text-[15px] text-slate-900",
                  errors.ngayRotKienDateTime ? "border-rose-500 ring-2 ring-rose-500" : "",
                ].join(" ")}
              />
              {errors.ngayRotKienDateTime && (
                <p className="text-sm text-rose-600">{errors.ngayRotKienDateTime}</p>
              )}
            </div>
          </div>

          {/* Số soda - hóa đơn */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Số soda - hóa đơn</label>
            <SoSodaScanInput
              key={open ? data?._id : "closed"}
              initialCodes={soSodaCodes}
              existingCodes={adjustedExistingCodes}
              existingCodeCounts={adjustedExistingCodeCounts}
              duplicateActionLabel={LAN_2_LABEL}
              onDuplicateConfirmed={() => setCoRotLan2(true)}
              onCodesChange={async (codes, hasError) => {
                setSoSodaCodes(codes);
                setSoSodaHasError(hasError);
                if (!codes.length) {
                  setFormData((prev) => ({ ...prev, soKienRot: "" }));
                  return;
                }
                try {
                  const res = await nhanSuSoanService.getKienTheoSoSoda(codes);
                  const { notFound = [], tongKien = 0 } = res || {};
                  if (notFound.length) {
                    toast.error(`❌ Không tìm thấy dữ liệu cho: ${notFound.join(", ")}`);
                  }
                  setFormData((prev) => ({ ...prev, soKienRot: String(tongKien) }));
                } catch (err) {
                  console.error("Lỗi tra cứu kiện theo soda:", err);
                  toast.error("❌ Không tra cứu được số kiện, thử lại");
                }
              }}
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Ghi chú</label>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 text-sm font-bold select-none">
                {GHI_CHU_CO_DINH}
              </span>
              {coRotLan2 && (
                <span className="inline-flex items-center rounded-md bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 text-sm font-bold select-none">
                  {LAN_2_LABEL}
                </span>
              )}
              <span className="text-xs text-slate-400">(cố định, không thể xóa)</span>
            </div>
            <Textarea
              name="ghiChuThem"
              placeholder="Ghi chú thêm (không bắt buộc)..."
              value={formData.ghiChuThem}
              onChange={handleChange}
              className="min-h-[90px] text-[15px] text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3 px-6 py-4 border-t shrink-0 bg-white">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-11 px-5 text-[15px] font-semibold"
          >
            Hủy
          </Button>
          <Button onClick={handleSave} className="h-11 px-6 text-[15px] font-semibold">
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditKienDialog;