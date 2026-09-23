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
  getDefaultDateRange,
  KhoFilter,
} from "./dashboardCommon";

const NHAP_MIN_ANGLE = 6;
const PUT_MIN_ANGLE = 8;

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
const NhapPutStatCard = ({ icon: Icon, label, value, tone }) => {
  const t = STAT_TONES[tone] || STAT_TONES.blue;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 ring-4 ${t.ring}`}
    >
      <span className={`shrink-0 rounded-lg p-2.5 ${t.icon}`}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className={`text-2xl font-extrabold leading-tight ${t.value}`}>
          {value}
        </p>
      </div>
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

const NhapHangSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));
  const [dateFrom, setDateFrom] = useState(() => getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => getDefaultDateRange().to);

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

  // totalKien / totalSku luôn là TỔNG của toàn bộ khoảng ngày đang lọc
  // (không phải theo từng ngày riêng lẻ) vì tính trực tiếp từ `filtered`.
  const { labels, khoBarData, totalKien, totalSku, byKho } = useMemo(() => {
    const dateKeys = [
      ...new Set(filtered.map((r) => toDateKeyUTC(r.ngay_nhap_kho))),
    ].sort();

    const skuSet = new Set();
    let totalKien = 0;
    const byKho = {};

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      const kho = Number(r.kho);
      totalKien += kien;
      skuSet.add(r.sku);
      byKho[kho] = (byKho[kho] || 0) + kien;
    });

    const khoBarData = {
      labels: dateKeys.map(formatDateLabel),
      datasets: KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)).map(
        ({ kho, label, color }) => ({
          label,
          data: dateKeys.map((key) =>
            filtered
              .filter(
                (r) =>
                  Number(r.kho) === kho &&
                  toDateKeyUTC(r.ngay_nhap_kho) === key,
              )
              .reduce((sum, r) => sum + (Number(r.kien) || 0), 0),
          ),
          backgroundColor: color,
          borderRadius: 4,
        }),
      ),
    };

    return {
      labels: dateKeys.map(formatDateLabel),
      khoBarData,
      totalKien,
      totalSku: skuSet.size,
      byKho,
    };
  }, [filtered, selectedKho]);

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            Xóa lọc ngày
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NhapPutStatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={formatNumber(totalKien)}
          tone="blue"
        />
        <NhapPutStatCard
          icon={PackageCheck}
          label="Số SKU"
          value={formatNumber(totalSku)}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
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
  const [dateFrom, setDateFrom] = useState(() => getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => getDefaultDateRange().to);

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

  const { totalKien, chuaPut, daPut, byKho } = useMemo(() => {
    let totalKien = 0;
    let chuaPut = 0;
    const byKho = {};

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      totalKien += kien;
      const kho = Number(r.kho);
      if (!byKho[kho]) byKho[kho] = { daPut: 0, chuaPut: 0 };

      // Hàng trung chuyển (SKU "HANGTRUNGCHUYEN") không cần putaway thật sự
      // -> dù vị trí đang ở RZ* (thường tính là "chưa put") vẫn coi là "đã
      // put" luôn, không tính vào chưa put.
      const isHangTrungChuyen =
        String(r.sku || "").trim() === "HANGTRUNGCHUYEN";

      if (!isHangTrungChuyen && isChuaPut(r.vi_tri)) {
        chuaPut += kien;
        byKho[kho].chuaPut += kien;
      } else {
        byKho[kho].daPut += kien;
      }
    });

    return { totalKien, chuaPut, daPut: totalKien - chuaPut, byKho };
  }, [filtered]);

  const khoActive = useMemo(
    () => KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)),
    [selectedKho],
  );

  const khoBarData = useMemo(() => {
    return {
      labels: khoActive.map((k) => k.label),
      datasets: [
        {
          label: "Đã put",
          data: khoActive.map((k) => byKho[k.kho]?.daPut || 0),
          backgroundColor: "#10b981",
          borderRadius: 4,
        },
        {
          label: "Chưa put (RZ*)",
          data: khoActive.map((k) => byKho[k.kho]?.chuaPut || 0),
          backgroundColor: "#f43f5e",
          borderRadius: 4,
        },
      ],
    };
  }, [byKho, khoActive]);

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            Xóa lọc ngày
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {khoActive.map(({ kho, label }) => {
          const k = byKho[kho] || { daPut: 0, chuaPut: 0 };
          const total = k.daPut + k.chuaPut;
          return (
            <NhapPutStatCard
              key={kho}
              icon={Boxes}
              label={`Tổng kiện - ${label}`}
              value={formatNumber(total)}
              tone="blue"
            />
          );
        })}
        <NhapPutStatCard
          icon={PackageCheck}
          label="Đã put"
          value={formatNumber(daPut)}
          tone="emerald"
        />
        <NhapPutStatCard
          icon={PackageX}
          label="Chưa put (RZ*)"
          value={formatNumber(chuaPut)}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : totalKien === 0 ? (
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
  const [loading, setLoading] = useState(false);

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
