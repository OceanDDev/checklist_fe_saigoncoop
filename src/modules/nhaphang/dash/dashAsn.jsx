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
import {
  Loader2,
  FileStack,
  Package,
  PackageCheck,
  Truck,
  Building2,
} from "lucide-react";
import { asnService } from "@/services/nhaphang/asn.service";
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
  getDefaultDateRange,
} from "./dashboardCommon";

const ASN_MIN_ANGLE = 6;

// Màu theo loại hình — khai đúng theo TÊN LOẠI HÌNH THẬT xuất hiện trong dữ
// liệu ASN (khác với module Nhập/Put khác), để mỗi loại hình có 1 màu
// riêng biệt, không bị trùng. Loại hình lạ ngoài danh sách này (nếu phát
// sinh sau này) sẽ rơi vào FALLBACK_COLORS bên dưới theo thứ tự xuất hiện.
const LOAI_HINH_COLORS = {
  "Nhập NCC": "#10b981",
  "Nhập VAS": "#f59e0b",
  "Nhập hàng trung chuyển": "#CC33CC",
  "Nhập mua CSH": "#8b5cf6",
  "Nhập nội bộ": "#f43f5e",
  "Nhập trả từ nơi xuất đến": "#0ea5e9",
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

// Bảng màu cho các cột "Kiện kế hoạch theo ngành hàng" — lặp vòng nếu
// nhiều ngành hàng hơn số màu
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

// kien_ke_hoach / kien_con_lai lưu dạng String trong DB (theo đúng
// Excel gốc) -> parse an toàn về số để cộng dồn, bỏ dấu phẩy/khoảng trắng
const parseNum = (v) => {
  const n = Number(String(v ?? "").replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// ─────────────────────────────────────────────
// CHUẨN HÓA "NGÀNH HÀNG" — dữ liệu gốc bị nhập lẫn mã số (001, 005, 010,
// 030, 050...) chung với tên ngành hàng, ví dụ:
//   "005, 010"                 -> chỉ có số, không có tên
//   "005, Thực phẩm công nghệ" -> số + tên
//   "Thực phẩm công nghệ, 001" -> tên + số
//   "030, Hoá phẩm"            -> số + tên khác
//   "Đồ dùng, 015"             -> tên + số
// Quy tắc gom nhóm (theo yêu cầu thực tế):
//   - Nếu có phần chữ (không phải số thuần) -> dùng phần chữ đó làm tên
//     ngành hàng chuẩn (bỏ hết mã số đi kèm).
//   - Nếu chỉ toàn mã số, không có phần chữ -> mặc định gom vào
//     "Thực phẩm công nghệ" (các mã số này đều thuộc ngành đó).
//   - Riêng các dòng mà cột ngành hàng bị nhập nhầm thành MÃ ASN dạng
//     "VAS-190926-1" (chữ-số-số) thì KHÔNG tính vào ngành hàng nào cả —
//     bỏ qua hoàn toàn dòng đó khi gộp biểu đồ ngành hàng.
const ASN_CODE_LIKE_REGEX = /^[A-Za-z]{2,}-\d{4,}-\d+$/;

const isAsnCodeLike = (v) => ASN_CODE_LIKE_REGEX.test(String(v || "").trim());

const normalizeNganhHang = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "Chưa xác định";
  // Bị nhập nhầm mã ASN vào cột ngành hàng -> loại bỏ hoàn toàn, không
  // tính vào "Chưa xác định" hay bất kỳ nhóm nào khác.
  if (isAsnCodeLike(value)) return null;

  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  // Phần không phải số thuần (vd "Hoá phẩm", "Thực phẩm công nghệ") mới
  // được coi là tên ngành hàng thật sự — các mã số chỉ là mã đi kèm.
  const textParts = parts.filter((p) => !/^\d+$/.test(p));

  if (textParts.length > 0) return textParts[0];

  // Toàn bộ là mã số, không có tên chữ -> mặc định thuộc Thực phẩm công nghệ
  return "Thực phẩm công nghệ";
};

// Màu cố định cho 3 cột Kế hoạch / Đã nhận / Còn lại — dùng chung cho cả
// chú thích lẫn dataset của biểu đồ, tránh lặp lại màu ở 2 chỗ
const KIEN_SERIES = [
  { key: "keHoach", label: "Kiện kế hoạch", color: "#6366f1" },
  { key: "daNhan", label: "Kiện đã nhận", color: "#10b981" },
  { key: "conLai", label: "Kiện còn lại", color: "#f59e0b" },
];

// Màu theo tone — class tĩnh (không nối chuỗi động) để Tailwind không
// purge mất khi build.
const STAT_TONES = {
  indigo: {
    icon: "bg-indigo-100 text-indigo-600",
    value: "text-indigo-700",
    ring: "ring-indigo-100",
  },
  sky: {
    icon: "bg-sky-100 text-sky-600",
    value: "text-sky-700",
    ring: "ring-sky-100",
  },
  violet: {
    icon: "bg-violet-100 text-violet-600",
    value: "text-violet-700",
    ring: "ring-violet-100",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
    ring: "ring-emerald-100",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600",
    value: "text-amber-700",
    ring: "ring-amber-100",
  },
};

// Card riêng cho tab ASN — số to, đậm, có màu rõ theo từng loại, tách khỏi
// StatCard dùng chung (dashboardCommon) để không ảnh hưởng dashboard khác.
const ASNStatCard = ({ icon: Icon, label, value, tone }) => {
  const t = STAT_TONES[tone] || STAT_TONES.indigo;
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
    totalKienDaNhan,
    byLoaiHinh,
    byNganhHang,
    last7DaysPO,
    last7DaysKien,
  } = useMemo(() => {
    const poSet = new Set();
    const nccSet = new Set();
    let totalKienKeHoach = 0;
    let totalKienConLai = 0;
    const loaiHinhPoSets = {}; // { loai_hinh: Set(po) }
    const nganhHangKien = {}; // { ten_nganh_hang_chuẩn_hóa: tổng kien_ke_hoach }
    const dayPoSets = {}; // { 'YYYY-MM-DD': Set(po) }
    const dayKien = {}; // { 'YYYY-MM-DD': { keHoach, conLai } }

    filtered.forEach((r) => {
      if (r.po) poSet.add(r.po);
      if (r.ma_ncc !== undefined && r.ma_ncc !== null && r.ma_ncc !== "") {
        nccSet.add(r.ma_ncc);
      }

      const kienKeHoach = parseNum(r.kien_ke_hoach);
      const kienConLai = parseNum(r.kien_con_lai);
      totalKienKeHoach += kienKeHoach;
      totalKienConLai += kienConLai;

      const lh = String(r.loai_hinh || "").trim() || "Khác";
      if (!loaiHinhPoSets[lh]) loaiHinhPoSets[lh] = new Set();
      if (r.po) loaiHinhPoSets[lh].add(r.po);

      // Chuẩn hóa ngành hàng: gộp các biến thể có mã số (005, 010, 001,
      // 030, 050...) về đúng tên ngành hàng; dòng bị nhập nhầm mã ASN thì
      // trả về null -> bỏ qua, không tính vào biểu đồ ngành hàng.
      const nh = normalizeNganhHang(r.ten_nganh_hang);
      if (nh !== null) {
        nganhHangKien[nh] = (nganhHangKien[nh] || 0) + kienKeHoach;
      }

      const dayKey = toDateKeyUTC(r.ngay_asn);
      if (dayKey) {
        if (r.po) {
          if (!dayPoSets[dayKey]) dayPoSets[dayKey] = new Set();
          dayPoSets[dayKey].add(r.po);
        }
        if (!dayKien[dayKey]) dayKien[dayKey] = { keHoach: 0, conLai: 0 };
        dayKien[dayKey].keHoach += kienKeHoach;
        dayKien[dayKey].conLai += kienConLai;
      }
    });

    // 7 ngày gần nhất tính theo hôm nay — luôn thấy xu hướng mới nhất dù
    // bộ lọc ngày phía trên đang chọn khoảng khác
    const buildLast7 = (mapFn) => {
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
          ...mapFn(key),
        });
      }
      return days;
    };

    const last7DaysPO = buildLast7((key) => ({
      count: dayPoSets[key]?.size || 0,
    }));

    const last7DaysKien = buildLast7((key) => {
      const keHoach = dayKien[key]?.keHoach || 0;
      const conLai = dayKien[key]?.conLai || 0;
      return { keHoach, conLai, daNhan: Math.max(0, keHoach - conLai) };
    });

    // Ngành hàng theo tổng kiện kế hoạch, giảm dần — chỉ giữ top 9, phần
    // còn lại gộp vào "Khác" để biểu đồ không bị vỡ vụn quá nhiều cột nhỏ
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

    return {
      totalPO: poSet.size,
      totalNCC: nccSet.size,
      totalKienKeHoach,
      totalKienConLai,
      totalKienDaNhan: Math.max(0, totalKienKeHoach - totalKienConLai),
      byLoaiHinh: Object.entries(loaiHinhPoSets).map(([name, set], i) => ({
        name,
        value: set.size,
        fill:
          LOAI_HINH_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
      byNganhHang,
      last7DaysPO,
      last7DaysKien,
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

  // 3 cột nhóm mỗi ngày: Kế hoạch / Đã nhận / Còn lại
  const kienBarData = useMemo(
    () => ({
      labels: last7DaysKien.map((d) => d.label),
      datasets: KIEN_SERIES.map(({ key, label, color }) => ({
        label,
        data: last7DaysKien.map((d) => d[key]),
        backgroundColor: color,
        borderRadius: 6,
        minBarLength: 3,
        maxBarThickness: 22,
      })),
    }),
    [last7DaysKien],
  );

  const kienBarMax = useMemo(() => {
    let max = 0;
    last7DaysKien.forEach((d) => {
      max = Math.max(max, d.keHoach, d.daNhan, d.conLai);
    });
    return max;
  }, [last7DaysKien]);

  // Biểu đồ cột ngang xếp hạng ngành hàng theo kiện kế hoạch — đảo ngược
  // thứ tự vì Chart.js horizontal bar vẽ từ dưới lên, muốn ngành nhiều
  // nhất nằm trên cùng thì phải đưa nó vào cuối mảng labels/data
  const nganhHangBarData = useMemo(() => {
    const rows = [...byNganhHang].reverse();
    return {
      labels: rows.map((d) => d.name),
      datasets: [
        {
          label: "Kiện kế hoạch",
          data: rows.map((d) => d.value),
          backgroundColor: rows.map((d) => d.fill),
          borderRadius: 6,
          maxBarThickness: 26,
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
      tab: "asn",
      loai_hinh: name,
      kho: selectedKho.length === 1 ? String(selectedKho[0]) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-indigo-700 md:text-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          Booking
        </h2>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ASNStatCard
          icon={FileStack}
          label="Tổng số PO"
          value={formatNumber(totalPO)}
          tone="indigo"
        />
        <ASNStatCard
          icon={Building2}
          label="Tổng NCC"
          value={formatNumber(totalNCC)}
          tone="sky"
        />
        <ASNStatCard
          icon={Package}
          label="Kiện kế hoạch"
          value={formatNumber(totalKienKeHoach)}
          tone="violet"
        />
        <ASNStatCard
          icon={PackageCheck}
          label="Kiện đã nhận"
          value={formatNumber(totalKienDaNhan)}
          tone="emerald"
        />
        <ASNStatCard
          icon={Truck}
          label="Kiện còn lại"
          value={formatNumber(totalKienConLai)}
          tone="amber"
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
                      offset: 4,
                      clamp: true,
                      color: "#1e1b4b",
                      backgroundColor: "rgba(255,255,255,0.85)",
                      borderRadius: 4,
                      padding: { top: 2, bottom: 2, left: 5, right: 5 },
                      font: { weight: "bold", size: 13 },
                      formatter: (value) =>
                        value > 0 ? formatNumber(value) : "",
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: {
                        font: { size: 12, weight: "600" },
                        color: "#334155",
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      ticks: {
                        font: { size: 12 },
                        color: "#64748b",
                      },
                      suggestedMax:
                        dayBarMax > 0 ? dayBarMax * 1.25 : undefined,
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

      {/* Kiện kế hoạch / đã nhận / còn lại theo ngày ASN — 7 ngày gần nhất */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-600">
            Kiện Kế hoạch / Đã nhận / Còn lại theo ngày ASN (7 ngày gần nhất)
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
            {KIEN_SERIES.map(({ key, label, color }) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex h-72 items-center justify-center text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="h-72">
            <Bar
              data={kienBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 24 } },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) =>
                        `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} kiện`,
                    },
                  },
                  datalabels: {
                    anchor: "end",
                    align: "end",
                    offset: 4,
                    clamp: true,
                    color: "#1e1b4b",
                    backgroundColor: "rgba(255,255,255,0.85)",
                    borderRadius: 4,
                    padding: { top: 1, bottom: 1, left: 4, right: 4 },
                    font: { weight: "bold", size: 12 },
                    formatter: (value) =>
                      value > 0 ? formatNumber(value) : "",
                  },
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
                    ticks: {
                      font: { size: 12 },
                      color: "#64748b",
                    },
                    suggestedMax:
                      kienBarMax > 0 ? kienBarMax * 1.25 : undefined,
                  },
                },
              }}
            />
          </div>
        )}
      </div>

      {/* Kiện kế hoạch theo ngành hàng — cột ngang xếp hạng, ngành nhiều
          kiện nhất nằm trên cùng; tên ngành hàng dài vẫn đọc trọn vẹn */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-slate-600">
          Kiện kế hoạch theo ngành hàng
        </p>
        {loading ? (
          <div className="flex h-80 items-center justify-center text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : byNganhHang.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-slate-400">
            Không có dữ liệu
          </div>
        ) : (
          <div style={{ height: Math.max(260, byNganhHang.length * 42) }}>
            <Bar
              data={nganhHangBarData}
              options={{
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { right: 56 } },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) =>
                        `${formatNumber(ctx.parsed.x)} kiện (${
                          totalKienKeHoach
                            ? ((ctx.parsed.x / totalKienKeHoach) * 100).toFixed(
                                1,
                              )
                            : 0
                        }%)`,
                    },
                  },
                  datalabels: {
                    anchor: "end",
                    align: "end",
                    offset: 6,
                    clamp: true,
                    color: "#1e1b4b",
                    backgroundColor: "rgba(255,255,255,0.85)",
                    borderRadius: 4,
                    padding: { top: 2, bottom: 2, left: 5, right: 5 },
                    font: { weight: "bold", size: 12 },
                    formatter: (value) =>
                      value > 0 ? `${formatNumber(value)} kiện` : "",
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    grid: { color: "#f1f5f9" },
                    ticks: { font: { size: 11 }, color: "#64748b" },
                    suggestedMax:
                      nganhHangBarMax > 0 ? nganhHangBarMax * 1.25 : undefined,
                  },
                  y: {
                    grid: { display: false },
                    ticks: {
                      font: { size: 12, weight: "600" },
                      color: "#334155",
                    },
                  },
                },
              }}
            />
          </div>
        )}
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
