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
const FONT_SANS =
  '"Be Vietnam Pro", -apple-system, "Segoe UI", Roboto, sans-serif';
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

const nf = new Intl.NumberFormat("vi-VN");
const formatNumber = (n) => nf.format(n);

/* ------------------------------------------------------------------ */
/* CSS nổi bật cho react-date-range                                    */
/* ------------------------------------------------------------------ */
const DateRangeHighlightStyle = () => (
  <style>{`
    .date-range-highlight .rdrInRange {
      background-color: #e0e7ff !important;
    }
    .date-range-highlight .rdrStartEdge,
    .date-range-highlight .rdrEndEdge {
      background-color: #4f46e5 !important;
    }
    .date-range-highlight .rdrDayInPreview,
    .date-range-highlight .rdrDayStartPreview,
    .date-range-highlight .rdrDayEndPreview {
      border-color: #4f46e5 !important;
    }
    .date-range-highlight .rdrDayNumber span {
      font-weight: 600;
    }
    .date-range-highlight .rdrStartEdge ~ .rdrDayNumber span,
    .date-range-highlight .rdrEndEdge ~ .rdrDayNumber span {
      color: #ffffff !important;
    }
    .date-range-highlight .rdrDayToday .rdrDayNumber span:after {
      background: #4f46e5 !important;
    }
  `}</style>
);

/* ------------------------------------------------------------------ */
/* DateRangeFilter — popup căn giữa màn hình (modal)                   */
/* ------------------------------------------------------------------ */
export const DateRangeFilter = memo(function DateRangeFilter({
  startValue,
  endValue,
  onChange,
  onClear,
}) {
  const [show, setShow] = useState(false);
  const range = [
    {
      startDate: startValue ? new Date(startValue) : new Date(),
      endDate: endValue ? new Date(endValue) : new Date(),
      key: "selection",
    },
  ];

  const hasValue = startValue && endValue;

  useEffect(() => {
    if (show) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => e.key === "Escape" && setShow(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        onClick={() => setShow(true)}
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
          <>
            <DateRangeHighlightStyle />
            <div
              onClick={() => setShow(false)}
              className="fixed inset-0 z-[9998] bg-slate-900/45 backdrop-blur-[2px]"
            />
            <div className="fixed left-1/2 top-1/2 z-[9999] w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
              <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-white px-5 py-4">
                <div
                  className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-500"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Khoảng ngày đã chọn
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center ring-1 ring-slate-200">
                    <div
                      className="text-[10px] font-medium text-slate-400"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      Từ ngày
                    </div>
                    <div
                      className="text-sm font-bold text-slate-800"
                      style={{ fontFamily: FONT_MONO }}
                    >
                      {startValue
                        ? dayjs(startValue).format("DD/MM/YYYY")
                        : "--/--/----"}
                    </div>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center ring-1 ring-slate-200">
                    <div
                      className="text-[10px] font-medium text-slate-400"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      Đến ngày
                    </div>
                    <div
                      className="text-sm font-bold text-slate-800"
                      style={{ fontFamily: FONT_MONO }}
                    >
                      {endValue
                        ? dayjs(endValue).format("DD/MM/YYYY")
                        : "--/--/----"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="date-range-highlight">
                <DateRange
                  ranges={range}
                  showDateDisplay={false}
                  onChange={(item) => {
                    const { startDate, endDate } = item.selection;
                    onChange(
                      startDate ? dayjs(startDate).format("YYYY-MM-DD") : "",
                      endDate ? dayjs(endDate).format("YYYY-MM-DD") : "",
                    );
                  }}
                  moveRangeOnFirstSelection={false}
                  maxDate={new Date()}
                  rangeColors={["#4F46E5"]}
                  color="#4F46E5"
                />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={() => {
                    onClear?.();
                    setShow(false);
                  }}
                  className="text-[12.5px] font-medium text-slate-400 hover:text-red-500"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Xoá lọc
                </button>
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:bg-indigo-700"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Xong
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Cấu hình & hằng số                                                  */
/* ------------------------------------------------------------------ */

const classifyChain = (soDonHang) => {
  const code = (soDonHang || "").toString().trim().toUpperCase();
  if (code.startsWith("SO")) return "CS";
  if (code.startsWith("TO")) return "CF";
  return "Khác";
};

// ✅ Prefix regex tương ứng để lọc lại đúng chuỗi trên bảng dữ liệu khi
// nhảy trang từ biểu đồ qua (dùng cho ô lọc "Số đơn hàng", vốn đang lọc
// bằng regex ở backend -> "^TO"/"^SO" khớp đúng logic classifyChain).

const CHAIN_COLORS = { CF: "#16A34A", CS: "#0EA5E9", Khác: "#94a3b8" };
const CHAIN_LABEL = {
  CF: "Co.op Food/ CF",
  CS: "Co.op Smile / CS",
  Khác: "Khác",
};

const CHAIN_LOGOS = {
  CF: "/img/coopfood.png",
  CS: "/img/coopsmile.png",
};

const CHUYEN_ORDER = ["SÁNG", "TRƯA", "CHIỀU", "TỐI", "PHÂN BỔ", "KHAI TRƯƠNG"];
const CHUYEN_COLORS = {
  SÁNG: "#FBBF24",
  TRƯA: "#FB923C",
  CHIỀU: "#38BDF8",
  TỐI: "#6366F1",
  "PHÂN BỔ": "#06B6D4",
  "KHAI TRƯƠNG": "#A855F7",
  Khác: "#94a3b8",
};

const TRANG_THAI_ORDER = ["Chưa soạn", "Đang soạn", "Hoàn thành"];
const TRANG_THAI_COLORS = {
  "Chưa soạn": "#94a3b8",
  "Đang soạn": "#f59e0b",
  "Hoàn thành": "#10b981",
};

const WORK_HOUR_START = 7;
const WORK_HOUR_END = 17;
const WORK_HOURS_COUNT = WORK_HOUR_END - WORK_HOUR_START;

const chuyenKey = (chuyen) => {
  if (!chuyen) return "Khác";
  const key = chuyen.toString().trim().toUpperCase().normalize("NFC");
  const found = CHUYEN_ORDER.find((k) => key.includes(k));
  return found || "Khác";
};

const KPI_DEADLINE_HOURS = 24;
const KPI_ORDER = ["Đạt KPI", "Đang soạn (còn hạn)", "Không đạt KPI"];
const KPI_COLORS = {
  "Đạt KPI": "#10b981",
  "Đang soạn (còn hạn)": "#3b82f6",
  "Không đạt KPI": "#ef4444",
};

const classifyKPI = (item, now) => {
  if (!item.tgImport) return null;
  const deadline = dayjs(item.tgImport).add(KPI_DEADLINE_HOURS, "hour");

  if (item.trangThai === "Hoàn thành" && item.tgHoanThanh) {
    return dayjs(item.tgHoanThanh).isAfter(deadline)
      ? "Không đạt KPI"
      : "Đạt KPI";
  }
  return now.isAfter(deadline) ? "Không đạt KPI" : "Đang soạn (còn hạn)";
};

/* ------------------------------------------------------------------ */
/* Thuật toán đặt label số liệu ngoài donut kèm đường dẫn              */
/* ------------------------------------------------------------------ */
const RADIAN = Math.PI / 180;

const computePieLabelLayout = (data, cx, cy, outerRadius, chartHeight) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const labelRadius = outerRadius + 22;
  const anchorRadius = outerRadius + 4;
  const rowHeight = 18;

  const minY = 14;
  const maxY = chartHeight - 14;

  let cumulated = 0;
  const positioned = data.map((d) => {
    const sweep = (d.value / total) * 360;
    const midAngle = cumulated + sweep / 2;
    cumulated += sweep;

    const rad = -midAngle * RADIAN;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
      ...d,
      percent: d.value / total,
      x: cx + labelRadius * cos,
      rawY: cy + labelRadius * sin,
      anchorX: cx + anchorRadius * cos,
      anchorY: cy + anchorRadius * sin,
      side: cos >= 0 ? "right" : "left",
    };
  });

  ["left", "right"].forEach((side) => {
    const group = positioned
      .filter((p) => p.side === side)
      .sort((a, b) => a.rawY - b.rawY);
    if (group.length === 0) return;

    const neededHeight = (group.length - 1) * rowHeight;
    const availableHeight = maxY - minY;

    if (neededHeight <= availableHeight) {
      for (let i = 1; i < group.length; i++) {
        const gap = group[i].rawY - group[i - 1].rawY;
        if (gap < rowHeight) group[i].rawY = group[i - 1].rawY + rowHeight;
      }
    } else {
      const avgY = group.reduce((s, p) => s + p.rawY, 0) / group.length;
      let startY = avgY - neededHeight / 2;
      startY = Math.max(minY, Math.min(startY, maxY - neededHeight));
      group.forEach((p, i) => {
        p.rawY = startY + i * rowHeight;
      });
    }

    group.forEach((p) => {
      p.y = Math.max(minY, Math.min(p.rawY, maxY));
    });
  });

  return positioned;
};

const usePieLabelRenderer = (data, chartHeight) =>
  useMemo(() => {
    let layoutCache = null;
    let cacheKey = null;

    return function PieLabel(props) {
      const { cx, cy, outerRadius, index } = props;
      const key = `${cx}-${cy}-${outerRadius}-${chartHeight}`;
      if (!layoutCache || cacheKey !== key) {
        layoutCache = computePieLabelLayout(
          data,
          cx,
          cy,
          outerRadius,
          chartHeight,
        );
        cacheKey = key;
      }

      const pos = layoutCache[index];
      if (!pos) return null;

      const isRight = pos.side === "right";
      const textX = pos.x + (isRight ? 6 : -6);

      return (
        <g>
          <polyline
            points={`${pos.anchorX},${pos.anchorY} ${pos.x},${pos.y}`}
            fill="none"
            stroke={pos.fill || "#cbd5e1"}
            strokeWidth={1.25}
          />
          <circle cx={pos.anchorX} cy={pos.anchorY} r={2.5} fill={pos.fill} />
          <text
            x={textX}
            y={pos.y}
            textAnchor={isRight ? "start" : "end"}
            dominantBaseline="central"
            fontSize={12.5}
            fontFamily={FONT_MONO}
            fontWeight={700}
            fill={pos.fill}
          >
            {formatNumber(pos.value)}
          </text>
        </g>
      );
    };
  }, [data, chartHeight]);

/* ------------------------------------------------------------------ */
/* StatCard                                                            */
/* ------------------------------------------------------------------ */
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
  capturing,
}) {
  if (capturing) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          background: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#64748b",
            marginBottom: 4,
            whiteSpace: "normal",
            wordBreak: "break-word",
            letterSpacing: "normal",
          }}
        >
          {typeof label === "string" ? label.toLocaleUpperCase("vi-VN") : label}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#0f172a",
            letterSpacing: "normal",
          }}
        >
          {typeof value === "number" ? formatNumber(value) : value}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: accent || "#94a3b8",
              marginTop: 2,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {sub}
          </div>
        )}
      </div>
    );
  }

  const wrapperClass =
    "group relative rounded-2xl p-4 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg";

  const wrapperStyle = {
    background: accent
      ? `linear-gradient(155deg, ${accent}14 0%, ${accent}05 55%, #ffffff 100%)`
      : "linear-gradient(155deg, #f8fafc 0%, #ffffff 60%)",
    borderColor: accent ? `${accent}33` : "#e2e8f0",
    boxShadow: accent
      ? `0 1px 2px rgba(15,23,42,0.04), 0 0 0 1px ${accent}26`
      : undefined,
  };

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {accent && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.16]"
            style={{ backgroundColor: accent }}
          />
        </div>
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
            className="truncate pt-0.5 text-[11.5px] font-semibold leading-[1.6] tracking-wide text-slate-500"
            style={{ fontFamily: FONT_SANS }}
          >
            {typeof label === "string"
              ? label.toLocaleUpperCase("vi-VN")
              : label}
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
              style={{ fontFamily: FONT_SANS, color: accent || "#94a3b8" }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

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
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
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

/* ------------------------------------------------------------------ */
/* ChainProgressBar                                                    */
/* ------------------------------------------------------------------ */
const ChainProgressBar = memo(function ChainProgressBar({
  label,
  counts,
  total,
  logo,
}) {
  const segments = TRANG_THAI_ORDER.map((key) => ({
    key,
    value: counts[key] || 0,
    color: TRANG_THAI_COLORS[key],
    pct: total > 0 ? ((counts[key] || 0) / total) * 100 : 0,
  }));
  const doneCount = counts["Hoàn thành"] || 0;
  const donePct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

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
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          )}
          {label}
        </span>
        <span className="text-slate-500" style={{ fontFamily: FONT_MONO }}>
          {doneCount}/{total} &middot;{" "}
          <b className="text-slate-700">{donePct}%</b>
        </span>
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.key}
                title={`${s.key}: ${s.value}`}
                className="h-full transition-all duration-500"
                style={{ width: `${s.pct}%`, backgroundColor: s.color }}
              />
            ),
        )}
      </div>

      <div
        className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-400"
        style={{ fontFamily: FONT_SANS }}
      >
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.key} <b className="text-slate-600">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* ChainFilterToggle — 2 logo CF/CS để lọc riêng 2 pie "chuyến" và     */
/* "trạng thái". Click lại logo đang chọn hoặc nút "Xoá lọc" để về lại */
/* toàn bộ dữ liệu.                                                    */
/* ------------------------------------------------------------------ */
const ChainFilterToggle = memo(function ChainFilterToggle({
  selectedChain,
  onSelect,
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSelect(selectedChain === "CF" ? null : "CF")}
        title="Lọc theo Co.op Food / CF"
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white p-1 ring-2 transition-all ${
          selectedChain === "CF"
            ? "scale-105 ring-green-500"
            : "opacity-50 ring-slate-200 hover:opacity-100 hover:ring-slate-300"
        }`}
      >
        <img
          src={CHAIN_LOGOS.CF}
          alt="CF"
          className="h-full w-full rounded-[4px] object-contain"
        />
      </button>
      <button
        type="button"
        onClick={() => onSelect(selectedChain === "CS" ? null : "CS")}
        title="Lọc theo Co.op Smile / CS"
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white p-1 ring-2 transition-all ${
          selectedChain === "CS"
            ? "scale-105 ring-sky-500"
            : "opacity-50 ring-slate-200 hover:opacity-100 hover:ring-slate-300"
        }`}
      >
        <img
          src={CHAIN_LOGOS.CS}
          alt="CS"
          className="h-full w-full rounded-[4px] object-contain"
        />
      </button>
      {selectedChain && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-[10.5px] font-medium text-slate-400 hover:text-red-500"
        >
          Xoá lọc
        </button>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Component chính                                                     */
/* ------------------------------------------------------------------ */

const NhanSuSoanDashboard = memo(function NhanSuSoanDashboard({
  tuNgay,
  denNgay,
  onMeta,
  // ✅ MỚI: gọi khi người dùng click vào 1 lát của pie "theo chuyến" hoặc
  // "theo trạng thái". Nhận về { type: "chuyen" | "trangThai", value,
  // chain, tuNgay, denNgay } — component cha (NhanSuSoanTable) dùng object
  // này để chuyển qua tab Bảng dữ liệu và áp đúng bộ lọc tương ứng.
  onNavigate,
}) {
  useDashboardFonts();

  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ MỚI: lọc riêng cho 2 biểu đồ "theo chuyến" / "theo trạng thái" —
  // click logo CF/CS chỉ ảnh hưởng 2 pie này, không ảnh hưởng các thẻ số
  // liệu / biểu đồ khác (vẫn hiện toàn bộ dữ liệu như cũ).
  const [selectedChain, setSelectedChain] = useState(null); // null | "CF" | "CS"

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
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
    const chainTrangThai = {
      CF: { "Chưa soạn": 0, "Đang soạn": 0, "Hoàn thành": 0 },
      CS: { "Chưa soạn": 0, "Đang soạn": 0, "Hoàn thành": 0 },
      Khác: { "Chưa soạn": 0, "Đang soạn": 0, "Hoàn thành": 0 },
    };
    const hourCount = {};
    const dayCount = {};
    const kpiCount = {};

    items.forEach((item) => {
      const storeCode = item.maNXD || item.noiXuatDen || "N/A";
      storeSet.add(storeCode);

      const chain = classifyChain(item.soDonHang);
      const tt = item.trangThai || "Chưa soạn";

      chainCount[chain] += 1;
      chainStoreSet[chain].add(storeCode);
      if (tt === "Hoàn thành") chainDone[chain] += 1;
      chainTrangThai[chain][tt] = (chainTrangThai[chain][tt] || 0) + 1;

      const kpi = classifyKPI(item, now);
      if (kpi) kpiCount[kpi] = (kpiCount[kpi] || 0) + 1;

      if (item.tgNhanPhieu) {
        const dNhan = dayjs(item.tgNhanPhieu);
        const h = dNhan.hour();
        hourCount[h] = (hourCount[h] || 0) + 1;
      }

      if (item.tgImport) {
        const d = dayjs(item.tgImport);
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
      chainTrangThai,
      chainStoreCount: {
        CF: chainStoreSet.CF.size,
        CS: chainStoreSet.CS.size,
      },
      kpiData,
      kpiTotal,
      kpiDatRate,
      hourData,
      dayData,
      avgPerHour,
    };
  }, [rawItems, tuNgay, denNgay]);

  // ✅ MỚI: dữ liệu riêng cho 2 pie "theo chuyến" / "theo trạng thái",
  // được tính lại theo `selectedChain` (lọc bằng logo CF/CS).
  const chartFilteredItems = useMemo(() => {
    if (!selectedChain) return rawItems;
    return rawItems.filter(
      (item) => classifyChain(item.soDonHang) === selectedChain,
    );
  }, [rawItems, selectedChain]);

  const chainChartStats = useMemo(() => {
    const chuyenCount = {};
    const trangThaiCount = {};

    chartFilteredItems.forEach((item) => {
      const ck = chuyenKey(item.chuyen);
      chuyenCount[ck] = (chuyenCount[ck] || 0) + 1;

      const tt = item.trangThai || "Chưa soạn";
      trangThaiCount[tt] = (trangThaiCount[tt] || 0) + 1;
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

    return { chuyenData, trangThaiData };
  }, [chartFilteredItems]);

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

  const chuyenLabel = usePieLabelRenderer(chainChartStats.chuyenData, 280);
  const trangThaiLabel = usePieLabelRenderer(
    chainChartStats.trangThaiData,
    280,
  );
  const kpiLabel = usePieLabelRenderer(stats.kpiData, 230);

  // ✅ MỚI: click vào 1 lát pie -> báo lên component cha (qua onNavigate)
  // để nhảy qua tab Bảng dữ liệu, áp đúng bộ lọc: chuỗi (nếu đang chọn
  // logo CF/CS) + chuyến/trạng thái vừa click + khoảng ngày đang xem.
  const handleSliceClick = (type, value) => {
    if (!onNavigate) return;
    onNavigate({
      type, // "chuyen" | "trangThai"
      value,
      chain: selectedChain, // null | "CF" | "CS"
      tuNgay,
      denNgay,
    });
  };

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
        <ChartCard
          title={`Đơn hàng theo chuyến${selectedChain ? ` — ${CHAIN_LABEL[selectedChain]}` : ""}`}
          eyebrow={
            <ChainFilterToggle
              selectedChain={selectedChain}
              onSelect={setSelectedChain}
            />
          }
        >
          <ResponsiveContainer width="100%" height={280} debounce={150}>
            <PieChart margin={{ top: 24, right: 70, bottom: 10, left: 70 }}>
              <Pie
                data={chainChartStats.chuyenData}
                dataKey="value"
                nameKey="name"
                innerRadius={44}
                outerRadius={72}
                paddingAngle={2}
                label={chuyenLabel}
                labelLine={false}
                cursor="pointer"
                onClick={(data) => handleSliceClick("chuyen", data.name)}
              >
                {chainChartStats.chuyenData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={`Đơn hàng theo trạng thái${selectedChain ? ` — ${CHAIN_LABEL[selectedChain]}` : ""}`}
          eyebrow={
            <ChainFilterToggle
              selectedChain={selectedChain}
              onSelect={setSelectedChain}
            />
          }
        >
          <ResponsiveContainer width="100%" height={280} debounce={150}>
            <PieChart margin={{ top: 24, right: 70, bottom: 24, left: 70 }}>
              <Pie
                data={chainChartStats.trangThaiData}
                dataKey="value"
                nameKey="name"
                innerRadius={44}
                outerRadius={72}
                paddingAngle={2}
                label={trangThaiLabel}
                labelLine={false}
                cursor="pointer"
                onClick={(data) => handleSliceClick("trangThai", data.name)}
              >
                {chainChartStats.trangThaiData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tiến độ xử lý theo chuỗi">
          <div className="flex h-[280px] flex-col justify-center gap-6 px-1">
            <ChainProgressBar
              label={CHAIN_LABEL.CF}
              counts={stats.chainTrangThai.CF}
              total={stats.chainCount.CF}
              logo={CHAIN_LOGOS.CF}
            />
            <ChainProgressBar
              label={CHAIN_LABEL.CS}
              counts={stats.chainTrangThai.CS}
              total={stats.chainCount.CS}
              logo={CHAIN_LOGOS.CS}
            />
            {stats.chainCount["Khác"] > 0 && (
              <ChainProgressBar
                label="Khác"
                counts={stats.chainTrangThai["Khác"]}
                total={stats.chainCount["Khác"]}
              />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Thẻ SLA / KPI */}
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
          <ResponsiveContainer width="100%" height={230} debounce={150}>
            <PieChart margin={{ top: 24, right: 70, bottom: 24, left: 70 }}>
              <Pie
                data={stats.kpiData}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                label={kpiLabel}
                labelLine={false}
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
        title="Số lượng đơn hàng phát ra theo từng giờ (theo TG nhận phiếu)"
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
            >
              <LabelList
                dataKey="soLuong"
                position="top"
                fontSize={11}
                fontFamily={FONT_MONO}
                fill="#475569"
                formatter={(v) => (v > 0 ? formatNumber(v) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Đơn theo ngày gần nhất */}
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
