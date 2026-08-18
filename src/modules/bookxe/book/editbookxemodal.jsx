/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Truck, Clock, AlertTriangle } from "lucide-react";
import { bookXeService } from "@/services/bookxe.service";

const SLOT_PRESETS = [
  { xuat: "07:30", toi: "09:00", label: "9:00 - 16:00", color: "#3B82F6" },
  { xuat: "08:30", toi: "09:00", label: "9:00 - 16:00", color: "#06B6D4" },
  { xuat: "10:00", toi: "11:00", label: "11:00 - 16:00", color: "#10B981" },
  { xuat: "12:30", toi: "13:30", label: "13:30 - 16:00", color: "#84CC16" },
  { xuat: "13:30", toi: "14:00", label: "14:00 - 21:00", color: "#F59E0B" },
  { xuat: "14:30", toi: "15:00", label: "15:00 - 21:00", color: "#F97316" },
  { xuat: "15:30", toi: "17:00", label: "17:00 - 21:00", color: "#EF4444" },
  { xuat: "17:30", toi: "20:30", label: "20:30 - 22:00", color: "#A855F7" },
];

const STATUS_OPTIONS = ["Chưa Book", "Chờ xe", "Có kiện rớt", "Hoàn thành"];

// Chuyển ISO date -> "YYYY-MM-DD" theo giờ VN, dùng để đổ vào input[type=date]
const toYMD_VN = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

// Chuyển ISO date -> "HH:mm" theo giờ VN, dùng để đổ vào input[type=time]
const toHHmm_VN = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const EditBookXeModal = ({ open, item, onClose, onUpdated }) => {
  const [form, setForm] = useState(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setError("");
    setForm({
      ngayBook: toYMD_VN(item.ngay_di_hang) || todayStr(),
      gioXuat: toHHmm_VN(item.thoi_gian_xuat),
      gioToiCh: toHHmm_VN(item.thoi_gian_dk_toi_ch),
      quan: item.quan || "",
      ma_ch: item.ma_ch || "",
      ten_ch: item.ten_ch || "",
      ma_ncv: item.ma_ncv || "",
      ten_nvc: item.ten_nvc || "",
      lich_di_hang: item.lich_di_hang || "",
      kien: item.kien ?? 0,
      kien_rot: item.kien_rot ?? 0,
      ghi_chu: item.ghi_chu || "",
      trangThai: item.trangThai || "Chưa Book",
    });

    const gioXuatVN = toHHmm_VN(item.thoi_gian_xuat);
    const gioToiVN = toHHmm_VN(item.thoi_gian_dk_toi_ch);
    const presetIdx = SLOT_PRESETS.findIndex(
      (s) => s.xuat === gioXuatVN && s.toi === gioToiVN,
    );
    setActiveSlotIdx(presetIdx >= 0 ? presetIdx : null);
  }, [open, item]);

  if (!open || !form) return null;

  const activeColor =
    activeSlotIdx !== null ? SLOT_PRESETS[activeSlotIdx].color : null;

  const applySlot = (slot, idx) => {
    setActiveSlotIdx(idx);
    setForm((prev) => ({ ...prev, gioXuat: slot.xuat, gioToiCh: slot.toi }));
  };

  const setField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "gioXuat" || field === "gioToiCh") setActiveSlotIdx(null);
  };

  const isValid = form.ngayBook && form.gioXuat && form.gioToiCh;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        thoi_gian_xuat: new Date(
          `${form.ngayBook}T${form.gioXuat}:00+07:00`,
        ).toISOString(),
        thoi_gian_dk_toi_ch: new Date(
          `${form.ngayBook}T${form.gioToiCh}:00+07:00`,
        ).toISOString(),
        ngay_di_hang: new Date(
          `${form.ngayBook}T00:00:00+07:00`,
        ).toISOString(),
        quan: form.quan || undefined,
        ma_ch: form.ma_ch || undefined,
        ten_ch: form.ten_ch || undefined,
        ma_ncv: form.ma_ncv || undefined,
        ten_nvc: form.ten_nvc || undefined,
        lich_di_hang: form.lich_di_hang || undefined,
        kien: Number(form.kien) || 0,
        kien_rot: Number(form.kien_rot) || 0,
        ghi_chu: form.ghi_chu || undefined,
        trangThai: form.trangThai,
      };

      await bookXeService.updateBookXe(item._id, payload);
      onUpdated?.();
      onClose?.();
    } catch (err) {
      console.error("Lỗi khi cập nhật chuyến book xe:", err);
      setError("Cập nhật thất bại, thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Truck size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight text-slate-800">
                Sửa Chuyến Book Xe
              </h2>
              <p className="text-xs text-slate-400">
                {item?.ma_ch ? `Mã CH: ${item.ma_ch}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Ngày đi hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.ngayBook}
              onChange={setField("ngayBook")}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:w-56"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <Clock size={14} />
              Chọn nhanh khung giờ
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SLOT_PRESETS.map((slot, idx) => {
                const active = activeSlotIdx === idx;
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => applySlot(slot, idx)}
                    className="rounded-lg border px-2.5 py-2 text-left text-xs transition-all"
                    style={{
                      borderColor: active ? slot.color : "#e2e8f0",
                      backgroundColor: active ? `${slot.color}1A` : "#fff",
                      boxShadow: active
                        ? `0 0 0 1px ${slot.color}66`
                        : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slot.color }}
                      />
                      {slot.xuat}
                    </div>
                    <div className="mt-0.5 text-slate-500">{slot.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Giờ xuất <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.gioXuat}
                onChange={setField("gioXuat")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Dự kiến tới CH <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.gioToiCh}
                onChange={setField("gioToiCh")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Mã CH
              </label>
              <input
                type="text"
                value={form.ma_ch}
                onChange={setField("ma_ch")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Tên CH
              </label>
              <input
                type="text"
                value={form.ten_ch}
                onChange={setField("ten_ch")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Mã NCV
              </label>
              <input
                type="text"
                value={form.ma_ncv}
                onChange={setField("ma_ncv")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Tên NVC
              </label>
              <input
                type="text"
                value={form.ten_nvc}
                onChange={setField("ten_nvc")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Quận
              </label>
              <input
                type="text"
                value={form.quan}
                onChange={setField("quan")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Lịch đi hàng
              </label>
              <input
                type="text"
                value={form.lich_di_hang}
                onChange={setField("lich_di_hang")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Kiện
              </label>
              <input
                type="number"
                min={0}
                value={form.kien}
                onChange={setField("kien")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Kiện rớt
              </label>
              <input
                type="number"
                min={0}
                value={form.kien_rot}
                onChange={setField("kien_rot")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Trạng thái
              </label>
              <select
                value={form.trangThai}
                onChange={setField("trangThai")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Ghi chú
              </label>
              <textarea
                value={form.ghi_chu}
                onChange={setField("ghi_chu")}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!isValid || submitting}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: activeColor || "#2563eb" }}
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default EditBookXeModal;