/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/NhanSuSoanDashboard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Legend,
  LabelList,
} from "recharts";
import {
  Package,
  Store,
  Truck,
  Boxes,
  CalendarDays,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";
import NhanSuSoanEmployeeLookup from "./nhansu";

/* ------------------------------------------------------------------ */
/* Cấu hình & hằng số                                                  */
/* ------------------------------------------------------------------ */

// Số đơn hàng bắt đầu bằng "SO" -> chuỗi CS, bắt đầu bằng "TO" -> chuỗi CF
const classifyChain = (soDonHang) => {
  const code = (soDonHang || "").toString().trim().toUpperCase();
  if (code.startsWith("SO")) return "CS";
  if (code.startsWith("TO")) return "CF";
  return "Khác";
};

const CHAIN_COLORS = { CF: "#6366f1", CS: "#0d9488", Khác: "#94a3b8" };
const CHAIN_LABEL = {
  CF: "Co.op Food/ CF",
  CS: "Co.op Smile / CS",
  Khác: "Khác",
};

const CHUYEN_ORDER = ["SÁNG", "TRƯA", "CHIỀU", "TỐI"];
const CHUYEN_COLORS = {
  SÁNG: "#22c55e",
  TRƯA: "#ef4444",
  CHIỀU: "#eab308",
  TỐI: "#6366f1",
  Khác: "#94a3b8",
};

const TRANG_THAI_ORDER = ["Chưa soạn", "Đang soạn", "Hoàn thành"];
const TRANG_THAI_COLORS = {
  "Chưa soạn": "#94a3b8",
  "Đang soạn": "#f59e0b",
  "Hoàn thành": "#10b981",
};

// Khung giờ làm việc dùng để tính bình quân đơn/giờ (7h - 17h ~ 10 tiếng)
const WORK_HOUR_START = 7;
const WORK_HOUR_END = 17; // exclusive
const WORK_HOURS_COUNT = WORK_HOUR_END - WORK_HOUR_START;

// Mặc định lọc 7 ngày gần nhất (khớp với mặc định của NhanSuSoanTable)
const getDefaultTuNgay = () => dayjs().subtract(6, "day").format("YYYY-MM-DD");
const getDefaultDenNgay = () => dayjs().format("YYYY-MM-DD");

const chuyenKey = (chuyen) => {
  if (!chuyen) return "Khác";
  const key = chuyen.toString().trim().toUpperCase().normalize("NFC");
  const found = CHUYEN_ORDER.find((k) => key.includes(k));
  return found || "Khác";
};

// Hạn KPI: 24 giờ kể từ TG import. VD 9h hôm nay import, 9h ngày hôm sau
// chưa hoàn thành -> rớt KPI.
const KPI_DEADLINE_HOURS = 24;

const KPI_ORDER = ["Đạt KPI", "Đang soạn (còn hạn)", "Không đạt KPI"];
const KPI_COLORS = {
  "Đạt KPI": "#10b981",
  "Đang soạn (còn hạn)": "#3b82f6",
  "Không đạt KPI": "#ef4444",
};

/**
 * Phân loại 1 phiếu theo KPI (hạn 24h từ tgImport):
 * - "Đạt KPI": đã hoàn thành và tgHoanThanh <= tgImport + 24h
 * - "Đang soạn (còn hạn)": chưa hoàn thành nhưng vẫn còn trong hạn 24h tính từ hiện tại
 * - "Không đạt KPI": hoàn thành trễ (tgHoanThanh > hạn) HOẶC quá hạn 24h mà vẫn chưa hoàn thành
 * Trả về null nếu phiếu không có tgImport (không đủ dữ liệu để tính).
 */
const classifyKPI = (item, now) => {
  if (!item.tgImport) return null;
  const deadline = dayjs(item.tgImport).add(KPI_DEADLINE_HOURS, "hour");

  if (item.trangThai === "Hoàn thành" && item.tgHoanThanh) {
    return dayjs(item.tgHoanThanh).isAfter(deadline)
      ? "Không đạt KPI"
      : "Đạt KPI";
  }

  // Chưa hoàn thành (hoặc thiếu tgHoanThanh dù trạng thái Hoàn thành)
  return now.isAfter(deadline) ? "Không đạt KPI" : "Đang soạn (còn hạn)";
};

/* ------------------------------------------------------------------ */
/* UI phụ trợ                                                          */
/* ------------------------------------------------------------------ */

export const DateRangeFilter = ({
  startValue,
  endValue,
  onChange,
  onClear,
}) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const inputWrapRef = useRef(null);
  const popupRef = useRef(null);
  const range = [
    {
      startDate: startValue ? new Date(startValue) : new Date(),
      endDate: endValue ? new Date(endValue) : new Date(),
      key: "selection",
    },
  ];

  // Tính toạ độ thực tế của input để định vị popup (render qua portal),
  // và tự căn lại nếu popup có nguy cơ tràn ra ngoài mép phải màn hình.
  const openPopup = () => {
    const rect = inputWrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 320; // chiều rộng ước lượng của react-date-range
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      const clickedInput = inputWrapRef.current?.contains(e.target);
      const clickedPopup = popupRef.current?.contains(e.target);
      if (!clickedInput && !clickedPopup) setShow(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Đóng popup khi cuộn trang hoặc resize để tránh popup bị lệch vị trí
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [show]);

  const hasValue = startValue && endValue;

  return (
    <div className="relative" ref={inputWrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={
          hasValue
            ? `${dayjs(startValue).format("DD/MM/YYYY")} - ${dayjs(endValue).format("DD/MM/YYYY")}`
            : ""
        }
        placeholder="Chọn khoảng ngày import"
        className="w-64 cursor-pointer rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 pl-9 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md"
      />
      <CalendarDays
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
      />
      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          title="Xoá lọc ngày"
          className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-0.5 text-white shadow transition-colors hover:bg-rose-600"
        >
          <X size={12} />
        </button>
      )}
      {show &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-slate-200"
          >
            <DateRange
              ranges={range}
              onChange={(item) => {
                const { startDate, endDate } = item.selection;
                onChange(
                  startDate ? dayjs(startDate).format("YYYY-MM-DD") : "",
                  endDate ? dayjs(endDate).format("YYYY-MM-DD") : "",
                );
              }}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};

// Export để NhanSuSoanEmployeeLookup dùng chung, tránh lặp code
export const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur">
    <div
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent}`}
    >
      <Icon size={20} className="text-white" />
    </div>
    <div className="min-w-0">
      <div className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  </div>
);

export const ChartCard = ({ title, children, className = "" }) => (
  <div
    className={`rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur ${className}`}
  >
    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
      {title}
    </h3>
    {children}
  </div>
);

const ChainProgressBar = ({ label, done, total, color }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
        <span className="text-slate-500">
          {done}/{total} đơn &middot; <b className="text-slate-700">{pct}%</b>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Component chính                                                     */
/* ------------------------------------------------------------------ */

const NhanSuSoanDashboard = () => {
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tuNgay, setTuNgay] = useState(getDefaultTuNgay());
  const [denNgay, setDenNgay] = useState(getDefaultDenNgay());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Lấy toàn bộ bản ghi trong khoảng ngày để tính toán ở client.
      // Nếu tập dữ liệu lớn, nên đổi sang endpoint tổng hợp riêng ở backend
      // (vd. GET /nhansusoan/dashboard-stats?tuNgay=..&denNgay=..) để tránh
      // tải nặng và tính toán trực tiếp bằng MongoDB aggregation.
      const res = await nhanSuSoanService.getAllNhanSuSoan({
        page: 1,
        limit: 10000,
        tuNgay,
        denNgay,
      });
      setRawItems(res.data || res.items || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu dashboard:", err);
      setError("Không tải được dữ liệu cho dashboard.");
    } finally {
      setLoading(false);
    }
  }, [tuNgay, denNgay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const items = rawItems;
    const soDay = Math.max(1, dayjs(denNgay).diff(dayjs(tuNgay), "day") + 1);
    const now = dayjs();

    const totalOrders = items.length;
    const storeSet = new Set();
    const chainStoreSet = { CF: new Set(), CS: new Set(), Khác: new Set() };
    const chainCount = { CF: 0, CS: 0, Khác: 0 };
    const chainDone = { CF: 0, CS: 0, Khác: 0 };
    const chuyenCount = {};
    const trangThaiCount = {};
    const hourCount = {};
    const dayCount = {};
    const kpiCount = {};

    items.forEach((item) => {
      const storeCode = item.maNXD || item.noiXuatDen || "N/A";
      storeSet.add(storeCode);

      const chain = classifyChain(item.soDonHang);
      chainCount[chain] += 1;
      chainStoreSet[chain].add(storeCode);
      if (item.trangThai === "Hoàn thành") chainDone[chain] += 1;

      const ck = chuyenKey(item.chuyen);
      chuyenCount[ck] = (chuyenCount[ck] || 0) + 1;

      const tt = item.trangThai || "Chưa soạn";
      trangThaiCount[tt] = (trangThaiCount[tt] || 0) + 1;

      const kpi = classifyKPI(item, now);
      if (kpi) kpiCount[kpi] = (kpiCount[kpi] || 0) + 1;

      if (item.tgImport) {
        const d = dayjs(item.tgImport);
        const h = d.hour();
        hourCount[h] = (hourCount[h] || 0) + 1;
        const dayKey = d.format("YYYY-MM-DD");
        dayCount[dayKey] = (dayCount[dayKey] || 0) + 1;
      }
    });

    const chuyenData = CHUYEN_ORDER.filter((k) => chuyenCount[k]).map((k) => ({
      name: k,
      value: chuyenCount[k],
      fill: CHUYEN_COLORS[k],
    }));
    if (chuyenCount["Khác"]) {
      chuyenData.push({
        name: "Khác",
        value: chuyenCount["Khác"],
        fill: CHUYEN_COLORS["Khác"],
      });
    }

    const trangThaiData = TRANG_THAI_ORDER.map((k) => ({
      name: k,
      value: trangThaiCount[k] || 0,
      fill: TRANG_THAI_COLORS[k],
    }));

    const kpiData = KPI_ORDER.filter((k) => kpiCount[k]).map((k) => ({
      name: k,
      value: kpiCount[k],
      fill: KPI_COLORS[k],
    }));
    const kpiTotal = kpiData.reduce((s, d) => s + d.value, 0);
    const kpiDatCount = kpiCount["Đạt KPI"] || 0;
    const kpiDatRate = kpiTotal > 0 ? Math.round((kpiDatCount / kpiTotal) * 100) : 0;

    const avgPerHour = totalOrders / (soDay * WORK_HOURS_COUNT);

    const hourData = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, "0")}h`,
      soLuong: hourCount[h] || 0,
    }));

    const dayData = Object.keys(dayCount)
      .sort()
      .map((d) => ({
        date: dayjs(d).format("DD/MM"),
        soLuong: dayCount[d],
      }));

    return {
      totalOrders,
      totalStores: storeSet.size,
      chainCount,
      chainDone,
      chainStoreCount: {
        CF: chainStoreSet.CF.size,
        CS: chainStoreSet.CS.size,
      },
      chuyenData,
      trangThaiData,
      kpiData,
      kpiTotal,
      kpiDatRate,
      hourData,
      dayData,
      avgPerHour,
    };
  }, [rawItems, tuNgay, denNgay]);

  return (
    <div className="space-y-4">
      {/* Header: tiêu đề + số bản ghi + lọc ngày + nút tra cứu NV (đưa lên đầu, dễ thấy) */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            DASHBOARD PHIẾU SOẠN
          </h1>
          <p className="text-sm text-slate-500">
            Tổng quan đơn hàng theo chuỗi, chuyến, trạng thái và tiến độ xử lý
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading && (
            <Loader2 size={18} className="animate-spin text-blue-500" />
          )}
          {!loading && !error && (
            <span className="text-xs text-slate-400">
              (API trả về {rawItems.length} bản ghi)
            </span>
          )}
          <DateRangeFilter
            startValue={tuNgay}
            endValue={denNgay}
            onChange={(s, e) => {
              setTuNgay(s);
              setDenNgay(e);
            }}
            onClear={() => {
              setTuNgay(getDefaultTuNgay());
              setDenNgay(getDefaultDenNgay());
            }}
          />
          {/* Nút mở modal tra cứu theo mã nhân viên — đặt ngay header thay vì cuối trang */}
          <NhanSuSoanEmployeeLookup />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Package}
          label="Tổng đơn hàng"
          value={stats.totalOrders}
          accent="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <StatCard
          icon={Store}
          label="Tổng cửa hàng đặt"
          value={stats.totalStores}
          accent="bg-gradient-to-br from-slate-500 to-slate-700"
        />
        <StatCard
          icon={Truck}
          label="Đơn CF"
          value={stats.chainCount.CF}
          sub={CHAIN_LABEL.CF}
          accent="bg-gradient-to-br from-indigo-500 to-indigo-700"
        />
        <StatCard
          icon={Store}
          label="Cửa hàng CF đặt"
          value={stats.chainStoreCount.CF}
          accent="bg-gradient-to-br from-indigo-400 to-indigo-600"
        />
        <StatCard
          icon={Boxes}
          label="Đơn CS"
          value={stats.chainCount.CS}
          sub={CHAIN_LABEL.CS}
          accent="bg-gradient-to-br from-teal-500 to-emerald-600"
        />
        <StatCard
          icon={Store}
          label="Cửa hàng CS đặt"
          value={stats.chainStoreCount.CS}
          accent="bg-gradient-to-br from-teal-400 to-emerald-500"
        />
      </div>

      {/* Chuyến + trạng thái + progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Đơn hàng theo chuyến">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.chuyenData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {stats.chuyenData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Đơn hàng theo trạng thái">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.trangThaiData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {stats.trangThaiData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tiến độ xử lý theo chuỗi">
          <div className="flex h-[220px] flex-col justify-center gap-6 px-2">
            <ChainProgressBar
              label={CHAIN_LABEL.CF}
              done={stats.chainDone.CF}
              total={stats.chainCount.CF}
              color={CHAIN_COLORS.CF}
            />
            <ChainProgressBar
              label={CHAIN_LABEL.CS}
              done={stats.chainDone.CS}
              total={stats.chainCount.CS}
              color={CHAIN_COLORS.CS}
            />
            {stats.chainCount["Khác"] > 0 && (
              <ChainProgressBar
                label="Khác"
                done={stats.chainDone["Khác"]}
                total={stats.chainCount["Khác"]}
                color={CHAIN_COLORS["Khác"]}
              />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Tỷ lệ đạt KPI (hạn 24h từ TG import) */}
      <ChartCard title="Tỷ lệ đạt KPI (hạn 24 giờ kể từ TG import)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.kpiData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {stats.kpiData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center gap-1 px-2 text-sm text-slate-600 md:min-w-[220px]">
            <div className="text-3xl font-bold text-emerald-600">
              {stats.kpiDatRate}%
            </div>
            <div className="text-xs text-slate-400">
              Tỷ lệ đạt KPI trên {stats.kpiTotal} phiếu có TG import
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Phiếu được tính &quot;Đạt KPI&quot; nếu hoàn thành trong vòng 24
              giờ kể từ TG import. Quá 24 giờ mà chưa hoàn thành (hoặc hoàn
              thành trễ) sẽ tính là &quot;Không đạt KPI&quot;.
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Đơn theo giờ */}
      <ChartCard title="Số lượng đơn hàng phát ra theo từng giờ">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Clock size={14} className="text-blue-500" />
          Bình quân {stats.avgPerHour.toFixed(1)} đơn/giờ (tính trên khung{" "}
          {WORK_HOUR_START}h-{WORK_HOUR_END}h, {WORK_HOURS_COUNT} tiếng/ngày)
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={stats.hourData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <ReferenceLine
              y={stats.avgPerHour}
              stroke="#f97316"
              strokeDasharray="4 4"
              label={{
                value: "TB/giờ",
                position: "right",
                fill: "#f97316",
                fontSize: 11,
              }}
            />
            <Bar
              dataKey="soLuong"
              name="Số đơn"
              fill="#3b82f6"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Đơn theo ngày gần nhất */}
      <ChartCard title="Số lượng đơn hàng theo ngày (trong khoảng đã chọn)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={stats.dayData}
            margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar
              dataKey="soLuong"
              name="Số đơn"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey="soLuong"
                position="top"
                fontSize={11}
                fill="#475569"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default NhanSuSoanDashboard;