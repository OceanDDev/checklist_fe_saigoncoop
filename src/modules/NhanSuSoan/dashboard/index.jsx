/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/NhanSuSoanDashboard.jsx
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Legend,
  LabelList,
} from "recharts";
import {
  Package,
  Store,
  Truck,
  Boxes,
  Clock,
  CalendarDays,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

/* ------------------------------------------------------------------ */
/* Visual identity — clean, international SaaS dashboard              */
/* ------------------------------------------------------------------ */
// One neutral, highly-legible sans (Inter) carries every label and
// heading — the "international" register used by most modern product
// dashboards. Numeric read-outs get a companion mono face with tabular
// figures, so figures stay easy to scan/compare without feeling like an
// industrial signage board.
const FONT_SANS = '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

const useDashboardFonts = () => {
  useEffect(() => {
    const id = "nhansusoan-dashboard-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
};

// Single shared formatter instance — avoids reallocating an
// Intl.NumberFormat on every render of every stat card.
const nf = new Intl.NumberFormat("vi-VN");
const formatNumber = (n) => nf.format(n);

/* ------------------------------------------------------------------ */
/* Re-exported for NhanSuSoanEmployeeLookup (nhansu.jsx), which relies */
/* on this specific portal-based date filter for its own lookup modal. */
/* ------------------------------------------------------------------ */
export const DateRangeFilter = memo(function DateRangeFilter({
  startValue,
  endValue,
  onChange,
  onClear,
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const inputWrapRef = useRef(null);
  const popupRef = useRef(null);
  const range = [
    {
      startDate: startValue ? new Date(startValue) : new Date(),
      endDate: endValue ? new Date(endValue) : new Date(),
      key: "selection",
    },
  ];

  const openPopup = () => {
    const rect = inputWrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 320;
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      const clickedInput = inputWrapRef.current?.contains(e.target);
      const clickedPopup = popupRef.current?.contains(e.target);
      if (!clickedInput && !clickedPopup) setShow(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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

  const hasValue = startValue && endValue;

  return (
    <div className="relative" ref={inputWrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={
          hasValue
            ? `${dayjs(startValue).format("DD/MM/YYYY")} - ${dayjs(endValue).format("DD/MM/YYYY")}`
            : ""
        }
        placeholder="Chọn khoảng ngày import"
        style={{ fontFamily: FONT_MONO }}
        className="w-64 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 pl-9 text-sm text-slate-700 shadow-sm outline-none transition-colors placeholder:font-sans placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <CalendarDays
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          title="Xoá lọc ngày"
          className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-0.5 text-white shadow transition-colors hover:bg-red-500"
        >
          <X size={12} />
        </button>
      )}
      {show &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-slate-200"
          >
            <DateRange
              ranges={range}
              onChange={(item) => {
                const { startDate, endDate } = item.selection;
                onChange(
                  startDate ? dayjs(startDate).format("YYYY-MM-DD") : "",
                  endDate ? dayjs(endDate).format("YYYY-MM-DD") : "",
                );
              }}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Cấu hình & hằng số                                                  */
/* ------------------------------------------------------------------ */

// Số đơn hàng bắt đầu bằng "SO" -> chuỗi CS, bắt đầu bằng "TO" -> chuỗi CF
const classifyChain = (soDonHang) => {
  const code = (soDonHang || "").toString().trim().toUpperCase();
  if (code.startsWith("SO")) return "CS";
  if (code.startsWith("TO")) return "CF";
  return "Khác";
};

const CHAIN_COLORS = { CF: "#16A34A", CS: "#0EA5E9", Khác: "#94a3b8" };
const CHAIN_LABEL = {
  CF: "Co.op Food/ CF",
  CS: "Co.op Smile / CS",
  Khác: "Khác",
};

/* ------------------------------------------------------------------ */
/* Logo 2 chuỗi CF / CS — thay 2 đường dẫn bên dưới bằng logo thật.    */
/*                                                                      */
/* Cách 1 (đơn giản nhất, không cần build/import):                     */
/*   Bỏ 2 file logo vào thư mục public, ví dụ: public/logos/cf.png và   */
/*   public/logos/cs.png, rồi giữ nguyên 2 dòng string bên dưới, chỉ    */
/*   đổi lại tên/đường dẫn cho khớp.                                    */
/*                                                                      */
/* Cách 2 (nếu muốn import qua bundler để tối ưu/cache):                */
/*   import cfLogo from "@/assets/logos/cf-logo.png";                   */
/*   import csLogo from "@/assets/logos/cs-logo.png";                   */
/*   rồi thay giá trị CF/CS bên dưới bằng biến cfLogo/csLogo thay vì    */
/*   chuỗi string.                                                      */
const CHAIN_LOGOS = {
  CF: "/img/coopfood.png",
  CS: "/img/coopsmile.png",
};

// Màu theo chuyến phản ánh sắc độ ánh sáng trong ngày — sáng vàng ấm,
// trưa cam rực, chiều xanh dương dịu, tối chàm sẫm — để bảng màu tự thân
// đã gợi ý đúng khung giờ mà không cần đọc nhãn.
const CHUYEN_ORDER = ["SÁNG", "TRƯA", "CHIỀU", "TỐI"];
const CHUYEN_COLORS = {
  SÁNG: "#FBBF24",
  TRƯA: "#FB923C",
  CHIỀU: "#38BDF8",
  TỐI: "#6366F1",
  Khác: "#94a3b8",
};

const TRANG_THAI_ORDER = ["Chưa soạn", "Đang soạn", "Hoàn thành"];
const TRANG_THAI_COLORS = {
  "Chưa soạn": "#94a3b8",
  "Đang soạn": "#f59e0b",
  "Hoàn thành": "#10b981",
};

// Khung giờ làm việc dùng để tính bình quân đơn/giờ (7h - 17h ~ 10 tiếng)
const WORK_HOUR_START = 7;
const WORK_HOUR_END = 17; // exclusive
const WORK_HOURS_COUNT = WORK_HOUR_END - WORK_HOUR_START;

const chuyenKey = (chuyen) => {
  if (!chuyen) return "Khác";
  const key = chuyen.toString().trim().toUpperCase().normalize("NFC");
  const found = CHUYEN_ORDER.find((k) => key.includes(k));
  return found || "Khác";
};

// Hạn KPI: 24 giờ kể từ TG import. VD 9h hôm nay import, 9h ngày hôm sau
// chưa hoàn thành -> rớt KPI.
const KPI_DEADLINE_HOURS = 24;

const KPI_ORDER = ["Đạt KPI", "Đang soạn (còn hạn)", "Không đạt KPI"];
const KPI_COLORS = {
  "Đạt KPI": "#10b981",
  "Đang soạn (còn hạn)": "#3b82f6",
  "Không đạt KPI": "#ef4444",
};

/**
 * Phân loại 1 phiếu theo KPI (hạn 24h từ tgImport):
 * - "Đạt KPI": đã hoàn thành và tgHoanThanh <= tgImport + 24h
 * - "Đang soạn (còn hạn)": chưa hoàn thành nhưng vẫn còn trong hạn 24h tính từ hiện tại
 * - "Không đạt KPI": hoàn thành trễ (tgHoanThanh > hạn) HOẶC quá hạn 24h mà vẫn chưa hoàn thành
 * Trả về null nếu phiếu không có tgImport (không đủ dữ liệu để tính).
 */
const classifyKPI = (item, now) => {
  if (!item.tgImport) return null;
  const deadline = dayjs(item.tgImport).add(KPI_DEADLINE_HOURS, "hour");

  if (item.trangThai === "Hoàn thành" && item.tgHoanThanh) {
    return dayjs(item.tgHoanThanh).isAfter(deadline)
      ? "Không đạt KPI"
      : "Đạt KPI";
  }

  // Chưa hoàn thành (hoặc thiếu tgHoanThanh dù trạng thái Hoàn thành)
  return now.isAfter(deadline) ? "Không đạt KPI" : "Đang soạn (còn hạn)";
};

/* ------------------------------------------------------------------ */
/* UI phụ trợ                                                          */
/* ------------------------------------------------------------------ */

// StatCard: nền màu nhẹ theo accent (tint), chip logo nổi bật trên nền
// trắng bo tròn + viền màu để logo cửa hàng luôn là điểm nhấn đầu tiên
// mắt chạm vào, số liệu vẫn giữ mono tabular để dễ so sánh.
export const StatCard = memo(function StatCard({
  icon: Icon,
  logo,
  logoAlt,
  label,
  value,
  sub,
  tint,
  iconColor,
  accent,
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-4 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: accent
          ? `linear-gradient(155deg, ${accent}14 0%, ${accent}05 55%, #ffffff 100%)`
          : "linear-gradient(155deg, #f8fafc 0%, #ffffff 60%)",
        borderColor: accent ? `${accent}33` : "#e2e8f0",
        boxShadow: accent
          ? `0 1px 2px rgba(15,23,42,0.04), 0 0 0 1px ${accent}26`
          : undefined,
      }}
    >
      {accent && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ backgroundColor: accent }}
        />
      )}
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.16]"
          style={{ backgroundColor: accent }}
        />
      )}
      <div className="relative flex items-center gap-3">
        <div
          className={
            logo
              ? "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white p-1.5 ring-2"
              : `grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`
          }
          style={
            logo
              ? {
                  boxShadow: accent
                    ? `0 4px 10px -2px ${accent}55`
                    : "0 1px 2px rgba(15,23,42,0.06)",
                  ["--tw-ring-color"]: accent ? `${accent}80` : "#e2e8f0",
                }
              : undefined
          }
        >
          {logo ? (
            <img
              src={logo}
              alt={logoAlt || label}
              className="h-full w-full rounded-md object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Icon size={19} className={iconColor} strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0">
          <div
            className="truncate text-[11.5px] font-semibold uppercase tracking-wide text-slate-500"
            style={{ fontFamily: FONT_SANS }}
          >
            {label}
          </div>
          <div
            className="text-[27px] font-bold leading-tight tracking-tight text-slate-900"
            style={{
              fontFamily: FONT_MONO,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {typeof value === "number" ? formatNumber(value) : value}
          </div>
          {sub && (
            <div
              className="truncate text-[11px] font-medium"
              style={{
                fontFamily: FONT_SANS,
                color: accent || "#94a3b8",
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ChartCard: plain elevated card, clear hierarchy — title in the sans
// face, supporting figure in mono, one thin rule to separate header
// from content.
export const ChartCard = memo(function ChartCard({
  title,
  children,
  className = "",
  eyebrow,
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 transition-shadow duration-200 hover:shadow-md md:p-5 ${className}`}
    >
      <div className="mb-3 flex items-baseline justify-between border-b border-slate-100 pb-3">
        <h3
          className="text-[13.5px] font-semibold text-slate-800"
          style={{ fontFamily: FONT_SANS }}
        >
          {title}
        </h3>
        {eyebrow && (
          <span
            className="text-[11.5px] font-medium text-slate-400"
            style={{ fontFamily: FONT_SANS }}
          >
            {eyebrow}
          </span>
        )}
      </div>
      {children}
    </div>
  );
});

// ChainProgressBar: flat, rounded capacity bar — percentage in mono,
// smooth fill, no decorative tick marks.
const ChainProgressBar = memo(function ChainProgressBar({
  label,
  done,
  total,
  color,
  logo,
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[13px] font-medium text-slate-600">
        <span
          className="flex items-center gap-2"
          style={{ fontFamily: FONT_SANS }}
        >
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-5 w-5 rounded-[4px] object-contain ring-1 ring-slate-100"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
          {label}
        </span>
        <span className="text-slate-500" style={{ fontFamily: FONT_MONO }}>
          {done}/{total} &middot; <b className="text-slate-700">{pct}%</b>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Component chính                                                     */
/* ------------------------------------------------------------------ */

/**
 * Dashboard phiếu soạn.
 * Ngày lọc (tuNgay/denNgay) được điều khiển từ component cha (NhanSuSoanTable)
 * để có thể hiển thị chung một bộ lọc ngày trong header dùng chung của 2 tab.
 * onMeta báo trạng thái loading/số bản ghi lên cha để cha hiển thị trong header.
 */
const NhanSuSoanDashboard = memo(function NhanSuSoanDashboard({
  tuNgay,
  denNgay,
  onMeta,
}) {
  useDashboardFonts();

  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        // Lấy toàn bộ bản ghi trong khoảng ngày để tính toán ở client.
        // Nếu tập dữ liệu lớn, nên đổi sang endpoint tổng hợp riêng ở backend
        // (vd. GET /nhansusoan/dashboard-stats?tuNgay=..&denNgay=..) để tránh
        // tải nặng và tính toán trực tiếp bằng MongoDB aggregation.
        const res = await nhanSuSoanService.getAllNhanSuSoan({
          page: 1,
          limit: 10000,
          tuNgay,
          denNgay,
        });
        if (!cancelled) setRawItems(res.data || res.items || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu dashboard:", err);
        if (!cancelled) setError("Không tải được dữ liệu cho dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [tuNgay, denNgay]);

  // onMeta được "tách" khỏi dependency array của effect báo cáo bên dưới
  // bằng cách đi qua ref. Cha thường truyền một hàm inline mới mỗi lần
  // render — nếu đưa thẳng onMeta vào deps, effect sẽ chạy lại (và có thể
  // gây render loop ở cha) dù loading/count/error không hề đổi.
  const onMetaRef = useRef(onMeta);
  useEffect(() => {
    onMetaRef.current = onMeta;
  }, [onMeta]);

  useEffect(() => {
    onMetaRef.current?.({ loading, count: rawItems.length, error });
  }, [loading, rawItems.length, error]);

  const stats = useMemo(() => {
    const items = rawItems;
    const soDay = Math.max(1, dayjs(denNgay).diff(dayjs(tuNgay), "day") + 1);
    const now = dayjs();

    const totalOrders = items.length;
    const storeSet = new Set();
    const chainStoreSet = { CF: new Set(), CS: new Set(), Khác: new Set() };
    const chainCount = { CF: 0, CS: 0, Khác: 0 };
    const chainDone = { CF: 0, CS: 0, Khác: 0 };
    const chuyenCount = {};
    const trangThaiCount = {};
    const hourCount = {};
    const dayCount = {};
    const kpiCount = {};

    items.forEach((item) => {
      const storeCode = item.maNXD || item.noiXuatDen || "N/A";
      storeSet.add(storeCode);

      const chain = classifyChain(item.soDonHang);
      chainCount[chain] += 1;
      chainStoreSet[chain].add(storeCode);
      if (item.trangThai === "Hoàn thành") chainDone[chain] += 1;

      const ck = chuyenKey(item.chuyen);
      chuyenCount[ck] = (chuyenCount[ck] || 0) + 1;

      const tt = item.trangThai || "Chưa soạn";
      trangThaiCount[tt] = (trangThaiCount[tt] || 0) + 1;

      const kpi = classifyKPI(item, now);
      if (kpi) kpiCount[kpi] = (kpiCount[kpi] || 0) + 1;

      if (item.tgImport) {
        const d = dayjs(item.tgImport);
        const h = d.hour();
        hourCount[h] = (hourCount[h] || 0) + 1;
        const dayKey = d.format("YYYY-MM-DD");
        if (!dayCount[dayKey]) {
          dayCount[dayKey] = {
            "Chưa soạn": 0,
            "Đang soạn": 0,
            "Hoàn thành": 0,
          };
        }
        dayCount[dayKey][tt] = (dayCount[dayKey][tt] || 0) + 1;
      }
    });

    const chuyenData = CHUYEN_ORDER.filter((k) => chuyenCount[k]).map((k) => ({
      name: k,
      value: chuyenCount[k],
      fill: CHUYEN_COLORS[k],
    }));
    if (chuyenCount["Khác"]) {
      chuyenData.push({
        name: "Khác",
        value: chuyenCount["Khác"],
        fill: CHUYEN_COLORS["Khác"],
      });
    }

    const trangThaiData = TRANG_THAI_ORDER.map((k) => ({
      name: k,
      value: trangThaiCount[k] || 0,
      fill: TRANG_THAI_COLORS[k],
    }));

    const kpiData = KPI_ORDER.filter((k) => kpiCount[k]).map((k) => ({
      name: k,
      value: kpiCount[k],
      fill: KPI_COLORS[k],
    }));
    const kpiTotal = kpiData.reduce((s, d) => s + d.value, 0);
    const kpiDatCount = kpiCount["Đạt KPI"] || 0;
    const kpiDatRate =
      kpiTotal > 0 ? Math.round((kpiDatCount / kpiTotal) * 100) : 0;

    const avgPerHour = totalOrders / (soDay * WORK_HOURS_COUNT);

    const hourData = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, "0")}h`,
      soLuong: hourCount[h] || 0,
    }));

    const dayData = Object.keys(dayCount)
      .sort()
      .map((d) => {
        const c = dayCount[d];
        return {
          date: dayjs(d).format("DD/MM"),
          "Chưa soạn": c["Chưa soạn"] || 0,
          "Đang soạn": c["Đang soạn"] || 0,
          "Hoàn thành": c["Hoàn thành"] || 0,
          soLuong:
            (c["Chưa soạn"] || 0) +
            (c["Đang soạn"] || 0) +
            (c["Hoàn thành"] || 0),
        };
      });

    return {
      totalOrders,
      totalStores: storeSet.size,
      chainCount,
      chainDone,
      chainStoreCount: {
        CF: chainStoreSet.CF.size,
        CS: chainStoreSet.CS.size,
      },
      chuyenData,
      trangThaiData,
      kpiData,
      kpiTotal,
      kpiDatRate,
      hourData,
      dayData,
      avgPerHour,
    };
  }, [rawItems, tuNgay, denNgay]);

  // Trạng thái tổng hợp KPI — tính một lần mỗi khi stats đổi, dùng cho
  // thẻ hero (màu, nhãn trạng thái, có cảnh báo hay không).
  const kpiStatus = useMemo(() => {
    const rate = stats.kpiDatRate;
    if (rate >= 90) {
      return {
        color: "#10b981",
        tint: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-emerald-100",
        label: "Đạt chuẩn",
        alert: false,
      };
    }
    if (rate >= 70) {
      return {
        color: "#f59e0b",
        tint: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-amber-100",
        label: "Cần chú ý",
        alert: false,
      };
    }
    return {
      color: "#ef4444",
      tint: "bg-red-50",
      text: "text-red-700",
      ring: "ring-red-100",
      alert: true,
    };
  }, [stats.kpiDatRate]);

  return (
    <div className="space-y-5" style={{ fontFamily: FONT_SANS }}>
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Package}
          label="Tổng đơn hàng"
          value={stats.totalOrders}
          tint="bg-blue-50"
          iconColor="text-blue-600"
          accent="#3B82F6"
        />
        <StatCard
          icon={Store}
          label="Tổng cửa hàng đặt"
          value={stats.totalStores}
          tint="bg-slate-100"
          iconColor="text-slate-600"
          accent="#64748B"
        />
        <StatCard
          icon={Truck}
          logo={CHAIN_LOGOS.CF}
          logoAlt="Co.op Food"
          label="Đơn CF"
          value={stats.chainCount.CF}
          sub={CHAIN_LABEL.CF}
          tint="bg-green-50"
          iconColor="text-green-600"
          accent={CHAIN_COLORS.CF}
        />
        <StatCard
          icon={Store}
          logo={CHAIN_LOGOS.CF}
          logoAlt="Co.op Food"
          label="Cửa hàng CF đặt"
          value={stats.chainStoreCount.CF}
          sub={CHAIN_LABEL.CF}
          tint="bg-green-50"
          iconColor="text-green-600"
          accent={CHAIN_COLORS.CF}
        />
        <StatCard
          icon={Boxes}
          logo={CHAIN_LOGOS.CS}
          logoAlt="Co.op Smile"
          label="Đơn CS"
          value={stats.chainCount.CS}
          sub={CHAIN_LABEL.CS}
          tint="bg-sky-50"
          iconColor="text-sky-600"
          accent={CHAIN_COLORS.CS}
        />
        <StatCard
          icon={Store}
          logo={CHAIN_LOGOS.CS}
          logoAlt="Co.op Smile"
          label="Cửa hàng CS đặt"
          value={stats.chainStoreCount.CS}
          sub={CHAIN_LABEL.CS}
          tint="bg-sky-50"
          iconColor="text-sky-600"
          accent={CHAIN_COLORS.CS}
        />
      </div>

      {/* Chuyến + trạng thái + progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Đơn hàng theo chuyến">
          <ResponsiveContainer width="100%" height={220} debounce={150}>
            <PieChart>
              <Pie
                data={stats.chuyenData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {stats.chuyenData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Đơn hàng theo trạng thái">
          <ResponsiveContainer width="100%" height={220} debounce={150}>
            <PieChart>
              <Pie
                data={stats.trangThaiData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {stats.trangThaiData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tiến độ xử lý theo chuỗi">
          <div className="flex h-[220px] flex-col justify-center gap-6 px-1">
            <ChainProgressBar
              label={CHAIN_LABEL.CF}
              done={stats.chainDone.CF}
              total={stats.chainCount.CF}
              color={CHAIN_COLORS.CF}
              logo={CHAIN_LOGOS.CF}
            />
            <ChainProgressBar
              label={CHAIN_LABEL.CS}
              done={stats.chainDone.CS}
              total={stats.chainCount.CS}
              color={CHAIN_COLORS.CS}
              logo={CHAIN_LOGOS.CS}
            />
            {stats.chainCount["Khác"] > 0 && (
              <ChainProgressBar
                label="Khác"
                done={stats.chainDone["Khác"]}
                total={stats.chainCount["Khác"]}
                color={CHAIN_COLORS["Khác"]}
              />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Thẻ SLA / KPI — điểm nhấn duy nhất của dashboard: một pill trạng   */}
      {/* thái theo màu tín hiệu (xanh/vàng/đỏ), số liệu lớn, và donut nhỏ   */}
      {/* bên cạnh — thay cho phong cách "bảng đèn xưởng" trước đây bằng    */}
      {/* một thẻ sáng, phẳng, đúng chuẩn SaaS quốc tế.                     */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-slate-200/70 md:p-6">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: kpiStatus.color }}
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13.5px] font-semibold text-slate-800">
            Tỉ lệ đạt KPI &middot; hạn 24 giờ kể từ TG import
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${kpiStatus.tint} ${kpiStatus.text} ring-1 ${kpiStatus.ring}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${kpiStatus.alert ? "motion-safe:animate-pulse" : ""}`}
              style={{ backgroundColor: kpiStatus.color }}
            />
            {kpiStatus.label}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex flex-col justify-center">
            <div
              className="text-5xl font-bold leading-none tracking-tight"
              style={{
                fontFamily: FONT_MONO,
                color: kpiStatus.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stats.kpiDatRate}%
            </div>
            <div
              className="mt-2 text-[11.5px] text-slate-400"
              style={{ fontFamily: FONT_MONO }}
            >
              trên {formatNumber(stats.kpiTotal)} phiếu có TG import
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200} debounce={150}>
            <PieChart>
              <Pie
                data={stats.kpiData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {stats.kpiData.map((d, i) => (
                  <Cell key={i} fill={d.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex max-w-[220px] flex-col justify-center gap-1.5 text-[11.5px] leading-relaxed text-slate-500">
            <span className="flex items-start gap-1.5">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-slate-300"
              />
              Phiếu được tính &quot;Đạt KPI&quot; nếu hoàn thành trong vòng 24
              giờ kể từ TG import. Quá hạn mà chưa hoàn thành (hoặc hoàn thành
              trễ) sẽ tính là &quot;Không đạt KPI&quot;.
            </span>
          </div>
        </div>
      </div>

      {/* Đơn theo giờ */}
      <ChartCard
        title="Số lượng đơn hàng phát ra theo từng giờ"
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Clock size={13} className="text-slate-400" />
            Bình quân{" "}
            <b className="text-slate-700">{stats.avgPerHour.toFixed(1)}</b>{" "}
            đơn/giờ ({WORK_HOUR_START}h-{WORK_HOUR_END}h)
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={260} debounce={150}>
          <BarChart
            data={stats.hourData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#eef2f6"
            />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fontFamily: FONT_MONO, fill: "#94a3b8" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fontFamily: FONT_MONO, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                fontFamily: FONT_SANS,
              }}
            />
            <ReferenceLine
              y={stats.avgPerHour}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: "TB/giờ",
                position: "right",
                fill: "#b45309",
                fontSize: 11,
                fontFamily: FONT_SANS,
              }}
            />
            <Bar
              dataKey="soLuong"
              name="Số đơn"
              fill="#4F46E5"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Đơn theo ngày gần nhất — chồng 3 màu theo trạng thái để thấy      */}
      {/* ngay tỉ lệ Chưa soạn / Đang soạn / Hoàn thành mỗi ngày.           */}
      <ChartCard title="Số lượng đơn hàng theo ngày (trong khoảng đã chọn)">
        <ResponsiveContainer width="100%" height={280} debounce={150}>
          <BarChart
            data={stats.dayData}
            margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#eef2f6"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fontFamily: FONT_MONO, fill: "#94a3b8" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fontFamily: FONT_MONO, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                fontFamily: FONT_SANS,
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={28}
              wrapperStyle={{ fontSize: 12, fontFamily: FONT_SANS }}
            />
            <Bar
              dataKey="Chưa soạn"
              name="Chưa soạn"
              stackId="trangThai"
              fill={TRANG_THAI_COLORS["Chưa soạn"]}
              maxBarSize={36}
            />
            <Bar
              dataKey="Đang soạn"
              name="Đang soạn"
              stackId="trangThai"
              fill={TRANG_THAI_COLORS["Đang soạn"]}
              maxBarSize={36}
            />
            <Bar
              dataKey="Hoàn thành"
              name="Hoàn thành"
              stackId="trangThai"
              fill={TRANG_THAI_COLORS["Hoàn thành"]}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            >
              <LabelList
                dataKey="soLuong"
                position="top"
                fontSize={11}
                fill="#475569"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
});

export default NhanSuSoanDashboard;
