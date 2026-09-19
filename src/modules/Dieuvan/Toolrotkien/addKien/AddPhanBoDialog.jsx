/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback } from "react";
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

const GHI_CHU_CO_DINH = "Phân Bổ";

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

const AddPhanBoDialog = ({ onSubmit, existingSodaCodes = [] }) => {
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    maCH: "",
    tenCH: "",
    soKienRot: "",
    ngayRotKienDate: toVNDate(),
    ghiChuThem: "",
  });

  const [soSodaCodes, setSoSodaCodes] = useState([]);
  const [soSodaHasError, setSoSodaHasError] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const key = formData.maCH.trim();
    if (key.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await dataCHService.getAllDataCH({
          search: key,
          limit: 20,
        });
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
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (open) return;

      const activeTag = document.activeElement?.tagName;
      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        document.activeElement?.isContentEditable;
      if (isTyping) return;

      if (
        e.key.toLowerCase() === "z" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open]);
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
        const res = await dataCHService.getAllDataCH({
          search: key,
          limit: 20,
        });
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

    if (!formData.ngayRotKienDate) errs.ngayRotKienDate = "Chọn ngày";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData.maCH, formData.ngayRotKienDate]);

  const handleSave = async () => {
    if (!(await validate())) return;
    if (soSodaHasError) {
      toast.error("❌ Có mã soda bị trùng, vui lòng kiểm tra lại!");
      return;
    }
    const time = nowVNTimeHHmm();
    const ngayRotKien = `${formData.ngayRotKienDate}T${time}`;

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

    const ghiChu = formData.ghiChuThem.trim()
      ? `${GHI_CHU_CO_DINH} - ${formData.ghiChuThem.trim()}`
      : GHI_CHU_CO_DINH;

    await onSubmit?.({
      maCH: formData.maCH,
      tenCH: formData.tenCH,
      soKienRot: formData.soKienRot,
      soSoda: soSodaCodes.join(", "),
      ngayRotKien,
      ghiChu,
      boPhan,
      trangThai: false,
    });

    setFormData({
      maCH: "",
      tenCH: "",
      soKienRot: "",
      ngayRotKienDate: toVNDate(),
      ghiChuThem: "",
    });
    setShowSuggest(false);
    setActiveIndex(-1);
    setErrors({});
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        ngayRotKienDate: prev.ngayRotKienDate || toVNDate(),
      }));
      setErrors({});
    } else {
      setShowSuggest(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">➕ Thêm Phân bổ</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[640px] text-[15px] md:text-base max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Thêm thông tin Phân bổ
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 px-6 py-2 overflow-y-auto flex-1 min-h-0">
          {/* Mã CH + Gợi ý */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">
              Mã cửa hàng <span className="text-rose-600">*</span>{" "}
              <span className="text-xs font-normal text-slate-400">
                (tự điền khi quét mã soda, có thể sửa tay)
              </span>
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
                      Math.min(i + 1, suggestions.length - 1),
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
                  {searching ? (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      Đang tìm...
                    </div>
                  ) : suggestions.length ? (
                    suggestions.map((ch, idx) => (
                      <button
                        key={ch._id || ch.maCH}
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

          {/* Số kiện + Ngày */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Ngày cập nhập <span className="text-rose-600">*</span>
              </label>
              <Input
                name="ngayRotKienDate"
                type="date"
                value={formData.ngayRotKienDate}
                onChange={handleChange}
                max={toVNDate()}
                className={[
                  "h-11 text-[15px] text-slate-900",
                  errors.ngayRotKienDate
                    ? "border-rose-500 ring-2 ring-rose-500"
                    : "",
                ].join(" ")}
              />
              {errors.ngayRotKienDate && (
                <p className="text-sm text-rose-600">
                  {errors.ngayRotKienDate}
                </p>
              )}
            </div>
          </div>

          {/* Số soda - hóa đơn (nhiều mã) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">
              Số soda - hóa đơn{" "}
            </label>
            <SoSodaScanInput
              key={open}
              onRequestSave={handleSave} // 👈 thêm
              existingCodes={existingSodaCodes}
              onCodesChange={async (codes, hasError) => {
                setSoSodaCodes(codes);
                setSoSodaHasError(hasError);

                if (!codes.length) {
                  setFormData((prev) => ({ ...prev, soKienRot: "" }));
                  return;
                }

                try {
                  const res = await nhanSuSoanService.getKienTheoSoSoda(codes);
                  const {
                    notFound = [],
                    tongKien = 0,
                    maCH: maCHTraCuu,
                    tenCH: tenCHTraCuu,
                    mismatch,
                  } = res || {};

                  if (notFound.length) {
                    toast.error(
                      `❌ Không tìm thấy dữ liệu cho: ${notFound.join(", ")}`,
                    );
                  }

                  if (mismatch) {
                    toast.error(
                      "⚠ Các mã đang quét thuộc nhiều cửa hàng khác nhau — kiểm tra lại!",
                    );
                  }

                  setFormData((prev) => ({
                    ...prev,
                    soKienRot: String(tongKien),
                    // Chỉ tự điền mã/tên CH khi tra cứu ra đúng 1 cửa hàng duy nhất
                    // và người dùng chưa tự gõ mã CH trước đó (tránh ghi đè lựa chọn tay)
                    maCH: !mismatch && maCHTraCuu ? maCHTraCuu : prev.maCH,
                    tenCH: !mismatch && tenCHTraCuu ? tenCHTraCuu : prev.tenCH,
                  }));
                } catch (err) {
                  console.error("Lỗi tra cứu kiện theo soda:", err);
                  toast.error("❌ Không tra cứu được số kiện, thử lại");
                }
              }}
            />
          </div>

          {/* Ghi chú: nhãn cố định + phần gõ thêm */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">
              Ghi chú
            </label>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 text-sm font-bold select-none">
                {GHI_CHU_CO_DINH}
              </span>
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
          <Button
            onClick={handleSave}
            className="h-11 px-6 text-[15px] font-semibold"
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPhanBoDialog;
