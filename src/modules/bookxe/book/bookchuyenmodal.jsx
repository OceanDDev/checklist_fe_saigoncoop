/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  PackageCheck,
  RotateCcw,
  AlertTriangle,
  Truck,
  Search,
  CalendarClock,
  ArrowLeft,
  Sparkles,
  UserRound,
  Clock,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  PartyPopper,
  Shuffle,
  CheckCircle2,
  PencilLine,
  CircleDashed,
} from "lucide-react";
import { bookXeService } from "@/services/bookxe.service";

const NGUONG = { CS: 120, CF: 180 };

const MATCH_PRIORITY = [
  "tung_ghep_chung",
  "quan",
  "lenh_dieu_dong",
  "ncv",
  "lich_di_hang",
  "chuyen", // 👈 thêm
];

const MATCH_LABEL = {
  tung_ghep_chung: "Từng ghép chung chuyến",
  quan: "Chung quận",
  lenh_dieu_dong: "Từng đi chung LĐD",
  ncv: "Chung NVC",
  lich_di_hang: "Chung lịch đi hàng",
  chuyen: "Chung chuyến", // 👈 thêm
};

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
const CHUYEN_STYLE = {
  SÁNG: {
    badge:
      "text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 shadow-sm",
    dot: "bg-green-400",
    icon: Sunrise,
    iconColor: "text-green-500",
  },
  TRƯA: {
    badge:
      "text-red-700 bg-gradient-to-r from-red-50 to-rose-50 border border-red-300 shadow-sm",
    dot: "bg-red-400",
    icon: Sun,
    iconColor: "text-red-500",
  },
  CHIỀU: {
    badge:
      "text-yellow-700 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 shadow-sm",
    dot: "bg-yellow-400",
    icon: Sunset,
    iconColor: "text-yellow-500",
  },
  TỐI: {
    badge:
      "text-indigo-700 bg-gradient-to-r from-indigo-50 to-slate-100 border border-indigo-300 shadow-sm",
    dot: "bg-indigo-500",
    icon: Moon,
    iconColor: "text-indigo-500",
  },
  "KHAI TRƯƠNG": {
    badge:
      "text-purple-700 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-300 shadow-sm",
    dot: "bg-purple-500",
    icon: PartyPopper,
    iconColor: "text-purple-500",
  },
  "PHÂN BỔ": {
    badge:
      "text-cyan-700 bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-300 shadow-sm",
    dot: "bg-cyan-500",
    icon: Shuffle,
    iconColor: "text-cyan-500",
  },
  "GIAO KHÁCH": {
    badge:
      "text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 shadow-sm",
    dot: "bg-rose-500",
    icon: Truck,
    iconColor: "text-rose-500",
  },
};
const TRANG_THAI_SOAN_STYLE = {
  "Hoàn thành": {
    badge:
      "text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 shadow-sm",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    label: "Đã soạn xong",
  },
  "Đang soạn": {
    badge:
      "text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 shadow-sm",
    dot: "bg-amber-500",
    icon: PencilLine,
    iconColor: "text-amber-600",
    label: "Đang soạn",
  },
  "Chưa soạn": {
    badge:
      "text-violet-700 bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-300 shadow-sm",
    dot: "bg-violet-500",
    icon: CircleDashed,
    iconColor: "text-violet-600",
    label: "Chưa soạn",
  },
};
const DEFAULT_CHUYEN_STYLE = {
  badge:
    "text-slate-600 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-300 shadow-sm",
  dot: "bg-slate-400",
  icon: Clock,
  iconColor: "text-slate-500",
};

const getChuyenStyle = (chuyen) => {
  if (!chuyen) return null;
  const key = chuyen.trim().toUpperCase();
  return CHUYEN_STYLE[key] || DEFAULT_CHUYEN_STYLE;
};
const QUICK_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "giaokhach", label: "Giao khách" },
  { key: "kienrot", label: "Kiện rớt" },
  { key: "ghepchung", label: "Từng ghép chung" },
];
// ─── Helpers thuần (không phụ thuộc state, an toàn để định nghĩa ngoài component) ──

const getMatchReasons = (item, selectedItems) => {
  if (selectedItems.length === 0) return [];
  const reasons = new Set();
  for (const sel of selectedItems) {
    if (sel.key === item.key) continue;

    if (
      item.tungGhepChungVoi?.length &&
      sel.ma_ch &&
      item.tungGhepChungVoi.includes(sel.ma_ch)
    ) {
      reasons.add("tung_ghep_chung");
    }
    if (item.quan && sel.quan && item.quan === sel.quan) {
      reasons.add("quan");
    }
    if (item.lenhDieuDongLienQuan?.length && sel.lenhDieuDongLienQuan?.length) {
      const chung = item.lenhDieuDongLienQuan.some((ldd) =>
        sel.lenhDieuDongLienQuan.includes(ldd),
      );
      if (chung) reasons.add("lenh_dieu_dong");
    }
    if (item.ten_nvc && sel.ten_nvc && item.ten_nvc === sel.ten_nvc) {
      reasons.add("ncv");
    }
    if (
      item.lich_di_hang &&
      sel.lich_di_hang &&
      item.lich_di_hang === sel.lich_di_hang
    ) {
      reasons.add("lich_di_hang");
    }
    if (item.chuyen && sel.chuyen && item.chuyen === sel.chuyen) {
      reasons.add("chuyen");
    }
    // Đủ reasons rồi thì không cần duyệt tiếp các sel khác
    if (reasons.size === MATCH_PRIORITY.length) break;
  }
  return MATCH_PRIORITY.filter((r) => reasons.has(r));
};

const getMatchScore = (reasons) =>
  reasons.reduce((score, r) => {
    const weight = MATCH_PRIORITY.length - MATCH_PRIORITY.indexOf(r);
    return score + 10 ** weight;
  }, 0);

const formatNgayVN = (ngayStr) => {
  if (!ngayStr) return "";
  const [y, m, d] = ngayStr.split("-");
  if (!y || !m || !d) return ngayStr;
  return `${d}/${m}/${y}`;
};

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ItemRow = memo(function ItemRow({
  item,
  checked,
  onToggle,
  matchReasons,
}) {
  const isSuggested = !checked && matchReasons.length > 0;
  const isGiaoKhach = !!item.coGiaoKhach;
  const isKienRot = item.nguon === "kien_rot";
  const chuyenStyle = getChuyenStyle(item.chuyen);
  const ChuyenIcon = chuyenStyle?.icon;
  const soanStyle = TRANG_THAI_SOAN_STYLE[item.trangThaiSoan]; // 👈
  const SoanIcon = soanStyle?.icon; // 👈

  return (
    <label
      className={[
        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all",
        checked
          ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200"
          : isGiaoKhach
            ? "border-rose-300 bg-rose-50/70 hover:border-rose-400 hover:shadow-sm"
            : isKienRot
              ? "border-amber-300 bg-amber-50/70 hover:border-amber-400 hover:shadow-sm"
              : isSuggested
                ? "border-emerald-300 bg-emerald-50/60 hover:border-emerald-400"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-600"
      />
      <div className="min-w-0 flex-1">
        {isGiaoKhach && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <UserRound size={13} />
            Giao khách — ngày {formatNgayVN(item.ngayGiaoKhach)}
            <span className="font-normal text-rose-500">
              (chuyến quan trọng, ưu tiên book trước)
            </span>
          </div>
        )}
        {isKienRot && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <RotateCcw size={13} />
            Kiện rớt
            {item.ngayRotKien
              ? ` — ngày ${formatNgayVN(item.ngayRotKien)}`
              : ""}
            <span className="font-normal text-amber-600">(cần rebook lại)</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {isSuggested && !isGiaoKhach && !isKienRot && (
            <Sparkles size={14} className="shrink-0 text-emerald-500" />
          )}
          <span className="text-[15px] font-semibold text-slate-800">
            {item.ma_ch}
          </span>
          <span className="text-slate-600">- {item.ten_ch}</span>

          {chuyenStyle && (
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                chuyenStyle.badge,
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${chuyenStyle.dot}`} />
              {ChuyenIcon && (
                <ChuyenIcon size={12} className={chuyenStyle.iconColor} />
              )}
              {item.chuyen}
            </span>
          )}

          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              item.nguon === "kien_rot"
                ? "bg-amber-50 text-amber-600"
                : "bg-blue-50 text-blue-600",
            ].join(" ")}
          >
            {item.nguon === "kien_rot" ? (
              <RotateCcw size={12} />
            ) : (
              <PackageCheck size={12} />
            )}
            {item.nguon === "kien_rot" ? "Kiện rớt" : "Kiện mới"}
          </span>
          {item.loaiCuaHang && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {item.loaiCuaHang}
            </span>
          )}

          {soanStyle && (
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                soanStyle.badge,
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${soanStyle.dot}`} />
              <SoanIcon size={12} className={soanStyle.iconColor} />
              {soanStyle.label}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
          <span className="font-medium text-slate-700">{item.kien} kiện</span>
          {item.ten_nvc && <span>NVC: {item.ten_nvc}</span>}
          {item.lich_di_hang && <span>Lịch: {item.lich_di_hang}</span>}
          {item.quan && <span>{item.quan}</span>}
        </div>
        {isKienRot && item.ghiChuRotKien && (
          <div className="mt-1.5 text-[13px] italic text-amber-600">
            Ghi chú: {item.ghiChuRotKien}
          </div>
        )}
        {matchReasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {matchReasons.map((r) => (
              <span
                key={r}
                className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                💡 {MATCH_LABEL[r] || r}
              </span>
            ))}
          </div>
        )}
      </div>
    </label>
  );
});

const SelectionSummary = memo(function SelectionSummary({
  selectedItems,
  nguong,
  tongKien,
  vuotNguong,
  coLoaiKhacNhau,
  coGiaoKhachChon,
  onRemove,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-base text-slate-500">
          Đã chọn{" "}
          <span className="text-xl font-bold text-slate-800">
            {selectedItems.length}
          </span>{" "}
          cửa hàng
        </span>
        <span className="text-xl font-bold text-slate-800">
          {tongKien} kiện{nguong > 0 ? ` / ${nguong}` : ""}
        </span>
      </div>

      {nguong > 0 && (
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={[
              "h-full rounded-full transition-all",
              vuotNguong ? "bg-red-500" : "bg-blue-500",
            ].join(" ")}
            style={{ width: `${Math.min((tongKien / nguong) * 100, 100)}%` }}
          />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {coGiaoKhachChon && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
            <UserRound size={15} />
            Có chuyến giao khách trong lựa chọn — ưu tiên book đúng ngày.
          </p>
        )}
        {vuotNguong && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle size={15} />
            Đã vượt ngưỡng gợi ý ({nguong} kiện) — vẫn có thể book.
          </p>
        )}
        {coLoaiKhacNhau && (
          <p className="flex items-center gap-1.5 text-sm text-amber-600">
            <AlertTriangle size={15} />
            Đang ghép lẫn cả CS và CF trong cùng chuyến.
          </p>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto border-t border-slate-100 pt-4">
          {selectedItems.map((s) => (
            <div
              key={s.key}
              className={[
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                s.coGiaoKhach
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-50 text-slate-600",
              ].join(" ")}
            >
              <span className="truncate pr-2">
                {s.coGiaoKhach && (
                  <UserRound size={13} className="mr-1 inline" />
                )}
                <span className="font-semibold text-slate-800">{s.ma_ch}</span>{" "}
                - {s.ten_ch}
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <span className="font-medium text-slate-500">
                  {s.kien} kiện
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(s)}
                  title="Bỏ chọn"
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const BookForm = memo(function BookForm({
  selectedItems,
  onCancel,
  onConfirm,
  submitting,
}) {
  const ncvGoiY = selectedItems.find((s) => s.ma_ncv)?.ma_ncv || "";
  const tenNvcGoiY = selectedItems.find((s) => s.ten_nvc)?.ten_nvc || "";
  const quanGoiY = selectedItems.every((s) => s.quan === selectedItems[0]?.quan)
    ? selectedItems[0]?.quan || ""
    : "";
  const tongKien = selectedItems.reduce((sum, s) => sum + (s.kien || 0), 0);
  const coGiaoKhach = selectedItems.some((s) => s.coGiaoKhach);

  const [form, setForm] = useState({
    ngayBook: todayStr(),
    gioXuat: "",
    gioToiCh: "",
    ma_ncv: ncvGoiY,
    ten_nvc: tenNvcGoiY,
    quan: quanGoiY,
    ghi_chu: "",
  });
  const [activeSlotIdx, setActiveSlotIdx] = useState(null);

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

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm({
      ...form,
      thoi_gian_xuat: `${form.ngayBook}T${form.gioXuat}`,
      thoi_gian_dk_toi_ch: `${form.ngayBook}T${form.gioToiCh}`,
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
      >
        <ArrowLeft size={15} />
        Quay lại chọn cửa hàng
      </button>

      <div
        className="rounded-xl border p-5 shadow-sm transition-colors"
        style={{
          borderColor: activeColor ? `${activeColor}66` : undefined,
          backgroundColor: activeColor ? `${activeColor}0D` : undefined,
        }}
      >
        <div
          className={[
            "mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-800",
            !activeColor && (coGiaoKhach ? "text-rose-700" : ""),
          ].join(" ")}
        >
          <Truck
            size={17}
            style={{
              color: activeColor || (coGiaoKhach ? "#e11d48" : "#2563eb"),
            }}
          />
          Xác nhận Book chuyến ({selectedItems.length} cửa hàng · {tongKien}{" "}
          kiện)
          {coGiaoKhach && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
              <UserRound size={12} />
              Có giao khách
            </span>
          )}
        </div>

        <div className="mb-4 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-600">
          {selectedItems.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              {s.coGiaoKhach && (
                <UserRound size={12} className="shrink-0 text-rose-500" />
              )}
              <span>
                {s.ma_ch} - {s.ten_ch} ({s.kien} kiện)
              </span>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            Ngày đi hàng <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={form.ngayBook}
              onChange={setField("ngayBook")}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:w-56"
            />
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, ngayBook: todayStr() }))
              }
              className={[
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                form.ngayBook === todayStr()
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, ngayBook: tomorrowStr() }))
              }
              className={[
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                form.ngayBook === tomorrowStr()
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              Ngày mai
            </button>
          </div>
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
                    boxShadow: active ? `0 0 0 1px ${slot.color}66` : undefined,
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
            <p className="mt-1 text-xs text-slate-400">
              Preset chỉ là gợi ý giờ bắt đầu của khung — chỉnh tay nếu cần giờ
              khác trong khung.
            </p>
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
          <div className="sm:col-span-2">
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

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Quay lại chọn
          </button>
          <button
            type="button"
            disabled={!isValid || submitting}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: activeColor || "#2563eb" }}
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? "Đang tạo..." : "Xác nhận Book"}
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Component chính ────────────────────────────────────────────────────────

const BookChuyenModal = ({ open, onClose, onBooked }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // giá trị đã debounce, dùng để lọc thật
  const [quickFilter, setQuickFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedQuan, setSelectedQuan] = useState("");
  const [selectedChuyen, setSelectedChuyen] = useState("");

  const quanOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.quan).filter(Boolean))).sort(),
    [items],
  );
  const chuyenOptions = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.chuyen).filter(Boolean))).sort(),
    [items],
  );
  // Debounce ô search 200ms — tránh lọc lại toàn danh sách mỗi ký tự gõ.
  useEffect(() => {
    const t = setTimeout(
      () => setSearch(searchInput.trim().toLowerCase()),
      200,
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!open) return;
    setSelectedKeys([]);
    setShowForm(false);
    setSearchInput("");
    setSearch("");
    setQuickFilter("all");
    setSelectedQuan(""); // 👈 thêm
    setSelectedChuyen(""); // 👈 thêm
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await bookXeService.suggestBookXe();
      const list = (res?.data ?? []).map((it) => ({
        ...it,
        key: it.key || `${it.nguon}:${it.ma_ch}:${it.sourceId || ""}`,
      }));
      setItems(list);
    } catch (err) {
      console.error("Lỗi khi tải danh sách cửa hàng có thể book:", err);
      setError("Không tải được danh sách. Kiểm tra lại API /bookxe/suggest.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredItems = useMemo(() => {
    let list = items;
    if (search) {
      list = list.filter(
        (it) =>
          it.ma_ch?.toLowerCase().includes(search) ||
          it.ten_ch?.toLowerCase().includes(search),
      );
    }
    if (quickFilter === "giaokhach") list = list.filter((it) => it.coGiaoKhach);
    else if (quickFilter === "kienrot")
      list = list.filter((it) => it.nguon === "kien_rot");
    else if (quickFilter === "ghepchung")
      list = list.filter((it) => it.tungGhepChungVoi?.length);

    if (selectedQuan) list = list.filter((it) => it.quan === selectedQuan);
    if (selectedChuyen)
      list = list.filter((it) => it.chuyen === selectedChuyen);

    return list;
  }, [items, search, quickFilter, selectedQuan, selectedChuyen]);

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const selectedItems = useMemo(
    () => items.filter((it) => selectedKeySet.has(it.key)),
    [items, selectedKeySet],
  );

  const soLuongGiaoKhach = useMemo(
    () => filteredItems.filter((it) => it.coGiaoKhach).length,
    [filteredItems],
  );

  const soLuongKienRot = useMemo(
    () => filteredItems.filter((it) => it.nguon === "kien_rot").length,
    [filteredItems],
  );

  const sortedItems = useMemo(() => {
    return filteredItems
      .map((item) => {
        const checked = selectedKeySet.has(item.key);
        const matchReasons = checked
          ? []
          : getMatchReasons(item, selectedItems);
        return {
          item,
          checked,
          matchReasons,
          matchScore: getMatchScore(matchReasons),
        };
      })
      .sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? -1 : 1;
        if (!a.checked) {
          const gkA = a.item.coGiaoKhach ? 1 : 0;
          const gkB = b.item.coGiaoKhach ? 1 : 0;
          if (gkA !== gkB) return gkB - gkA;

          const rotA = a.item.nguon === "kien_rot" ? 1 : 0;
          const rotB = b.item.nguon === "kien_rot" ? 1 : 0;
          if (rotA !== rotB) return rotB - rotA;

          const diff = b.matchScore - a.matchScore;
          if (diff !== 0) return diff;
        }
        return 0;
      });
  }, [filteredItems, selectedKeySet, selectedItems]);

  const toggleItem = useCallback((item) => {
    setSelectedKeys((prev) =>
      prev.includes(item.key)
        ? prev.filter((k) => k !== item.key)
        : [...prev, item.key],
    );
  }, []);

  const tongKien = useMemo(
    () => selectedItems.reduce((sum, s) => sum + (s.kien || 0), 0),
    [selectedItems],
  );
  const loaiChon = selectedItems[0]?.loaiCuaHang;
  const coLoaiKhacNhau = useMemo(
    () => selectedItems.some((s) => s.loaiCuaHang !== loaiChon),
    [selectedItems, loaiChon],
  );
  const nguong = NGUONG[loaiChon] || 0;
  const vuotNguong = nguong > 0 && tongKien > nguong;
  const coGiaoKhachChon = useMemo(
    () => selectedItems.some((s) => s.coGiaoKhach),
    [selectedItems],
  );

  const handleConfirmBook = useCallback(
    async (form) => {
      setSubmitting(true);
      try {
        const payload = {
          thoi_gian_xuat: new Date(form.thoi_gian_xuat).toISOString(),
          thoi_gian_dk_toi_ch: new Date(form.thoi_gian_dk_toi_ch).toISOString(),
          ngay_di_hang: new Date(
            `${form.ngayBook}T00:00:00+07:00`,
          ).toISOString(),
          quan: form.quan || undefined,
          ma_ncv: form.ma_ncv || undefined,
          ten_nvc: form.ten_nvc || undefined,
          ghi_chu: form.ghi_chu || undefined,

          ma_ch: selectedItems.map((s) => s.ma_ch).join(", "),
          ten_ch: selectedItems.map((s) => s.ten_ch).join(", "),
          so_luong_ch: String(selectedItems.length),
          kien: tongKien,
          lich_di_hang: selectedItems[0]?.lich_di_hang || undefined,
          trangThai: "Chờ xe",
          co_giao_khach: coGiaoKhachChon || undefined,
          ngay_giao_khach: coGiaoKhachChon
            ? selectedItems.find((s) => s.coGiaoKhach)?.ngayGiaoKhach
            : undefined,
          nhan_su_soan_ids: selectedItems.flatMap((s) => s.nhanSuSoanIds || []),
          rot_kien_ids: selectedItems.flatMap((s) => s.rotKienIds || []),
        };

        await bookXeService.createBookXe(payload);
        onBooked?.();

        // 👇 thay vì đóng modal, refresh lại danh sách + reset lựa chọn để book tiếp
        setSelectedKeys([]);
        setShowForm(false);
        setSelectedQuan("");
        setSelectedChuyen("");
        await fetchItems();
      } catch (err) {
        console.error("Lỗi khi tạo chuyến book xe:", err);
        setError("Tạo chuyến thất bại, thử lại.");
      } finally {
        setSubmitting(false);
      }
    },
    [selectedItems, tongKien, coGiaoKhachChon, onBooked, fetchItems],
  );

  const handleShowForm = useCallback(() => setShowForm(true), []);
  const handleCancelForm = useCallback(() => setShowForm(false), []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Truck size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight text-slate-800">
                Thêm Chuyến
              </h2>
              <p className="text-xs text-slate-400">
                Chọn cửa hàng để ghép chuyến book xe
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

        <div className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-5">
          {showForm ? (
            <BookForm
              selectedItems={selectedItems}
              onCancel={handleCancelForm}
              onConfirm={handleConfirmBook}
              submitting={submitting}
            />
          ) : loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              Đang tải danh sách cửa hàng...
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[240px] flex-1">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Tìm mã CH, tên CH..."
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {QUICK_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setQuickFilter(f.key)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        quickFilter === f.key
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      ].join(" ")}
                    >
                      {f.label}
                    </button>
                  ))}

                  <select
                    value={selectedQuan}
                    onChange={(e) => setSelectedQuan(e.target.value)}
                    className={[
                      "cursor-pointer rounded-full border-none px-3 py-1 text-xs font-medium outline-none transition-colors",
                      selectedQuan
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    <option value="">Theo quận</option>
                    {quanOptions.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedChuyen}
                    onChange={(e) => setSelectedChuyen(e.target.value)}
                    className={[
                      "cursor-pointer rounded-full border-none px-3 py-1 text-xs font-medium outline-none transition-colors",
                      selectedChuyen
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    <option value="">Theo chuyến</option>
                    {chuyenOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {(selectedQuan || selectedChuyen) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuan("");
                        setSelectedChuyen("");
                      }}
                      className="rounded-full px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                    >
                      Xoá lọc quận/chuyến
                    </button>
                  )}
                </div>

                {soLuongGiaoKhach > 0 && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                    <UserRound size={14} className="shrink-0" />
                    Có {soLuongGiaoKhach} cửa hàng đang có giao khách — nên ưu
                    tiên book trước.
                  </div>
                )}
                {soLuongKienRot > 0 && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
                    <RotateCcw size={14} className="shrink-0" />
                    Có {soLuongKienRot} cửa hàng có kiện rớt cần rebook lại.
                  </div>
                )}

                {sortedItems.length === 0 ? (
                  <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center text-sm text-slate-400">
                    Không có cửa hàng nào khớp bộ lọc hiện tại.
                  </div>
                ) : (
                  <div className="max-h-[56vh] space-y-2.5 overflow-y-auto pr-1">
                    {sortedItems.map(({ item, checked, matchReasons }) => (
                      <ItemRow
                        key={item.key}
                        item={item}
                        checked={checked}
                        onToggle={toggleItem}
                        matchReasons={matchReasons}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:sticky lg:top-0">
                {selectedItems.length > 0 ? (
                  <SelectionSummary
                    selectedItems={selectedItems}
                    nguong={nguong}
                    tongKien={tongKien}
                    vuotNguong={vuotNguong}
                    coLoaiKhacNhau={coLoaiKhacNhau}
                    coGiaoKhachChon={coGiaoKhachChon}
                    onRemove={toggleItem}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 text-center text-sm text-slate-400">
                    Chọn cửa hàng bên trái, hoặc bấm &quot;Tự động ghép
                    chuyến&quot; để hệ thống chọn sẵn.
                  </div>
                )}

                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={handleShowForm}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CalendarClock size={15} />
                  Tiếp tục Book ({selectedItems.length} cửa hàng)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default BookChuyenModal;
