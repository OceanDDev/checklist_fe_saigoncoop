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
  getDefaultDateRange,
  KhoFilter,
} from "./dashboardCommon";

// SKU cố định của Hàng Trung Chuyển — khớp với SKU_KHONG_AP_QC_DAC_THU
// bên NhapHangImportModal (import.jsx). Đây là dòng hàng được import
// chung với "Nhập" (loai_hinh: "Nhập") nhưng luôn cho qua rule QC Đặc Thù.
const SKU_HANG_TRUNG_CHUYEN = "HANGTRUNGCHUYEN";

const TC_NHAP_MIN_ANGLE = 6;
const TC_PUT_MIN_ANGLE = 8;

// ─────────────────────────────────────────────
// STAT CARD riêng cho Hàng Trung Chuyển — số to, đậm, ring màu theo tone,
// cùng phong cách với LetStatCard bên DashLet để đồng bộ UI giữa các
// dashboard con trong cùng module Nhập Hàng.
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

const TrungChuyenStatCard = ({ icon: Icon, label, value, tone = "slate" }) => {
  const t = STAT_TONES[tone] || STAT_TONES.slate;
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

// ─────────────────────────────────────────────
// SECTION 1: TRUNG CHUYỂN — NHẬP — tổng kiện theo ngày nhập kho, filter
// kho + khoảng ngày. Nhận data từ component cha (không tự fetch).
// ─────────────────────────────────────────────
const TrungChuyenNhapSection = ({ rawData, loading, onNavigate }) => {
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

  // totalKien / totalDong luôn là TỔNG của toàn bộ khoảng ngày đang lọc
  // (không phải theo từng ngày riêng lẻ) vì tính trực tiếp từ `filtered`.
  const { labels, khoBarData, totalKien, totalDong, byKho } = useMemo(() => {
    const dateKeys = [
      ...new Set(filtered.map((r) => toDateKeyUTC(r.ngay_nhap_kho))),
    ].sort();

    let totalKien = 0;
    const byKho = {};

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      const kho = Number(r.kho);
      totalKien += kien;
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
          minBarLength: 4,
        }),
      ),
    };

    return {
      labels: dateKeys.map(formatDateLabel),
      khoBarData,
      totalKien,
      totalDong: filtered.length,
      byKho,
    };
  }, [filtered, selectedKho]);

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-indigo-600 hover:underline"
          >
            Xóa lọc ngày
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TrungChuyenStatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={formatNumber(totalKien)}
          tone="blue"
        />
        <TrungChuyenStatCard
          icon={PackageCheck}
          label="Tổng số dòng"
          value={formatNumber(totalDong)}
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

  const { khoBarData, totalKien, chuaPut, daPut, byKho } =
    useMemo(() => {
      const dateKeys = [
        ...new Set(filtered.map((r) => toDateKeyUTC(r.ngay_nhap_kho))),
      ].sort();

      let totalKien = 0;
      let chuaPut = 0;
      const byKho = {};

      filtered.forEach((r) => {
        const kien = Number(r.kien) || 0;
        totalKien += kien;
        const kho = Number(r.kho);
        if (!byKho[kho]) byKho[kho] = { daPut: 0, chuaPut: 0 };

        if (isChuaPut(r.vi_tri)) {
          chuaPut += kien;
          byKho[kho].chuaPut += kien;
        } else {
          byKho[kho].daPut += kien;
        }
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
            minBarLength: 4,
          }),
        ),
      };

      return {
        labels: dateKeys.map(formatDateLabel),
        khoBarData,
        totalKien,
        chuaPut,
        daPut: totalKien - chuaPut,
        byKho,
      };
    }, [filtered, selectedKho]);

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-indigo-600 hover:underline"
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
            <TrungChuyenStatCard
              key={kho}
              icon={Boxes}
              label={`Tổng kiện - ${label}`}
              value={formatNumber(total)}
              tone="blue"
            />
          );
        })}
        <TrungChuyenStatCard
          icon={PackageCheck}
          label="Đã put"
          value={formatNumber(daPut)}
          tone="emerald"
        />
        <TrungChuyenStatCard
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
