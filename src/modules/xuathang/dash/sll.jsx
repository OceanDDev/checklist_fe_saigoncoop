// pages/xuathang/dash/sll.jsx
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
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { Loader2, Truck, Package, CalendarDays } from "lucide-react";
import { xuatHangService } from "@/services/xuathang/xuathang.service";
import DateRangeFilter from "@/modules/nhaphang/dash/date";
import {
  pad2,
  dayKeyUTC,
  LAST_N_WEEKS,
  LAST_N_MONTHS,
  CONCEPT_ORDER_HINT,
  isChinhRow,
  dedupeAndEnrich,
  sortByOrderHint,
  groupByPeriod,
  limitToRecentPeriods,
  kienByGroup,
  KpiCard,
  BubbleLabel,
} from "../dash/share";

const COLOR_SLL = "#d4a017";

// Khoảng ngày mặc định = tháng hiện tại
const getDefaultMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${pad2(month + 1)}-01`,
    end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}`,
  };
};

// Đếm số chuyến/kiện theo Loại hình vận chuyển — giúp thấy rõ SLL đang gồm
// những loại hình nào, vì giờ đây SLL = mọi thứ KHÔNG thuộc Concept
// CoopSmile/CoopFood + Loại hình "TTPP giao hàng" của Dashboard chính.
const demTheoLoaiHinh = (rows) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = (r.loai_hinh_van_chuyen || "").trim() || "Chưa rõ";
    if (!map.has(key)) map.set(key, { name: key, soChuyen: 0, soKien: 0 });
    const entry = map.get(key);
    entry.soChuyen += 1;
    entry.soKien += Number(r.so_kien) || 0;
  });
  return Array.from(map.values()).sort((a, b) => b.soChuyen - a.soChuyen);
};

const DashboardSoLuongLon = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // toàn bộ chuyến SLL (chưa lọc ngày)
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

      // Số Lượng Lớn = phần còn lại, tức KHÔNG thuộc dữ liệu "chính" của
      // Dashboard (concept CoopSmile/CoopFood + loại hình "TTPP giao hàng").
      setRows(enriched.filter((r) => !isChinhRow(r)));
    } catch (err) {
      console.error("Lỗi getDanhSach (SLL):", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRows();
  }, []);

  const filteredRows = useMemo(() => {
    if (!dateStart && !dateEnd) return rows;
    return rows.filter((r) => {
      if (!r.ngay_xe_vao_ttpp) return false;
      const d = new Date(r.ngay_xe_vao_ttpp);
      if (isNaN(d.getTime())) return false;
      const key = dayKeyUTC(d);
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

  // "Theo ngày" tôn trọng bộ lọc ngày phía trên; "Theo tuần"/"Theo tháng"
  // luôn lấy N kỳ gần nhất trên toàn bộ dữ liệu SLL.
  const trend = useMemo(() => {
    if (period === "day") return groupByPeriod(filteredRows, period);
    const full = groupByPeriod(rows, period);
    return limitToRecentPeriods(full, period);
  }, [filteredRows, rows, period]);

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
  const tbChuyenNgay =
    soNgayCoData > 0 ? filteredRows.length / soNgayCoData : 0;
  const tbKienNgay = soNgayCoData > 0 ? tongKien / soNgayCoData : 0;

  const kienTheoConcept = useMemo(
    () =>
      sortByOrderHint(kienByGroup(filteredRows, "concept"), CONCEPT_ORDER_HINT),
    [filteredRows],
  );

  const theoLoaiHinh = useMemo(
    () => demTheoLoaiHinh(filteredRows),
    [filteredRows],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">
          Số Lượng Lớn
        </h2>
        <div className="w-full sm:w-72">
          <DateRangeFilter
            label="Lọc theo Ngày xe vào TTPP"
            startValue={dateStart}
            endValue={dateEnd}
            onChange={handleDateRangeChange}
            onClear={handleDateRangeClear}
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-slate-400">
        Toàn bộ chuyến KHÔNG thuộc Concept CoopSmile/CoopFood + Loại hình vận
        chuyển &quot;TTPP giao hàng&quot; (đã tách khỏi Dashboard chính).
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={Truck}
          label="Tổng số chuyến"
          value={filteredRows.length.toLocaleString("vi-VN")}
          tone="amber"
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
          icon={CalendarDays}
          label="TB kiện / ngày"
          value={tbKienNgay.toLocaleString("vi-VN", {
            maximumFractionDigits: 1,
          })}
          tone="blue"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">
            Xu hướng số chuyến &amp; số kiện
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
                    ? "bg-white text-amber-600 shadow-sm"
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
              fill={COLOR_SLL}
              radius={[3, 3, 0, 0]}
            >
              <LabelList
                dataKey="soChuyen"
                position="top"
                formatter={(v) => (v ? v.toLocaleString("vi-VN") : "")}
                fill="#92400e"
                fontSize={11}
                fontWeight={700}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">
          Tổng số kiện
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={trend}
            margin={{ top: 34, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="gradSllKien" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLOR_SLL} stopOpacity={0.4} />
                <stop offset="95%" stopColor={COLOR_SLL} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              formatter={(v) => [v.toLocaleString("vi-VN"), "Số kiện"]}
            />
            <Area
              type="monotone"
              dataKey="tongKien"
              name="Số kiện"
              stroke={COLOR_SLL}
              fill="url(#gradSllKien)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: COLOR_SLL }}
              label={(props) => <BubbleLabel {...props} fill={COLOR_SLL} />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">
            SLL theo Concept — Số kiện
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={kienTheoConcept}
              margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v.toLocaleString("vi-VN"), "Số kiện"]}
              />
              <Bar
                dataKey="value"
                name="Số kiện"
                fill={COLOR_SLL}
                radius={[3, 3, 0, 0]}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v) => v.toLocaleString("vi-VN")}
                  fill="#64748b"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Chi tiết theo Loại hình vận chuyển
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-medium">Loại hình</th>
                  <th className="px-3 py-2 text-center font-medium">
                    Số chuyến
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    Số kiện
                  </th>
                </tr>
              </thead>
              <tbody>
                {theoLoaiHinh.map((r) => (
                  <tr
                    key={r.name}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="truncate px-3 py-2 font-medium text-slate-700">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {r.soChuyen.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {r.soKien.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
                {theoLoaiHinh.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
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
      </div>
    </div>
  );
};

export default DashboardSoLuongLon;