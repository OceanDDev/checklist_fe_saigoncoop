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
import { Loader2, PackageCheck, PackageX, Boxes } from "lucide-react";
import dayjs from "dayjs";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";
import {
  KHO_LIST,
  FETCH_LIMIT,
  FONT_SANS,
  useDonutFonts,
  usePieLabelRenderer,
  percentLabelFormatter,
  KhoFilter,
  formatNumber,
  toDateKeyUTC,
  formatDateLabel,
} from "./dashboardCommon";
import DateRangeFilter from "./date";
import { bucketKey, lastBuckets, PERIOD_LIMIT } from "@/utils/period";
import PeriodToggle from "./PeriodToggle";

const LET_MIN_ANGLE = 6;

// Khoảng ngày mặc định: cả tháng hiện tại (vd tháng 9 -> 01/09 đến 30/09)
const getCurrentMonthRange = () => ({
  from: dayjs().startOf("month").format("YYYY-MM-DD"),
  to: dayjs().endOf("month").format("YYYY-MM-DD"),
});

// Định dạng số bình quân: tối đa 1 số lẻ, kiểu Việt Nam (1.234,5)
const formatAvg = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Text hiển thị theo chế độ Ngày / Tháng / Năm
const PERIOD_TEXT = {
  day: "theo khoảng ngày đang lọc",
  month: "12 tháng gần nhất",
  year: "5 năm gần nhất",
};
const PERIOD_UNIT = { day: "ngày", month: "tháng", year: "năm" };

// ─────────────────────────────────────────────
// LET HÀNG (Châm hàng) — theo trạng thái
// Hoàn Thành / Sẵn sàng châm hàng / Chờ lệnh châm hàng
// Phải khớp CHÍNH XÁC với TRANG_THAI_OPTIONS bên LetForm.jsx (dropdown filter
// của bảng dữ liệu), nếu không onNavigate({ trang_thai }) sẽ không lọc đúng.
// ─────────────────────────────────────────────
const TRANG_THAI_LIST = [
  { key: "Chờ lệnh châm hàng", label: "Chờ lệnh châm hàng", color: "#f43f5e" },
  { key: "Sẵn sàng châm hàng", label: "Sẵn sàng châm hàng", color: "#2563eb" },
  { key: "Hoàn thành", label: "Hoàn thành", color: "#10b981" },
];

// so khớp chính xác chuỗi trạng thái (đã trim) — nếu trong DB có biến thể
// khác (viết hoa/thường, thừa khoảng trắng khác kiểu) thì sửa lại đây
const normalizeTrangThai = (v) => String(v || "").trim();

// Tone riêng cho từng stat card — cùng thứ tự với TRANG_THAI_LIST: Chờ
// lệnh -> Sẵn sàng -> Hoàn thành. Card "Tổng số kiện" dùng tone "slate".
const statTones = ["rose", "blue", "emerald"];
const statIcons = [PackageX, Boxes, PackageCheck];

// Màu theo tone — class tĩnh (không nối chuỗi động) để Tailwind không
// purge mất khi build. Cùng bảng tone với DashASN để 2 dashboard đồng bộ
// phong cách, có thêm "slate" và "rose" cho card Let.
const STAT_TONES = {
  slate: {
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-700",
    ring: "ring-slate-100",
  },
  rose: {
    icon: "bg-rose-100 text-rose-600",
    value: "text-rose-700",
    ring: "ring-rose-100",
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
};

// Card riêng cho tab Let — số to, đậm, có màu rõ theo từng loại, tách khỏi
// StatCard dùng chung (dashboardCommon) để không ảnh hưởng dashboard khác,
// cùng phong cách với ASNStatCard bên tab ASN.
// avgValue (tùy chọn): hiện thêm ô "TB / ngày" bên phải.
const LetStatCard = ({ icon: Icon, label, value, avgValue, tone }) => {
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

const LetHangSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));
  const [dateFrom, setDateFrom] = useState(() => getCurrentMonthRange().from);
  const [dateTo, setDateTo] = useState(() => getCurrentMonthRange().to);
  // Chế độ xem biểu đồ cột theo thời gian: day | month | year
  const [period, setPeriod] = useState("day");

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  const filtered = useMemo(() => {
    return rawData.filter((r) => {
      if (!selectedKho.includes(Number(r.kho))) return false;
      // Lọc theo "Ngày giờ tạo" (ngay_gio_tao_let) — field ngay_let cũ đã
      // bị đổi tên/tách thành ngay_nhan_let + ngay_gio_tao_let, dashboard
      // dùng ngay_gio_tao_let để đồng bộ với ý nghĩa "ngày tạo phiếu châm".
      const key = toDateKeyUTC(r.ngay_gio_tao_let);
      if (dateFrom || dateTo) {
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }
      return true;
    });
  }, [rawData, selectedKho, dateFrom, dateTo]);

  // Bình quân/ngày chỉ tính trên các ngày có dữ liệu trong bộ lọc
  const { totalKien, byTrangThai, soNgayCoData } = useMemo(() => {
    let totalKien = 0;
    const byTrangThai = {};
    const dayKeys = new Set();

    TRANG_THAI_LIST.forEach(({ key }) => (byTrangThai[key] = 0));

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      const tt = normalizeTrangThai(r.trang_thai);

      totalKien += kien;

      const dk = toDateKeyUTC(r.ngay_gio_tao_let);
      if (dk) dayKeys.add(dk);

      if (Object.prototype.hasOwnProperty.call(byTrangThai, tt)) {
        byTrangThai[tt] += kien;
      }
    });

    return { totalKien, byTrangThai, soNgayCoData: dayKeys.size };
  }, [filtered]);

  const perDay = (n) => (soNgayCoData > 0 ? n / soNgayCoData : 0);

  // Biểu đồ cột theo thời gian, chia theo trạng thái.
  // Ngày: theo bộ lọc ngày; Tháng / Năm: bỏ lọc ngày (chỉ lọc kho).
  const trendRows = useMemo(
    () =>
      period === "day"
        ? filtered
        : rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [period, filtered, rawData, selectedKho],
  );

  const trendData = useMemo(() => {
    const sums = {}; // { trang_thai: { key: tổng kiện } }
    const keys = new Set();
    TRANG_THAI_LIST.forEach(({ key }) => (sums[key] = {}));

    trendRows.forEach((r) => {
      const key =
        period === "day"
          ? toDateKeyUTC(r.ngay_gio_tao_let)
          : bucketKey(r.ngay_gio_tao_let, period);
      if (!key) return;
      const tt = normalizeTrangThai(r.trang_thai);
      if (!sums[tt]) return;
      sums[tt][key] = (sums[tt][key] || 0) + (Number(r.kien) || 0);
      keys.add(key);
    });

    const buckets =
      period === "day"
        ? [...keys].sort().map((key) => ({ key, label: formatDateLabel(key) }))
        : lastBuckets(period, PERIOD_LIMIT[period]);

    return {
      labels: buckets.map((b) => b.label),
      datasets: TRANG_THAI_LIST.map(({ key, label, color }) => ({
        label,
        // Giá trị 0 -> null để không vẽ cột giả (minBarLength chỉ giúp
        // các giá trị nhỏ nhưng > 0 vẫn nhìn thấy được)
        data: buckets.map((b) => sums[key][b.key] || null),
        backgroundColor: color,
        borderRadius: 2,
        minBarLength: 4,
        barPercentage: 0.9,
        categoryPercentage: 0.9,
      })),
    };
  }, [trendRows, period]);

  // Chừa khoảng trống phía trên (suggestedMax) cho nhãn số ở đỉnh cột
  // Cột chồng -> chiều cao mỗi cột = tổng các trạng thái trong mốc đó
  const trendMax = useMemo(() => {
    let max = 0;
    trendData.labels.forEach((_, i) => {
      const total = trendData.datasets.reduce(
        (s, ds) => s + (ds.data[i] || 0),
        0,
      );
      if (total > max) max = total;
    });
    return max;
  }, [trendData]);

  const pieData = useMemo(
    () =>
      TRANG_THAI_LIST.map(({ key, label, color }) => ({
        name: label,
        value: byTrangThai[key] || 0,
        fill: color,
      })),
    [byTrangThai],
  );

  const pieLabel = usePieLabelRenderer(
    pieData,
    280,
    40,
    LET_MIN_ANGLE,
    percentLabelFormatter,
  );

  // Click vào lát donut -> báo lên component cha để chuyển qua tab Bảng dữ
  // liệu + áp bộ lọc theo đúng trạng thái đó.
  const handleSliceClick = (name) => {
    if (!onNavigate) return;
    const match = TRANG_THAI_LIST.find((t) => t.label === name);
    onNavigate({
      tab: "let",
      trang_thai: match?.key,
      kho: selectedKho.length === 1 ? selectedKho[0] : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-amber-700 md:text-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
          Let Hàng
        </h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="w-full sm:w-72">
        <DateRangeFilter
          label="Lọc theo Ngày tạo Let"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LetStatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={formatNumber(totalKien)}
          avgValue={formatAvg(perDay(totalKien))}
          tone="slate"
        />
        {TRANG_THAI_LIST.map(({ key, label }, i) => (
          <LetStatCard
            key={key}
            icon={statIcons[i]}
            label={label}
            value={formatNumber(byTrangThai[key] || 0)}
            avgValue={formatAvg(perDay(byTrangThai[key] || 0))}
            tone={statTones[i]}
          />
        ))}
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Bình quân tính trên {soNgayCoData} ngày có dữ liệu trong bộ lọc.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-600">
              Số kiện Let theo {PERIOD_UNIT[period]} ({PERIOD_TEXT[period]})
            </p>
            <PeriodToggle
              value={period}
              onChange={setPeriod}
              activeClass="text-amber-600"
            />
          </div>
          {period !== "day" && (
            <p className="mb-2 text-xs text-slate-400">
              {PERIOD_TEXT[period]} trên toàn bộ dữ liệu (không áp dụng bộ lọc
              ngày phía trên)
            </p>
          )}
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : trendMax === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-80">
              <Bar
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: { top: 8 } },
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        font: { size: 12, weight: "600" },
                        color: "#334155",
                        boxWidth: 12,
                        boxHeight: 12,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) =>
                          `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} kiện`,
                        footer: (items) =>
                          `Tổng: ${formatNumber(
                            items.reduce((s, it) => s + (it.parsed.y || 0), 0),
                          )} kiện`,
                      },
                    },
                    // Cột CHỒNG: mỗi mốc thời gian 1 cột, chỉ hiện 1 nhãn
                    // TỔNG ở đỉnh cột (gắn vào segment trên cùng có giá
                    // trị). Nhiều mốc (> 12) -> xoay dọc để không đè nhau.
                    datalabels: {
                      anchor: "end",
                      align: "end",
                      offset: 2,
                      clamp: true,
                      rotation: trendData.labels.length > 12 ? -90 : 0,
                      color: "#1e1b4b",
                      font: { weight: "bold", size: 11 },
                      display: (ctx) => {
                        const i = ctx.dataIndex;
                        const sets = ctx.chart.data.datasets;
                        if (!(sets[ctx.datasetIndex].data[i] > 0)) return false;
                        for (
                          let d = sets.length - 1;
                          d > ctx.datasetIndex;
                          d--
                        ) {
                          if (sets[d].data[i] > 0) return false;
                        }
                        return true;
                      },
                      formatter: (_, ctx) => {
                        const i = ctx.dataIndex;
                        const total = ctx.chart.data.datasets.reduce(
                          (s, ds) => s + (ds.data[i] || 0),
                          0,
                        );
                        return formatNumber(total);
                      },
                    },
                  },
                  scales: {
                    x: {
                      stacked: true,
                      grid: { display: false },
                      ticks: {
                        autoSkip: false,
                        maxRotation: 60,
                        font: { size: 11, weight: "600" },
                        color: "#334155",
                      },
                    },
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      ticks: { font: { size: 12 }, color: "#64748b" },
                      // chừa chỗ phía trên cho nhãn tổng xoay dọc
                      suggestedMax: trendMax > 0 ? trendMax * 1.3 : undefined,
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
                    minAngle={LET_MIN_ANGLE}
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
    </div>
  );
};

// ─────────────────────────────────────────────
// DASHLET — tự fetch data riêng (loai_hinh: "Let")
// ─────────────────────────────────────────────
const DashLet = ({ onNavigate }) => {
  const [rawDataLet, setRawDataLet] = useState([]);
  const [loadingLet, setLoadingLet] = useState(false);

  useEffect(() => {
    const fetchLet = async () => {
      setLoadingLet(true);
      try {
        const res = await nhapHangService.getDanhSach({
          page: 1,
          limit: FETCH_LIMIT,
          loai_hinh: "Let",
        });
        setRawDataLet(res?.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu Let hàng:", err);
      } finally {
        setLoadingLet(false);
      }
    };
    fetchLet();
  }, []);

  return (
    <LetHangSection
      rawData={rawDataLet}
      loading={loadingLet}
      onNavigate={onNavigate}
    />
  );
};

export default DashLet;
