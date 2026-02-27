/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, memo } from "react";
import { phieuLeService } from "@/services/phieusoan/phieule.service";
import dayjs from "dayjs";

// ─── Hook ─────────────────────────────────────────────────────────────────────
const usePhieuSoanDashboard = (startDate, endDate) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: 1,
        limit: 9999,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      };

      const allRes = await phieuLeService.getAllPhieuLe(params);

      const allPhieu = Array.isArray(allRes?.data)
        ? allRes.data
        : (allRes?.data?.phieule ?? allRes?.phieule ?? []);

      // Khởi tạo các biến chứa kết quả
      const byTrangThai = { "Chờ xử lý": 0, "Đã xử lý": 0, "Đã Xuất": 0 };

      // Tách chi tiết cho Transfer (TF) và Soda (SD)
      const statsLoai = {
        TF: { count: 0, kien: 0, khoiLuong: 0, daXuLy: 0 },
        SD: { count: 0, kien: 0, khoiLuong: 0, daXuLy: 0 },
      };

      const byQuan = {};
      const byChuyen = {};
      const byDate = {};

      let tongKien = 0;
      let tongKhoiLuong = 0;
      let daIn = 0;
      let chuaIn = 0;

      // Chuẩn bị key cho byDate
      const refEnd = endDate ? dayjs(endDate) : dayjs();
      const refStart = startDate
        ? dayjs(startDate)
        : dayjs().subtract(6, "day");
      const diffDays = Math.min(refEnd.diff(refStart, "day"), 29);
      for (let i = diffDays; i >= 0; i--) {
        byDate[refEnd.subtract(i, "day").format("DD/MM")] = 0;
      }

      // Vòng lặp tối ưu
      for (let i = 0; i < allPhieu.length; i++) {
        const p = allPhieu[i];

        // 1. Trạng thái
        if (p.trang_thai in byTrangThai) byTrangThai[p.trang_thai]++;

        // 2. Chi tiết theo loại phiếu (TF vs SD)
        const isSD =
          p.loai_phieu === "SD" || p.loai_phieu?.toUpperCase() === "SODA";
        const loaiKey = isSD ? "SD" : "TF";

        statsLoai[loaiKey].count++;
        statsLoai[loaiKey].kien += Number(p.tong_kien) || 0;
        statsLoai[loaiKey].khoiLuong += Number(p.tong_khoi_luong) || 0;
        if (p.trang_thai === "Đã xử lý") {
          statsLoai[loaiKey].daXuLy++;
        }

        // 3. Quận
        if (p.quan) byQuan[p.quan] = (byQuan[p.quan] || 0) + 1;

        // 4. Chuyến
        if (p.chuyen) byChuyen[p.chuyen] = (byChuyen[p.chuyen] || 0) + 1;

        // 5. Khối lượng & Kiện tổng hợp
        tongKien += Number(p.tong_kien) || 0;
        tongKhoiLuong += Number(p.tong_khoi_luong) || 0;

        // 6. In phiếu
        if ((p.so_lan_in_phieu || 0) > 0) {
          daIn++;
        } else {
          chuaIn++;
        }

        // 7. Date
        if (p.ngay_import) {
          try {
            const dateStr = p.ngay_import.substring(0, 10);
            const parts = dateStr.split("-");
            if (parts.length === 3) {
              const key = `${parts[2]}/${parts[1]}`;
              if (key in byDate) byDate[key]++;
            }
          } catch (e) {
            console.log(e);
          }
        }
      }

      setData({
        total: allPhieu.length,
        choXuLy: byTrangThai["Chờ xử lý"],
        daXuLy: byTrangThai["Đã xử lý"],
        daXuat: byTrangThai["Đã Xuất"],
        statsLoai,
        byQuan,
        byChuyen,
        byDate,
        tongKien,
        tongKhoiLuong,
        daIn,
        chuaIn,
      });
    } catch (err) {
      console.error("Dashboard Error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString("vi-VN");
const fmtKg = (n) =>
  Number(n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ─── Mini components ──────────────────────────────────────────────────────────
const StatCard = memo(({ label, value, sub, icon, gradient }) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md bg-gradient-to-br ${gradient}`}
  >
    <div className="absolute -right-3 -top-3 text-white/10 text-8xl select-none leading-none">
      {icon}
    </div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
      {label}
    </p>
    <p className="mt-1 text-3xl font-black">{value}</p>
    <p className="mt-0.5 text-xs text-white/80">{sub}</p>
  </div>
));
StatCard.displayName = "StatCard";

const KpiCard = memo(({ label, value, icon, color, bg, border }) => (
  <div
    className={`rounded-xl border p-4 ${bg} ${border} flex items-center gap-3`}
  >
    <span className="text-2xl">{icon}</span>
    <div>
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight">
        {label}
      </p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  </div>
));
KpiCard.displayName = "KpiCard";

const Card = memo(({ title, badge, children, className = "" }) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden ${className}`}
  >
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0">
      <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <div className="p-5 flex-1">{children}</div>
  </div>
));
Card.displayName = "Card";

const MiniBarChart = memo(({ data, color = "#6366f1", maxH = 60 }) => {
  const entries = Object.entries(data);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div
      className="flex items-end gap-0.5 w-full"
      style={{ height: maxH + 18 }}
    >
      {entries.map(([label, val]) => (
        <div key={label} className="flex flex-col items-center flex-1 gap-0.5">
          <div
            style={{
              height: `${(val / max) * maxH}px`,
              background: color,
              minHeight: val > 0 ? 3 : 0,
            }}
            className="w-full rounded-t-sm transition-all duration-500"
            title={`${label}: ${val}`}
          />
          <span className="text-[8px] text-slate-400 truncate w-full text-center leading-none">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
});
MiniBarChart.displayName = "MiniBarChart";

const DonutChart = memo(({ segments, size = 130, stroke = 20 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, g) => s + g.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
      <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 - 2} fill="white" />
    </svg>
  );
});
DonutChart.displayName = "DonutChart";

const PRESETS = [
  { label: "Hôm nay", days: 0 },
  { label: "7 ngày", days: 6 },
  { label: "30 ngày", days: 29 },
  { label: "Tất cả", days: null },
];

const DateFilter = memo(({ startDate, endDate, onChangeDates }) => {
  const [active, setActive] = useState(1);
  const [showCustom, setShowCustom] = useState(false);
  const [cStart, setCStart] = useState("");
  const [cEnd, setCEnd] = useState("");

  const applyPreset = (idx) => {
    setActive(idx);
    setShowCustom(false);
    const p = PRESETS[idx];
    if (p.days === null) {
      onChangeDates("", "");
    } else {
      onChangeDates(
        dayjs().subtract(p.days, "day").format("YYYY-MM-DD"),
        dayjs().format("YYYY-MM-DD"),
      );
    }
  };

  const applyCustom = () => {
    if (cStart && cEnd) {
      setActive(-1);
      onChangeDates(cStart, cEnd);
      setShowCustom(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p, i) => (
        <button
          key={p.label}
          onClick={() => applyPreset(i)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            active === i
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          active === -1
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        📅 Tùy chọn
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-md">
          <input
            type="date"
            value={cStart}
            onChange={(e) => setCStart(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <span className="text-slate-400 text-xs">→</span>
          <input
            type="date"
            value={cEnd}
            onChange={(e) => setCEnd(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
          >
            Áp dụng
          </button>
        </div>
      )}

      {(startDate || endDate) && (
        <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
          {startDate ? dayjs(startDate).format("DD/MM/YYYY") : "..."} —{" "}
          {endDate ? dayjs(endDate).format("DD/MM/YYYY") : "..."}
        </span>
      )}
    </div>
  );
});
DateFilter.displayName = "DateFilter";

const DashboardTab = () => {
  const [startDate, setStartDate] = useState(() =>
    dayjs().subtract(6, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data, loading, error, refresh } = usePhieuSoanDashboard(
    startDate,
    endDate,
  );

  const handleRefresh = async () => {
    await refresh();
    setLastRefresh(new Date());
  };

  // ─── HÀM RENDER NỘI DUNG CHÍNH (Tách biệt với Toolbar) ────────────
  const renderDashboardContent = () => {
    if (loading)
      return (
        <div className="space-y-4 animate-pulse mt-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      );

    if (error)
      return (
        <div className="p-10 mt-5 text-center border-2 border-dashed border-red-200 rounded-2xl text-red-400">
          ⚠️ Lỗi kết nối dữ liệu Phiếu Soạn
        </div>
      );

    if (!data) return null;

    const {
      total,
      choXuLy,
      daXuLy,
      daXuat,
      statsLoai,
      byQuan,
      byChuyen,
      byDate,
      tongKien,
      tongKhoiLuong,
      daIn,
      chuaIn,
    } = data;

    const rateXuat = pct(daXuat, total);
    const rateXuLy = pct(daXuLy, total);
    const rateChoXuLy = pct(choXuLy, total);
    const rateDaIn = pct(daIn, total);

    const donutSegments = [
      { label: "Đã Xuất", value: daXuat, color: "#10b981" },
      { label: "Đã Xử Lý", value: daXuLy, color: "#3b82f6" },
      { label: "Chờ Xử Lý", value: choXuLy, color: "#f59e0b" },
    ].filter((s) => s.value > 0);

    const topQuan = Object.entries(byQuan)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
    const topChuyen = Object.entries(byChuyen)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const maxQuan = Math.max(...topQuan.map(([, v]) => v), 1);

    return (
      <div className="space-y-5 mt-5">
        {/* ── Row 1: Stats trạng thái ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Tổng Phiếu"
            value={fmt(total)}
            sub="Trong khoảng thời gian"
            icon="📚"
            gradient="from-indigo-500 to-indigo-700"
          />
          <StatCard
            label="Chờ Xử Lý"
            value={fmt(choXuLy)}
            sub={`${rateChoXuLy}% tổng số`}
            icon="⏳"
            gradient="from-amber-400 to-orange-500"
          />
          <StatCard
            label="Đã Xử Lý"
            value={fmt(daXuLy)}
            sub={`${rateXuLy}% tổng số`}
            icon="🔄"
            gradient="from-blue-400 to-blue-600"
          />
          <StatCard
            label="Đã Xuất"
            value={fmt(daXuat)}
            sub={`${rateXuat}% hoàn tất`}
            icon="✅"
            gradient="from-emerald-400 to-teal-600"
          />
        </div>

        {/* ── Row 2: KPI phụ ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Tổng kiện hàng"
            value={fmt(tongKien)}
            icon="📦"
            color="text-blue-600"
            bg="bg-blue-50"
            border="border border-blue-100"
          />
          <KpiCard
            label="Tổng khối lượng"
            value={`${fmtKg(tongKhoiLuong)} kg`}
            icon="⚖️"
            color="text-violet-600"
            bg="bg-violet-50"
            border="border border-violet-100"
          />
          <KpiCard
            label="Đã in phiếu"
            value={`${fmt(daIn)} (${rateDaIn}%)`}
            icon="🖨️"
            color="text-green-600"
            bg="bg-green-50"
            border="border border-green-100"
          />
          <KpiCard
            label="Chưa in phiếu"
            value={fmt(chuaIn)}
            icon="📝"
            color="text-orange-600"
            bg="bg-orange-50"
            border="border border-orange-100"
          />
        </div>

        {/* ── Row 3: Donut + Chi tiết Transfer + Chi tiết Soda ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card title="Phân bổ trạng thái">
            <div className="flex flex-col items-center h-full justify-center">
              <div className="relative">
                <DonutChart segments={donutSegments} size={130} stroke={20} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-800">
                    {rateXuat}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">
                    Đã xuất
                  </span>
                </div>
              </div>
              <div className="mt-5 w-full space-y-2.5">
                {[
                  {
                    label: "Đã Xuất",
                    value: daXuat,
                    rate: rateXuat,
                    color: "#10b981",
                  },
                  {
                    label: "Đã Xử Lý",
                    value: daXuLy,
                    rate: rateXuLy,
                    color: "#3b82f6",
                  },
                  {
                    label: "Chờ Xử Lý",
                    value: choXuLy,
                    rate: rateChoXuLy,
                    color: "#f59e0b",
                  },
                ].map((seg) => (
                  <div
                    key={seg.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ background: seg.color }}
                      />
                      <span className="text-slate-600 font-medium">
                        {seg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800 text-sm">
                        {fmt(seg.value)}
                      </span>
                      <span className="text-[10px] text-slate-400 w-8 text-right font-semibold">
                        {seg.rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Thông số: Transfer (TF)">
            <div className="flex flex-col h-full justify-between space-y-4">
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <span className="text-sm font-semibold text-slate-500">
                  Số lượng phiếu
                </span>
                <span className="text-3xl font-black text-orange-500">
                  {fmt(statsLoai.TF.count)}
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <span className="text-sm font-semibold text-slate-500">
                  Tổng kiện hàng
                </span>
                <span className="text-xl font-bold text-slate-700">
                  {fmt(statsLoai.TF.kien)}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    kiện
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <span className="text-sm font-semibold text-slate-500">
                  Tổng khối lượng
                </span>
                <span className="text-xl font-bold text-slate-700">
                  {fmtKg(statsLoai.TF.khoiLuong)}{" "}
                  <span className="text-xs font-normal text-slate-400">kg</span>
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl mt-auto">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Tỷ lệ đã xử lý
                </span>
                <span className="text-lg font-black text-blue-600">
                  {pct(statsLoai.TF.daXuLy, statsLoai.TF.count)}%
                </span>
              </div>
            </div>
          </Card>

          <Card title="Thông số: Soda (SD)">
            <div className="flex flex-col h-full justify-between space-y-4">
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <span className="text-sm font-semibold text-slate-500">
                  Số lượng phiếu
                </span>
                <span className="text-3xl font-black text-purple-600">
                  {fmt(statsLoai.SD.count)}
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <span className="text-sm font-semibold text-slate-500">
                  Tổng kiện hàng
                </span>
                <span className="text-xl font-bold text-slate-700">
                  {fmt(statsLoai.SD.kien)}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    kiện
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <span className="text-sm font-semibold text-slate-500">
                  Tổng khối lượng
                </span>
                <span className="text-xl font-bold text-slate-700">
                  {fmtKg(statsLoai.SD.khoiLuong)}{" "}
                  <span className="text-xs font-normal text-slate-400">kg</span>
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl mt-auto">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Tỷ lệ đã xử lý
                </span>
                <span className="text-lg font-black text-blue-600">
                  {pct(statsLoai.SD.daXuLy, statsLoai.SD.count)}%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Row 4: Biểu đồ ngày + Quận + Chuyến ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card
            title="Phiếu nhập theo ngày"
            badge={
              startDate
                ? `${dayjs(startDate).format("DD/MM")}→${dayjs(endDate).format("DD/MM")}`
                : "Tất cả"
            }
          >
            {Object.values(byDate).every((v) => v === 0) ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Không có dữ liệu
              </p>
            ) : (
              <>
                <MiniBarChart data={byDate} color="#6366f1" maxH={60} />
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  Tổng:{" "}
                  <b className="text-slate-600">
                    {Object.values(byDate).reduce((s, v) => s + v, 0)}
                  </b>{" "}
                  phiếu
                </p>
              </>
            )}
          </Card>

          <Card title="Phân bổ theo quận">
            {topQuan.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Không có dữ liệu
              </p>
            ) : (
              <div className="space-y-2">
                {topQuan.map(([quan, count]) => (
                  <div key={quan} className="flex items-center gap-2">
                    <span
                      className="text-xs text-slate-600 w-20 truncate shrink-0"
                      title={quan}
                    >
                      {quan}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.round((count / maxQuan) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Phân bổ theo chuyến">
            {topChuyen.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Không có dữ liệu
              </p>
            ) : (
              <div className="space-y-2">
                {topChuyen.map(([chuyen, count], i) => {
                  const colors = [
                    "bg-emerald-400",
                    "bg-teal-400",
                    "bg-cyan-400",
                    "bg-sky-400",
                    "bg-blue-400",
                  ];
                  return (
                    <div key={chuyen} className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white shrink-0 ${colors[i % colors.length]}`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs text-slate-600 flex-1 truncate">
                        Chuyến {chuyen}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {count}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({pct(count, total)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  };

  // ─── PHẦN TRẢ VỀ CHÍNH BẢO VỆ TOOLBAR ────────────
  return (
    <div>
      {/* ── Toolbar LUÔN HIỂN THỊ, không bao giờ bị re-mount ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">
            Tổng quan hệ thống
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cập nhật lúc {lastRefresh.toLocaleTimeString("vi-VN")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter
            startDate={startDate}
            endDate={endDate}
            onChangeDates={(s, e) => {
              setStartDate(s);
              setEndDate(e);
            }}
          />
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Chỉ nhấp nháy Skeleton/Data ở khối này ── */}
      {renderDashboardContent()}
    </div>
  );
};

export default DashboardTab;
