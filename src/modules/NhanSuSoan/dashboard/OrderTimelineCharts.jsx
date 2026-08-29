/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/OrderTimelineCharts.jsx
//
// Hiển thị 3 biểu đồ cột "Đơn hàng theo thời gian" CÙNG LÚC:
//   - 14 ngày gần nhất
//   - 7 tuần gần nhất
//   - 12 tháng gần nhất
// Mỗi biểu đồ tách riêng 2 cột CF (xanh lá) / CS (xanh dương).
// Có 1 nút chuyển chỉ số DUY NHẤT (Đơn hàng / Kiện đã hoàn thành) áp
// dụng chung cho cả 3 biểu đồ.
//
// Chỉ gọi API 1 LẦN (fetch 12 tháng gần nhất — đủ dữ liệu cho cả 3 mốc
// thời gian), rồi tự tính lại 3 tập dữ liệu từ cùng 1 nguồn.

import { useEffect, useMemo, useState, memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { AlertTriangle, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

const FONT_SANS =
  '"Be Vietnam Pro", -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

const nf = new Intl.NumberFormat("vi-VN");
const formatNumber = (n) => nf.format(n);

const classifyChain = (soDonHang) => {
  const code = (soDonHang || "").toString().trim().toUpperCase();
  if (code.startsWith("SO")) return "CS";
  if (code.startsWith("TO")) return "CF";
  return "Khác";
};

const CHAIN_COLORS = { CF: "#16A34A", CS: "#0EA5E9" };
const CHAIN_LABEL = { CF: "Co.op Food / CF", CS: "Co.op Smile / CS" };

const METRIC_OPTIONS = [
  { value: "donHang", label: "Đơn hàng" },
  { value: "kien", label: "Kiện" },
];

// ✅ Fetch đủ 12 tháng gần nhất — bao trọn dữ liệu cần cho cả 3 biểu đồ
// (14 ngày và 7 tuần đều nằm gọn trong 12 tháng), chỉ 1 lần gọi API.
const FETCH_MONTHS_BACK = 12;

/* ------------------------------------------------------------------ */
/* Sinh danh sách khung thời gian (bucket) theo từng loại mốc          */
/* ------------------------------------------------------------------ */
const buildBuckets = (range) => {
  const now = dayjs();

  if (range === "tuan") {
    const N = 7; // 7 tuần gần nhất — mỗi tuần = khung 7 ngày, tính lùi từ hôm nay
    return Array.from({ length: N }, (_, i) => {
      const end = now.subtract((N - 1 - i) * 7, "day").endOf("day");
      const start = end.subtract(6, "day").startOf("day");
      return {
        label: `${start.format("DD/MM")}-${end.format("DD/MM")}`,
        start,
        end,
      };
    });
  }

  if (range === "thang") {
    const N = 12; // 12 tháng gần nhất — theo tháng dương lịch
    return Array.from({ length: N }, (_, i) => {
      const m = now.subtract(N - 1 - i, "month");
      return {
        label: m.format("MM/YYYY"),
        start: m.startOf("month"),
        end: m.endOf("month"),
      };
    });
  }

  // "ngay" — mặc định, 14 ngày gần nhất
  const N = 14;
  return Array.from({ length: N }, (_, i) => {
    const d = now.subtract(N - 1 - i, "day");
    return {
      label: d.format("DD/MM"),
      start: d.startOf("day"),
      end: d.endOf("day"),
    };
  });
};

// ✅ Gom `items` vào đúng bucket theo tgImport, tách riêng CF/CS. Với
// chỉ số "Kiện" -> chỉ cộng dồn số kiện của các phiếu đã Hoàn thành.
const aggregate = (items, range, metric) => {
  const buckets = buildBuckets(range);
  const data = buckets.map(() => ({
    CF: { donHang: 0, kien: 0 },
    CS: { donHang: 0, kien: 0 },
  }));

  items.forEach((item) => {
    if (!item.tgImport) return;
    const t = dayjs(item.tgImport).valueOf();
    const idx = buckets.findIndex(
      (b) => t >= b.start.valueOf() && t <= b.end.valueOf(),
    );
    if (idx === -1) return;

    const chain = classifyChain(item.soDonHang);
    if (chain !== "CF" && chain !== "CS") return;

    data[idx][chain].donHang += 1;
    if (item.trangThai === "Hoàn thành") {
      data[idx][chain].kien += item.kien || 0;
    }
  });

  const field = metric === "kien" ? "kien" : "donHang";
  return buckets.map((b, i) => ({
    label: b.label,
    CF: data[i].CF[field],
    CS: data[i].CS[field],
  }));
};

/* ------------------------------------------------------------------ */
/* Card khung chung — style tối giản, đồng bộ với ChartCard bên        */
/* NhanSuSoanDashboard.jsx (tách riêng ở đây để tránh import vòng).    */
/* ------------------------------------------------------------------ */
const MiniChartCard = memo(function MiniChartCard({
  title,
  eyebrow,
  children,
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 transition-shadow duration-200 hover:shadow-md md:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
        <h3
          className="text-[13.5px] font-semibold text-slate-800"
          style={{ fontFamily: FONT_SANS }}
        >
          {title}
        </h3>
        {eyebrow && (
          <span
            className="text-[11.5px] font-medium text-slate-400"
            style={{ fontFamily: FONT_SANS }}
          >
            {eyebrow}
          </span>
        )}
      </div>
      {children}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* 1 biểu đồ cột CF/CS cho 1 mốc thời gian cụ thể                      */
/* ------------------------------------------------------------------ */
const TimelineBarChart = memo(function TimelineBarChart({
  title,
  data,
  height = 260,
}) {
  const totalCF = useMemo(() => data.reduce((s, d) => s + d.CF, 0), [data]);
  const totalCS = useMemo(() => data.reduce((s, d) => s + d.CS, 0), [data]);

  return (
    <MiniChartCard
      title={title}
      eyebrow={
        <div
          className="flex flex-wrap items-center gap-3"
          style={{ fontFamily: FONT_MONO }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: CHAIN_COLORS.CF }}
            />
            {formatNumber(totalCF)}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: CHAIN_COLORS.CS }}
            />
            {formatNumber(totalCS)}
          </span>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={height} debounce={150}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#eef2f6"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fontFamily: FONT_MONO, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fontFamily: FONT_MONO, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              fontFamily: FONT_SANS,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={24}
            wrapperStyle={{ fontSize: 11.5, fontFamily: FONT_SANS }}
          />
          <Bar
            dataKey="CF"
            name={CHAIN_LABEL.CF}
            fill={CHAIN_COLORS.CF}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          >
            <LabelList
              dataKey="CF"
              position="top"
              fontSize={9.5}
              fill="#166534"
              formatter={(v) => (v > 0 ? formatNumber(v) : "")}
            />
          </Bar>
          <Bar
            dataKey="CS"
            name={CHAIN_LABEL.CS}
            fill={CHAIN_COLORS.CS}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          >
            <LabelList
              dataKey="CS"
              position="top"
              fontSize={9.5}
              fill="#0369a1"
              formatter={(v) => (v > 0 ? formatNumber(v) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </MiniChartCard>
  );
});

/* ------------------------------------------------------------------ */
/* Component chính — 3 biểu đồ hiện CÙNG LÚC + 1 nút chỉ số chung      */
/* ------------------------------------------------------------------ */
const OrderTimelineCharts = memo(function OrderTimelineCharts() {
  const [metric, setMetric] = useState("donHang"); // "donHang" | "kien"

  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const tu = dayjs()
          .subtract(FETCH_MONTHS_BACK - 1, "month")
          .startOf("month")
          .format("YYYY-MM-DD");
        const den = dayjs().format("YYYY-MM-DD");
        const res = await nhanSuSoanService.getAllNhanSuSoan({
          page: 1,
          limit: 50000,
          tuNgay: tu,
          denNgay: den,
        });
        if (!cancelled) setRawItems(res.data || res.items || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu biểu đồ đơn hàng theo thời gian:", err);
        if (!cancelled) {
          setRawItems([]);
          setError("Không tải được dữ liệu biểu đồ.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 👈 chỉ fetch 1 lần — đủ dữ liệu cho cả 3 biểu đồ bên dưới

  const dayData = useMemo(
    () => aggregate(rawItems, "ngay", metric),
    [rawItems, metric],
  );
  const weekData = useMemo(
    () => aggregate(rawItems, "tuan", metric),
    [rawItems, metric],
  );
  const monthData = useMemo(
    () => aggregate(rawItems, "thang", metric),
    [rawItems, metric],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="text-[13.5px] font-semibold text-slate-800"
          style={{ fontFamily: FONT_SANS }}
        >
          Đơn hàng theo thời gian (CF / CS)
        </h3>
        <div className="flex items-center gap-2">
          {loading && (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          )}
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMetric(opt.value)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  metric === opt.value
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                style={{ fontFamily: FONT_SANS }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TimelineBarChart
          title={`${metric === "kien" ? "Kiện đã hoàn thành" : "Đơn hàng"} — 14 ngày gần nhất`}
          data={dayData}
        />
        <TimelineBarChart
          title={`${metric === "kien" ? "Kiện đã hoàn thành" : "Đơn hàng"} — 7 tuần gần nhất`}
          data={weekData}
        />
      </div>

      <TimelineBarChart
        title={`${metric === "kien" ? "Kiện đã hoàn thành" : "Đơn hàng"} — 12 tháng gần nhất`}
        data={monthData}
        height={300}
      />
    </div>
  );
});

export default OrderTimelineCharts;
