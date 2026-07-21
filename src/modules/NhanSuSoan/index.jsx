/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/NhanSuSoanTable.jsx
import {
  forwardRef,
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
  Loader2,
} from "lucide-react";
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

// Style riêng cho từng ca: Sáng / Trưa / Chiều / Tối
// Có thêm icon-dot màu để nhận diện nhanh hơn nữa
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
};

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
  // match theo từ khoá chứa trong chuỗi (vd: "CHUYẾN SÁNG 1")
  const found = Object.keys(CHUYEN_STYLE).find((k) => key.includes(k));
  return (found && CHUYEN_STYLE[found]) || CHUYEN_FALLBACK_STYLE;
};

const ChuyenBadge = ({ value }) => {
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
};

const DEFAULT_FILTERS = {
  soDonHang: "",
  soPhieuGop: "",
  trangThai: "",
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

// Mặc định lọc TG import trong 7 ngày gần nhất (tính cả hôm nay)
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

// Mã nhân viên được làm nổi bật hơn: nền trắng, viền rõ, chữ đậm, có hover
const NhanVienChips = ({ list }) => {
  if (!list || list.length === 0)
    return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((nv, idx) => {
        const isObj = nv && typeof nv === "object";
        // ✅ Ưu tiên hiển thị đúng mã đã nhập gốc (ma_hien_thi) — có thể là
        // mã phụ. Fallback ma_nhan_vien cho dữ liệu cũ chưa có field này.
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
};
const EmptyState = ({
  title = "Không có dữ liệu",
  subtitle = "Nhập dữ liệu hoặc điều chỉnh bộ lọc để thấy kết quả.",
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 ring-1 ring-indigo-200 grid place-items-center shadow-inner">
      <PackageSearch size={28} className="text-indigo-400" />
    </div>
    <div className="mt-4 text-lg font-semibold text-slate-700">{title}</div>
    <p className="mt-1 text-slate-500 max-w-md text-sm">{subtitle}</p>
  </div>
);

const filterInputCls =
  "w-full h-7 px-2 text-xs rounded-md border border-slate-300 bg-white/70 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-shadow";

/** Nút lọc theo khoảng ngày (dùng chung cho TG import / TG hoàn thành / TG nhận phiếu / dashboard).
 *  Tự quản lý state hiển thị popup + đóng khi click ra ngoài, báo lên cha qua onChange/onClear.
 *  compact=true: hiển thị nhỏ gọn để đặt vừa trong ô lọc của header bảng. */
const DateRangeFilter = ({
  label,
  startValue,
  endValue,
  onChange,
  onClear,
  compact = false,
}) => {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : null,
      endDate: endValue ? new Date(endValue) : null,
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const wrapRef = useRef(null);

  // Đồng bộ lại nếu giá trị được điều khiển từ cha thay đổi (vd: nút "Xoá lọc" ở nơi khác)
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
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  if (compact) {
    return (
      <div className="relative" ref={wrapRef}>
        <input
          type="text"
          readOnly
          onClick={() => setShow((v) => !v)}
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

        {show && (
          <div className="absolute z-50 mt-1 overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-200">
            <DateRange
              ranges={range}
              onChange={handleRangeChange}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={() => setShow((v) => !v)}
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

      {show && (
        <div className="absolute right-0 z-50 mt-2 overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-200">
          <DateRange
            ranges={range}
            onChange={handleRangeChange}
            moveRangeOnFirstSelection={false}
            maxDate={new Date()}
          />
        </div>
      )}
    </div>
  );
};

/** Tab chuyển đổi giữa Bảng dữ liệu và Dashboard */
const ViewTabs = ({ view, onChange }) => {
  const tabs = [
    { key: "table", label: "Bảng dữ liệu", icon: Table2 },
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
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
};

const NhanSuSoanTable = forwardRef(
  (
    {
      title = "QUẢN LÝ PHIẾU SOẠN",
      description = "Quản lý danh sách phiếu soạn",
    },
    ref,
  ) => {
    const [view, setView] = useState("table"); // "table" | "dashboard"
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState(() => ({
      ...DEFAULT_FILTERS,
      tuNgay: getDefaultTuNgay(),
      denNgay: getDefaultDenNgay(),
    }));

    // Lọc ngày + trạng thái tải riêng cho tab Dashboard, hiển thị chung
    // trong header (thay vì Dashboard tự vẽ header của riêng nó)
    const [dashTuNgay, setDashTuNgay] = useState(getDefaultTuNgay());
    const [dashDenNgay, setDashDenNgay] = useState(getDefaultDenNgay());
    const [dashMeta, setDashMeta] = useState({
      loading: false,
      count: 0,
      error: "",
    });

    const gopPhieuRef = useRef(null);
    const scanGiaoPhieuRef = useRef(null);
    const huyGiaoPhieuRef = useRef(null);
    const scanHoanThanhRef = useRef(null);
    const hasActiveFilter = useMemo(
      () =>
        !!(
          filters.soDonHang ||
          filters.soPhieuGop ||
          filters.trangThai ||
          filters.maNXD ||
          filters.noiXuatDen ||
          filters.chuyen ||
          filters.lichDiHang ||
          filters.nvSoan ||
          filters.nvKC ||
          filters.tuNgayHT ||
          filters.denNgayHT ||
          filters.tuNgayNP ||
          filters.denNgayNP
        ),
      [filters],
    );

    // Gom các phiếu đã gộp (cùng soPhieuGop) đứng cạnh nhau và đẩy lên đầu bảng.
    // Phiếu chưa gộp (soPhieuGop rỗng) giữ nguyên thứ tự, xếp sau các nhóm đã gộp.
    const sortedItems = useMemo(() => {
      if (!items.length) return items;

      const groupMap = new Map(); // soPhieuGop -> mảng item
      const groupOrder = []; // thứ tự xuất hiện đầu tiên của mỗi soPhieuGop
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

      const grouped = groupOrder.flatMap((key) => groupMap.get(key));
      return [...grouped, ...ungrouped];
    }, [items]);

    const fetchNhanSuSoan = useCallback(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await nhanSuSoanService.getAllNhanSuSoan({
          page,
          limit,
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
    }, [page, limit, filters]);
    useEffect(() => {
      const handleGlobalShortcut = (e) => {
        if (!e.altKey) return;
        const tag = document.activeElement?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          document.activeElement?.isContentEditable
        )
          return;

        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          gopPhieuRef.current?.open();
        } else if (key === "x") {
          e.preventDefault();
          scanGiaoPhieuRef.current?.open();
        } else if (key === "c") {
          e.preventDefault();
          huyGiaoPhieuRef.current?.open();
        } else if (key === "v") {
          e.preventDefault();
          scanHoanThanhRef.current?.open();
        }
      };
      document.addEventListener("keydown", handleGlobalShortcut);
      return () =>
        document.removeEventListener("keydown", handleGlobalShortcut);
    }, []);
    useEffect(() => {
      // Chỉ cần gọi API bảng khi đang ở tab "table";
      // tab "dashboard" tự quản lý fetch dữ liệu riêng của nó (qua props ngày).
      if (view === "table") fetchNhanSuSoan();
    }, [fetchNhanSuSoan, view]);

    useImperativeHandle(ref, () => ({ fetchNhanSuSoan }));

    const handleFilterChange = (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    };

    const maxPage = useMemo(
      () => Math.max(1, Math.ceil(total / limit)),
      [total, limit],
    );

    return (
      <div className="mx-auto max-w-[1900px] space-y-4 p-4 md:p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {/* Header dùng chung cho cả 2 tab: tiêu đề + tabs + control theo view đang chọn */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              {title}
            </h1>
            <p className="text-sm text-slate-500">
              {view === "table"
                ? description
                : "Tổng quan đơn hàng theo chuỗi, chuyến, trạng thái và tiến độ xử lý"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ViewTabs view={view} onChange={setView} />

            {view === "table" && (
              <div className="flex flex-wrap items-center gap-2">
                <GopPhieu ref={gopPhieuRef} onSuccess={fetchNhanSuSoan} />
                <ScanGiaoPhieu
                  ref={scanGiaoPhieuRef}
                  onSuccess={fetchNhanSuSoan}
                />
                <HuyGiaoPhieu
                  ref={huyGiaoPhieuRef}
                  onSuccess={fetchNhanSuSoan}
                />
                <ScanHoanThanh
                  ref={scanHoanThanhRef}
                  onSuccess={fetchNhanSuSoan}
                />
                <ImportNhanSuSoan onImported={fetchNhanSuSoan} />
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
                <NhanSuSoanEmployeeLookup />
              </div>
            )}
          </div>
        </div>

        {/* Tab Dashboard: nhận ngày lọc từ header dùng chung ở trên */}
        {view === "dashboard" && (
          <NhanSuSoanDashboard
            tuNgay={dashTuNgay}
            denNgay={dashDenNgay}
            onMeta={setDashMeta}
          />
        )}

        {/* Tab Bảng dữ liệu: giữ nguyên toàn bộ bảng + filter + phân trang cũ */}
        {view === "table" && (
          <>
            {/* Toolbar filter: khoảng ngày TG import */}
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
            </div>

            {/* Table */}
            <div className="overflow-auto rounded-2xl border border-slate-200 shadow-md ring-1 ring-slate-100">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 backdrop-blur">
                  {/* Header row */}
                  <tr className="border-b-2 border-slate-200">
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
                      TG import
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      TG hoàn thành
                    </th>
                    <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                      TG nhận phiếu
                    </th>
                  </tr>

                  {/* Search row - ngay dưới header */}
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.soDonHang}
                        onChange={(e) =>
                          handleFilterChange("soDonHang", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.soPhieuGop}
                        onChange={(e) =>
                          handleFilterChange("soPhieuGop", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.maNXD}
                        onChange={(e) =>
                          handleFilterChange("maNXD", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.noiXuatDen}
                        onChange={(e) =>
                          handleFilterChange("noiXuatDen", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.chuyen}
                        onChange={(e) =>
                          handleFilterChange("chuyen", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.lichDiHang}
                        onChange={(e) =>
                          handleFilterChange("lichDiHang", e.target.value)
                        }
                        placeholder="Lọc..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.nvSoan}
                        onChange={(e) =>
                          handleFilterChange("nvSoan", e.target.value)
                        }
                        placeholder="Lọc mã NV..."
                        className={filterInputCls}
                      />
                    </th>
                    <th className="px-3 py-1.5">
                      <input
                        type="text"
                        value={filters.nvKC}
                        onChange={(e) =>
                          handleFilterChange("nvKC", e.target.value)
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
                        {Array.from({ length: 14 }).map((__, j) => (
                          <td key={`sk-${i}-${j}`} className="px-3 py-3">
                            <div className="h-3 w-24 max-w-full animate-pulse rounded bg-gradient-to-r from-slate-200 to-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {!loading && error && (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-3 py-8 text-center text-rose-600 font-medium"
                      >
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading && !error && items.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-3 py-6">
                        <EmptyState />
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    sortedItems.length > 0 &&
                    sortedItems.map((item, idx) => {
                      const key = (item.soPhieuGop || "").toString().trim();
                      const prevKey = (sortedItems[idx - 1]?.soPhieuGop || "")
                        .toString()
                        .trim();
                      // Vẽ đường phân cách đậm hơn khi chuyển sang nhóm phiếu gộp khác
                      const isGroupBoundary = key !== prevKey && idx !== 0;

                      return (
                        <tr
                          key={item._id}
                          className={`border-b border-slate-100 transition-colors duration-150 hover:bg-blue-50/70 hover:shadow-[inset_3px_0_0_0_theme(colors.blue.400)] ${
                            key
                              ? "bg-indigo-50/40 even:bg-indigo-50/60"
                              : "even:bg-slate-50/70"
                          } ${
                            isGroupBoundary
                              ? "border-t-2 border-t-indigo-200"
                              : ""
                          }`}
                        >
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
                            <ChuyenBadge value={item.chuyen} />
                          </td>
                          {/* lichDiHang là text (VD: "T7/CN"), không phải ngày tháng
                              -> hiển thị trực tiếp, KHÔNG dùng formatDate() */}
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                            {item.lichDiHang || ""}
                          </td>
                          <td className="px-3 py-2">
                            <NhanVienChips
                              list={item.nvSoanChiTiet || item.nvSoan}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <NhanVienChips
                              list={item.nvKCChiTiet || item.nvKC}
                            />
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
                                TRANG_THAI_STYLE[item.trangThai] ||
                                TRANG_THAI_STYLE["Chưa soạn"]
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  TRANG_THAI_DOT[item.trangThai] ||
                                  TRANG_THAI_DOT["Chưa soạn"]
                                }`}
                              />
                              {item.trangThai}
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
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!hasActiveFilter ? (
              <div className="flex flex-col gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-600">
                  Đang hiển thị <b className="text-blue-700">{items.length}</b>{" "}
                  / <b className="text-slate-800">{total}</b> bản ghi
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setPage(1);
                      setLimit(Number(e.target.value));
                    }}
                    className="h-10 rounded-xl border border-teal-300 bg-teal-50 px-3 font-medium text-teal-700 shadow-sm transition-shadow hover:bg-teal-100 hover:shadow-md"
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
                      disabled={page === 1}
                      className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40 disabled:hover:from-indigo-50 disabled:hover:to-purple-50"
                    >
                      ⏮
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
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
                      onChange={(e) => {
                        const v = Number(e.target.value || 1);
                        setPage(Math.min(Math.max(1, v), maxPage));
                      }}
                      className="h-10 w-16 rounded-xl border border-blue-300 bg-blue-50/50 px-2 text-center font-bold text-blue-700 shadow-sm focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                    <span className="px-1 text-sm text-slate-600">
                      / {maxPage}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                      disabled={page >= maxPage}
                      className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
                    >
                      Sau
                    </button>
                    <button
                      onClick={() => setPage(maxPage)}
                      disabled={page >= maxPage}
                      className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40 disabled:hover:from-indigo-50 disabled:hover:to-purple-50"
                    >
                      ⏭
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 text-sm py-4 px-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-xl border border-blue-200 shadow-sm">
                <span className="font-medium text-slate-700">
                  Đang lọc: Hiển thị{" "}
                  <b className="text-blue-600">{items.length}</b> /{" "}
                  <b className="text-slate-800">{total}</b> kết quả
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

NhanSuSoanTable.displayName = "NhanSuSoanTable";

export default NhanSuSoanTable;
