/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/NhanSuSoanTable.jsx
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Sunrise,
  Sun,
  Sunset,
  Moon,
  CalendarDays,
  X,
  PackageSearch,
  Table2,
  LayoutDashboard,
  Users,
  Loader2,
  FileSpreadsheet,
  Trash2,
  Pencil,
  PartyPopper,
  Shuffle,
} from "lucide-react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import ImportNhanSuSoan from "./importexcel";
import ScanGiaoPhieu from "./scangiaophieu";
import ScanHoanThanh from "./scanhoanthanh";
import GopPhieu from "./gopphieu";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";
import HuyGiaoPhieu from "./huygiaophieu";
import NhanSuSoanDashboard from "./dashboard";
import NhanSuSoanEmployeeLookup from "./dashboard/nhansu";

const TRANG_THAI_OPTIONS = ["Chưa soạn", "Đang soạn", "Hoàn thành"];
const TRANG_THAI_BOOK_XE_OPTIONS = ["Chờ Book", "Chờ Xe", "Hoàn thành"];

const TRANG_THAI_STYLE = {
  "Chưa soạn": "text-slate-600 bg-slate-100 border border-slate-200 shadow-sm",
  "Đang soạn":
    "text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 shadow-sm",
  "Hoàn thành":
    "text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 shadow-sm",
};

const TRANG_THAI_DOT = {
  "Chưa soạn": "bg-slate-400",
  "Đang soạn": "bg-amber-500 animate-pulse",
  "Hoàn thành": "bg-emerald-500",
};

const TRANG_THAI_BOOK_XE_STYLE = {
  "Chờ Book":
    "text-orange-700 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 shadow-sm",
  "Chờ Xe":
    "text-sky-700 bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-300 shadow-sm",
  "Hoàn thành":
    "text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 shadow-sm",
};

const TRANG_THAI_BOOK_XE_DOT = {
  "Chờ Book": "bg-orange-500 animate-pulse",
  "Chờ Xe": "bg-sky-500 animate-pulse",
  "Hoàn thành": "bg-emerald-500",
};

// Style riêng cho từng ca: Sáng / Trưa / Chiều / Tối
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
};

const CHUYEN_OPTIONS = [
  "SÁNG",
  "TRƯA",
  "CHIỀU",
  "TỐI",
  "KHAI TRƯƠNG",
  "PHÂN BỔ",
];

const CHUYEN_FALLBACK_STYLE = {
  badge: "text-gray-600 bg-gray-100 border border-gray-200",
  dot: "bg-gray-400",
  icon: null,
  iconColor: "text-gray-400",
};

const getChuyenStyle = (chuyen) => {
  if (!chuyen)
    return {
      ...CHUYEN_FALLBACK_STYLE,
      badge: "text-slate-500 bg-slate-50 border border-slate-200",
    };
  const key = chuyen.toString().trim().toUpperCase().normalize("NFC");
  const found = Object.keys(CHUYEN_STYLE).find((k) => key.includes(k));
  return (found && CHUYEN_STYLE[found]) || CHUYEN_FALLBACK_STYLE;
};

// Wrap memo — badge chỉ phụ thuộc `value`, không cần tính lại khi các dòng
// khác trong bảng re-render.
const ChuyenBadge = memo(function ChuyenBadge({ value }) {
  if (!value) return <span className="text-slate-300">—</span>;
  const style = getChuyenStyle(value);
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-transform hover:scale-105 ${style.badge}`}
    >
      {Icon ? (
        <Icon size={13} className={style.iconColor} strokeWidth={2.5} />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      )}
      {value}
    </span>
  );
});
const DEFAULT_FILTERS = {
  soDonHang: "",
  soPhieuGop: "",
  trangThai: "",
  trangThaiBookXe: "",
  maNXD: "",
  noiXuatDen: "",
  chuyen: "",
  lichDiHang: "",
  nvSoan: "",
  nvKC: "",
  tuNgay: "",
  denNgay: "",
  tuNgayHT: "",
  denNgayHT: "",
  tuNgayNP: "",
  denNgayNP: "",
};
const CHAIN_SODONHANG_PREFIX = { CF: "^TO", CS: "^SO" };

// Các trường lọc dạng gõ chữ — sẽ debounce trước khi thật sự lọc/gọi API,
// tránh gọi lại bảng mỗi lần gõ 1 ký tự.
const TEXT_FILTER_KEYS = [
  "soDonHang",
  "soPhieuGop",
  "maNXD",
  "noiXuatDen",
  "chuyen",
  "lichDiHang",
  "nvSoan",
  "nvKC",
];

// Các filter (ngoài trangThai / trangThaiBookXe) khi có giá trị sẽ khiến bảng
// tải hết toàn bộ kết quả khớp (không phân trang theo trang/limit thật).
const OTHER_FILTER_KEYS = [
  "soDonHang",
  "soPhieuGop",
  "maNXD",
  "noiXuatDen",
  "chuyen",
  "lichDiHang",
  "nvSoan",
  "nvKC",
  "tuNgayHT",
  "denNgayHT",
  "tuNgayNP",
  "denNgayNP",
];

// Giới hạn "lấy hết" khi có filter khác — nếu backend có max limit riêng,
// chỉnh số này cho khớp để tránh bị cắt bớt dữ liệu.
const FETCH_ALL_LIMIT = 100000;

const getDefaultTuNgay = () => dayjs().subtract(6, "day").format("YYYY-MM-DD");
const getDefaultDenNgay = () => dayjs().format("YYYY-MM-DD");

const formatDateTime = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Trả về text thuần (mã hiển thị) từ mảng nvSoan/nvKC, dùng cho export Excel
const nhanVienListToText = (list) => {
  if (!list || list.length === 0) return "";
  return list
    .map((nv) => {
      if (nv && typeof nv === "object")
        return nv.ma_hien_thi || nv.ma_nhan_vien || "";
      return nv;
    })
    .filter(Boolean)
    .join(", ");
};

/** Đọc thông tin người dùng hiện tại từ localStorage.
 *  Dữ liệu lưu dạng object phẳng: { _id, name, username, role }.
 *  Chỉ role === 57 mới được thấy/dùng nút Xoá. */
const getCurrentUserRole = () => {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("userInfo") ||
      localStorage.getItem("auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role ?? null;
  } catch {
    return null;
  }
};

// Mã nhân viên được làm nổi bật hơn — memo vì props chỉ phụ thuộc `list`.
const NhanVienChips = memo(function NhanVienChips({ list }) {
  if (!list || list.length === 0)
    return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((nv, idx) => {
        const isObj = nv && typeof nv === "object";
        const maHienThi = isObj ? nv.ma_hien_thi || nv.ma_nhan_vien : nv;
        const tenNV = isObj ? nv.ten_nhan_vien : "";
        const viaMaPhu = isObj && !!nv.via_ma_phu;

        return (
          <span
            key={idx}
            title={
              viaMaPhu
                ? `${tenNV || ""} — mã phụ (mã chính: ${nv.ma_nhan_vien})`
                : tenNV || ""
            }
            className={`relative rounded-md border bg-white px-1.5 py-0.5 text-xs font-semibold shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
              viaMaPhu
                ? "border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50"
                : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {maHienThi}
            {viaMaPhu && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-blue-500"
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
    </div>
  );
});

const EmptyState = memo(function EmptyState({
  title = "Không có dữ liệu",
  subtitle = "Nhập dữ liệu hoặc điều chỉnh bộ lọc để thấy kết quả.",
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 ring-1 ring-indigo-200 grid place-items-center shadow-inner">
        <PackageSearch size={28} className="text-indigo-400" />
      </div>
      <div className="mt-4 text-lg font-semibold text-slate-700">{title}</div>
      <p className="mt-1 text-slate-500 max-w-md text-sm">{subtitle}</p>
    </div>
  );
});

const filterInputCls =
  "w-full h-7 px-2 text-xs rounded-md border border-slate-300 bg-white/70 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-shadow";

/** Nút lọc theo khoảng ngày (dùng chung cho TG import / TG hoàn thành / TG nhận phiếu / dashboard).
 *  Popup được đẩy ra document.body qua createPortal + position: fixed để
 *  KHÔNG BAO GIỜ bị z-index/overflow của các thẻ StatCard, bảng, hay
 *  container cha che/chèn lên — bất kể bộ lọc này đang nằm ở đâu trong DOM. */
const DateRangeFilter = memo(function DateRangeFilter({
  label,
  startValue,
  endValue,
  onChange,
  onClear,
  compact = false,
}) {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : null,
      endDate: endValue ? new Date(endValue) : null,
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    setRange([
      {
        startDate: startValue ? new Date(startValue) : null,
        endDate: endValue ? new Date(endValue) : null,
        key: "selection",
      },
    ]);
  }, [startValue, endValue]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInput = wrapRef.current?.contains(e.target);
      const clickedPopup = popupRef.current?.contains(e.target);
      if (!clickedInput && !clickedPopup) setShow(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đóng popup khi cuộn trang / đổi kích thước cửa sổ — tránh popup
  // "trôi" sai vị trí vì nó không còn nằm trong luồng absolute nữa.
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [show]);

  const openPopup = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 320;
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      const maxLeft = window.innerWidth - popupWidth - 8;
      if (left > maxLeft) left = maxLeft;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  const handleRangeChange = (item) => {
    const { startDate, endDate } = item.selection;
    setRange([item.selection]);
    onChange(
      startDate ? dayjs(startDate).format("YYYY-MM-DD") : "",
      endDate ? dayjs(endDate).format("YYYY-MM-DD") : "",
    );
  };

  const handleClear = () => {
    setRange([{ startDate: null, endDate: null, key: "selection" }]);
    onClear();
    setShow(false);
  };

  const hasValue = range[0].startDate && range[0].endDate;

  const popup = show && (
    <div
      ref={popupRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
    >
      <DateRange
        ranges={range}
        onChange={handleRangeChange}
        showDateDisplay={false}
        moveRangeOnFirstSelection={false}
        maxDate={new Date()}
      />
    </div>
  );

  if (compact) {
    return (
      <div className="relative" ref={wrapRef}>
        <input
          type="text"
          readOnly
          onClick={openPopup}
          value={
            hasValue
              ? `${dayjs(range[0].startDate).format("DD/MM/YY")} - ${dayjs(range[0].endDate).format("DD/MM/YY")}`
              : ""
          }
          placeholder={label}
          title={label}
          className={`${filterInputCls} cursor-pointer pr-5`}
        />
        {hasValue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Xoá lọc ngày"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <X size={12} />
          </button>
        )}
        {show &&
          typeof document !== "undefined" &&
          createPortal(popup, document.body)}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={
          hasValue
            ? `${dayjs(range[0].startDate).format("DD/MM/YYYY")} - ${dayjs(range[0].endDate).format("DD/MM/YYYY")}`
            : ""
        }
        placeholder={label}
        className="w-60 cursor-pointer rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 pl-9 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md"
      />
      <CalendarDays
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          title="Xoá lọc ngày"
          className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-0.5 text-white shadow transition-colors hover:bg-rose-600"
        >
          <X size={12} />
        </button>
      )}
      {show &&
        typeof document !== "undefined" &&
        createPortal(popup, document.body)}
    </div>
  );
});

/** Tab chuyển đổi giữa Bảng dữ liệu / Dashboard / Năng suất nhân viên */
const ViewTabs = memo(function ViewTabs({ view, onChange }) {
  const tabs = [
    { key: "table", label: "Bảng dữ liệu", icon: Table2 },
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "nhansu", label: "Năng suất NV", icon: Users },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = view === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
              active
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
});

/** 1 dòng dữ liệu trong bảng — tách riêng + memo để khi chỉ có 1-2 dòng đổi
 *  trạng thái chọn/focus, các dòng còn lại không phải render lại.
 *  Khi được chọn (isSelected), dòng "nổi lên" nhẹ bằng translateY + shadow.
 *  `index` là vị trí dòng trong sortedItems — cần thiết để hỗ trợ chọn
 *  nhanh nhiều dòng bằng Shift + click (xem toggleSelectRow ở component cha). */
const TableRow = memo(function TableRow({
  item,
  index,
  isSelected,
  isFocused,
  isGroupBoundary,
  onToggleSelect,
  rowRef,
  shiftPressedRef, // 👈 thêm
  onEditChuyen, // 👈 thêm
}) {
  return (
    <tr
      ref={rowRef}
      style={
        isSelected ? { transform: "translateY(-2px) scale(1.002)" } : undefined
      }
      className={`relative border-b border-slate-100 transition-all duration-200 ease-out will-change-transform hover:bg-blue-50/70 hover:shadow-[inset_3px_0_0_0_theme(colors.blue.400)] ${
        isSelected
          ? "z-10 bg-blue-50 shadow-[0_4px_14px_-2px_rgba(59,130,246,0.35)] ring-1 ring-blue-300"
          : item.soPhieuGop
            ? "bg-indigo-50/40 even:bg-indigo-50/60"
            : "even:bg-slate-50/70"
      } ${isGroupBoundary ? "border-t-2 border-t-indigo-200" : ""} ${
        isFocused
          ? "!bg-blue-50/60 shadow-[inset_3px_0_0_0_theme(colors.blue.500)]"
          : ""
      }`}
    >
      <td className="px-3 py-2 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onMouseDown={(e) => {
            shiftPressedRef.current = e.shiftKey; // ghi nhận Shift NGAY trước khi toggle
          }}
          onChange={() =>
            onToggleSelect(item._id, index, shiftPressedRef.current)
          }
          title="Giữ Shift + click để chọn nhanh nhiều dòng liên tiếp"
          className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600 transition-transform duration-150 checked:scale-110"
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">
        {item.soDonHang}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-slate-700">
        {item.soPhieuGop ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
            {item.soPhieuGop}
          </span>
        ) : (
          ""
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-slate-700">
        {item.maNXD || ""}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-slate-700">
        {item.noiXuatDen || ""}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          type="button"
          onClick={() => onEditChuyen(item)}
          className="group relative inline-flex items-center"
          title="Bấm để sửa Chuyến"
        >
          <ChuyenBadge value={item.chuyen} />
          <Pencil
            size={10}
            strokeWidth={2.5}
            className="absolute -right-1 -top-1 rounded-full bg-white p-[1px] text-slate-400 opacity-0 shadow ring-1 ring-slate-200 transition-opacity group-hover:opacity-100"
          />
        </button>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-slate-700">
        {item.lichDiHang || ""}
      </td>
      <td className="px-3 py-2">
        <NhanVienChips list={item.nvSoanChiTiet || item.nvSoan} />
      </td>
      <td className="px-3 py-2">
        <NhanVienChips list={item.nvKCChiTiet || item.nvKC} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="inline-block rounded-lg bg-gradient-to-r from-green-100 to-emerald-50 px-2 py-1 font-bold text-green-700 shadow-sm">
          {item.kien ?? 0}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="inline-block rounded-lg bg-gradient-to-r from-blue-100 to-sky-50 px-2 py-1 font-bold text-blue-700 shadow-sm">
          {item.dong ?? 0}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold whitespace-nowrap ${
            TRANG_THAI_STYLE[item.trangThai] || TRANG_THAI_STYLE["Chưa soạn"]
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              TRANG_THAI_DOT[item.trangThai] || TRANG_THAI_DOT["Chưa soạn"]
            }`}
          />
          {item.trangThai}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold whitespace-nowrap ${
            TRANG_THAI_BOOK_XE_STYLE[item.trangThaiBookXe] ||
            TRANG_THAI_BOOK_XE_STYLE["Chờ Book"]
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              TRANG_THAI_BOOK_XE_DOT[item.trangThaiBookXe] ||
              TRANG_THAI_BOOK_XE_DOT["Chờ Book"]
            }`}
          />
          {item.trangThaiBookXe || "Chờ Book"}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
        {formatDateTime(item.tgImport)}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
        {formatDateTime(item.tgHoanThanh)}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
        {formatDateTime(item.tgNhanPhieu)}
      </td>
    </tr>
  );
});

const NhanSuSoanTable = forwardRef(
  (
    {
      title = "QUẢN LÝ PHIẾU SOẠN",
      description = "Quản lý danh sách phiếu soạn",
    },
    ref,
  ) => {
    const [view, setView] = useState("table"); // "table" | "dashboard" | "nhansu"
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editingChuyenItem, setEditingChuyenItem] = useState(null);
    const [savingChuyen, setSavingChuyen] = useState(false);
    const [filters, setFilters] = useState(() => ({
      ...DEFAULT_FILTERS,
      tuNgay: getDefaultTuNgay(),
      denNgay: getDefaultDenNgay(),
    }));

    // Chỉ role 57 mới được thấy/dùng nút Xoá.
    const canDelete = useMemo(() => getCurrentUserRole() === 57, []);

    // Bản nháp của các ô lọc dạng gõ chữ — cập nhật UI ngay lập tức,
    // nhưng chỉ đẩy vào `filters` (và gọi API) sau khi ngừng gõ ~350ms.
    const [textFilterDrafts, setTextFilterDrafts] = useState(() => {
      const draft = {};
      TEXT_FILTER_KEYS.forEach((k) => (draft[k] = DEFAULT_FILTERS[k]));
      return draft;
    });
    const appliedTextFiltersRef = useRef(textFilterDrafts);

    useEffect(() => {
      const timer = setTimeout(() => {
        const changed = TEXT_FILTER_KEYS.some(
          (k) => appliedTextFiltersRef.current[k] !== textFilterDrafts[k],
        );
        if (changed) {
          appliedTextFiltersRef.current = textFilterDrafts;
          setFilters((prev) => ({ ...prev, ...textFilterDrafts }));
          setPage(1);
        }
      }, 350);
      return () => clearTimeout(timer);
    }, [textFilterDrafts]);

    const handleTextFilterChange = useCallback((key, value) => {
      setTextFilterDrafts((prev) => ({ ...prev, [key]: value }));
    }, []);

    // Lọc ngày + trạng thái tải riêng cho tab Dashboard
    const [dashTuNgay, setDashTuNgay] = useState(getDefaultTuNgay());
    const [dashDenNgay, setDashDenNgay] = useState(getDefaultDenNgay());
    const [dashMeta, setDashMeta] = useState({
      loading: false,
      count: 0,
      error: "",
    });

    // Danh sách phiếu đang được tick chọn + dòng đang focus bằng bàn phím
    const [selectedMap, setSelectedMap] = useState(() => new Map()); // id -> item đầy đủ

    const selectedIds = useMemo(
      () => new Set(selectedMap.keys()),
      [selectedMap],
    );
    const selectedItems = useMemo(
      () => Array.from(selectedMap.values()),
      [selectedMap],
    );

    const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
    const rowRefs = useRef([]);

    // Hỗ trợ Shift + click: nhớ vị trí dòng vừa được tick gần nhất, và có
    // đang giữ phím Shift hay không. Dùng ref thay vì state để tránh
    // re-render toàn bảng mỗi lần nhấn/nhả Shift.
    const lastCheckedIndexRef = useRef(null);
    const shiftPressedRef = useRef(false); // ghi lại shiftKey ngay trước khi checkbox đổi trạng thái

    const gopPhieuRef = useRef(null);
    const scanGiaoPhieuRef = useRef(null);
    const huyGiaoPhieuRef = useRef(null);
    const scanHoanThanhRef = useRef(null);

    // Các filter (ngoài trạng thái) đang có giá trị -> tải hết dữ liệu khớp
    // thay vì phân trang thật, vì các trường này thường cần xem toàn bộ kết
    // quả khớp cùng lúc (ví dụ tìm theo mã NXĐ, NV soạn...).
    const hasOtherActiveFilter = useMemo(
      () => OTHER_FILTER_KEYS.some((k) => !!filters[k]),
      [filters],
    );

    // Gom các phiếu đã gộp (cùng soPhieuGop) đứng cạnh nhau và đẩy lên đầu bảng.
    // Trong các nhóm đã gộp, nhóm nào vừa được thao tác Gộp Phiếu gần đây
    // nhất sẽ được ưu tiên đứng lên đầu tiên — xác định bằng tgHoanThanh lớn
    // nhất trong nhóm, vì hành động Gộp Phiếu luôn set tgHoanThanh = thời
    // điểm gộp cho toàn bộ phiếu trong nhóm đó.
    const sortedItems = useMemo(() => {
      if (!items.length) return items;

      const groupMap = new Map();
      const groupOrder = [];
      const ungrouped = [];

      items.forEach((item) => {
        const key = (item.soPhieuGop || "").toString().trim();
        if (!key) {
          ungrouped.push(item);
          return;
        }
        if (!groupMap.has(key)) {
          groupMap.set(key, []);
          groupOrder.push(key);
        }
        groupMap.get(key).push(item);
      });

      const groupLatestTime = (key) => {
        const groupItems = groupMap.get(key) || [];
        return groupItems.reduce((latest, it) => {
          const t = it.tgHoanThanh ? new Date(it.tgHoanThanh).getTime() : NaN;
          return Number.isFinite(t) && t > latest ? t : latest;
        }, 0);
      };

      const sortedGroupOrder = [...groupOrder].sort(
        (a, b) => groupLatestTime(b) - groupLatestTime(a),
      );

      const grouped = sortedGroupOrder.flatMap((key) => groupMap.get(key));
      return [...grouped, ...ungrouped];
    }, [items]);

    // Đánh dấu ranh giới nhóm gộp 1 lần duy nhất khi sortedItems đổi,
    // thay vì tính lại prevKey mỗi lần render bảng.
    const groupBoundaryFlags = useMemo(
      () =>
        sortedItems.map((item, idx) => {
          if (idx === 0) return false;
          const key = (item.soPhieuGop || "").toString().trim();
          const prevKey = (sortedItems[idx - 1]?.soPhieuGop || "")
            .toString()
            .trim();
          return key !== prevKey;
        }),
      [sortedItems],
    );

    // Callback ref ổn định theo từng vị trí dòng — chỉ tạo lại khi số dòng
    // thay đổi, giúp TableRow (đã memo) không bị re-render vì prop ref đổi
    // định danh ở mỗi lần render cha.
    const rowRefCallbacks = useMemo(
      () =>
        sortedItems.map((_, idx) => (el) => {
          rowRefs.current[idx] = el;
        }),
      [sortedItems.length],
    );

    const toggleSelectRow = useCallback(
      (id, index, shiftKey) => {
        const prevCheckedIndex = lastCheckedIndexRef.current;

        setSelectedMap((prev) => {
          const next = new Map(prev);
          const canRangeSelect =
            shiftKey && prevCheckedIndex !== null && typeof index === "number";

          if (canRangeSelect) {
            const start = Math.min(prevCheckedIndex, index);
            const end = Math.max(prevCheckedIndex, index);
            for (let i = start; i <= end; i++) {
              const it = sortedItems[i];
              if (it) next.set(it._id, it);
            }
          } else if (next.has(id)) {
            next.delete(id);
          } else {
            const it =
              sortedItems[index] ?? sortedItems.find((x) => x._id === id);
            if (it) next.set(id, it);
          }
          return next;
        });

        if (typeof index === "number") {
          lastCheckedIndexRef.current = index;
          setFocusedRowIndex(index);
        }
      },
      [sortedItems],
    );
    const toggleSelectAll = useCallback(() => {
      setSelectedMap((prev) => {
        if (prev.size === sortedItems.length && sortedItems.length > 0) {
          return new Map();
        }
        const next = new Map();
        sortedItems.forEach((it) => next.set(it._id, it));
        return next;
      });
      lastCheckedIndexRef.current = null;
    }, [sortedItems]);
    useEffect(() => {
      setFocusedRowIndex((prev) => {
        if (sortedItems.length === 0) return -1;
        return Math.min(Math.max(prev, 0), sortedItems.length - 1);
      });
    }, [sortedItems]);

    useEffect(() => {
      rowRefs.current[focusedRowIndex]?.scrollIntoView({ block: "nearest" });
    }, [focusedRowIndex]);

    const fetchNhanSuSoan = useCallback(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await nhanSuSoanService.getAllNhanSuSoan({
          page: hasOtherActiveFilter ? 1 : page,
          limit: hasOtherActiveFilter ? FETCH_ALL_LIMIT : limit,
          ...filters,
        });
        const data = res.data || res.items || [];
        setItems(data);
        setTotal(Number(res.total ?? res.count ?? data.length));
      } catch (err) {
        console.error("Lỗi fetchNhanSuSoan:", err);
        setError("Không tải được dữ liệu Nhân Sự Soạn.");
      } finally {
        setLoading(false);
      }
    }, [page, limit, filters, hasOtherActiveFilter]);

    // Sau khi bất kỳ thao tác nào (gộp / giao / huỷ giao / hoàn thành / xoá)
    // thành công: tải lại bảng và bỏ tích các phiếu đang chọn.
    const handleActionSuccess = useCallback(() => {
      fetchNhanSuSoan();
      setSelectedMap(new Map()); // ✅
      lastCheckedIndexRef.current = null;
    }, [fetchNhanSuSoan]);
    // ✅ MỚI: nhận payload từ Dashboard khi click 1 lát pie ("theo chuyến" /
    // "theo trạng thái") -> áp filter tương ứng lên bảng dữ liệu rồi chuyển
    // view sang "table". Bỏ qua debounce của ô lọc text (soDonHang/chuyen)
    // bằng cách set thẳng cả filters lẫn textFilterDrafts + appliedTextFiltersRef
    // để useEffect debounce không ghi đè lại giá trị vừa set.
    const handleDashboardNavigate = useCallback(
      ({ type, value, chain, tuNgay: navTuNgay, denNgay: navDenNgay }) => {
        const soDonHangPrefix = chain
          ? CHAIN_SODONHANG_PREFIX[chain] || ""
          : "";
        const chuyenValue = type === "chuyen" ? value : "";

        setFilters((prev) => ({
          ...prev,
          soDonHang: soDonHangPrefix,
          chuyen: chuyenValue,
          trangThai: type === "trangThai" ? value : "",
          tuNgay: navTuNgay || prev.tuNgay,
          denNgay: navDenNgay || prev.denNgay,
        }));

        setTextFilterDrafts((prev) => ({
          ...prev,
          soDonHang: soDonHangPrefix,
          chuyen: chuyenValue,
        }));
        appliedTextFiltersRef.current = {
          ...appliedTextFiltersRef.current,
          soDonHang: soDonHangPrefix,
          chuyen: chuyenValue,
        };

        setPage(1);
        setView("table");
      },
      [],
    );
    const handleOpenEditChuyen = useCallback((item) => {
      setEditingChuyenItem(item);
    }, []);

    const handleCloseEditChuyen = useCallback(() => {
      if (savingChuyen) return; // không cho đóng khi đang lưu dở
      setEditingChuyenItem(null);
    }, [savingChuyen]);

    const handleSaveChuyen = useCallback(
      async (newValue) => {
        if (!editingChuyenItem) return;
        setSavingChuyen(true);
        try {
          await nhanSuSoanService.updateNhanSuSoan(editingChuyenItem._id, {
            chuyen: newValue,
          });
          setEditingChuyenItem(null);
          fetchNhanSuSoan();
        } catch (err) {
          console.error("Lỗi cập nhật Chuyến:", err);
          alert("Cập nhật Chuyến thất bại. Vui lòng thử lại.");
        } finally {
          setSavingChuyen(false);
        }
      },
      [editingChuyenItem, fetchNhanSuSoan],
    );

    useEffect(() => {
      const handleGlobalKeyDown = (e) => {
        const active = document.activeElement;
        const tag = active?.tagName;
        const isTypingField =
          (tag === "INPUT" && !["checkbox", "radio"].includes(active.type)) ||
          tag === "TEXTAREA" ||
          active?.isContentEditable;
        if (isTypingField) return;

        // Điều hướng dòng bằng mũi tên + tick chọn bằng Space (không cần Alt)
        if (!e.altKey && view === "table" && sortedItems.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedRowIndex((prev) =>
              Math.min(prev < 0 ? 0 : prev + 1, sortedItems.length - 1),
            );
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            if (focusedRowIndex >= 0 && focusedRowIndex < sortedItems.length) {
              toggleSelectRow(
                sortedItems[focusedRowIndex]._id,
                focusedRowIndex,
                e.shiftKey,
              );
            }
            return;
          }
        }

        if (!e.altKey) return;

        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          gopPhieuRef.current?.open(selectedItems);
        } else if (key === "x") {
          e.preventDefault();
          scanGiaoPhieuRef.current?.open(selectedItems);
        } else if (key === "c") {
          e.preventDefault();
          huyGiaoPhieuRef.current?.open(selectedItems);
        } else if (key === "v") {
          e.preventDefault();
          scanHoanThanhRef.current?.open(selectedItems);
        }
      };
      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }, [selectedItems, focusedRowIndex, sortedItems, view, toggleSelectRow]);

    useEffect(() => {
      if (view === "table") fetchNhanSuSoan();
    }, [fetchNhanSuSoan, view]);

    useImperativeHandle(ref, () => ({ fetchNhanSuSoan }));

    const handleFilterChange = useCallback((key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    }, []);

    const maxPage = useMemo(
      () => Math.max(1, Math.ceil(total / limit)),
      [total, limit],
    );

    const handleExportExcel = useCallback(async () => {
      setExporting(true);
      try {
        let rowsToExport = selectedItems;

        // Không tick dòng nào -> xuất TOÀN BỘ dữ liệu khớp filter hiện tại
        // (bao gồm cả tuNgay/denNgay), không chỉ trang đang hiển thị trên UI.
        if (rowsToExport.length === 0) {
          const res = await nhanSuSoanService.getAllNhanSuSoan({
            page: 1,
            limit: FETCH_ALL_LIMIT,
            ...filters,
          });
          rowsToExport = res.data || res.items || [];
        }

        if (rowsToExport.length === 0) {
          alert("Không có dữ liệu để xuất Excel.");
          return;
        }

        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "SC Logistics";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Phiếu Soạn", {
          views: [{ state: "frozen", ySplit: 1 }],
        });

        sheet.columns = [
          { header: "Số đơn hàng", key: "soDonHang", width: 16 },
          { header: "Số phiếu gộp", key: "soPhieuGop", width: 14 },
          { header: "Mã NXĐ", key: "maNXD", width: 12 },
          { header: "Nơi xuất đến", key: "noiXuatDen", width: 26 },
          { header: "Chuyến", key: "chuyen", width: 10 },
          { header: "Lịch đi hàng", key: "lichDiHang", width: 14 },
          { header: "NV soạn", key: "nvSoan", width: 24 },
          { header: "NV KC", key: "nvKC", width: 24 },
          { header: "Kiện", key: "kien", width: 8 },
          { header: "Dòng", key: "dong", width: 8 },
          { header: "Trạng thái", key: "trangThai", width: 14 },
          { header: "Trạng thái Book Xe", key: "trangThaiBookXe", width: 18 },
          { header: "TG import", key: "tgImport", width: 18 },
          { header: "TG hoàn thành", key: "tgHoanThanh", width: 18 },
          { header: "TG nhận phiếu", key: "tgNhanPhieu", width: 18 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FF1E293B" } };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
        headerRow.height = 22;
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE2E8F0" },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };
        });

        rowsToExport.forEach((item) => {
          sheet.addRow({
            soDonHang: item.soDonHang || "",
            soPhieuGop: item.soPhieuGop || "",
            maNXD: item.maNXD || "",
            noiXuatDen: item.noiXuatDen || "",
            chuyen: item.chuyen || "",
            lichDiHang: item.lichDiHang || "",
            nvSoan: nhanVienListToText(item.nvSoanChiTiet || item.nvSoan),
            nvKC: nhanVienListToText(item.nvKCChiTiet || item.nvKC),
            kien: item.kien ?? 0,
            dong: item.dong ?? 0,
            trangThai: item.trangThai || "",
            trangThaiBookXe: item.trangThaiBookXe || "Chờ Book",
            tgImport: formatDateTime(item.tgImport),
            tgHoanThanh: formatDateTime(item.tgHoanThanh),
            tgNhanPhieu: formatDateTime(item.tgNhanPhieu),
          });
        });

        // Viền + căn giữa cho toàn bộ dữ liệu (trừ header đã set riêng ở trên)
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return;
          row.eachCell({ includeEmpty: false }, (cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
            cell.alignment = { vertical: "middle" };
          });
        });

        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: sheet.columns.length },
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `PhieuSoan_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Lỗi xuất Excel:", err);
        alert("Xuất Excel thất bại. Vui lòng thử lại.");
      } finally {
        setExporting(false);
      }
    }, [selectedItems, filters]);

    // ─── Xoá phiếu — chỉ role 57 ────────────────────────────────────────────
    // Xoá các phiếu đang được tick chọn (bulk), giống cách các thao tác
    // Gộp/Giao/Huỷ giao/Hoàn thành đang dùng selectedItems.
    const handleDeleteSelected = useCallback(async () => {
      if (!canDelete || selectedItems.length === 0) return;

      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn xoá ${selectedItems.length} phiếu đã chọn? Hành động này không thể hoàn tác.`,
      );
      if (!confirmed) return;

      setDeleting(true);
      try {
        await Promise.all(
          selectedItems.map((item) =>
            nhanSuSoanService.deleteNhanSuSoan(item._id),
          ),
        );
        handleActionSuccess();
      } catch (err) {
        console.error("Lỗi xoá phiếu:", err);
        alert("Xoá phiếu thất bại. Vui lòng thử lại.");
      } finally {
        setDeleting(false);
      }
    }, [canDelete, selectedItems, handleActionSuccess]);

    return (
      <div className="mx-auto max-w-[1900px] space-y-4 p-4 md:p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {/* Header dùng chung cho cả 3 tab */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              {title}
            </h1>
            <p className="text-sm text-slate-500">
              {view === "table"
                ? description
                : view === "dashboard"
                  ? "Tổng quan đơn hàng theo chuỗi, chuyến, trạng thái và tiến độ xử lý"
                  : "Năng suất soạn hàng / kiểm chéo theo bộ phận, chức vụ và từng nhân viên"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ViewTabs view={view} onChange={setView} />

            {view === "table" && (
              <div className="flex flex-wrap items-center gap-3">
                {selectedIds.size > 0 && (
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    Đã chọn {selectedIds.size} phiếu
                  </span>
                )}

                {/* Nhóm 1: thao tác xử lý trên phiếu (theo đúng luồng: gộp -> giao -> huỷ giao -> hoàn thành) */}
                <div className="flex flex-wrap items-center gap-2">
                  <GopPhieu ref={gopPhieuRef} onSuccess={handleActionSuccess} />
                  <ScanGiaoPhieu
                    ref={scanGiaoPhieuRef}
                    onSuccess={handleActionSuccess}
                  />
                  <HuyGiaoPhieu
                    ref={huyGiaoPhieuRef}
                    onSuccess={handleActionSuccess}
                  />
                  <ScanHoanThanh
                    ref={scanHoanThanhRef}
                    onSuccess={handleActionSuccess}
                  />
                </div>

                {/* Đường chia nhóm */}
                <div className="hidden h-6 w-px bg-slate-200 sm:block" />

                {/* Nhóm 2: dữ liệu (nhập / xuất / xoá) */}
                <div className="flex flex-wrap items-center gap-2">
                  <ImportNhanSuSoan onImported={fetchNhanSuSoan} />
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={exporting || loading}
                    title={
                      selectedIds.size > 0
                        ? `Xuất Excel ${selectedIds.size} phiếu đã chọn`
                        : "Xuất Excel toàn bộ dữ liệu đang hiển thị"
                    }
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:from-emerald-600 disabled:hover:to-teal-600"
                  >
                    {exporting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={15} />
                    )}
                    {exporting
                      ? "Đang xuất..."
                      : selectedIds.size > 0
                        ? `Xuất Excel (${selectedIds.size})`
                        : "Xuất Excel"}
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={deleting || selectedIds.size === 0}
                      title={
                        selectedIds.size > 0
                          ? `Xoá ${selectedIds.size} phiếu đã chọn`
                          : "Chọn ít nhất 1 phiếu để xoá"
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-rose-700 hover:to-red-700 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:from-rose-600 disabled:hover:to-red-600"
                    >
                      {deleting ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      {deleting
                        ? "Đang xoá..."
                        : selectedIds.size > 0
                          ? `Xoá (${selectedIds.size})`
                          : "Xoá"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {view === "dashboard" && (
              <div className="flex flex-wrap items-center gap-2">
                {dashMeta.loading && (
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                )}
                {!dashMeta.loading && !dashMeta.error && (
                  <span className="text-xs text-slate-400">
                    ({dashMeta.count} bản ghi)
                  </span>
                )}
                <DateRangeFilter
                  label="Lọc theo TG import"
                  startValue={dashTuNgay}
                  endValue={dashDenNgay}
                  onChange={(s, e) => {
                    setDashTuNgay(s);
                    setDashDenNgay(e);
                  }}
                  onClear={() => {
                    setDashTuNgay(getDefaultTuNgay());
                    setDashDenNgay(getDefaultDenNgay());
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab Dashboard */}
        {view === "dashboard" && (
          <NhanSuSoanDashboard
            tuNgay={dashTuNgay}
            denNgay={dashDenNgay}
            onMeta={setDashMeta}
            onNavigate={handleDashboardNavigate}
          />
        )}

        {/* Tab Năng suất nhân viên — tách hẳn khỏi Dashboard để không còn
            bị chèn/đè lên toolbar hay các thẻ số liệu của Dashboard nữa. */}
        {view === "nhansu" && <NhanSuSoanEmployeeLookup />}

        {/* Tab Bảng dữ liệu */}
        {view === "table" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <DateRangeFilter
                label="Lọc theo TG import"
                startValue={filters.tuNgay}
                endValue={filters.denNgay}
                onChange={(start, end) => {
                  setFilters((prev) => ({
                    ...prev,
                    tuNgay: start,
                    denNgay: end,
                  }));
                  setPage(1);
                }}
                onClear={() => {
                  setFilters((prev) => ({ ...prev, tuNgay: "", denNgay: "" }));
                  setPage(1);
                }}
              />
              {selectedIds.size > 0 && (
                <span className="text-xs text-slate-400">
                  Mẹo: giữ <b className="text-slate-600">Shift</b> rồi tick 1
                  dòng khác để chọn nhanh cả khoảng.
                </span>
              )}
            </div>

            {/* Table */}
            <div className="overflow-auto rounded-2xl border border-slate-200 shadow-md ring-1 ring-slate-100">
              <table className="min-w-full text-xs md:text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 backdrop-blur">
                  <tr className="border-b-2 border-slate-200">
                    <th className="w-8 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={
                          sortedItems.length > 0 &&
                          selectedIds.size === sortedItems.length
                        }
                        onChange={toggleSelectAll}
                        title="Chọn tất cả"
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Số đơn hàng
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Số phiếu gộp
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Mã NXĐ
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Nơi xuất đến
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Chuyến
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Lịch đi hàng
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      NV soạn
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      NV KC
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Kiện
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Dòng
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Trạng thái
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      Trạng thái Book Xe
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      TG import
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      TG hoàn thành
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      TG nhận phiếu
                    </th>
                  </tr>

                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-1.5" />
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.soDonHang}
                        onChange={(e) =>
                          handleTextFilterChange("soDonHang", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.soPhieuGop}
                        onChange={(e) =>
                          handleTextFilterChange("soPhieuGop", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.maNXD}
                        onChange={(e) =>
                          handleTextFilterChange("maNXD", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.noiXuatDen}
                        onChange={(e) =>
                          handleTextFilterChange("noiXuatDen", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.chuyen}
                        onChange={(e) =>
                          handleTextFilterChange("chuyen", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.lichDiHang}
                        onChange={(e) =>
                          handleTextFilterChange("lichDiHang", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.nvSoan}
                        onChange={(e) =>
                          handleTextFilterChange("nvSoan", e.target.value)
                        }
                        placeholder="Lọc mã NV..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={textFilterDrafts.nvKC}
                        onChange={(e) =>
                          handleTextFilterChange("nvKC", e.target.value)
                        }
                        placeholder="Lọc mã NV..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5" />
                    <th className="px-3 py-1.5" />
                    <th className="px-3 py-1.5">
                      <select
                        value={filters.trangThai}
                        onChange={(e) =>
                          handleFilterChange("trangThai", e.target.value)
                        }
                        className={filterInputCls}
                      >
                        <option value="">Tất cả</option>
                        {TRANG_THAI_OPTIONS.map((tt) => (
                          <option key={tt} value={tt}>
                            {tt}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-3 py-1.5">
                      <select
                        value={filters.trangThaiBookXe}
                        onChange={(e) =>
                          handleFilterChange("trangThaiBookXe", e.target.value)
                        }
                        className={filterInputCls}
                      >
                        <option value="">Tất cả</option>
                        {TRANG_THAI_BOOK_XE_OPTIONS.map((tt) => (
                          <option key={tt} value={tt}>
                            {tt}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-3 py-1.5" />
                    <th className="px-3 py-1.5">
                      <DateRangeFilter
                        compact
                        label="Lọc ngày..."
                        startValue={filters.tuNgayHT}
                        endValue={filters.denNgayHT}
                        onChange={(start, end) => {
                          setFilters((prev) => ({
                            ...prev,
                            tuNgayHT: start,
                            denNgayHT: end,
                          }));
                          setPage(1);
                        }}
                        onClear={() => {
                          setFilters((prev) => ({
                            ...prev,
                            tuNgayHT: "",
                            denNgayHT: "",
                          }));
                          setPage(1);
                        }}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <DateRangeFilter
                        compact
                        label="Lọc ngày..."
                        startValue={filters.tuNgayNP}
                        endValue={filters.denNgayNP}
                        onChange={(start, end) => {
                          setFilters((prev) => ({
                            ...prev,
                            tuNgayNP: start,
                            denNgayNP: end,
                          }));
                          setPage(1);
                        }}
                        onClear={() => {
                          setFilters((prev) => ({
                            ...prev,
                            tuNgayNP: "",
                            denNgayNP: "",
                          }));
                          setPage(1);
                        }}
                      />
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr
                        key={`skeleton-${i}`}
                        className="border-b border-slate-100"
                      >
                        {Array.from({ length: 16 }).map((__, j) => (
                          <td key={`sk-${i}-${j}`} className="px-3 py-3">
                            <div className="h-3 w-24 max-w-full animate-pulse rounded bg-gradient-to-r from-slate-200 to-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {!loading && error && (
                    <tr>
                      <td
                        colSpan={16}
                        className="px-3 py-8 text-center text-rose-600 font-medium"
                      >
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading && !error && items.length === 0 && (
                    <tr>
                      <td colSpan={16} className="px-3 py-6">
                        <EmptyState />
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    sortedItems.length > 0 &&
                    sortedItems.map((item, idx) => (
                      <TableRow
                        key={item._id}
                        item={item}
                        index={idx}
                        isSelected={selectedIds.has(item._id)}
                        isFocused={idx === focusedRowIndex}
                        isGroupBoundary={groupBoundaryFlags[idx]}
                        onToggleSelect={toggleSelectRow}
                        rowRef={rowRefCallbacks[idx]}
                        shiftPressedRef={shiftPressedRef} // 👈 thêm dòng này
                        onEditChuyen={handleOpenEditChuyen} // 👈 thêm
                      />
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination — luôn hiển thị 1 khối duy nhất. Khi có filter khác
                (ngoài trạng thái) thì fetchNhanSuSoan đã tải hết dữ liệu nên
                maxPage tự nhiên còn 1 trang, không cần nhánh JSX riêng. */}
            <div className="flex flex-col gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-600">
                {hasOtherActiveFilter && (
                  <span className="mr-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    Đang lọc
                  </span>
                )}
                Đang hiển thị <b className="text-blue-700">{items.length}</b> /{" "}
                <b className="text-slate-800">{total}</b> bản ghi
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                  disabled={hasOtherActiveFilter}
                  title={
                    hasOtherActiveFilter
                      ? "Đang lọc — hiển thị toàn bộ kết quả khớp"
                      : undefined
                  }
                  className="h-10 rounded-xl border border-teal-300 bg-teal-50 px-3 font-medium text-teal-700 shadow-sm transition-shadow hover:bg-teal-100 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/trang
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1 || hasOtherActiveFilter}
                    className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40 disabled:hover:from-indigo-50 disabled:hover:to-purple-50"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || hasOtherActiveFilter}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
                  >
                    Trước
                  </button>
                  <span className="px-2 text-sm text-slate-600">Trang</span>
                  <input
                    type="number"
                    min={1}
                    max={maxPage}
                    value={page}
                    disabled={hasOtherActiveFilter}
                    onChange={(e) => {
                      const v = Number(e.target.value || 1);
                      setPage(Math.min(Math.max(1, v), maxPage));
                    }}
                    className="h-10 w-16 rounded-xl border border-blue-300 bg-blue-50/50 px-2 text-center font-bold text-blue-700 shadow-sm focus:ring-2 focus:ring-blue-300 outline-none disabled:opacity-50"
                  />
                  <span className="px-1 text-sm text-slate-600">
                    / {maxPage}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                    disabled={page >= maxPage || hasOtherActiveFilter}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
                  >
                    Sau
                  </button>
                  <button
                    onClick={() => setPage(maxPage)}
                    disabled={page >= maxPage || hasOtherActiveFilter}
                    className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40 disabled:hover:from-indigo-50 disabled:hover:to-purple-50"
                  >
                    ⏭
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {editingChuyenItem &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleCloseEditChuyen();
              }}
            >
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800">
                    Sửa Chuyến — {editingChuyenItem.soDonHang}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseEditChuyen}
                    disabled={savingChuyen}
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                    title="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {CHUYEN_OPTIONS.map((opt) => {
                    const style = getChuyenStyle(opt);
                    const Icon = style.icon;
                    const active = editingChuyenItem.chuyen === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={savingChuyen}
                        onClick={() => handleSaveChuyen(opt)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? `${style.badge} ring-2 ring-offset-1 ring-blue-400`
                            : `${style.badge} opacity-70 hover:opacity-100`
                        }`}
                      >
                        {Icon && (
                          <Icon
                            size={14}
                            className={style.iconColor}
                            strokeWidth={2.5}
                          />
                        )}
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {savingChuyen && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Đang lưu...
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

NhanSuSoanTable.displayName = "NhanSuSoanTable";

export default NhanSuSoanTable;
