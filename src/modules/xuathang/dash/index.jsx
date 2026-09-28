// pages/xuathang/dash/dashboard.jsx
/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Loader2,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Package,
  CalendarDays,
  Gauge,
} from "lucide-react";
import { xuatHangService } from "@/services/xuathang/xuathang.service";
import DateRangeFilter from "@/modules/nhaphang/dash/date";
import {
  pad2,
  dayKeyUTC,
  DOW_LABELS,
  LAST_N_WEEKS,
  LAST_N_MONTHS,
  CONCEPT_ORDER_HINT,
  isChinhRow,
  dedupeAndEnrich,
  sortByOrderHint,
  groupByPeriod,
  limitToRecentPeriods,
  KpiCard,
  BubbleLabel,
} from "../dash/share";

const COLOR_DUNG_HAN = "#22c55e";
const COLOR_TRE_HAN = "#1e3a8a";
const COLOR_SANG = "#22c55e";
const COLOR_TRUA = "#f59e0b";
const COLOR_TOI = "#1e3a8a";

const PHAN_LOAI_ORDER = [
  "Dưới 15p",
  "Dưới 30p",
  "Dưới 60p",
  "Dưới 90p",
  "Trên 90p",
];
const PHAN_LOAI_COLORS = {
  "Dưới 15p": "#22c55e",
  "Dưới 30p": "#1e3a8a",
  "Dưới 60p": "#d4a017",
  "Dưới 90p": "#7f1d1d",
  "Trên 90p": "#38bdf8",
};

const CHUYEN_ORDER = [
  "Trước 7:30",
  "Chuyến sáng",
  "Chuyến trưa",
  "Chuyến tối",
  "Chưa xác định",
];

// Khoảng ngày mặc định = tháng hiện tại (vd hôm nay ở tháng 9 -> 1/9 - 30/9)
const getDefaultMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${pad2(month + 1)}-01`,
    end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}`,
  };
};

const pivotByGroup = (rows, groupKey) => {
  const map = new Map();
  rows.forEach((r) => {
    if (!r.trang_thai_kpi) return;
    const key = r[groupKey] || "-";
    if (!map.has(key)) map.set(key, { dung_han: 0, tre_han: 0 });
    if (r.trang_thai_kpi === "Đúng hạn") map.get(key).dung_han += 1;
    else map.get(key).tre_han += 1;
  });
  return Array.from(map.entries()).map(([key, val]) => {
    const total = val.dung_han + val.tre_han;
    return {
      name: key,
      dung_han: val.dung_han,
      tre_han: val.tre_han,
      total,
      pct_dung_han: total > 0 ? (val.dung_han / total) * 100 : 0,
      pct_tre_han: total > 0 ? (val.tre_han / total) * 100 : 0,
    };
  });
};

// Chuyến theo NVC x buckets (sáng/trưa/tối) + tổng, lấy top N NVC nhiều
// chuyến nhất, gộp phần còn lại vào "Khác"
const groupByNVC = (rows, topN = 6) => {
  const map = new Map();
  rows.forEach((r) => {
    if (!r.chuyen_bucket) return;
    const key = r.ten_nvc || "Chưa rõ NVC";
    if (!map.has(key))
      map.set(key, { name: key, Sáng: 0, Trưa: 0, Tối: 0, total: 0 });
    const entry = map.get(key);
    entry[r.chuyen_bucket] += 1;
    entry.total += 1;
  });
  const arr = Array.from(map.values()).sort((a, b) => b.total - a.total);
  if (arr.length <= topN) return arr;
  const top = arr.slice(0, topN);
  const rest = arr.slice(topN);
  const khac = rest.reduce(
    (acc, r) => ({
      name: "Khác",
      Sáng: acc.Sáng + r.Sáng,
      Trưa: acc.Trưa + r.Trưa,
      Tối: acc.Tối + r.Tối,
      total: acc.total + r.total,
    }),
    { name: "Khác", Sáng: 0, Trưa: 0, Tối: 0, total: 0 },
  );
  return [...top, khac];
};

// Leaderboard NVC theo tỷ lệ đúng hạn (chỉ tính NVC có đủ dữ liệu thời gian)
const buildLeaderboard = (rows, topN = 8) => {
  const map = new Map();
  rows.forEach((r) => {
    if (!r.trang_thai_kpi) return;
    const key = r.ten_nvc || "Chưa rõ NVC";
    if (!map.has(key)) map.set(key, { name: key, dung_han: 0, total: 0 });
    const entry = map.get(key);
    entry.total += 1;
    if (r.trang_thai_kpi === "Đúng hạn") entry.dung_han += 1;
  });
  return Array.from(map.values())
    .filter((r) => r.total >= 3) // bỏ NVC quá ít chuyến để tránh %ảo
    .map((r) => ({ ...r, pct: (r.dung_han / r.total) * 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
};

// Đúng hạn / Trễ hạn theo NVC, tách riêng CoopSmile (CS) vs CoopFood (CF)
const buildNVCConceptStats = (rows) => {
  const map = new Map();

  rows.forEach((r) => {
    if (!r.trang_thai_kpi) return;
    const key = r.ten_nvc || "Chưa rõ NVC";
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        tong_dung: 0,
        tong_tre: 0,
        cs_dung: 0,
        cs_tre: 0,
        cf_dung: 0,
        cf_tre: 0,
      });
    }
    const entry = map.get(key);
    const isDung = r.trang_thai_kpi === "Đúng hạn";

    if (isDung) entry.tong_dung += 1;
    else entry.tong_tre += 1;

    if (r.concept === "CoopSmile") {
      isDung ? (entry.cs_dung += 1) : (entry.cs_tre += 1);
    } else if (r.concept === "CoopFood") {
      isDung ? (entry.cf_dung += 1) : (entry.cf_tre += 1);
    }
  });

  return Array.from(map.values())
    .map((r) => {
      const total = r.tong_dung + r.tong_tre;
      return { ...r, total, pct: total > 0 ? (r.tong_dung / total) * 100 : 0 };
    })
    .sort((a, b) => b.total - a.total);
};

// Đếm chuyến theo Thứ (T2..CN) x buckets (Sáng/Trưa/Tối)
const buildHeatmap = (rows) => {
  const matrix = {}; // { [dow]: { Sáng, Trưa, Tối } }
  for (let i = 0; i < 7; i++) matrix[i] = { Sáng: 0, Trưa: 0, Tối: 0 };
  rows.forEach((r) => {
    if (!r.chuyen_bucket || !r.ngay_xe_vao_ttpp) return;
    const d = new Date(r.ngay_xe_vao_ttpp);
    if (isNaN(d.getTime())) return;
    matrix[d.getUTCDay()][r.chuyen_bucket] += 1;
  });
  // Sắp lại thứ tự T2->CN
  const order = [1, 2, 3, 4, 5, 6, 0];
  const max = Math.max(
    1,
    ...order.flatMap((dow) => Object.values(matrix[dow])),
  );
  return { order, matrix, max };
};

const DashboardXuatHang = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // đã lọc: chỉ dữ liệu "chính" (isChinhRow)
  const [period, setPeriod] = useState("day"); // day | week | month
  const [dateStart, setDateStart] = useState(
    () => getDefaultMonthRange().start,
  );
  const [dateEnd, setDateEnd] = useState(() => getDefaultMonthRange().end);

  const fetchAllRows = async () => {
    setLoading(true);
    try {
      const res = await xuatHangService.getDanhSach({ page: 1, limit: 100000 });
      const raw = res?.data || [];
      const enriched = dedupeAndEnrich(raw);

      // Dashboard chính CHỈ lấy concept CoopSmile/CoopFood + loại hình vận
      // chuyển "TTPP giao hàng" — phần còn lại thuộc tab "Số Lượng Lớn".
      setRows(enriched.filter(isChinhRow));
    } catch (err) {
      console.error("Lỗi getDanhSach (dashboard):", err);
    } finally {
      setLoading(false);
    }
  };
  const filteredRows = useMemo(() => {
    if (!dateStart && !dateEnd) return rows;
    return rows.filter((r) => {
      if (!r.ngay_xe_vao_ttpp) return false;
      const d = new Date(r.ngay_xe_vao_ttpp);
      if (isNaN(d.getTime())) return false;
      const key = dayKeyUTC(d); // "YYYY-MM-DD"
      if (dateStart && key < dateStart) return false;
      if (dateEnd && key > dateEnd) return false;
      return true;
    });
  }, [rows, dateStart, dateEnd]);

  const handleDateRangeChange = (start, end) => {
    setDateStart(start);
    setDateEnd(end);
  };

  const handleDateRangeClear = () => {
    setDateStart("");
    setDateEnd("");
  };
  useEffect(() => {
    fetchAllRows();
  }, []);

  const theoConcept = useMemo(
    () =>
      sortByOrderHint(
        pivotByGroup(filteredRows, "concept"),
        CONCEPT_ORDER_HINT,
      ),
    [filteredRows],
  );
  const theoChuyen = useMemo(
    () => sortByOrderHint(pivotByGroup(filteredRows, "chuyen"), CHUYEN_ORDER),
    [filteredRows],
  );
  const theoNVC = useMemo(() => groupByNVC(filteredRows), [filteredRows]);
  const leaderboard = useMemo(
    () => buildLeaderboard(filteredRows),
    [filteredRows],
  );
  const nvcConceptStats = useMemo(
    () => buildNVCConceptStats(filteredRows),
    [filteredRows],
  );

  // "Theo ngày" -> vẫn tôn trọng DateRangeFilter phía trên (dùng filteredRows).
  // "Theo tuần" / "Theo tháng" -> LUÔN tính trên toàn bộ dữ liệu (dùng rows
  // chưa lọc ngày) rồi cắt về N kỳ gần nhất, bỏ qua bộ lọc ngày phía trên.
  const trend = useMemo(() => {
    if (period === "day") return groupByPeriod(filteredRows, period);
    const full = groupByPeriod(rows, period);
    return limitToRecentPeriods(full, period);
  }, [filteredRows, rows, period]);

  const heatmap = useMemo(() => buildHeatmap(filteredRows), [filteredRows]);

  // Dữ liệu heatmap ở dạng mảng cho area chart (Thứ x Sáng/Trưa/Tối)
  const heatmapTrend = useMemo(() => {
    const { order, matrix } = heatmap;
    return order.map((dow) => ({
      name: DOW_LABELS[dow],
      Sáng: matrix[dow].Sáng,
      Trưa: matrix[dow].Trưa,
      Tối: matrix[dow].Tối,
    }));
  }, [heatmap]);

  const tongTrangThai = useMemo(() => {
    const dung = filteredRows.filter(
      (r) => r.trang_thai_kpi === "Đúng hạn",
    ).length;
    const tre = filteredRows.filter(
      (r) => r.trang_thai_kpi === "Trễ hạn",
    ).length;
    const total = dung + tre;
    return [
      { name: "Đúng hạn", value: dung, pct: total ? (dung / total) * 100 : 0 },
      { name: "Trễ hạn", value: tre, pct: total ? (tre / total) * 100 : 0 },
    ];
  }, [filteredRows]);

  const phanLoaiThoiGian = useMemo(() => {
    const counts = new Map(PHAN_LOAI_ORDER.map((k) => [k, 0]));
    filteredRows.forEach((r) => {
      if (r.phan_loai)
        counts.set(r.phan_loai, (counts.get(r.phan_loai) || 0) + 1);
    });
    return PHAN_LOAI_ORDER.map((key) => ({
      name: key,
      value: counts.get(key) || 0,
    })).filter((r) => r.value > 0);
  }, [filteredRows]);

  const tongSo = filteredRows.length;
  const tongDungHan = tongTrangThai[0]?.value || 0;
  const tongTreHan = tongTrangThai[1]?.value || 0;
  const tongKien = useMemo(
    () => filteredRows.reduce((sum, r) => sum + (Number(r.so_kien) || 0), 0),
    [filteredRows],
  );
  const soNgayCoData = useMemo(
    () =>
      new Set(
        filteredRows.map(
          (r) => r.ngay_xe_vao_ttpp && dayKeyUTC(new Date(r.ngay_xe_vao_ttpp)),
        ),
      ).size,
    [filteredRows],
  );
  const tbChuyenNgay = soNgayCoData > 0 ? tongSo / soNgayCoData : 0;
  const tbKienNgay = soNgayCoData > 0 ? tongKien / soNgayCoData : 0;
  const tbKienChuyen = tongSo > 0 ? tongKien / tongSo : 0;

  const handleBarClick = (data) => {
    if (!onNavigate || !data?.name) return;
    onNavigate({ tab: "data", concept: data.name });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-base font-semibold text-slate-800">
        Tổng quan Xuất Hàng
      </h2>
      <p className="-mt-3 text-xs text-slate-400">
        Chỉ tính chuyến thuộc Concept CoopSmile/CoopFood + Loại hình vận chuyển
        &quot;TTPP giao hàng&quot;. Xem các chuyến còn lại ở tab Số Lượng Lớn.
      </p>
      <div className="w-full sm:w-72">
        <DateRangeFilter
          label="Lọc theo Ngày xe vào TTPP"
          startValue={dateStart}
          endValue={dateEnd}
          onChange={handleDateRangeChange}
          onClear={handleDateRangeClear}
        />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={Truck}
          label="Tổng số chuyến"
          value={tongSo.toLocaleString("vi-VN")}
          tone="blue"
        />
        <KpiCard
          icon={Package}
          label="Tổng số kiện"
          value={tongKien.toLocaleString("vi-VN")}
          tone="amber"
        />
        <KpiCard
          icon={CalendarDays}
          label="TB chuyến / ngày"
          value={tbChuyenNgay.toFixed(1)}
          tone="blue"
        />
        <KpiCard
          icon={Package}
          label="TB kiện / ngày"
          value={tbKienNgay.toLocaleString("vi-VN", {
            maximumFractionDigits: 1,
          })}
          tone="amber"
        />
        <KpiCard
          icon={CheckCircle2}
          label={`Đúng hạn ≤90p (${tongTrangThai[0].pct.toFixed(1)}%)`}
          value={tongDungHan.toLocaleString("vi-VN")}
          tone="green"
        />
        <KpiCard
          icon={AlertTriangle}
          label={`Trễ hạn >90p (${tongTrangThai[1].pct.toFixed(1)}%)`}
          value={tongTreHan.toLocaleString("vi-VN")}
          tone="red"
        />
      </div>
      <p className="-mt-3 text-xs text-slate-400">
        Trung bình {tbKienChuyen.toFixed(1)} kiện/chuyến · dữ liệu trải trên{" "}
        {soNgayCoData} ngày
      </p>

      {/* Xu hướng theo ngày/tuần/tháng — combo chart số chuyến + tổng kiện */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">
            Xu hướng số chuyến &amp; tổng kiện
          </p>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            {[
              { key: "day", label: "Theo ngày" },
              { key: "week", label: "Theo tuần" },
              { key: "month", label: "Theo tháng" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={[
                  "rounded-md px-3 py-1.5 font-medium transition-colors",
                  period === opt.key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {period !== "day" && (
          <p className="-mt-1 mb-3 text-xs text-slate-400">
            {period === "week"
              ? `${LAST_N_WEEKS} tuần gần nhất`
              : `${LAST_N_MONTHS} tháng gần nhất`}{" "}
            trên toàn bộ dữ liệu (không áp dụng bộ lọc ngày phía trên)
          </p>
        )}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={trend}
            margin={{ top: 26, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="soChuyen"
              name="Số chuyến"
              fill="#1e3a8a"
              radius={[3, 3, 0, 0]}
            >
              <LabelList
                dataKey="soChuyen"
                position="top"
                formatter={(v) => v.toLocaleString("vi-VN")}
                fill="#1e3a8a"
                fontSize={11}
                fontWeight={700}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">
          Tổng kiện
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={trend}
            margin={{ top: 34, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="gradTongKien" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="tongKien"
              name="Tổng kiện"
              stroke="#f59e0b"
              fill="url(#gradTongKien)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#f59e0b" }}
              label={(props) => <BubbleLabel {...props} fill="#c2740a" />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chuyến theo NVC — stacked sáng/trưa/tối */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Số chuyến theo Nhà vận chuyển (Sáng / Trưa / Tối)
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={theoNVC}
            margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sáng" stackId="a" fill={COLOR_SANG}>
              <LabelList
                dataKey="Sáng"
                position="center"
                formatter={(v) => (v > 0 ? v : "")}
                fill="#fff"
                fontSize={10}
                fontWeight={600}
              />
            </Bar>
            <Bar dataKey="Trưa" stackId="a" fill={COLOR_TRUA}>
              <LabelList
                dataKey="Trưa"
                position="center"
                formatter={(v) => (v > 0 ? v : "")}
                fill="#fff"
                fontSize={10}
                fontWeight={600}
              />
            </Bar>
            <Bar dataKey="Tối" stackId="a" fill={COLOR_TOI}>
              <LabelList
                dataKey="Tối"
                position="center"
                formatter={(v) => (v > 0 ? v : "")}
                fill="#fff"
                fontSize={10}
                fontWeight={600}
              />
              <LabelList
                dataKey="total"
                position="top"
                fill="#334155"
                fontSize={11}
                fontWeight={600}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mật độ chuyến theo Thứ x khung giờ — area chart mượt */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Mật độ chuyến theo Thứ trong tuần &amp; khung giờ
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart
            data={heatmapTrend}
            margin={{ top: 36, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="gradSang" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLOR_SANG} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLOR_SANG} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradTrua" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLOR_TRUA} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLOR_TRUA} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradToi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLOR_TOI} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLOR_TOI} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="Sáng"
              name="Sáng"
              stroke={COLOR_SANG}
              fill="url(#gradSang)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: COLOR_SANG }}
              label={(props) => <BubbleLabel {...props} fill={COLOR_SANG} />}
            />
            <Area
              type="monotone"
              dataKey="Trưa"
              name="Trưa"
              stroke={COLOR_TRUA}
              fill="url(#gradTrua)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: COLOR_TRUA }}
              label={(props) => <BubbleLabel {...props} fill={COLOR_TRUA} />}
            />
            <Area
              type="monotone"
              dataKey="Tối"
              name="Tối"
              stroke={COLOR_TOI}
              fill="url(#gradToi)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: COLOR_TOI }}
              label={(props) => <BubbleLabel {...props} fill={COLOR_TOI} />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar 100% theo Concept */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-700">
          Tỷ lệ Đúng hạn / Trễ hạn theo Concept
        </p>
        <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: COLOR_DUNG_HAN }}
            />
            Đúng hạn
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: COLOR_TRE_HAN }}
            />
            Trễ hạn
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={theoConcept}
            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
          >
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, key, { payload }) =>
                key === "pct_dung_han"
                  ? [
                      `${payload.dung_han} chuyến (${value.toFixed(2)}%)`,
                      "Đúng hạn",
                    ]
                  : [
                      `${payload.tre_han} chuyến (${value.toFixed(2)}%)`,
                      "Trễ hạn",
                    ]
              }
            />
            <Bar
              dataKey="pct_dung_han"
              stackId="a"
              fill={COLOR_DUNG_HAN}
              onClick={handleBarClick}
              cursor="pointer"
            >
              <LabelList
                dataKey="pct_dung_han"
                position="center"
                formatter={(v) => (v > 5 ? `${v.toFixed(2)}%` : "")}
                fill="#fff"
                fontSize={12}
              />
            </Bar>
            <Bar
              dataKey="pct_tre_han"
              stackId="a"
              fill={COLOR_TRE_HAN}
              onClick={handleBarClick}
              cursor="pointer"
            >
              <LabelList
                dataKey="pct_tre_han"
                position="center"
                formatter={(v) => (v > 5 ? `${v.toFixed(2)}%` : "")}
                fill="#fff"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2 donut + leaderboard NVC */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Trạng thái KPI
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={tongTrangThai}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                label={({ pct }) => `${pct.toFixed(1)}%`}
              >
                <Cell fill={COLOR_DUNG_HAN} />
                <Cell fill={COLOR_TRE_HAN} />
              </Pie>
              <Legend />
              <Tooltip
                formatter={(v, n, { payload }) => [
                  `${v} (${payload.pct.toFixed(2)}%)`,
                  n,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Phân loại theo thời gian xử lý
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={phanLoaiThoiGian}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                label={({ value }) => `${value}`}
              >
                {phanLoaiThoiGian.map((entry) => (
                  <Cell key={entry.name} fill={PHAN_LOAI_COLORS[entry.name]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leaderboard NVC — dạng danh sách xếp hạng, khác biểu đồ tròn/cột */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Gauge size={16} className="text-blue-600" />
            Top NVC theo tỷ lệ đúng hạn
          </p>
          <div className="space-y-2.5">
            {leaderboard.map((nvc, idx) => (
              <div key={nvc.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-slate-600">
                    {idx + 1}. {nvc.name}
                  </span>
                  <span className="shrink-0 text-slate-400">
                    {nvc.pct.toFixed(0)}% ({nvc.total} chuyến)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${nvc.pct}%`,
                      background:
                        nvc.pct >= 90
                          ? COLOR_DUNG_HAN
                          : nvc.pct >= 70
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  />
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-xs text-slate-400">Chưa đủ dữ liệu</p>
            )}
          </div>
        </div>
      </div>
      {/* Đúng hạn / Trễ hạn theo NVC, tách CoopSmile vs CoopFood */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Đúng hạn / Trễ hạn theo Nhà vận chuyển — CoopSmile vs CoopFood
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-3 py-2 align-bottom font-medium"
                >
                  Nhà vận chuyển
                </th>
                <th
                  colSpan={3}
                  className="border-l border-slate-100 px-3 py-1.5 text-center font-medium text-slate-600"
                >
                  Tổng
                </th>
                <th
                  colSpan={2}
                  className="border-l border-slate-100 px-3 py-1.5 text-center font-medium text-emerald-600"
                >
                  CoopSmile
                </th>
                <th
                  colSpan={2}
                  className="border-l border-slate-100 px-3 py-1.5 text-center font-medium text-amber-600"
                >
                  CoopFood
                </th>
              </tr>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="border-l border-slate-100 px-3 py-1.5 text-center">
                  Đúng
                </th>
                <th className="px-3 py-1.5 text-center">Trễ</th>
                <th className="px-3 py-1.5 text-center">%Đúng</th>
                <th className="border-l border-slate-100 px-3 py-1.5 text-center">
                  Đúng
                </th>
                <th className="px-3 py-1.5 text-center">Trễ</th>
                <th className="border-l border-slate-100 px-3 py-1.5 text-center">
                  Đúng
                </th>
                <th className="px-3 py-1.5 text-center">Trễ</th>
              </tr>
            </thead>
            <tbody>
              {nvcConceptStats.map((r) => (
                <tr
                  key={r.name}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="truncate px-3 py-2 font-medium text-slate-700">
                    {r.name}
                  </td>
                  <td className="border-l border-slate-100 px-3 py-2 text-center text-emerald-600">
                    {r.tong_dung}
                  </td>
                  <td className="px-3 py-2 text-center text-blue-900">
                    {r.tong_tre}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={[
                        "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        r.pct >= 90
                          ? "bg-emerald-50 text-emerald-700"
                          : r.pct >= 70
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {r.pct.toFixed(0)}%
                    </span>
                  </td>
                  <td className="border-l border-slate-100 px-3 py-2 text-center text-emerald-600">
                    {r.cs_dung || "-"}
                  </td>
                  <td className="px-3 py-2 text-center text-blue-900">
                    {r.cs_tre || "-"}
                  </td>
                  <td className="border-l border-slate-100 px-3 py-2 text-center text-emerald-600">
                    {r.cf_dung || "-"}
                  </td>
                  <td className="px-3 py-2 text-center text-blue-900">
                    {r.cf_tre || "-"}
                  </td>
                </tr>
              ))}
              {nvcConceptStats.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Chưa đủ dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Theo khung giờ / chuyến (5 mốc chi tiết) */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-700">
          Số chuyến &amp; tỷ lệ đúng hạn theo khung giờ
        </p>
        <p className="mb-3 text-xs text-slate-400">
          Sáng: 7h30–12h30 · Trưa: 12h30–17h30 · Tối: từ 17h30 (theo giờ TTPP
          yêu cầu xe vào)
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={theoChuyen}
            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
          >
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              formatter={(value, key) =>
                key === "dung_han" ? [value, "Đúng hạn"] : [value, "Trễ hạn"]
              }
            />
            <Legend
              formatter={(value) =>
                value === "dung_han" ? "Đúng hạn" : "Trễ hạn"
              }
            />
            <Bar dataKey="dung_han" stackId="a" fill={COLOR_DUNG_HAN} />
            <Bar dataKey="tre_han" stackId="a" fill={COLOR_TRE_HAN}>
              <LabelList
                dataKey="total"
                position="top"
                formatter={(v) => v.toLocaleString("vi-VN")}
                fill="#64748b"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardXuatHang;
