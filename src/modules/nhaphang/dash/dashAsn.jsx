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
  Legend as RechartsLegend,
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
  usePieLabelRenderer,
  percentLabelFormatter,
  KhoFilter,
  formatNumber,
  toDateKeyUTC,
  getDefaultDateRange,
} from "./dashboardCommon";

// Đăng ký thêm các thành phần Line/Area cho Chart.js — an toàn khi gọi
// lại (Chart.js tự bỏ qua nếu đã được đăng ký ở nơi khác trong app).
ChartJS.register(LineElement, PointElement, LineController, Filler);

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
  // Loại hình theo cột "Ghi Chú" của file Booking: mặc định KHÔ khi để
  // trống, còn lại là ĐÔNG / SLL lấy nguyên giá trị trong file.
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

// Thứ tự ưu tiên hiển thị 3 loại hình chính trong biểu đồ "Số kiện theo
// ngày Booking" — loại hình lạ khác (nếu phát sinh) sẽ xếp sau theo thứ
// tự xuất hiện trong dữ liệu.
const LOAI_HINH_KIEN_ORDER = ["KHÔ", "ĐÔNG", "SLL"];

// Bảng màu cho các cột "Số kiện theo ngành hàng" — lặp vòng nếu
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

// Chuyển hex "#RRGGBB" (hoặc "#RGB") -> "rgba(r,g,b,alpha)" — dùng để dựng
// gradient mượt cho biểu đồ vùng (area chart)
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
    totalBooking,
    totalSoKien,
    byLoaiHinh,
    byNganhHang,
    totalSoKienNganhHang,
    last7DaysPO,
    last7DaysKien,
    loaiHinhKienTypes,
  } = useMemo(() => {
    const poSet = new Set();
    const nccSet = new Set();
    const bookingSet = new Set();
    let totalSoKien = 0;
    const loaiHinhKien = {}; // { loai_hinh: tổng so_kien } -> dùng cho donut
    const nganhHangKien = {}; // { ten_nganh_hang_chuẩn_hóa: tổng so_kien }
    const dayPoSets = {}; // { 'YYYY-MM-DD': Set(po) }
    const daySoKienByLoai = {}; // { 'YYYY-MM-DD': { [loai_hinh]: tổng so_kien } }
    const loaiHinhTypesSeen = new Set();

    filtered.forEach((r) => {
      if (r.po) poSet.add(r.po);
      if (r.so_booking) bookingSet.add(r.so_booking);
      if (r.ma_ncc !== undefined && r.ma_ncc !== null && r.ma_ncc !== "") {
        nccSet.add(r.ma_ncc);
      }

      const soKien = parseNum(r.so_kien);
      totalSoKien += soKien;

      const lh = String(r.loai_hinh || "").trim() || "Khác";
      loaiHinhKien[lh] = (loaiHinhKien[lh] || 0) + soKien;
      loaiHinhTypesSeen.add(lh);

      // Chuẩn hóa ngành hàng: gộp các biến thể có mã số (005, 010, 001,
      // 030, 050...) về đúng tên ngành hàng; dòng bị nhập nhầm mã ASN thì
      // trả về null -> bỏ qua, không tính vào biểu đồ ngành hàng.
      const nh = normalizeNganhHang(r.ten_nganh_hang);
      if (nh !== null) {
        nganhHangKien[nh] = (nganhHangKien[nh] || 0) + soKien;
      }

      const dayKey = toDateKeyUTC(r.ngay_asn);
      if (dayKey) {
        if (r.po) {
          if (!dayPoSets[dayKey]) dayPoSets[dayKey] = new Set();
          dayPoSets[dayKey].add(r.po);
        }
        if (!daySoKienByLoai[dayKey]) daySoKienByLoai[dayKey] = {};
        daySoKienByLoai[dayKey][lh] =
          (daySoKienByLoai[dayKey][lh] || 0) + soKien;
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

    const last7DaysKien = buildLast7((key) => ({
      byLoai: daySoKienByLoai[key] || {},
    }));

    // Thứ tự các loại hình cho biểu đồ "Số kiện theo ngày": ưu tiên
    // KHÔ / ĐÔNG / SLL trước, loại hình lạ khác xếp theo sau.
    const knownTypes = LOAI_HINH_KIEN_ORDER.filter((lh) =>
      loaiHinhTypesSeen.has(lh),
    );
    const extraTypes = [...loaiHinhTypesSeen]
      .filter((lh) => !LOAI_HINH_KIEN_ORDER.includes(lh))
      .sort();
    const loaiHinhKienTypes = [...knownTypes, ...extraTypes];

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
    const totalSoKienNganhHang = nganhHangEntries.reduce(
      (sum, [, v]) => sum + v,
      0,
    );

    return {
      totalPO: poSet.size,
      totalNCC: nccSet.size,
      totalBooking: bookingSet.size,
      totalSoKien,
      // Donut "Theo loại hình" hiển thị theo TỔNG SỐ KIỆN (không phải số PO)
      byLoaiHinh: Object.entries(loaiHinhKien).map(([name, value], i) => ({
        name,
        value,
        fill:
          LOAI_HINH_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
      byNganhHang,
      totalSoKienNganhHang,
      last7DaysPO,
      last7DaysKien,
      loaiHinhKienTypes,
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
          // Bỏ order ép ĐÔNG lên đầu — giữ đúng thứ tự tự nhiên
          // KHÔ -> ĐÔNG -> SLL theo vị trí trong mảng loaiHinhKienTypes,
          // nên tooltip/legend sẽ hiện ĐÔNG ngay sau KHÔ như mong muốn.
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

  // Biểu đồ cột ngang xếp hạng ngành hàng theo kiện kế hoạch — đảo ngược
  // thứ tự vì Chart.js horizontal bar vẽ từ dưới lên, muốn ngành nhiều
  // nhất nằm trên cùng thì phải đưa nó vào cuối mảng labels/data
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
          Booking
        </h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày Booking
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày Booking
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
        <ASNStatCard
          icon={FileStack}
          label="Tổng số PO"
          value={formatNumber(totalPO)}
          tone="indigo"
        />
        <ASNStatCard
          icon={ClipboardList}
          label="Tổng số BOOKING"
          value={formatNumber(totalBooking)}
          tone="emerald"
        />
        <ASNStatCard
          icon={Building2}
          label="Tổng NCC"
          value={formatNumber(totalNCC)}
          tone="sky"
        />
        <ASNStatCard
          icon={Package}
          label="Tổng số kiện"
          value={formatNumber(totalSoKien)}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Số PO theo ngày Booking — 7 ngày gần nhất */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-600">
            Số PO theo ngày Booking (7 ngày gần nhất)
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

        {/* Donut theo loại hình — tính theo TỔNG SỐ KIỆN */}
        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          style={{ fontFamily: FONT_SANS }}
        >
          <p className="mb-2 text-sm font-medium text-slate-600">
            Theo loại hình
          </p>
          {loading || totalSoKien === 0 ? (
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
                      `${formatNumber(value)} kiện (${
                        totalSoKien
                          ? ((value / totalSoKien) * 100).toFixed(1)
                          : 0
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

      {/* Số kiện theo ngày Booking — 7 ngày gần nhất, dạng vùng (area)
          mượt, xếp chồng theo Khô/Đông/SLL */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-indigo-50/40 p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-600">
            Số kiện theo ngày Booking (7 ngày gần nhất)
          </p>
        </div>
        {loading ? (
          <div className="flex h-80 items-center justify-center text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="h-80">
            <Line
              data={kienAreaData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                layout: { padding: { top: 30, right: 12 } },
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
                      font: { size: 12, weight: "600" },
                      color: "#475569",
                    },
                  },
                  tooltip: {
                    backgroundColor: "rgba(30, 27, 75, 0.92)",
                    titleColor: "#e0e7ff",
                    titleFont: { weight: "700" },
                    bodyColor: "#ffffff",
                    padding: 10,
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
  display: (context) => {
    const value = context.dataset.data[context.dataIndex] || 0;
    return value > 0;
  },
  anchor: "end",
  align: "top",
  offset: (context) => (context.dataset.label === "ĐÔNG" ? 8 : 10),
  color: (context) => {
    if (context.dataset.label === "ĐÔNG") return "#0284c7";
    if (context.dataset.label === "KHÔ") return "#4338ca";
    return "#3730a3"; // SLL / loại hình khác — hiện tổng
  },
  backgroundColor: (context) =>
    context.dataset.label === "ĐÔNG"
      ? "rgba(224,242,254,0.95)"
      : "rgba(255,255,255,0.92)",
  borderColor: (context) =>
    context.dataset.label === "ĐÔNG" ? "#7dd3fc" : "#c7d2fe",
  borderWidth: 1,
  borderRadius: 6,
  padding: { top: 3, bottom: 3, left: 6, right: 6 },
  font: { weight: "bold", size: 11 },
  formatter: (value, context) => {
    const label = context.dataset.label;
    const stackedTypes = loaiHinhKienTypes.filter((lh) => lh !== "ĐÔNG");
    const isTopOfStack = label === stackedTypes[stackedTypes.length - 1];

    if (isTopOfStack) {
      // Dataset trên cùng của stack (ví dụ SLL) -> hiện TỔNG cộng dồn,
      // vì vị trí đường của nó trên biểu đồ đã là điểm cộng dồn
      const total = Object.values(
        last7DaysKien[context.dataIndex]?.byLoai || {},
      ).reduce((sum, v) => sum + v, 0);
      return total > 0 ? formatNumber(total) : "";
    }

    // Các dataset còn lại (KHÔ, ĐÔNG...) -> hiện đúng giá trị riêng
    // của chính nó tại điểm đó
    return value > 0 ? formatNumber(value) : "";
  },
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
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: "#eef2ff" },
                    ticks: { font: { size: 12 }, color: "#64748b" },
                    suggestedMax:
                      kienAreaMax > 0 ? kienAreaMax * 1.3 : undefined,
                  },
                  yDong: {
                    position: "right",
                    beginAtZero: true,
                    grid: { display: false },
                    ticks: {
                      font: { size: 11 },
                      color: "#0ea5e9",
                      callback: (v) => formatNumber(v),
                    },
                    // Nhân hệ số lớn hơn hẳn (thử 6-8 lần) để đường ĐÔNG luôn nằm
                    // thấp hơn KHÔ/SLL trên màn hình dù 2 trục độc lập nhau — vì
                    // ĐÔNG có giá trị nhỏ nhất trong 3 loại hình.
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
      </div>

      {/* Số kiện theo ngành hàng — cột ngang xếp hạng, ngành nhiều
          kiện nhất nằm trên cùng; tên ngành hàng dài vẫn đọc trọn vẹn */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-slate-600">
          Số kiện theo ngành hàng
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
                          totalSoKienNganhHang
                            ? (
                                (ctx.parsed.x / totalSoKienNganhHang) *
                                100
                              ).toFixed(1)
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
