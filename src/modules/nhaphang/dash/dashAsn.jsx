/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LineController,
  Filler,
} from "chart.js";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  FileStack,
  Package,
  Building2,
  ClipboardList,
} from "lucide-react";
import { asnService } from "@/services/nhaphang/asn.service";
import {
  KHO_LIST,
  FETCH_LIMIT,
  FONT_SANS,
  useDonutFonts,
  KhoFilter,
  formatNumber,
  toDateKeyUTC,
} from "./dashboardCommon";
import dayjs from "dayjs";
import { bucketKey, lastBuckets, PERIOD_LIMIT } from "@/utils/period";
import DateRangeFilter from "./date";
import PeriodToggle from "./PeriodToggle";

ChartJS.register(LineElement, PointElement, LineController, Filler);

const ASN_MIN_ANGLE = 6;

const getCurrentMonthRange = () => ({
  from: dayjs().startOf("month").format("YYYY-MM-DD"),
  to: dayjs().endOf("month").format("YYYY-MM-DD"),
});

const PERIOD_TEXT = {
  day: "7 ngày gần nhất",
  month: "12 tháng gần nhất",
  year: "5 năm gần nhất",
};
const PERIOD_UNIT = { day: "ngày", month: "tháng", year: "năm" };

const LOAI_HINH_COLORS = {
  "Nhập NCC": "#10b981",
  "Nhập VAS": "#f59e0b",
  "Nhập hàng trung chuyển": "#CC33CC",
  "Nhập mua CSH": "#8b5cf6",
  "Nhập nội bộ": "#f43f5e",
  "Nhập trả từ nơi xuất đến": "#0ea5e9",
  KHÔ: "#6366f1",
  ĐÔNG: "#0ea5e9",
  SLL: "#f59e0b",
};
const FALLBACK_COLORS = [
  "#2563eb",
  "#f97316",
  "#a855f7",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#6366f1",
];

const LOAI_HINH_KIEN_ORDER = ["KHÔ", "ĐÔNG", "SLL"];

const NGANH_HANG_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#f43f5e",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#ec4899",
];

const parseNum = (v) => {
  const n = Number(String(v ?? "").replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatAvg = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });

const formatPct = (value, total) =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%";

const hexToRgba = (hex, alpha) => {
  const h = String(hex || "#6366f1").replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ─────────────────────────────────────────────
// CHUẨN HÓA "NGÀNH HÀNG" (giữ nguyên quy tắc cũ)
// ─────────────────────────────────────────────
const ASN_CODE_LIKE_REGEX = /^[A-Za-z]{2,}-\d{4,}-\d+$/;
const isAsnCodeLike = (v) => ASN_CODE_LIKE_REGEX.test(String(v || "").trim());

const normalizeNganhHang = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "Chưa xác định";
  if (isAsnCodeLike(value)) return null;

  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const textParts = parts.filter((p) => !/^\d+$/.test(p));
  if (textParts.length > 0) return textParts[0];
  return "Thực phẩm công nghệ";
};

const STAT_TONES = {
  indigo: {
    icon: "bg-indigo-100 text-indigo-600",
    value: "text-indigo-700",
    bar: "bg-indigo-500",
    soft: "bg-indigo-50",
  },
  sky: {
    icon: "bg-sky-100 text-sky-600",
    value: "text-sky-700",
    bar: "bg-sky-500",
    soft: "bg-sky-50",
  },
  violet: {
    icon: "bg-violet-100 text-violet-600",
    value: "text-violet-700",
    bar: "bg-violet-500",
    soft: "bg-violet-50",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
    bar: "bg-emerald-500",
    soft: "bg-emerald-50",
  },
};

// Card KPI: số tổng rất lớn ở giữa, bình quân/ngày tách thành dải riêng bên dưới
const ASNStatCard = ({ icon: Icon, label, value, avgValue, tone }) => {
  const t = STAT_TONES[tone] || STAT_TONES.indigo;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 ${t.bar}`} />
      <div className="flex items-center gap-3 px-4 pt-3">
        <span className={`shrink-0 rounded-lg p-2 ${t.icon}`}>
          <Icon size={20} />
        </span>
        <p className="truncate text-sm font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <p
        className={`px-4 pb-3 pt-1 text-4xl font-extrabold leading-tight tabular-nums ${t.value}`}
      >
        {value}
      </p>
      {avgValue !== undefined && (
        <div
          className={`flex items-center justify-between px-4 py-2 text-sm ${t.soft}`}
        >
          <span className="font-medium text-slate-500">Bình quân / ngày</span>
          <span className={`text-lg font-bold tabular-nums ${t.value}`}>
            {avgValue}
          </span>
        </div>
      )}
    </div>
  );
};

const ChartCard = ({ title, subtitle, right, children, className = "" }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
  >
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-base font-bold text-slate-700">{title}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Loading = ({ height = "h-64" }) => (
  <div className={`flex ${height} items-center justify-center text-slate-400`}>
    <Loader2 size={20} className="animate-spin" />
  </div>
);

const ASNSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));
  const [dateFrom, setDateFrom] = useState(() => getCurrentMonthRange().from);
  const [dateTo, setDateTo] = useState(() => getCurrentMonthRange().to);
  const [period, setPeriod] = useState("day");

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  const filtered = useMemo(() => {
    return rawData.filter((r) => {
      if (!selectedKho.includes(Number(r.kho))) return false;
      const key = toDateKeyUTC(r.ngay_asn);
      if (dateFrom || dateTo) {
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }
      return true;
    });
  }, [rawData, selectedKho, dateFrom, dateTo]);
  useEffect(() => {
    const dropped = rawData.filter((r) => {
      const key = toDateKeyUTC(r.ngay_asn);
      return key === "2026-09-30" && !selectedKho.includes(Number(r.kho));
    });
    console.log("rawData:", rawData.length, "| filtered:", filtered.length);
    console.log(
      "30/09 bị loại do kho:",
      dropped.length,
      dropped.map((r) => r.kho),
    );
  }, [rawData, filtered, selectedKho]);
  const trendRows = useMemo(
    () =>
      period === "day"
        ? filtered
        : rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [period, filtered, rawData, selectedKho],
  );

  const { last7DaysPO, last7DaysKien, loaiHinhKienTypes } = useMemo(() => {
    const poSets = {};
    const kienByLoai = {};
    const typesSeen = new Set();

    trendRows.forEach((r) => {
      const key = bucketKey(r.ngay_asn, period);
      if (!key) return;
      const lh = String(r.loai_hinh || "").trim() || "Khác";
      typesSeen.add(lh);
      if (r.po) (poSets[key] ||= new Set()).add(r.po);
      kienByLoai[key] ||= {};
      kienByLoai[key][lh] = (kienByLoai[key][lh] || 0) + parseNum(r.so_kien);
    });

    const buckets = lastBuckets(period, PERIOD_LIMIT[period]);
    const known = LOAI_HINH_KIEN_ORDER.filter((lh) => typesSeen.has(lh));
    const extra = [...typesSeen]
      .filter((lh) => !LOAI_HINH_KIEN_ORDER.includes(lh))
      .sort();

    return {
      last7DaysPO: buckets.map((b) => ({
        ...b,
        count: poSets[b.key]?.size || 0,
      })),
      last7DaysKien: buckets.map((b) => ({
        ...b,
        byLoai: kienByLoai[b.key] || {},
      })),
      loaiHinhKienTypes: [...known, ...extra],
    };
  }, [trendRows, period]);

  const {
    totalPO,
    totalNCC,
    totalBooking,
    totalSoKien,
    byLoaiHinh,
    byNganhHang,
    totalSoKienNganhHang,
    soNgayCoData,
    avgPO,
    avgBooking,
    avgNCC,
    avgKien,
  } = useMemo(() => {
    const poSet = new Set();
    const nccSet = new Set();
    const bookingSet = new Set();
    let totalSoKien = 0;
    const loaiHinhKien = {};
    const nganhHangKien = {};
    const dayPO = {};
    const dayBooking = {};
    const dayNCC = {};

    filtered.forEach((r) => {
      if (r.po) poSet.add(r.po);
      if (r.so_booking) bookingSet.add(r.so_booking);
      if (r.ma_ncc !== undefined && r.ma_ncc !== null && r.ma_ncc !== "") {
        nccSet.add(r.ma_ncc);
      }

      const soKien = parseNum(r.so_kien);
      totalSoKien += soKien;

      const dk = toDateKeyUTC(r.ngay_asn);
      if (dk) {
        if (r.po) (dayPO[dk] ||= new Set()).add(r.po);
        if (r.so_booking) (dayBooking[dk] ||= new Set()).add(r.so_booking);
        if (r.ma_ncc !== undefined && r.ma_ncc !== null && r.ma_ncc !== "") {
          (dayNCC[dk] ||= new Set()).add(r.ma_ncc);
        }
      }

      const lh = String(r.loai_hinh || "").trim() || "Khác";
      loaiHinhKien[lh] = (loaiHinhKien[lh] || 0) + soKien;

      const nh = normalizeNganhHang(r.ten_nganh_hang);
      if (nh !== null) {
        nganhHangKien[nh] = (nganhHangKien[nh] || 0) + soKien;
      }
    });

    const nganhHangEntries = Object.entries(nganhHangKien)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const TOP_N = 9;
    const topNganhHang = nganhHangEntries.slice(0, TOP_N);
    const restNganhHang = nganhHangEntries.slice(TOP_N);
    const restTotal = restNganhHang.reduce((sum, [, v]) => sum + v, 0);
    const byNganhHang = topNganhHang.map(([name, value], i) => ({
      name,
      value,
      fill: NGANH_HANG_COLORS[i % NGANH_HANG_COLORS.length],
    }));
    if (restTotal > 0) {
      byNganhHang.push({
        name: `Khác (${restNganhHang.length} ngành)`,
        value: restTotal,
        fill: "#94a3b8",
      });
    }
    const totalSoKienNganhHang = nganhHangEntries.reduce(
      (sum, [, v]) => sum + v,
      0,
    );

    const dayKeys = new Set([
      ...Object.keys(dayPO),
      ...Object.keys(dayBooking),
      ...Object.keys(dayNCC),
    ]);
    const soNgayCoData = dayKeys.size;
    const avgOfDays = (map) =>
      soNgayCoData > 0
        ? Object.values(map).reduce((sum, set) => sum + set.size, 0) /
          soNgayCoData
        : 0;

    return {
      totalPO: poSet.size,
      totalNCC: nccSet.size,
      totalBooking: bookingSet.size,
      totalSoKien,
      // Sắp giảm dần theo số kiện để danh sách bên cạnh donut dễ đọc
      byLoaiHinh: Object.entries(loaiHinhKien)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], i) => ({
          name,
          value,
          fill:
            LOAI_HINH_COLORS[name] ||
            FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        })),
      byNganhHang,
      totalSoKienNganhHang,
      soNgayCoData,
      avgPO: avgOfDays(dayPO),
      avgBooking: avgOfDays(dayBooking),
      avgNCC: avgOfDays(dayNCC),
      avgKien: soNgayCoData > 0 ? totalSoKien / soNgayCoData : 0,
    };
  }, [filtered]);

  const dayBarData = useMemo(
    () => ({
      labels: last7DaysPO.map((d) => d.label),
      datasets: [
        {
          label: "Số PO",
          data: last7DaysPO.map((d) => d.count),
          backgroundColor: "#4f46e5",
          hoverBackgroundColor: "#4338ca",
          borderRadius: 8,
          minBarLength: 4,
          maxBarThickness: 46,
        },
      ],
    }),
    [last7DaysPO],
  );

  const dayBarMax = useMemo(
    () => Math.max(0, ...last7DaysPO.map((d) => d.count)),
    [last7DaysPO],
  );
  const totalPOTrend = useMemo(
    () => last7DaysPO.reduce((s, d) => s + d.count, 0),
    [last7DaysPO],
  );
  const totalKienTrend = useMemo(
    () =>
      last7DaysKien.reduce(
        (s, d) => s + Object.values(d.byLoai).reduce((a, v) => a + v, 0),
        0,
      ),
    [last7DaysKien],
  );

  const kienAreaData = useMemo(() => {
    const colors = { KHÔ: "#6366f1", ĐÔNG: "#0ea5e9", SLL: "#f59e0b" };
    return {
      labels: last7DaysKien.map((d) => d.label),
      datasets: loaiHinhKienTypes.map((lh, i) => {
        const color =
          colors[lh] ||
          LOAI_HINH_COLORS[lh] ||
          FALLBACK_COLORS[i % FALLBACK_COLORS.length];
        const isDong = lh === "ĐÔNG";

        return {
          label: lh,
          data: last7DaysKien.map((d) => d.byLoai[lh] || 0),
          borderColor: color,
          backgroundColor: isDong
            ? "transparent"
            : (context) => {
                const { chart } = context;
                const { ctx, chartArea } = chart;
                if (!chartArea) return hexToRgba(color, 0.25);
                const gradient = ctx.createLinearGradient(
                  0,
                  chartArea.top,
                  0,
                  chartArea.bottom,
                );
                gradient.addColorStop(0, hexToRgba(color, 0.6));
                gradient.addColorStop(1, hexToRgba(color, 0.03));
                return gradient;
              },
          borderWidth: isDong ? 3 : 2.5,
          borderDash: isDong ? [6, 3] : undefined,
          pointRadius: isDong ? 4 : 3,
          pointHoverRadius: isDong ? 7 : 6,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: color,
          pointBorderWidth: 2,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          tension: 0.42,
          fill: !isDong,
          stack: isDong ? undefined : "kien",
          yAxisID: isDong ? "yDong" : "y",
          order: i,
        };
      }),
    };
  }, [last7DaysKien, loaiHinhKienTypes]);

  const dongMax = useMemo(
    () => Math.max(0, ...last7DaysKien.map((d) => d.byLoai["ĐÔNG"] || 0)),
    [last7DaysKien],
  );

  const kienAreaMax = useMemo(
    () =>
      Math.max(
        0,
        ...last7DaysKien.map((d) =>
          Object.values(d.byLoai).reduce((sum, v) => sum + v, 0),
        ),
      ),
    [last7DaysKien],
  );

  const nganhHangBarData = useMemo(() => {
    const rows = [...byNganhHang].reverse();
    return {
      labels: rows.map((d) => d.name),
      datasets: [
        {
          label: "Số kiện",
          data: rows.map((d) => d.value),
          backgroundColor: rows.map((d) => d.fill),
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    };
  }, [byNganhHang]);

  const nganhHangBarMax = useMemo(
    () => Math.max(0, ...byNganhHang.map((d) => d.value)),
    [byNganhHang],
  );

  const handleSliceClick = (name) => {
    if (!onNavigate) return;
    onNavigate({
      tab: "Booking",
      loai_hinh: name,
      kho: selectedKho.length === 1 ? String(selectedKho[0]) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-indigo-700 md:text-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          Booking D+1
        </h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="w-full sm:w-72">
        <DateRangeFilter
          label="Lọc theo Ngày Booking"
          startValue={dateFrom}
          endValue={dateTo}
          onChange={(start, end) => {
            setDateFrom(start);
            setDateTo(end);
          }}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
          }}
        />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ASNStatCard
          icon={FileStack}
          label="Tổng số PO"
          value={formatNumber(totalPO)}
          avgValue={formatAvg(avgPO)}
          tone="indigo"
        />
        <ASNStatCard
          icon={ClipboardList}
          label="Tổng số Booking"
          value={formatNumber(totalBooking)}
          avgValue={formatAvg(avgBooking)}
          tone="emerald"
        />
        <ASNStatCard
          icon={Building2}
          label="Tổng NCC"
          value={formatNumber(totalNCC)}
          avgValue={formatAvg(avgNCC)}
          tone="sky"
        />
        <ASNStatCard
          icon={Package}
          label="Tổng số kiện"
          value={formatNumber(totalSoKien)}
          avgValue={formatAvg(avgKien)}
          tone="violet"
        />
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Bình quân/ngày tính trên <b>{soNgayCoData}</b> ngày có dữ liệu trong bộ
        lọc.
      </p>

      {/* Xu hướng kiện + donut loại hình */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={`Số kiện theo ${PERIOD_UNIT[period]} Booking`}
          subtitle={
            period === "day"
              ? `${PERIOD_TEXT[period]} · tổng ${formatNumber(totalKienTrend)} kiện`
              : `${PERIOD_TEXT[period]} trên toàn bộ dữ liệu (không áp dụng bộ lọc ngày) · tổng ${formatNumber(totalKienTrend)} kiện`
          }
          right={
            <PeriodToggle
              value={period}
              onChange={setPeriod}
              activeClass="text-indigo-600"
            />
          }
        >
          {loading ? (
            <Loading />
          ) : (
            <div className="h-72">
              <Line
                data={kienAreaData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  layout: { padding: { top: 34, right: 12 } },
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                      align: "end",
                      labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        padding: 16,
                        font: { size: 13, weight: "700" },
                        color: "#334155",
                      },
                    },
                    tooltip: {
                      backgroundColor: "rgba(30, 27, 75, 0.94)",
                      titleColor: "#e0e7ff",
                      titleFont: { weight: "700", size: 13 },
                      bodyFont: { size: 13 },
                      footerFont: { size: 13, weight: "700" },
                      padding: 12,
                      cornerRadius: 8,
                      boxPadding: 4,
                      callbacks: {
                        label: (ctx) =>
                          `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} kiện`,
                        footer: (items) => {
                          const total = items.reduce(
                            (sum, it) => sum + (it.parsed.y || 0),
                            0,
                          );
                          return `Tổng: ${formatNumber(total)} kiện`;
                        },
                      },
                    },
                    datalabels: {
                      // Chỉ hiện nhãn khi có giá trị, riêng KHÔ/SLL chỉ cần hiện ở điểm lớn
                      display: (context) =>
                        (context.dataset.data[context.dataIndex] || 0) > 0,

                      anchor: "end",
                      // Mỗi loại một hướng: SLL phía trên, KHÔ phía dưới, ĐÔNG bên phải
                      align: (context) => {
                        const label = context.dataset.label;
                        if (label === "SLL") return "top";
                        if (label === "KHÔ") return "bottom";
                        return "right"; // ĐÔNG
                      },
                      // Đẩy xa điểm hơn để không chạm nhau
                      offset: (context) => {
                        const label = context.dataset.label;
                        if (label === "SLL") return 12;
                        if (label === "KHÔ") return 14;
                        return 18; // ĐÔNG
                      },
                      clamp: true,

                      color: (context) => {
                        if (context.dataset.label === "ĐÔNG") return "#0369a1";
                        if (context.dataset.label === "KHÔ") return "#3730a3";
                        return "#92400e";
                      },
                      backgroundColor: "rgba(255,255,255,0.95)",
                      borderColor: (context) => {
                        if (context.dataset.label === "ĐÔNG") return "#7dd3fc";
                        if (context.dataset.label === "KHÔ") return "#c7d2fe";
                        return "#fcd34d";
                      },
                      borderWidth: 1,
                      borderRadius: 6,
                      padding: { top: 3, bottom: 3, left: 6, right: 6 },
                      font: { weight: "800", size: 12 },
                      formatter: (value) =>
                        value > 0 ? formatNumber(value) : "",
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: {
                        font: { size: 13, weight: "700" },
                        color: "#1e293b",
                      },
                    },
                    // Trục chính (KHÔ + SLL, số hàng nghìn) -> chuyển sang PHẢI
                    y: {
                      position: "right", // ✏️ đổi
                      stacked: true,
                      beginAtZero: true,
                      grid: { color: "#eef2ff" },
                      ticks: {
                        font: { size: 12 },
                        color: "#64748b",
                        callback: (v) => formatNumber(v),
                      },
                      suggestedMax:
                        kienAreaMax > 0 ? kienAreaMax * 1.3 : undefined,
                      title: {
                        // ➕ thêm tiêu đề cho rõ
                        display: true,
                        text: "KHÔ + SLL (kiện)",
                        color: "#64748b",
                        font: { size: 11, weight: "600" },
                      },
                    },
                    // Trục ĐÔNG (số nhỏ) -> chuyển sang TRÁI
                    yDong: {
                      position: "left", // ✏️ đổi
                      beginAtZero: true,
                      grid: { display: false },
                      ticks: {
                        font: { size: 11 },
                        color: "#0ea5e9",
                        callback: (v) => formatNumber(v),
                      },
                      suggestedMax: dongMax > 0 ? dongMax * 7 : undefined,
                      title: {
                        display: true,
                        text: "ĐÔNG (kiện)",
                        color: "#0ea5e9",
                        font: { size: 11, weight: "600" },
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>

        {/* Donut + bảng số liệu */}
        <ChartCard title="Theo loại hình" subtitle="Tính theo tổng số kiện">
          <div style={{ fontFamily: FONT_SANS }}>
            {loading || totalSoKien === 0 ? (
              <div className="flex h-72 items-center justify-center text-slate-400">
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Không có dữ liệu"
                )}
              </div>
            ) : (
              <>
                <div className="relative h-44">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    debounce={150}
                  >
                    <PieChart>
                      <Pie
                        data={byLoaiHinh}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                        minAngle={ASN_MIN_ANGLE}
                        cursor={onNavigate ? "pointer" : "default"}
                        onClick={(data) => handleSliceClick(data.name)}
                      >
                        {byLoaiHinh.map((d, i) => (
                          <Cell key={i} fill={d.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [
                          `${formatNumber(value)} kiện (${formatPct(value, totalSoKien)})`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Tổng ở giữa donut */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold leading-none text-slate-800 tabular-nums">
                      {formatNumber(totalSoKien)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      kiện
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {byLoaiHinh.map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => handleSliceClick(d.name)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: d.fill }}
                      />
                      <span className="flex-1 truncate font-semibold text-slate-700">
                        {d.name}
                      </span>
                      <span className="font-bold tabular-nums text-slate-800">
                        {formatNumber(d.value)}
                      </span>
                      <span className="w-14 text-right text-xs font-semibold tabular-nums text-slate-500">
                        {formatPct(d.value, totalSoKien)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Số PO + ngành hàng */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={`Số PO theo ${PERIOD_UNIT[period]} Booking`}
          subtitle={`${PERIOD_TEXT[period]} · tổng ${formatNumber(totalPOTrend)} PO`}
          className="bg-gradient-to-b from-white to-indigo-50/40"
        >
          {loading ? (
            <Loading height="h-96" />
          ) : (
            <div className="h-96">
              <Bar
                data={dayBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: { top: 36, right: 8 } },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      bodyFont: { size: 13 },
                      callbacks: {
                        label: (ctx) => `${formatNumber(ctx.parsed.y)} PO`,
                      },
                    },
                    datalabels: {
                      anchor: "end",
                      align: "end",
                      offset: 4,
                      clamp: true,
                      color: "#312e81",
                      backgroundColor: "#ffffff",
                      borderColor: "#c7d2fe",
                      borderWidth: 1.5,
                      borderRadius: 6,
                      padding: { top: 4, bottom: 4, left: 8, right: 8 },
                      font: { weight: "800", size: 16 },
                      formatter: (value) =>
                        value > 0 ? formatNumber(value) : "",
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: {
                        font: { size: 14, weight: "700" },
                        color: "#1e293b",
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: "#e2e8f0" },
                      ticks: {
                        font: { size: 13 },
                        color: "#475569",
                        callback: (v) => formatNumber(v),
                      },
                      suggestedMax: dayBarMax > 0 ? dayBarMax * 1.3 : undefined,
                    },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Số kiện theo ngành hàng"
          subtitle={`Tổng ${formatNumber(totalSoKienNganhHang)} kiện · nhiều nhất ở trên cùng`}
        >
          {loading ? (
            <Loading height="h-96" />
          ) : byNganhHang.length === 0 ? (
            <div className="flex h-96 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div style={{ height: Math.max(384, byNganhHang.length * 44) }}>
              <Bar
                data={nganhHangBarData}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: { right: 130 } },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      bodyFont: { size: 13 },
                      callbacks: {
                        label: (ctx) =>
                          `${formatNumber(ctx.parsed.x)} kiện (${formatPct(ctx.parsed.x, totalSoKienNganhHang)})`,
                      },
                    },
                    datalabels: {
                      anchor: "end",
                      align: "end",
                      offset: 6,
                      clamp: true,
                      color: "#312e81",
                      backgroundColor: "#ffffff",
                      borderColor: "#c7d2fe",
                      borderWidth: 1.5,
                      borderRadius: 6,
                      padding: { top: 3, bottom: 3, left: 7, right: 7 },
                      font: { weight: "800", size: 13 },
                      formatter: (value) =>
                        value > 0
                          ? `${formatNumber(value)} (${formatPct(value, totalSoKienNganhHang)})`
                          : "",
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      grid: { color: "#e2e8f0" },
                      ticks: {
                        font: { size: 12 },
                        color: "#475569",
                        callback: (v) => formatNumber(v),
                      },
                      suggestedMax:
                        nganhHangBarMax > 0
                          ? nganhHangBarMax * 1.15
                          : undefined,
                    },
                    y: {
                      grid: { display: false },
                      ticks: {
                        font: { size: 13, weight: "700" },
                        color: "#1e293b",
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DASH ASN — tự fetch data riêng
// ─────────────────────────────────────────────
const DashASN = ({ onNavigate }) => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchASN = async () => {
      
      setLoading(true);
      
      try {
        const res = await asnService.getDanhSach({
          page: 1,
          limit: FETCH_LIMIT,
        });
        setRawData(res?.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu ASN:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchASN();
    
  }, []);

  return (
    <ASNSection rawData={rawData} loading={loading} onNavigate={onNavigate} />
  );
};

export default DashASN;
