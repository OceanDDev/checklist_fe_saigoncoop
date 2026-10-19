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
import { asnService } from "@/services/nhaphang/asn.service";
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
  KhoFilter,
} from "./dashboardCommon";
import { bucketKey, lastBuckets, PERIOD_LIMIT } from "@/utils/period";
import DateRangeFilter from "./date";
import PeriodToggle from "./PeriodToggle";

const NHAP_MIN_ANGLE = 6;
const PUT_MIN_ANGLE = 8;

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

// so_kien của ASN/Booking lưu dạng String trong DB -> parse an toàn về số
const parseNum = (v) => {
  const n = Number(String(v ?? "").replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// Hàng trung chuyển (SKU "HANGTRUNGCHUYEN") không cần putaway thật sự
// -> dù vị trí đang ở RZ* vẫn coi là "đã put", không tính vào chưa put.
const isChuaPutRow = (r) =>
  String(r.sku || "").trim() !== "HANGTRUNGCHUYEN" && isChuaPut(r.vi_tri);

// Màu theo tone — class tĩnh (không nối chuỗi động) để Tailwind không
// purge mất khi build. Cùng bảng tone với DashASN / DashLet để 3 dashboard
// đồng bộ phong cách.
const STAT_TONES = {
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

// Card riêng cho Nhập/Put Hàng — số to, đậm, có màu rõ theo từng loại,
// tách khỏi StatCard dùng chung (dashboardCommon) để không ảnh hưởng
// dashboard khác, cùng phong cách với ASNStatCard / LetStatCard.
// avgValue (tùy chọn): hiện thêm ô "TB / ngày" bên phải.
const NhapPutStatCard = ({ icon: Icon, label, value, avgValue, tone }) => {
  const t = STAT_TONES[tone] || STAT_TONES.blue;
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

// datalabels dùng chung cho các biểu đồ cột ở đây — số to, đậm, có nền
// trắng mờ phía sau để nổi rõ trên mọi màu cột (thay cho
// barDataLabelsOptions dùng chung, vốn cỡ chữ nhỏ hơn).
const bigBarDataLabels = {
  anchor: "end",
  align: "end",
  offset: 4,
  clamp: true,
  color: "#1e1b4b",
  backgroundColor: "rgba(255,255,255,0.85)",
  borderRadius: 4,
  padding: { top: 2, bottom: 2, left: 5, right: 5 },
  font: { weight: "bold", size: 12 },
  formatter: (value) => (value > 0 ? formatNumber(value) : ""),
};

const axisTicksBold = { font: { size: 12, weight: "600" }, color: "#334155" };
const axisTicksNormal = { font: { size: 12 }, color: "#64748b" };
const legendLabelsBold = {
  font: { size: 12, weight: "600" },
  color: "#334155",
  boxWidth: 12,
  boxHeight: 12,
};

// Khối tiêu đề + nút Ngày/Tháng/Năm dùng chung cho biểu đồ cột theo thời gian
const TrendHeader = ({ period, setPeriod, activeClass, prefix }) => (
  <>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-medium text-slate-600">
        {prefix} theo {PERIOD_UNIT[period]} ({PERIOD_TEXT[period]})
      </p>
      <PeriodToggle
        value={period}
        onChange={setPeriod}
        activeClass={activeClass}
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

const NhapHangSection = ({ rawData, asnData, loading, onNavigate }) => {
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
      const key = toDateKeyUTC(r.ngay_nhap_kho);
      if (!key) return false;
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [rawData, selectedKho, dateFrom, dateTo]);

  // Tổng kiện BOOKING D-1 tương ứng: hàng nhập kho ngày D là hàng đã booking
  // ngày D-1 (vd nhập ngày 28 so với booking ngày 27). Với khoảng lọc
  // [từ, đến] thì lấy booking của [từ-1, đến-1]; "đến" bị chặn ở hôm nay
  // để không cộng booking của những ngày chưa tới. Cùng lọc theo kho.
  const bookingKien = useMemo(() => {
    const fmt = "YYYY-MM-DD";
    const today = dayjs().format(fmt);
    const toEff = dateTo && dateTo < today ? dateTo : today;
    const bookTo = dayjs(toEff).subtract(1, "day").format(fmt);
    const bookFrom = dateFrom
      ? dayjs(dateFrom).subtract(1, "day").format(fmt)
      : "";

    let sum = 0;
    (asnData || []).forEach((r) => {
      if (!selectedKho.includes(Number(r.kho))) return;
      const key = toDateKeyUTC(r.ngay_asn);
      if (!key) return;
      if (bookFrom && key < bookFrom) return;
      if (key > bookTo) return;
      sum += parseNum(r.so_kien);
    });
    return sum;
  }, [asnData, selectedKho, dateFrom, dateTo]);

  // totalKien / totalSku luôn là TỔNG của toàn bộ khoảng ngày đang lọc
  // (không phải theo từng ngày riêng lẻ) vì tính trực tiếp từ `filtered`.
  // Bình quân/ngày chỉ tính trên các ngày có dữ liệu.
  const { totalKien, totalSku, byKho, soNgayCoData, avgKien, avgSku } =
    useMemo(() => {
      const skuSet = new Set();
      const dayKeys = new Set();
      const daySku = {}; // { 'YYYY-MM-DD': Set(sku) }
      let totalKien = 0;
      const byKho = {};

      filtered.forEach((r) => {
        const kien = Number(r.kien) || 0;
        const kho = Number(r.kho);
        totalKien += kien;
        skuSet.add(r.sku);
        byKho[kho] = (byKho[kho] || 0) + kien;

        const dk = toDateKeyUTC(r.ngay_nhap_kho);
        if (dk) {
          dayKeys.add(dk);
          if (r.sku) (daySku[dk] ||= new Set()).add(r.sku);
        }
      });

      const soNgayCoData = dayKeys.size;
      // TB SKU/ngày = trung bình số SKU KHÁC NHAU của từng ngày
      const avgSku =
        soNgayCoData > 0
          ? Object.values(daySku).reduce((sum, set) => sum + set.size, 0) /
            soNgayCoData
          : 0;

      return {
        totalKien,
        totalSku: skuSet.size,
        byKho,
        soNgayCoData,
        avgKien: soNgayCoData > 0 ? totalKien / soNgayCoData : 0,
        avgSku,
      };
    }, [filtered]);

  // Danh sách kho đang được chọn — dùng để render card "Tổng kiện - Kho X"
  const khoActive = useMemo(
    () => KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)),
    [selectedKho],
  );

  // Bình quân/ngày = tổng kiện ÷ số ngày có dữ liệu trong bộ lọc
  const perDay = (n) => (soNgayCoData > 0 ? n / soNgayCoData : 0);

  // Dữ liệu biểu đồ cột: chế độ Ngày tôn trọng bộ lọc ngày; Tháng / Năm bỏ
  // lọc ngày (chỉ lọc kho) để thấy được toàn bộ lịch sử.
  const trendRows = useMemo(
    () =>
      period === "day"
        ? filtered
        : rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [period, filtered, rawData, selectedKho],
  );

  const { labels, khoBarData } = useMemo(() => {
    const sums = {}; // { kho: { key: tổng kiện } }
    const dayKeys = new Set();

    trendRows.forEach((r) => {
      const key =
        period === "day"
          ? toDateKeyUTC(r.ngay_nhap_kho)
          : bucketKey(r.ngay_nhap_kho, period);
      if (!key) return;
      const kho = Number(r.kho);
      if (!sums[kho]) sums[kho] = {};
      sums[kho][key] = (sums[kho][key] || 0) + (Number(r.kien) || 0);
      dayKeys.add(key);
    });

    const buckets =
      period === "day"
        ? [...dayKeys].sort().map((key) => ({
            key,
            label: formatDateLabel(key),
          }))
        : lastBuckets(period, PERIOD_LIMIT[period]);

    return {
      labels: buckets.map((b) => b.label),
      khoBarData: {
        labels: buckets.map((b) => b.label),
        datasets: KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)).map(
          ({ kho, label, color }) => ({
            label,
            data: buckets.map((b) => sums[kho]?.[b.key] || 0),
            backgroundColor: color,
            borderRadius: 4,
          }),
        ),
      },
    };
  }, [trendRows, period, selectedKho]);

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
    NHAP_MIN_ANGLE,
    percentLabelFormatter,
  );

  const handleKhoSliceClick = (data) => {
    if (!onNavigate) return;
    onNavigate({ tab: "nhap", kho: data.kho });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-blue-700 md:text-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          Nhập Hàng
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
        <NhapPutStatCard
          icon={Boxes}
          label="Tổng số kiện / Kiện Booking (D-1)"
          value={`${formatNumber(totalKien)} / ${formatNumber(bookingKien)}`}
          avgValue={formatAvg(avgKien)}
          tone="blue"
        />
        <NhapPutStatCard
          icon={PackageCheck}
          label="Số SKU"
          value={formatNumber(totalSku)}
          avgValue={formatAvg(avgSku)}
          tone="emerald"
        />
        {/* Card tổng kiện theo từng kho (Kho 810 / 8101 / 8104...) */}
        {khoActive.map(({ kho, label }) => {
          const total = byKho[kho] || 0;
          return (
            <NhapPutStatCard
              key={kho}
              icon={Boxes}
              label={`Tổng kiện - ${label}`}
              value={formatNumber(total)}
              avgValue={formatAvg(perDay(total))}
              tone="blue"
            />
          );
        })}
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Bình quân tính trên {soNgayCoData} ngày có dữ liệu trong bộ lọc.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-600">
              Số kiện nhập theo {PERIOD_UNIT[period]} ({PERIOD_TEXT[period]})
            </p>
            <PeriodToggle
              value={period}
              onChange={setPeriod}
              activeClass="text-blue-600"
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
          ) : labels.length === 0 ? (
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
                    legend: { position: "bottom", labels: legendLabelsBold },
                    datalabels: bigBarDataLabels,
                  },
                  scales: {
                    x: {
                      stacked: false,
                      ticks: axisTicksBold,
                      grid: { display: false },
                    },
                    y: {
                      stacked: false,
                      beginAtZero: true,
                      ticks: axisTicksNormal,
                      grid: { color: "#f1f5f9" },
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
                    minAngle={NHAP_MIN_ANGLE}
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

const PutHangSection = ({ rawData, loading, onNavigate }) => {
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

      if (isChuaPutRow(r)) {
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

  const khoActive = useMemo(
    () => KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)),
    [selectedKho],
  );

  // Ngày: theo bộ lọc ngày; Tháng / Năm: chỉ lọc kho (bỏ lọc ngày)
  const trendRows = useMemo(
    () =>
      period === "day"
        ? filtered
        : rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [period, filtered, rawData, selectedKho],
  );

  // Biểu đồ cột: mỗi mốc thời gian có 2 cột "Đã put" / "Chưa put (RZ*)"
  const putBarData = useMemo(() => {
    const sums = {}; // { key: { daPut, chuaPut } }
    const dayKeys = new Set();

    trendRows.forEach((r) => {
      const key =
        period === "day"
          ? toDateKeyUTC(r.ngay_nhap_kho)
          : bucketKey(r.ngay_nhap_kho, period);
      if (!key) return;
      const kien = Number(r.kien) || 0;
      if (!sums[key]) sums[key] = { daPut: 0, chuaPut: 0 };
      if (isChuaPutRow(r)) sums[key].chuaPut += kien;
      else sums[key].daPut += kien;
      dayKeys.add(key);
    });

    const buckets =
      period === "day"
        ? [...dayKeys]
            .sort()
            .map((key) => ({ key, label: formatDateLabel(key) }))
        : lastBuckets(period, PERIOD_LIMIT[period]);

    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: "Đã put",
          data: buckets.map((b) => sums[b.key]?.daPut || 0),
          backgroundColor: "#10b981",
          borderRadius: 4,
          minBarLength: 4,
        },
        {
          label: "Chưa put (RZ*)",
          data: buckets.map((b) => sums[b.key]?.chuaPut || 0),
          backgroundColor: "#f43f5e",
          borderRadius: 4,
          minBarLength: 4,
        },
      ],
    };
  }, [trendRows, period]);

  // Chừa khoảng trống phía trên (suggestedMax) cho nhãn số ở đỉnh cột
  const barMax = useMemo(() => {
    let max = 0;
    putBarData.datasets.forEach((ds) =>
      ds.data.forEach((v) => {
        if (v > max) max = v;
      }),
    );
    return max;
  }, [putBarData]);

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
    PUT_MIN_ANGLE,
    percentLabelFormatter,
  );

  const handleSliceClick = (name) => {
    if (!onNavigate) return;
    const isChuaPutSlice = name.startsWith("Chưa put");
    onNavigate({
      tab: "nhap",
      status: isChuaPutSlice ? "chuaPut" : "daPut",
      viTri: isChuaPutSlice ? "RZ" : undefined,
      kho: selectedKho.length === 1 ? selectedKho[0] : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-cyan-700 md:text-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" />
          Put Hàng
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
            <NhapPutStatCard
              key={kho}
              icon={Boxes}
              label={`Tổng kiện - ${label}`}
              value={formatNumber(total)}
              avgValue={formatAvg(perDay(total))}
              tone="blue"
            />
          );
        })}
        <NhapPutStatCard
          icon={PackageCheck}
          label="Đã put"
          value={formatNumber(daPut)}
          avgValue={formatAvg(perDay(daPut))}
          tone="emerald"
        />
        <NhapPutStatCard
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
          <TrendHeader
            period={period}
            setPeriod={setPeriod}
            activeClass="text-cyan-600"
            prefix="Số kiện put"
          />
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : barMax === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-72">
              <Bar
                data={putBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: { top: 24 } },
                  plugins: {
                    legend: { position: "bottom", labels: legendLabelsBold },
                    datalabels: bigBarDataLabels,
                  },
                  scales: {
                    x: {
                      stacked: false,
                      ticks: axisTicksBold,
                      grid: { display: false },
                    },
                    y: {
                      stacked: false,
                      beginAtZero: true,
                      ticks: axisTicksNormal,
                      grid: { color: "#f1f5f9" },
                      suggestedMax: barMax > 0 ? barMax * 1.25 : undefined,
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
                    minAngle={PUT_MIN_ANGLE}
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
// DASHNHAPPUT — gộp Nhập Hàng + Put Hàng, fetch data 1 LẦN (loai_hinh:
// "Nhập"), dùng chung cho cả 2 section (Put chỉ khác cách tính, dựa theo
// vi_tri bắt đầu "RZ").
// ─────────────────────────────────────────────
const DashNhapPut = ({ onNavigate }) => {
  const [rawData, setRawData] = useState([]);
  const [asnData, setAsnData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Booking (ASN) chỉ để đối chiếu "kiện nhập / kiện booking D-1" — lỗi
  // thì bỏ qua, không làm hỏng dashboard Nhập/Put.
  useEffect(() => {
    const fetchAsn = async () => {
      try {
        const res = await asnService.getDanhSach({
          page: 1,
          limit: FETCH_LIMIT,
        });
        setAsnData(res?.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu Booking (ASN):", err);
      }
    };
    fetchAsn();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await nhapHangService.getDanhSach({
          page: 1,
          limit: FETCH_LIMIT,
          loai_hinh: "Nhập",
        });
        setRawData(res?.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu Nhập hàng:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <NhapHangSection
        rawData={rawData}
        asnData={asnData}
        loading={loading}
        onNavigate={onNavigate}
      />
      <div className="border-t border-slate-200" />
      <PutHangSection
        rawData={rawData}
        loading={loading}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default DashNhapPut;
