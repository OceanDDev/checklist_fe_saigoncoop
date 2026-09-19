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
  Layers,
} from "lucide-react";
import { bookXeService } from "@/services/bookxe/bookxe.service";

const NGUONG = { CS: 120, CF: 180 };

const MATCH_PRIORITY = [
  "tung_ghep_chung",
  "quan",
  "lenh_dieu_dong",
  "ncv",
  "lich_di_hang",
  "chuyen",
];

const MATCH_LABEL = {
  tung_ghep_chung: "Từng ghép chung chuyến",
  quan: "Chung quận",
  lenh_dieu_dong: "Từng đi chung LĐD",
  ncv: "Chung NVC",
  lich_di_hang: "Chung lịch đi hàng",
  chuyen: "Chung chuyến",
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
  { key: "cs", label: "CS" },
  { key: "cf", label: "CF" },
  { key: "ghepchung", label: "Từng ghép chung" },
];

// ─── Helpers thuần (không phụ thuộc state, an toàn để định nghĩa ngoài component) ──

// Lấy phần "gốc" của quận (bookxe), tính trước dấu chấm đầu tiên.
// Vd: "Bình Dương. P Dĩ An" -> "Bình Dương"
const getQuanGoc = (quanBookxe) => {
  if (!quanBookxe) return "";
  return quanBookxe.split(".")[0].trim();
};

// CS: mã CH bắt đầu bằng chữ CH (vd: CH0123).
// CF: mã CH chỉ gồm chữ số (vd: 1234).
const isCS = (maCh) => /^CH/i.test((maCh || "").trim());
const isCF = (maCh) => /^\d+$/.test((maCh || "").trim());

// Chuẩn hoá để lọc không phân biệt hoa/thường và dấu tiếng Việt
// (gõ "sang" vẫn khớp "SÁNG", "toi" khớp "TỐI").
const normalizeText = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

// ════════════════════════════════════════════════════════════════════════
// GHI CHÚ QUAN TRỌNG VỀ MÔ HÌNH DỮ LIỆU (đọc kỹ trước khi sửa logic gộp):
//
// Mỗi item trả về từ API suggestBookXe() thuộc 1 trong 3 NGUỒN kiện độc lập,
// có thể cộng dồn/trùng lặp với nhau trên cùng 1 cửa hàng:
//
//   1) "Giao khách"  — cờ it.coGiaoKhach === true. Có thể trùng thêm với
//      loại (2) hoặc (3) bên dưới (1 item vừa giao khách vừa rớt/phân bổ).
//
//   2) "Bảng rớt kiện" — it.nguon === "kien_rot". Bảng này KHÔNG phải 1 loại
//      kiện duy nhất — nó gộp chung 2 loại con, phân biệt bằng nội dung
//      field ghiChuRotKien:
//        - ghiChuRotKien bắt đầu bằng "Phân Bổ"  -> loại con "Phân bổ"
//        - ghiChuRotKien khác (hoặc rỗng)        -> loại con "Rớt kiện" (mặc định)
//
//   3) "Kiện thường" — không phải giao khách, không thuộc bảng rớt kiện.
//
// => Khi thêm loại kiện mới trong tương lai, chỉ cần sửa isPhanBoItem (hoặc
//    thêm hàm phân loại tương tự) — không được gán trực tiếp coKienRot cho
//    mọi item có nguon === "kien_rot" nữa.
// ════════════════════════════════════════════════════════════════════════
const isPhanBoItem = (it) =>
  (it.ghiChuRotKien || "").trim().toUpperCase().startsWith("PHÂN BỔ");

// Gộp danh sách item "phẳng" thành danh sách nhóm theo mã cửa hàng — 1 cửa
// hàng chỉ hiện 1 dòng, tổng kiện cộng dồn từ tất cả các loại, kèm breakdown
// để hiển thị chi tiết. Đồng thời tiền tính sẵn chuỗi lowercase của mã/tên CH
// và lịch đi hàng để lọc tìm kiếm không phải gọi toLowerCase() lặp lại mỗi
// lần gõ phím.
const groupItemsByCuaHang = (rawItems) => {
  const map = new Map();

  for (const it of rawItems) {
    const gKey = `group:${it.ma_ch}`;
    let g = map.get(gKey);
    if (!g) {
      g = {
        key: gKey,
        ma_ch: it.ma_ch,
        ten_ch: it.ten_ch,
        maChLower: (it.ma_ch || "").toLowerCase(),
        tenChLower: (it.ten_ch || "").toLowerCase(),
        lichLower: "", // được tính sau khi gộp xong (xem cuối hàm)
        chuyenLower: "", // idem — đã bỏ dấu + lowercase để lọc nhanh
        laCS: isCS(it.ma_ch), // mã CH bắt đầu bằng CH
        laCF: isCF(it.ma_ch), // mã CH chỉ gồm chữ số
        kien: 0,
        kienGiaoKhach: 0,
        kienRot: 0,
        kienPhanBo: 0,
        kienBinhThuong: 0,
        coGiaoKhach: false,
        coKienRot: false,
        coPhanBo: false,
        coBinhThuong: false,
        loaiCuaHang: it.loaiCuaHang || "",
        quan_bookxe: it.quan_bookxe || "",
        ten_nvc: it.ten_nvc || "",
        ma_ncv: it.ma_ncv || "",
        lich_di_hang_bookxe: it.lich_di_hang_bookxe || "",
        ghi_chu_nhaxe: it.ghi_chu_nhaxe || "",
        chuyen: it.chuyen || "",
        trangThaiSoan: it.trangThaiSoan,
        tungGhepChungVoi: [],
        lenhDieuDongLienQuan: [],
        ngayGiaoKhach: null,
        ngayRotKien: null,
        ngayPhanBo: null,
        ghiChuRotKien: null,
        ghiChuPhanBo: null,
        subItems: [],
        keys: [],
      };
      map.set(gKey, g);
    }

    const kien = it.kien || 0;
    g.kien += kien;
    g.keys.push(it.key);
    g.subItems.push(it);

    if (it.coGiaoKhach) {
      // Loại 1: Giao khách
      g.coGiaoKhach = true;
      g.kienGiaoKhach += kien;
      g.ngayGiaoKhach = g.ngayGiaoKhach || it.ngayGiaoKhach;
    } else if (it.nguon === "kien_rot" && isPhanBoItem(it)) {
      // Loại 2a: thuộc bảng rớt kiện, ghiChu = "Phân Bổ" -> tách riêng
      g.coPhanBo = true;
      g.kienPhanBo += kien;
      g.ngayPhanBo = g.ngayPhanBo || it.ngayRotKien;
      g.ghiChuPhanBo = g.ghiChuPhanBo || it.ghiChuRotKien;
    } else if (it.nguon === "kien_rot") {
      // Loại 2b: thuộc bảng rớt kiện, ghiChu không phải Phân Bổ -> Rớt kiện
      g.coKienRot = true;
      g.kienRot += kien;
      g.ngayRotKien = g.ngayRotKien || it.ngayRotKien;
      g.ghiChuRotKien = g.ghiChuRotKien || it.ghiChuRotKien;
    } else {
      // Loại 3: Kiện thường
      g.coBinhThuong = true;
      g.kienBinhThuong += kien;
    }

    // Item vừa Giao khách vừa thuộc bảng rớt kiện: nhánh trên chỉ tính vào
    // kienGiaoKhach, cần bổ sung cờ + ngày + ghi chú Phân bổ/Rớt kiện ở đây.
    if (it.nguon === "kien_rot" && it.coGiaoKhach) {
      if (isPhanBoItem(it)) {
        g.coPhanBo = true;
        g.ngayPhanBo = g.ngayPhanBo || it.ngayRotKien;
        g.ghiChuPhanBo = g.ghiChuPhanBo || it.ghiChuRotKien;
      } else {
        g.coKienRot = true;
        g.ngayRotKien = g.ngayRotKien || it.ngayRotKien;
        g.ghiChuRotKien = g.ghiChuRotKien || it.ghiChuRotKien;
      }
    }

    g.quan_bookxe = g.quan_bookxe || it.quan_bookxe || "";
    g.ten_nvc = g.ten_nvc || it.ten_nvc || "";
    g.ma_ncv = g.ma_ncv || it.ma_ncv || "";
    g.lich_di_hang_bookxe =
      g.lich_di_hang_bookxe || it.lich_di_hang_bookxe || "";
    g.ghi_chu_nhaxe = g.ghi_chu_nhaxe || it.ghi_chu_nhaxe || "";
    g.chuyen = g.chuyen || it.chuyen || "";
    g.loaiCuaHang = g.loaiCuaHang || it.loaiCuaHang || "";
    if (it.tungGhepChungVoi?.length)
      g.tungGhepChungVoi.push(...it.tungGhepChungVoi);
    if (it.lenhDieuDongLienQuan?.length)
      g.lenhDieuDongLienQuan.push(...it.lenhDieuDongLienQuan);
  }

  const result = Array.from(map.values());
  // Tiền tính sau khi gộp xong, vì lich_di_hang_bookxe được merge dần trong
  // vòng lặp phía trên.
  for (const g of result) {
    g.lichLower = (g.lich_di_hang_bookxe || "").toLowerCase();
    g.chuyenLower = normalizeText(g.chuyen);
  }
  return result;
};

// Số loại kiện khác nhau đang gộp trong 1 cửa hàng — chỉ có ý nghĩa hiển thị
// (breakdown) khi >= 2.
const getSoLoai = (g) =>
  [g.coGiaoKhach, g.coKienRot, g.coPhanBo, g.coBinhThuong].filter(Boolean)
    .length;

const formatBreakdown = (g) => {
  const parts = [];
  if (g.kienGiaoKhach > 0)
    parts.push({
      label: `${g.kienGiaoKhach} giao khách`,
      cls: "text-rose-600",
    });
  if (g.kienRot > 0)
    parts.push({ label: `${g.kienRot} kiện rớt`, cls: "text-amber-600" });
  if (g.kienPhanBo > 0)
    parts.push({ label: `${g.kienPhanBo} phân bổ`, cls: "text-cyan-600" });
  if (g.kienBinhThuong > 0)
    parts.push({
      label: `${g.kienBinhThuong} kiện thường`,
      cls: "text-blue-600",
    });
  return parts;
};

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
    if (
      item.quan_bookxe &&
      sel.quan_bookxe &&
      getQuanGoc(item.quan_bookxe) === getQuanGoc(sel.quan_bookxe)
    ) {
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
      item.lich_di_hang_bookxe &&
      sel.lich_di_hang_bookxe &&
      item.lich_di_hang_bookxe === sel.lich_di_hang_bookxe
    ) {
      reasons.add("lich_di_hang");
    }
    if (item.chuyen && sel.chuyen && item.chuyen === sel.chuyen) {
      reasons.add("chuyen");
    }
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
  const isKienRot = !!item.coKienRot;
  const isPhanBo = !!item.coPhanBo;
  const chuyenStyle = getChuyenStyle(item.chuyen);
  const ChuyenIcon = chuyenStyle?.icon;
  const soanStyle = TRANG_THAI_SOAN_STYLE[item.trangThaiSoan];
  const SoanIcon = soanStyle?.icon;

  const soLoai = getSoLoai(item);
  const isMixed = soLoai > 1;
  const breakdown = isMixed ? formatBreakdown(item) : [];

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
              : isPhanBo
                ? "border-cyan-300 bg-cyan-50/70 hover:border-cyan-400 hover:shadow-sm"
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
        {isPhanBo && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-600">
            <Shuffle size={13} />
            Phân bổ
            {item.ngayPhanBo ? ` — ngày ${formatNgayVN(item.ngayPhanBo)}` : ""}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {isSuggested && !isGiaoKhach && !isKienRot && !isPhanBo && (
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

          {isMixed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-medium text-fuchsia-600">
              <Layers size={12} />
              Gộp {soLoai} loại kiện
            </span>
          ) : (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                item.coKienRot
                  ? "bg-amber-50 text-amber-600"
                  : item.coPhanBo
                    ? "bg-cyan-50 text-cyan-600"
                    : "bg-blue-50 text-blue-600",
              ].join(" ")}
            >
              {item.coKienRot ? (
                <RotateCcw size={12} />
              ) : item.coPhanBo ? (
                <Shuffle size={12} />
              ) : (
                <PackageCheck size={12} />
              )}
              {item.coKienRot
                ? "Kiện rớt"
                : item.coPhanBo
                  ? "Phân bổ"
                  : "Kiện mới"}
            </span>
          )}
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
          <span className="font-medium text-slate-700">
            {isMixed ? `Tổng ${item.kien} kiện` : `${item.kien} kiện`}
          </span>
          {item.ten_nvc && <span>NVC: {item.ten_nvc}</span>}
          {item.lich_di_hang_bookxe && (
            <span>Lịch: {item.lich_di_hang_bookxe}</span>
          )}
          {item.quan_bookxe && <span>{item.quan_bookxe}</span>}
        </div>
        {isMixed && breakdown.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            {breakdown.map((b) => (
              <span key={b.label} className={`font-medium ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}
        {isKienRot && item.ghiChuRotKien && (
          <div className="mt-1.5 text-[13px] italic text-amber-600">
            Ghi chú: {item.ghiChuRotKien}
          </div>
        )}
        {isPhanBo && item.ghiChuPhanBo && (
          <div className="mt-1.5 text-[13px] italic text-cyan-600">
            Ghi chú: {item.ghiChuPhanBo}
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
  tongKienGoc,
  onTongKienChange,
  vuotNguong,
  coLoaiKhacNhau,
  coGiaoKhachChon,
  coPhanBoChon,
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
        <span className="flex items-center gap-1.5 text-xl font-bold text-slate-800">
          <input
            type="number"
            min={tongKienGoc}
            value={tongKien}
            onChange={(e) => onTongKienChange(Number(e.target.value))}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (Number.isNaN(val) || val < tongKienGoc) {
                onTongKienChange(tongKienGoc);
              }
            }}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-base font-bold text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span>kiện{nguong > 0 ? ` / ${nguong}` : ""}</span>
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
        {tongKien > tongKienGoc && (
          <p className="text-xs text-slate-400">
            Số kiện thực tế theo cửa hàng đã chọn: {tongKienGoc} — đang điều
            chỉnh tăng lên {tongKien}.
          </p>
        )}
        {coGiaoKhachChon && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
            <UserRound size={15} />
            Có chuyến giao khách trong lựa chọn — ưu tiên book đúng ngày.
          </p>
        )}
        {coPhanBoChon && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-cyan-600">
            <Shuffle size={15} />
            Có kiện phân bổ trong lựa chọn.
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
          {selectedItems.map((s) => {
            const soLoai = getSoLoai(s);
            const breakdown = soLoai > 1 ? formatBreakdown(s) : [];
            return (
              <div
                key={s.key}
                className={[
                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                  s.coGiaoKhach
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-50 text-slate-600",
                ].join(" ")}
              >
                <span className="min-w-0 truncate pr-2">
                  {s.coGiaoKhach && (
                    <UserRound size={13} className="mr-1 inline" />
                  )}
                  <span className="font-semibold text-slate-800">
                    {s.ma_ch}
                  </span>{" "}
                  - {s.ten_ch}
                  {breakdown.length > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      ({breakdown.map((b) => b.label).join(" + ")})
                    </span>
                  )}
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
            );
          })}
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
  tongKien,
}) {
  const ncvGoiY = selectedItems.find((s) => s.ma_ncv)?.ma_ncv || "";
  const tenNvcGoiY = selectedItems.find((s) => s.ten_nvc)?.ten_nvc || "";
  const quanGoiY = selectedItems.every(
    (s) => s.quan_bookxe === selectedItems[0]?.quan_bookxe,
  )
    ? selectedItems[0]?.quan_bookxe || ""
    : "";
  const coGiaoKhach = selectedItems.some((s) => s.coGiaoKhach);

  // Ghi chú lấy từ NhaXe (ghi_chu). Chọn 1 cửa hàng: điền nguyên ghi chú;
  // chọn nhiều cửa hàng: mỗi dòng có tiền tố mã CH để biết ghi chú của cửa hàng nào.
  const ghiChuGoiY = selectedItems
    .filter((s) => s.ghi_chu_nhaxe)
    .map((s) =>
      selectedItems.length > 1
        ? `${s.ma_ch}: ${s.ghi_chu_nhaxe}`
        : s.ghi_chu_nhaxe,
    )
    .join("\n");

  const [form, setForm] = useState({
    ngayBook: todayStr(),
    gioXuat: "",
    gioToiCh: "",
    ma_ncv: ncvGoiY,
    ten_nvc: tenNvcGoiY,
    quan: quanGoiY,
    ghi_chu: ghiChuGoiY,
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
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedQuan, setSelectedQuan] = useState("");
  // Lọc chuyến bằng ô input (gõ "sáng" hoặc "sang" -> ra mọi cửa hàng chuyến
  // SÁNG), cũng dùng 2 state để debounce.
  const [chuyenInput, setChuyenInput] = useState("");
  const [chuyenSearch, setChuyenSearch] = useState("");
  // Lọc lịch đi hàng bằng ô input (gõ 7 -> ra mọi lịch có chứa "7"),
  // dùng 2 state giống searchInput/search để debounce.
  const [lichInput, setLichInput] = useState("");
  const [lichSearch, setLichSearch] = useState("");
  const [tongKienOverride, setTongKienOverride] = useState(null);

  // Gộp toàn bộ item theo mã cửa hàng TRƯỚC khi lọc — để 1 cửa hàng có cả
  // giao khách / kiện rớt / phân bổ / kiện thường luôn hiện 1 dòng duy nhất
  // với tổng kiện cộng dồn, dù filter đang áp dụng theo loại nào.
  const groupedAll = useMemo(() => groupItemsByCuaHang(items), [items]);

  const quanOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((i) => getQuanGoc(i.quan_bookxe)).filter(Boolean)),
      ).sort(),
    [items],
  );

  // Debounce 3 ô search (mã/tên CH, chuyến, lịch đi hàng) 200ms — tránh lọc
  // lại toàn danh sách mỗi ký tự gõ.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
      setChuyenSearch(normalizeText(chuyenInput.trim()));
      setLichSearch(lichInput.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(t);
  }, [searchInput, chuyenInput, lichInput]);

  useEffect(() => {
    if (!open) return;
    setSelectedKeys([]);
    setShowForm(false);
    setSearchInput("");
    setSearch("");
    setQuickFilter("all");
    setSelectedQuan("");
    setChuyenInput("");
    setChuyenSearch("");
    setLichInput("");
    setLichSearch("");
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // silent = true: tải lại danh sách ngầm (không bật spinner toàn màn hình),
  // dùng sau khi book xong để giữ nguyên bộ lọc, ô tìm kiếm và vị trí cuộn.
  const fetchItems = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
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

  // Dùng maChLower/tenChLower/lichLower đã tiền tính sẵn trong
  // groupItemsByCuaHang — tránh gọi toLowerCase() lặp lại trên toàn danh sách
  // mỗi lần search đổi.
  const filteredGroups = useMemo(() => {
    let list = groupedAll;
    if (search) {
      list = list.filter(
        (g) => g.maChLower.includes(search) || g.tenChLower.includes(search),
      );
    }
    if (quickFilter === "cs") list = list.filter((g) => g.laCS);
    else if (quickFilter === "cf") list = list.filter((g) => g.laCF);
    else if (quickFilter === "ghepchung")
      list = list.filter((g) => g.tungGhepChungVoi?.length);

    if (selectedQuan)
      list = list.filter((g) => getQuanGoc(g.quan_bookxe) === selectedQuan);
    if (chuyenSearch)
      list = list.filter((g) => g.chuyenLower.includes(chuyenSearch));
    if (lichSearch) list = list.filter((g) => g.lichLower.includes(lichSearch));

    return list;
  }, [groupedAll, search, quickFilter, selectedQuan, chuyenSearch, lichSearch]);

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const selectedItems = useMemo(
    () => groupedAll.filter((g) => selectedKeySet.has(g.key)),
    [groupedAll, selectedKeySet],
  );

  // Gộp 3 lượt đếm (giao khách / kiện rớt / phân bổ) thành 1 lượt reduce duy
  // nhất thay vì gọi .filter() riêng 3 lần trên cùng mảng filteredGroups.
  const { soLuongGiaoKhach, soLuongKienRot, soLuongPhanBo } = useMemo(
    () =>
      filteredGroups.reduce(
        (acc, g) => {
          if (g.coGiaoKhach) acc.soLuongGiaoKhach += 1;
          if (g.coKienRot) acc.soLuongKienRot += 1;
          if (g.coPhanBo) acc.soLuongPhanBo += 1;
          return acc;
        },
        { soLuongGiaoKhach: 0, soLuongKienRot: 0, soLuongPhanBo: 0 },
      ),
    [filteredGroups],
  );

  const sortedItems = useMemo(() => {
    return filteredGroups
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

          const rotA = a.item.coKienRot ? 1 : 0;
          const rotB = b.item.coKienRot ? 1 : 0;
          if (rotA !== rotB) return rotB - rotA;

          const pbA = a.item.coPhanBo ? 1 : 0;
          const pbB = b.item.coPhanBo ? 1 : 0;
          if (pbA !== pbB) return pbB - pbA;

          const diff = b.matchScore - a.matchScore;
          if (diff !== 0) return diff;
        }
        return 0;
      });
  }, [filteredGroups, selectedKeySet, selectedItems]);

  const toggleItem = useCallback((item) => {
    setSelectedKeys((prev) =>
      prev.includes(item.key)
        ? prev.filter((k) => k !== item.key)
        : [...prev, item.key],
    );
  }, []);

  // Tổng kiện "gốc" — cộng dồn thật từ các cửa hàng đã chọn.
  const tongKienGoc = useMemo(
    () => selectedItems.reduce((sum, s) => sum + (s.kien || 0), 0),
    [selectedItems],
  );

  useEffect(() => {
    setTongKienOverride(null);
  }, [selectedKeys]);

  const tongKien =
    tongKienOverride != null && tongKienOverride > tongKienGoc
      ? tongKienOverride
      : tongKienGoc;

  const handleTongKienChange = useCallback(
    (value) => {
      if (value === "" || Number.isNaN(value)) {
        setTongKienOverride(null);
        return;
      }
      setTongKienOverride(Math.max(value, tongKienGoc));
    },
    [tongKienGoc],
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
  const coPhanBoChon = useMemo(
    () => selectedItems.some((s) => s.coPhanBo),
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
          lich_di_hang: selectedItems[0]?.lich_di_hang_bookxe || undefined,
          trangThai: "Chờ xe",
          co_giao_khach: coGiaoKhachChon || undefined,
          ngay_giao_khach: coGiaoKhachChon
            ? selectedItems.find((s) => s.coGiaoKhach)?.ngayGiaoKhach
            : undefined,
          nhan_su_soan_ids: selectedItems.flatMap((s) =>
            s.subItems.flatMap((si) => si.nhanSuSoanIds || []),
          ),
          rot_kien_ids: selectedItems.flatMap((s) =>
            s.subItems.flatMap((si) => si.rotKienIds || []),
          ),
        };

        await bookXeService.createBookXe(payload);
        onBooked?.();

        // Book xong: chỉ bỏ chọn + quay về danh sách để book tiếp chuyến khác.
        // KHÔNG đóng modal và KHÔNG reset bộ lọc (tìm kiếm, quick filter,
        // quận, chuyến, lịch đi hàng đều giữ nguyên).
        setSelectedKeys([]);
        setShowForm(false);
        await fetchItems({ silent: true });
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
              tongKien={tongKien}
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

                  <div className="relative">
                    <Truck
                      size={12}
                      className={[
                        "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2",
                        chuyenInput ? "text-white" : "text-slate-400",
                      ].join(" ")}
                    />
                    <input
                      type="text"
                      value={chuyenInput}
                      onChange={(e) => setChuyenInput(e.target.value)}
                      placeholder="Lọc chuyến..."
                      className={[
                        "w-36 rounded-full border-none py-1 pl-7 pr-3 text-xs font-medium outline-none transition-colors",
                        chuyenInput
                          ? "bg-blue-600 text-white placeholder:text-blue-200"
                          : "bg-slate-100 text-slate-600 placeholder:text-slate-400 hover:bg-slate-200",
                      ].join(" ")}
                    />
                  </div>

                  <div className="relative">
                    <CalendarClock
                      size={12}
                      className={[
                        "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2",
                        lichInput ? "text-white" : "text-slate-400",
                      ].join(" ")}
                    />
                    <input
                      type="text"
                      value={lichInput}
                      onChange={(e) => setLichInput(e.target.value)}
                      placeholder="Lọc lịch đi hàng..."
                      className={[
                        "w-40 rounded-full border-none py-1 pl-7 pr-3 text-xs font-medium outline-none transition-colors",
                        lichInput
                          ? "bg-blue-600 text-white placeholder:text-blue-200"
                          : "bg-slate-100 text-slate-600 placeholder:text-slate-400 hover:bg-slate-200",
                      ].join(" ")}
                    />
                  </div>

                  {(selectedQuan || chuyenInput || lichInput) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuan("");
                        setChuyenInput("");
                        setChuyenSearch("");
                        setLichInput("");
                        setLichSearch("");
                      }}
                      className="rounded-full px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                    >
                      Xoá lọc quận/chuyến/lịch
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
                {soLuongPhanBo > 0 && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3.5 py-2.5 text-xs font-medium text-cyan-700">
                    <Shuffle size={14} className="shrink-0" />
                    Có {soLuongPhanBo} cửa hàng có kiện phân bổ.
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
                    tongKienGoc={tongKienGoc}
                    onTongKienChange={handleTongKienChange}
                    vuotNguong={vuotNguong}
                    coLoaiKhacNhau={coLoaiKhacNhau}
                    coGiaoKhachChon={coGiaoKhachChon}
                    coPhanBoChon={coPhanBoChon}
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
