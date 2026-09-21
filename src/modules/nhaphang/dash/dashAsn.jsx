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
import { Loader2, FileStack, Package, Truck, Building2 } from "lucide-react";
import { asnService } from "@/services/nhaphang/asn.service";
import {
  KHO_LIST,
  FETCH_LIMIT,
  FONT_SANS,
  useDonutFonts,
  usePieLabelRenderer,
  percentLabelFormatter,
  KhoFilter,
  StatCard,
  formatNumber,
  toDateKeyUTC,
  getDefaultDateRange,
} from "./dashboardCommon";

const ASN_MIN_ANGLE = 6;

// Màu theo loại hình — loại hình lạ (không có trong map) sẽ rơi vào bảng
// màu dự phòng bên dưới theo thứ tự xuất hiện, không bị vỡ layout.
const LOAI_HINH_COLORS = {
  "Nhập": "#2563eb",
  "Trả hàng": "#f59e0b",
  "Chuyển kho": "#8b5cf6",
};
const FALLBACK_COLORS = ["#10b981", "#f43f5e", "#0ea5e9", "#a855f7", "#eab308"];

// kien_ke_hoach / kien_con_lai lưu dạng String trong DB (theo đúng
// Excel gốc) -> parse an toàn về số để cộng dồn, bỏ dấu phẩy/khoảng trắng
const parseNum = (v) => {
  const n = Number(String(v ?? "").replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const ASNSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));
  const [dateFrom, setDateFrom] = useState(() => getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => getDefaultDateRange().to);

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  // Lọc theo kho đã chọn + khoảng "Ngày ASN" — cùng cách làm với LetHangSection
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

  const {
    totalPO,
    totalNCC,
    totalKienKeHoach,
    totalKienConLai,
    byLoaiHinh,
    last7Days,
  } = useMemo(() => {
    const poSet = new Set();
    const nccSet = new Set();
    let totalKienKeHoach = 0;
    let totalKienConLai = 0;
    const loaiHinhPoSets = {}; // { loai_hinh: Set(po) }
    const dayPoSets = {}; // { 'YYYY-MM-DD': Set(po) }

    filtered.forEach((r) => {
      if (r.po) poSet.add(r.po);
      if (r.ma_ncc !== undefined && r.ma_ncc !== null && r.ma_ncc !== "") {
        nccSet.add(r.ma_ncc);
      }

      totalKienKeHoach += parseNum(r.kien_ke_hoach);
      totalKienConLai += parseNum(r.kien_con_lai);

      const lh = String(r.loai_hinh || "").trim() || "Khác";
      if (!loaiHinhPoSets[lh]) loaiHinhPoSets[lh] = new Set();
      if (r.po) loaiHinhPoSets[lh].add(r.po);

      const dayKey = toDateKeyUTC(r.ngay_asn);
      if (dayKey && r.po) {
        if (!dayPoSets[dayKey]) dayPoSets[dayKey] = new Set();
        dayPoSets[dayKey].add(r.po);
      }
    });

    // 7 ngày gần nhất tính theo hôm nay — luôn thấy xu hướng mới nhất dù
    // bộ lọc ngày phía trên đang chọn khoảng khác
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - i),
      );
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(
          d.getUTCMonth() + 1,
        ).padStart(2, "0")}`,
        count: dayPoSets[key]?.size || 0,
      });
    }

    return {
      totalPO: poSet.size,
      totalNCC: nccSet.size,
      totalKienKeHoach,
      totalKienConLai,
      byLoaiHinh: Object.entries(loaiHinhPoSets).map(([name, set], i) => ({
        name,
        value: set.size,
        fill:
          LOAI_HINH_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
      last7Days: days,
    };
  }, [filtered]);

  const pieLabel = usePieLabelRenderer(
    byLoaiHinh,
    260,
    40,
    ASN_MIN_ANGLE,
    percentLabelFormatter,
  );

  const dayBarData = useMemo(
    () => ({
      labels: last7Days.map((d) => d.label),
      datasets: [
        {
          label: "Số PO",
          data: last7Days.map((d) => d.count),
          backgroundColor: "#4f46e5",
          hoverBackgroundColor: "#4338ca",
          borderRadius: 8,
          minBarLength: 4,
          maxBarThickness: 46,
        },
      ],
    }),
    [last7Days],
  );

  const dayBarMax = useMemo(
    () => Math.max(0, ...last7Days.map((d) => d.count)),
    [last7Days],
  );

  const handleSliceClick = (name) => {
    if (!onNavigate) return;
    onNavigate({
      tab: "asn",
      loai_hinh: name,
      kho: selectedKho.length === 1 ? String(selectedKho[0]) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">ASN</h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày ASN
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày ASN
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileStack}
          label="Tổng số PO"
          value={formatNumber(totalPO)}
          tone="bg-indigo-600"
        />
        <StatCard
          icon={Building2}
          label="Tổng NCC"
          value={formatNumber(totalNCC)}
          tone="bg-sky-600"
        />
        <StatCard
          icon={Package}
          label="Kiện kế hoạch"
          value={formatNumber(totalKienKeHoach)}
          tone="bg-amber-600"
        />
        <StatCard
          icon={Truck}
          label="Kiện còn lại"
          value={formatNumber(totalKienConLai)}
          tone="bg-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Số PO theo ngày ASN — 7 ngày gần nhất */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-600">
            Số PO theo ngày ASN (7 ngày gần nhất)
          </p>
          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="h-64">
              <Bar
                data={dayBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: { top: 24 } },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${formatNumber(ctx.parsed.y)} PO`,
                      },
                    },
                    datalabels: {
                      anchor: "end",
                      align: "end",
                      offset: 2,
                      clamp: true,
                      color: "#334155",
                      font: { weight: "bold", size: 11 },
                      formatter: (value) =>
                        value > 0 ? formatNumber(value) : "",
                    },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      suggestedMax:
                        dayBarMax > 0 ? dayBarMax * 1.2 : undefined,
                    },
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Donut theo loại hình */}
        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          style={{ fontFamily: FONT_SANS }}
        >
          <p className="mb-2 text-sm font-medium text-slate-600">
            Theo loại hình
          </p>
          {loading || totalPO === 0 ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Không có dữ liệu"
              )}
            </div>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height={260} debounce={150}>
                <PieChart margin={{ top: 24, right: 60, bottom: 24, left: 60 }}>
                  <Pie
                    data={byLoaiHinh}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={66}
                    paddingAngle={2}
                    minAngle={ASN_MIN_ANGLE}
                    label={pieLabel}
                    labelLine={false}
                    cursor={onNavigate ? "pointer" : "default"}
                    onClick={(data) => handleSliceClick(data.name)}
                  >
                    {byLoaiHinh.map((d, i) => (
                      <Cell key={i} fill={d.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, name) => [
                      `${formatNumber(value)} PO (${
                        totalPO ? ((value / totalPO) * 100).toFixed(1) : 0
                      }%)`,
                      name,
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