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
  StatCard,
  barDataLabelsOptions,
} from "./dashboardCommon";

const NHAP_MIN_ANGLE = 6;
const PUT_MIN_ANGLE = 8;

// ─────────────────────────────────────────────
// BIỂU ĐỒ CỘT NĂNG SUẤT NHÂN VIÊN — mỗi nhân viên 1 cột, giá trị = tổng
// kiện xử lý (kiện = 0 trên bảng tính là 1). Dùng chung cho NV Nhận &
// NV Putaway, chỉ khác field nguồn và tiêu đề.
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
              plugins: {
                legend: { display: false },
                datalabels: barDataLabelsOptions,
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${formatNumber(ctx.parsed.y)} kiện`,
                  },
                },
              },
              scales: {
                x: {
                  ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 },
                },
                y: { beginAtZero: true },
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION 1: NHẬP HÀNG — tổng kiện theo ngày nhập kho, filter kho + khoảng ngày
// Nhận data từ component cha (không tự fetch)
// ─────────────────────────────────────────────
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

  const { labels, datasets, totalKien, totalSku, byKhoKien } = useMemo(() => {
    const dateKeys = [
      ...new Set(filtered.map((r) => toDateKeyUTC(r.ngay_nhap_kho))),
    ].sort();
    const skuSet = new Set();
    let totalKien = 0;
    const byKhoKien = {};

    const datasets = KHO_LIST.filter(({ kho }) =>
      selectedKho.includes(kho),
    ).map(({ kho, label, color }) => ({
      label,
      data: dateKeys.map((key) =>
        filtered
          .filter(
            (r) =>
              Number(r.kho) === kho && toDateKeyUTC(r.ngay_nhap_kho) === key,
          )
          .reduce((sum, r) => sum + (Number(r.kien) || 0), 0),
      ),
      backgroundColor: color,
      borderRadius: 4,
    }));

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      const kho = Number(r.kho);
      totalKien += kien;
      skuSet.add(r.sku);
      byKhoKien[kho] = (byKhoKien[kho] || 0) + kien;
    });

    return {
      labels: dateKeys.map(formatDateLabel),
      datasets,
      totalKien,
      totalSku: skuSet.size,
      byKhoKien,
    };
  }, [filtered, selectedKho]);

  const khoPieData = useMemo(
    () =>
      KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)).map(
        ({ kho, label, color }) => ({
          name: label,
          kho,
          value: byKhoKien[kho] || 0,
          fill: color,
        }),
      ),
    [selectedKho, byKhoKien],
  );

  const khoPieLabel = usePieLabelRenderer(
    khoPieData,
    280,
    40,
    NHAP_MIN_ANGLE,
    percentLabelFormatter,
  );

  const empNhanData = useMemo(
    () => buildEmpProductivity(filtered, "nhan_vien_nhap"),
    [filtered],
  );

  const handleKhoSliceClick = (data) => {
    if (!onNavigate) return;
    onNavigate({ tab: "nhap", kho: data.kho });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Nhập Hàng</h2>
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
        <StatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={totalKien.toLocaleString("vi-VN")}
          tone="bg-blue-600"
        />
        <StatCard
          icon={PackageCheck}
          label="Số SKU"
          value={totalSku.toLocaleString("vi-VN")}
          tone="bg-emerald-600"
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
                data={{ labels, datasets }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                    datalabels: barDataLabelsOptions,
                  },
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
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

      <EmpProductivityBar
        title="Năng suất NV Nhận (theo kiện)"
        data={empNhanData}
        loading={loading}
      />
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION 2: PUT HÀNG — dùng CHUNG data với Nhập Hàng (loai_hinh "Nhập")
// Chưa put = vị trí (vi_tri) bắt đầu bằng "RZ" (RZ1, RZ2, ...)
// ─────────────────────────────────────────────
const PutHangSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  const filtered = useMemo(
    () => rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [rawData, selectedKho],
  );

  const { totalKien, chuaPut, daPut, byKho } = useMemo(() => {
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

    return { totalKien, chuaPut, daPut: totalKien - chuaPut, byKho };
  }, [filtered]);

  const khoBarData = useMemo(() => {
    const khoActive = KHO_LIST.filter(({ kho }) => selectedKho.includes(kho));
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
  }, [byKho, selectedKho]);

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

  const empPutData = useMemo(
    () => buildEmpProductivity(filtered, "nhan_vien_put"),
    [filtered],
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
        <h2 className="text-base font-semibold text-slate-800">Put Hàng</h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={totalKien.toLocaleString("vi-VN")}
          tone="bg-blue-600"
        />
        <StatCard
          icon={PackageCheck}
          label="Đã put"
          value={daPut.toLocaleString("vi-VN")}
          tone="bg-emerald-600"
        />
        <StatCard
          icon={PackageX}
          label="Chưa put (RZ*)"
          value={chuaPut.toLocaleString("vi-VN")}
          tone="bg-rose-600"
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
                  plugins: {
                    legend: { position: "bottom" },
                    datalabels: barDataLabelsOptions,
                  },
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
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

      <EmpProductivityBar
        title="Năng suất NV Putaway (theo kiện)"
        data={empPutData}
        loading={loading}
      />
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
