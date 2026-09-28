/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, PackageCheck, PackageX, Boxes, Users } from "lucide-react";
import dayjs from "dayjs";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";
import {
  KHO_LIST,
  FETCH_LIMIT,
  toDateKeyUTC,
  formatDateLabel,
  isChuaPut,
  FONT_SANS,
  useDonutFonts,
  formatNumber,
  usePieLabelRenderer,
  percentLabelFormatter,
  buildEmpProductivity,
  KhoFilter,
} from "./dashboardCommon";
import { bucketKey, lastBuckets, PERIOD_LIMIT } from "@/utils/period";
import DateRangeFilter from "./date";
import PeriodToggle from "./PeriodToggle";

// SKU cố định của Hàng Trung Chuyển — khớp với SKU_KHONG_AP_QC_DAC_THU
// bên NhapHangImportModal (import.jsx). Đây là dòng hàng được import
// chung với "Nhập" (loai_hinh: "Nhập") nhưng luôn cho qua rule QC Đặc Thù.
const SKU_HANG_TRUNG_CHUYEN = "HANGTRUNGCHUYEN";

const TC_NHAP_MIN_ANGLE = 6;
const TC_PUT_MIN_ANGLE = 8;

// Khoảng ngày mặc định: cả tháng hiện tại (vd tháng 9 -> 01/09 đến 30/09)
const getCurrentMonthRange = () => ({
  from: dayjs().startOf("month").format("YYYY-MM-DD"),
  to: dayjs().endOf("month").format("YYYY-MM-DD"),
});

// Text hiển thị theo chế độ Ngày / Tháng / Năm
const PERIOD_TEXT = {
  day: "theo khoảng ngày đang lọc",
  month: "12 tháng gần nhất",
  year: "5 năm gần nhất",
};
const PERIOD_UNIT = { day: "ngày", month: "tháng", year: "năm" };

// Định dạng số bình quân: tối đa 1 số lẻ, kiểu Việt Nam (1.234,5)
const formatAvg = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Dựng dữ liệu biểu đồ cột "kiện theo kho" theo Ngày / Tháng / Năm.
// - day: các ngày có dữ liệu trong `rows` (đã lọc theo bộ lọc ngày)
// - month / year: N kỳ gần nhất tính đến hôm nay (kỳ trống hiện 0)
const buildKhoTrendData = (rows, period, selectedKho) => {
  const sums = {}; // { kho: { key: tổng kiện } }
  const keys = new Set();

  rows.forEach((r) => {
    const key =
      period === "day"
        ? toDateKeyUTC(r.ngay_nhap_kho)
        : bucketKey(r.ngay_nhap_kho, period);
    if (!key) return;
    const kho = Number(r.kho);
    if (!sums[kho]) sums[kho] = {};
    sums[kho][key] = (sums[kho][key] || 0) + (Number(r.kien) || 0);
    keys.add(key);
  });

  const buckets =
    period === "day"
      ? [...keys].sort().map((key) => ({ key, label: formatDateLabel(key) }))
      : lastBuckets(period, PERIOD_LIMIT[period]);

  return {
    labels: buckets.map((b) => b.label),
    datasets: KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)).map(
      ({ kho, label, color }) => ({
        label,
        data: buckets.map((b) => sums[kho]?.[b.key] || 0),
        backgroundColor: color,
        borderRadius: 4,
        minBarLength: 4,
      }),
    ),
  };
};

// ─────────────────────────────────────────────
// STAT CARD riêng cho Hàng Trung Chuyển — số to, đậm, ring màu theo tone,
// cùng phong cách với LetStatCard bên DashLet để đồng bộ UI giữa các
// dashboard con trong cùng module Nhập Hàng.
// avgValue (tùy chọn): hiện thêm ô "TB / ngày" bên phải.
// ─────────────────────────────────────────────
const STAT_TONES = {
  slate: {
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-700",
    ring: "ring-slate-100",
  },
  blue: {
    icon: "bg-blue-100 text-blue-600",
    value: "text-blue-700",
    ring: "ring-blue-100",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
    ring: "ring-emerald-100",
  },
  rose: {
    icon: "bg-rose-100 text-rose-600",
    value: "text-rose-700",
    ring: "ring-rose-100",
  },
};

const TrungChuyenStatCard = ({
  icon: Icon,
  label,
  value,
  avgValue,
  tone = "slate",
}) => {
  const t = STAT_TONES[tone] || STAT_TONES.slate;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 ring-4 ${t.ring}`}
    >
      <span className={`shrink-0 rounded-lg p-2.5 ${t.icon}`}>
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className={`text-2xl font-extrabold leading-tight ${t.value}`}>
          {value}
        </p>
      </div>
      {avgValue !== undefined && (
        <div className="shrink-0 border-l border-slate-200 pl-3 text-right">
          <p className="text-xs font-medium text-slate-500">TB / ngày</p>
          <p className={`text-xl font-bold leading-tight ${t.value}`}>
            {avgValue}
          </p>
        </div>
      )}
    </div>
  );
};

// Datalabels dùng chung cho các cột nhóm (không stacked) trong module này —
// đặt số ngay trên đỉnh mỗi cột, có nền trắng mờ để luôn đọc được, giống
// hệt cấu hình bên DashLet.
const trungChuyenBarDataLabels = {
  anchor: "end",
  align: "end",
  offset: 4,
  clamp: true,
  color: "#1e1b4b",
  backgroundColor: "rgba(255,255,255,0.85)",
  borderRadius: 4,
  padding: { top: 2, bottom: 2, left: 5, right: 5 },
  font: { weight: "bold", size: 13 },
  formatter: (value) => (value > 0 ? formatNumber(value) : ""),
};

const trungChuyenLegendLabels = {
  font: { size: 12, weight: "600" },
  color: "#334155",
  boxWidth: 12,
  boxHeight: 12,
};

// ─────────────────────────────────────────────
// BIỂU ĐỒ CỘT NĂNG SUẤT NHÂN VIÊN — dùng chung cho NV Nhận & NV Putaway
// của Hàng Trung Chuyển, giống hệt bản trong DashNhapPut.
// ─────────────────────────────────────────────
const EmpProductivityBar = ({ title, data, loading }) => {
  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          label: "Kiện",
          data: data.map((d) => d.value),
          backgroundColor: data.map((d) => d.fill),
          borderRadius: 4,
        },
      ],
    }),
    [data],
  );

  const maxVal = useMemo(
    () => data.reduce((m, d) => (d.value > m ? d.value : m), 0),
    [data],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Users size={15} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          Không có dữ liệu
        </div>
      ) : (
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { top: 24 } },
              plugins: {
                legend: { display: false },
                datalabels: trungChuyenBarDataLabels,
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${formatNumber(ctx.parsed.y)} kiện`,
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: {
                    autoSkip: false,
                    maxRotation: 45,
                    minRotation: 0,
                    font: { size: 12, weight: "600" },
                    color: "#334155",
                  },
                },
                y: {
                  beginAtZero: true,
                  grid: { color: "#f1f5f9" },
                  ticks: { font: { size: 12 }, color: "#64748b" },
                  suggestedMax: maxVal > 0 ? maxVal * 1.25 : undefined,
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

// Khối tiêu đề + nút Ngày/Tháng/Năm dùng chung cho biểu đồ cột theo thời gian
const TrendHeader = ({ period, setPeriod }) => (
  <>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-medium text-slate-600">
        Số kiện theo {PERIOD_UNIT[period]} ({PERIOD_TEXT[period]})
      </p>
      <PeriodToggle
        value={period}
        onChange={setPeriod}
        activeClass="text-indigo-600"
      />
    </div>
    {period !== "day" && (
      <p className="mb-2 text-xs text-slate-400">
        {PERIOD_TEXT[period]} trên toàn bộ dữ liệu (không áp dụng bộ lọc ngày
        phía trên)
      </p>
    )}
  </>
);

// ─────────────────────────────────────────────
// SECTION 1: TRUNG CHUYỂN — NHẬP — tổng kiện theo ngày nhập kho, filter
// kho + khoảng ngày. Nhận data từ component cha (không tự fetch).
// ─────────────────────────────────────────────
const TrungChuyenNhapSection = ({ rawData, loading, onNavigate }) => {
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
      const key = toDateKeyUTC(r.ngay_nhap_kho);
      if (!key) return false;
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [rawData, selectedKho, dateFrom, dateTo]);

  // totalKien / totalDong luôn là TỔNG của toàn bộ khoảng ngày đang lọc
  // (không phải theo từng ngày riêng lẻ) vì tính trực tiếp từ `filtered`.
  // Bình quân/ngày chỉ tính trên các ngày có dữ liệu.
  const { totalKien, totalDong, byKho, soNgayCoData } = useMemo(() => {
    let totalKien = 0;
    const byKho = {};
    const dayKeys = new Set();

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      const kho = Number(r.kho);
      totalKien += kien;
      byKho[kho] = (byKho[kho] || 0) + kien;
      const dk = toDateKeyUTC(r.ngay_nhap_kho);
      if (dk) dayKeys.add(dk);
    });

    return {
      totalKien,
      totalDong: filtered.length,
      byKho,
      soNgayCoData: dayKeys.size,
    };
  }, [filtered]);

  const perDay = (n) => (soNgayCoData > 0 ? n / soNgayCoData : 0);

  // Ngày: theo bộ lọc ngày; Tháng / Năm: bỏ lọc ngày (chỉ lọc kho)
  const trendRows = useMemo(
    () =>
      period === "day"
        ? filtered
        : rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [period, filtered, rawData, selectedKho],
  );

  const khoBarData = useMemo(
    () => buildKhoTrendData(trendRows, period, selectedKho),
    [trendRows, period, selectedKho],
  );

  // Chiều cao lớn nhất trong toàn biểu đồ -> chừa khoảng trống phía trên
  // (suggestedMax) cho nhãn số ở đỉnh mỗi cột không bị cắt/dính viền trên.
  const khoBarMax = useMemo(() => {
    let max = 0;
    khoBarData.datasets.forEach((ds) =>
      ds.data.forEach((v) => {
        if (v > max) max = v;
      }),
    );
    return max;
  }, [khoBarData]);

  const khoPieData = useMemo(
    () =>
      KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)).map(
        ({ kho, label, color }) => ({
          name: label,
          kho,
          value: byKho[kho] || 0,
          fill: color,
        }),
      ),
    [selectedKho, byKho],
  );

  const khoPieLabel = usePieLabelRenderer(
    khoPieData,
    280,
    40,
    TC_NHAP_MIN_ANGLE,
    percentLabelFormatter,
  );

  const handleKhoSliceClick = (data) => {
    if (!onNavigate) return;
    onNavigate({ tab: "nhap", sku: SKU_HANG_TRUNG_CHUYEN, kho: data.kho });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-indigo-700 md:text-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          Hàng Trung Chuyển — Nhập
        </h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="w-full sm:w-72">
        <DateRangeFilter
          label="Lọc theo Ngày nhập kho"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TrungChuyenStatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={formatNumber(totalKien)}
          avgValue={formatAvg(perDay(totalKien))}
          tone="blue"
        />
        <TrungChuyenStatCard
          icon={PackageCheck}
          label="Tổng số dòng"
          value={formatNumber(totalDong)}
          avgValue={formatAvg(perDay(totalDong))}
          tone="emerald"
        />
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Bình quân tính trên {soNgayCoData} ngày có dữ liệu trong bộ lọc.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <TrendHeader period={period} setPeriod={setPeriod} />
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : khoBarMax === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-72">
              <Bar
                data={khoBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: { top: 24 } },
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: trungChuyenLegendLabels,
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) =>
                          `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} kiện`,
                      },
                    },
                    datalabels: trungChuyenBarDataLabels,
                  },
                  scales: {
                    x: {
                      stacked: false,
                      grid: { display: false },
                      ticks: {
                        font: { size: 12, weight: "600" },
                        color: "#334155",
                      },
                    },
                    y: {
                      stacked: false,
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      ticks: { font: { size: 12 }, color: "#64748b" },
                      suggestedMax:
                        khoBarMax > 0 ? khoBarMax * 1.25 : undefined,
                    },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          style={{ fontFamily: FONT_SANS }}
        >
          {loading || totalKien === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Không có dữ liệu"
              )}
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height={280} debounce={150}>
                <PieChart margin={{ top: 24, right: 70, bottom: 24, left: 70 }}>
                  <Pie
                    data={khoPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    minAngle={TC_NHAP_MIN_ANGLE}
                    label={khoPieLabel}
                    labelLine={false}
                    cursor={onNavigate ? "pointer" : "default"}
                    onClick={handleKhoSliceClick}
                  >
                    {khoPieData.map((d, i) => (
                      <Cell key={i} fill={d.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [
                      `${formatNumber(value)} kiện (${
                        totalKien ? ((value / totalKien) * 100).toFixed(1) : 0
                      }%)`,
                      "",
                    ]}
                  />
                  <RechartsLegend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION 2: TRUNG CHUYỂN — PUT — dùng CHUNG data với section Nhập.
// Chưa put = vị trí (vi_tri) bắt đầu bằng "RZ" (RZ1, RZ2, ...)
// ─────────────────────────────────────────────
const TrungChuyenPutSection = ({ rawData, loading, onNavigate }) => {
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
      const key = toDateKeyUTC(r.ngay_nhap_kho);
      if (!key) return false;
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [rawData, selectedKho, dateFrom, dateTo]);

  const { totalKien, chuaPut, daPut, byKho, soNgayCoData } = useMemo(() => {
    let totalKien = 0;
    let chuaPut = 0;
    const byKho = {};
    const dayKeys = new Set();

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      totalKien += kien;
      const kho = Number(r.kho);
      if (!byKho[kho]) byKho[kho] = { daPut: 0, chuaPut: 0 };

      const dk = toDateKeyUTC(r.ngay_nhap_kho);
      if (dk) dayKeys.add(dk);

      if (isChuaPut(r.vi_tri)) {
        chuaPut += kien;
        byKho[kho].chuaPut += kien;
      } else {
        byKho[kho].daPut += kien;
      }
    });

    return {
      totalKien,
      chuaPut,
      daPut: totalKien - chuaPut,
      byKho,
      soNgayCoData: dayKeys.size,
    };
  }, [filtered]);

  // Bình quân/ngày = tổng kiện ÷ số ngày có dữ liệu trong bộ lọc
  const perDay = (n) => (soNgayCoData > 0 ? n / soNgayCoData : 0);

  // Ngày: theo bộ lọc ngày; Tháng / Năm: bỏ lọc ngày (chỉ lọc kho)
  const trendRows = useMemo(
    () =>
      period === "day"
        ? filtered
        : rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [period, filtered, rawData, selectedKho],
  );

  const khoBarData = useMemo(
    () => buildKhoTrendData(trendRows, period, selectedKho),
    [trendRows, period, selectedKho],
  );

  const khoBarMax = useMemo(() => {
    let max = 0;
    khoBarData.datasets.forEach((ds) =>
      ds.data.forEach((v) => {
        if (v > max) max = v;
      }),
    );
    return max;
  }, [khoBarData]);

  const khoActive = useMemo(
    () => KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)),
    [selectedKho],
  );

  const pieData = useMemo(
    () => [
      { name: "Đã put", value: daPut, fill: "#10b981" },
      { name: "Chưa put (RZ*)", value: chuaPut, fill: "#f43f5e" },
    ],
    [daPut, chuaPut],
  );

  const pieLabel = usePieLabelRenderer(
    pieData,
    280,
    40,
    TC_PUT_MIN_ANGLE,
    percentLabelFormatter,
  );

  const empPutData = useMemo(
    () => buildEmpProductivity(filtered, "nhan_vien_put"),
    [filtered],
  );

  const handleSliceClick = (name) => {
    if (!onNavigate) return;
    const isChuaPutSlice = name.startsWith("Chưa put");
    onNavigate({
      tab: "nhap",
      sku: SKU_HANG_TRUNG_CHUYEN,
      status: isChuaPutSlice ? "chuaPut" : "daPut",
      viTri: isChuaPutSlice ? "RZ" : undefined,
      kho: selectedKho.length === 1 ? selectedKho[0] : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-indigo-700 md:text-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          Hàng Trung Chuyển — Put
        </h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="w-full sm:w-72">
        <DateRangeFilter
          label="Lọc theo Ngày nhập kho"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {khoActive.map(({ kho, label }) => {
          const k = byKho[kho] || { daPut: 0, chuaPut: 0 };
          const total = k.daPut + k.chuaPut;
          return (
            <TrungChuyenStatCard
              key={kho}
              icon={Boxes}
              label={`Tổng kiện - ${label}`}
              value={formatNumber(total)}
              avgValue={formatAvg(perDay(total))}
              tone="blue"
            />
          );
        })}
        <TrungChuyenStatCard
          icon={PackageCheck}
          label="Đã put"
          value={formatNumber(daPut)}
          avgValue={formatAvg(perDay(daPut))}
          tone="emerald"
        />
        <TrungChuyenStatCard
          icon={PackageX}
          label="Chưa put (RZ*)"
          value={formatNumber(chuaPut)}
          avgValue={formatAvg(perDay(chuaPut))}
          tone="rose"
        />
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Bình quân tính trên {soNgayCoData} ngày có dữ liệu trong bộ lọc.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <TrendHeader period={period} setPeriod={setPeriod} />
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : khoBarMax === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-72">
              <Bar
                data={khoBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: { top: 24 } },
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: trungChuyenLegendLabels,
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) =>
                          `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} kiện`,
                      },
                    },
                    datalabels: trungChuyenBarDataLabels,
                  },
                  scales: {
                    x: {
                      stacked: false,
                      grid: { display: false },
                      ticks: {
                        font: { size: 12, weight: "600" },
                        color: "#334155",
                      },
                    },
                    y: {
                      stacked: false,
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      ticks: { font: { size: 12 }, color: "#64748b" },
                      suggestedMax:
                        khoBarMax > 0 ? khoBarMax * 1.25 : undefined,
                    },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          style={{ fontFamily: FONT_SANS }}
        >
          {loading || totalKien === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Không có dữ liệu"
              )}
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height={280} debounce={150}>
                <PieChart margin={{ top: 24, right: 70, bottom: 24, left: 70 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    minAngle={TC_PUT_MIN_ANGLE}
                    label={pieLabel}
                    labelLine={false}
                    cursor={onNavigate ? "pointer" : "default"}
                    onClick={(data) => handleSliceClick(data.name)}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [
                      `${formatNumber(value)} kiện (${
                        totalKien ? ((value / totalKien) * 100).toFixed(1) : 0
                      }%)`,
                      "",
                    ]}
                  />
                  <RechartsLegend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <EmpProductivityBar
        title="Năng suất NV Putaway (theo kiện) — Hàng Trung Chuyển"
        data={empPutData}
        loading={loading}
      />
    </div>
  );
};

// ─────────────────────────────────────────────
// DASHHANGTRUNGCHUYEN — gộp 2 section Nhập + Put của riêng SKU
// "HANGTRUNGCHUYEN", fetch data 1 LẦN (loai_hinh: "Nhập", sku:
// "HANGTRUNGCHUYEN"), dùng chung cho cả 2 section.
// ─────────────────────────────────────────────
const DashHangTrungChuyen = ({ onNavigate }) => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await nhapHangService.getDanhSach({
          page: 1,
          limit: FETCH_LIMIT,
          loai_hinh: "Nhập",
          sku: SKU_HANG_TRUNG_CHUYEN,
        });
        // Lọc lại lần nữa ở client phòng trường hợp backend search theo
        // kiểu "chứa chuỗi" trả về nhầm SKU khác có chứa cùng chuỗi con.
        const data = (res?.data || []).filter(
          (r) => r.sku === SKU_HANG_TRUNG_CHUYEN,
        );
        setRawData(data);
      } catch (err) {
        console.error("Lỗi tải dữ liệu Hàng Trung Chuyển:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <TrungChuyenNhapSection
        rawData={rawData}
        loading={loading}
        onNavigate={onNavigate}
      />
      <div className="border-t border-slate-200" />
      <TrungChuyenPutSection
        rawData={rawData}
        loading={loading}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default DashHangTrungChuyen;