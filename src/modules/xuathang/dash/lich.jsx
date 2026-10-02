// pages/xuathang/dash/lich.jsx
/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { xuatHangService } from "@/services/xuathang/xuathang.service";
import { keHoachXeService } from "@/services/xuathang/kehoachxe.service";
import DateRangeFilter from "@/modules/nhaphang/dash/date";
import { pad2, dayKeyUTC, dedupeAndEnrich } from "./share";

// Mỗi dòng kế hoạch = 1 chuyến. Đổi thành true nếu cột "SL xe" = số chuyến.
const USE_SO_LUONG_XE = false;

const HOUR_COLORS = [
  "#4f9d3a",
  "#2b3a7a",
  "#a98a22",
  "#7a1f2b",
  "#4a90d9",
  "#6b2c91",
  "#e07020",
  "#14452f",
  "#0e7490",
  "#be185d",
];

const todayLocalKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
};

const formatLongDate = (key) => {
  if (!key) return "";
  const [y, m, d] = key.split("-");
  return `Ngày ${Number(d)} tháng ${Number(m)} năm ${y}`;
};

const formatRangeLabel = (s, e) =>
  s === e
    ? formatLongDate(s)
    : `Từ ${s.split("-").reverse().join("/")} đến ${e.split("-").reverse().join("/")}`;

// Đọc "Giờ xe vào kho đầu" -> số phút trong ngày.
// Hỗ trợ: "07:30", "7h30", số Excel (0.3125), hoặc ISO date (đọc UTC)
const parseGioVao = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    return v >= 0 && v < 1 ? Math.round(v * 1440) : null;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\s*[:hH]\s*(\d{2})?/);
  if (m) return Number(m[1]) * 60 + (Number(m[2]) || 0);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.getUTCHours() * 60 + d.getUTCMinutes();
  return null;
};

// Cùng mốc với Dashboard chính: trước 12h30 = Sáng, đến 17h30 = Trưa, sau = Tối
const bucketOf = (phut) => {
  if (phut === null) return null;
  if (phut < 750) return "Sáng";
  if (phut < 1050) return "Trưa";
  return "Tối";
};

const splitStores = (s) =>
  String(s || "")
    .split("+")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);

// Phân loại concept theo mã điểm bán:
//  - toàn số (vd 808, 2032)  -> Co.op Food
//  - bắt đầu bằng CH         -> Co.op Smile
//  - còn lại (P6, TB, CC...) -> Hợp tác xã
const conceptOfStore = (code) => {
  const s = String(code || "")
    .trim()
    .toUpperCase();
  if (/^\d+$/.test(s)) return "Co.op Food";
  if (s.startsWith("CH")) return "Co.op Smile";
  return "Hợp tác xã";
};

const PlanCard = ({ title, plan, done, bg, titleColor, numColor }) => {
  const extra = Math.max(0, done - plan);
  const remain = Math.max(0, plan - done);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg p-4 text-center"
      style={{ background: bg }}
    >
      <div
        className="text-sm font-bold uppercase"
        style={{ color: titleColor }}
      >
        {title}
      </div>
      <div className="text-5xl font-bold" style={{ color: numColor }}>
        {plan}
      </div>
      <div className="mt-1 text-xs text-slate-600">
        Hoàn thành <b>{done}</b>
        {extra > 0 ? (
          <span className="ml-1.5 font-semibold text-red-600">
            · Phát sinh +{extra}
          </span>
        ) : (
          <span className="ml-1.5 text-slate-500">· Còn {remain}</span>
        )}
      </div>
    </div>
  );
};

const LichXuatHang = ({ actualRows: actualRowsProp }) => {
  // Khoảng ngày (mặc định hôm nay). Chưa chọn đủ thì coi như 1 ngày.
  const [dateStart, setDateStart] = useState(todayLocalKey);
  const [dateEnd, setDateEnd] = useState(todayLocalKey);

  const [planRows, setPlanRows] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Nếu Dashboard không truyền data thì tự tải (dùng được độc lập)
  const [fetchedRows, setFetchedRows] = useState([]);
  const [loadingFetched, setLoadingFetched] = useState(!actualRowsProp);

  const handleDateChange = (start, end) => {
    const s = start || end || todayLocalKey();
    setDateStart(s);
    setDateEnd(end || s);
  };
  const handleDateClear = () => {
    const t = todayLocalKey();
    setDateStart(t);
    setDateEnd(t);
  };

  // Thực tế: chỉ tự tải khi không được truyền từ Dashboard
  useEffect(() => {
    if (actualRowsProp) return;
    (async () => {
      try {
        const res = await xuatHangService.getDanhSach({
          page: 1,
          limit: 100000,
        });
        setFetchedRows(dedupeAndEnrich(res?.data || []));
      } catch (err) {
        console.error("Lỗi getDanhSach (lịch xuất hàng):", err);
      } finally {
        setLoadingFetched(false);
      }
    })();
  }, [actualRowsProp]);

  const actualRows = actualRowsProp || fetchedRows;
  const loadingActual = actualRowsProp ? false : loadingFetched;

  // Kế hoạch: lấy theo khoảng ngày đang chọn
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlan(true);
      try {
        const res = await keHoachXeService.getDanhSach({
          page: 1,
          limit: 100000,
          tu_ngay: dateStart,
          den_ngay: dateEnd,
        });
        if (!cancelled) setPlanRows(res?.data || []);
      } catch (err) {
        console.error("Lỗi getDanhSach (kế hoạch xe):", err);
        if (!cancelled) setPlanRows([]);
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateStart, dateEnd]);

  const plan = useMemo(() => {
    const buckets = { Sáng: 0, Trưa: 0, Tối: 0 };
    const hours = new Map();
    const concepts = new Map();
    let trips = 0;
    let stores = 0;

    planRows.forEach((r) => {
      const n = USE_SO_LUONG_XE ? Number(r.so_luong_xe) || 1 : 1;
      trips += n;

      const phut = parseGioVao(r.thoi_gian_xe_vao_kho_dau_yeu_cau);
      const b = bucketOf(phut);
      if (b) buckets[b] += n;
      if (phut !== null) {
        const h = Math.floor(phut / 60);
        hours.set(h, (hours.get(h) || 0) + n);
      }

      // "CH00042+CH00356" = 2 điểm bán nhưng chỉ 1 chuyến
      const list = splitStores(r.ma_sieu_thi);
      stores += list.length;
      list.forEach((s) => {
        const c = conceptOfStore(s);
        concepts.set(c, (concepts.get(c) || 0) + 1);
      });
    });

    const hourList = Array.from(hours.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([h, count]) => ({ label: `${h}h-${h + 1}h`, count }));
    const conceptList = Array.from(concepts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { trips, stores, buckets, hourList, conceptList };
  }, [planRows]);

  // Thực tế trong khoảng ngày đã chọn
  const actual = useMemo(() => {
    const buckets = { Sáng: 0, Trưa: 0, Tối: 0 };
    let trips = 0;
    actualRows.forEach((r) => {
      if (!r.ngay_xe_vao_ttpp) return;
      const d = new Date(r.ngay_xe_vao_ttpp);
      if (isNaN(d.getTime())) return;
      const key = dayKeyUTC(d);
      if (key < dateStart || key > dateEnd) return;
      trips += 1;
      if (r.chuyen_bucket) buckets[r.chuyen_bucket] += 1;
    });
    return { trips, buckets };
  }, [actualRows, dateStart, dateEnd]);

  const loading = loadingPlan || loadingActual;
  const hourTotal = plan.hourList.reduce((s, h) => s + h.count, 0);
  const conceptMax = Math.max(1, ...plan.conceptList.map((c) => c.count));

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold uppercase tracking-wide text-red-700">
            KẾ HOẠCH XE
          </h2>
          <p className="text-sm font-semibold text-lime-800">
            {formatRangeLabel(dateStart, dateEnd)}
          </p>
        </div>
        <div className="w-full sm:w-72">
          <DateRangeFilter
            label="Chọn ngày xuất hàng"
            startValue={dateStart}
            endValue={dateEnd}
            onChange={handleDateChange}
            onClear={handleDateClear}
            allowFuture
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* 5 card */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <PlanCard
              title="Tổng số chuyến xe"
              plan={plan.trips}
              done={actual.trips}
              bg="#fde7b8"
              titleColor="#7a3b1d"
              numColor="#7f1d1d"
            />
            <div
              className="flex flex-col items-center justify-center rounded-lg p-4 text-center"
              style={{ background: "#c6f0c8" }}
            >
              <div className="text-sm font-bold uppercase text-emerald-900">
                Tổng số điểm bán
              </div>
              <div className="text-5xl font-bold text-emerald-900">
                {plan.stores}
              </div>
            </div>
            <PlanCard
              title="Sáng"
              plan={plan.buckets.Sáng}
              done={actual.buckets.Sáng}
              bg="#fff8c5"
              titleColor="#334155"
              numColor="#1e293b"
            />
            <PlanCard
              title="Trưa"
              plan={plan.buckets.Trưa}
              done={actual.buckets.Trưa}
              bg="#fcc419"
              titleColor="#7f1d1d"
              numColor="#b91c1c"
            />
            <PlanCard
              title="Tối"
              plan={plan.buckets.Tối}
              done={actual.buckets.Tối}
              bg="#bfdbfe"
              titleColor="#1e3a8a"
              numColor="#1e3a8a"
            />
          </div>

          {actual.trips > plan.trips && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              Đã vượt kế hoạch: <b>{actual.trips}</b> chuyến thực tế so với{" "}
              <b>{plan.trips}</b> kế hoạch → phát sinh{" "}
              <b>+{actual.trips - plan.trips}</b> chuyến.
            </div>
          )}

          {/* Booking xe / Khung giờ */}
          <div className="rounded-lg bg-lime-50 p-4">
            <p className="mb-3 text-center text-xs font-bold text-red-900">
              Booking xe / Khung giờ
            </p>
            {plan.hourList.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Không có kế hoạch cho thời gian này
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-12 flex-1 overflow-hidden">
                  {plan.hourList.map((h, i) => {
                    const pct = (h.count / hourTotal) * 100;
                    return (
                      <div
                        key={h.label}
                        title={`${h.label}: ${h.count} chuyến`}
                        className="flex flex-col items-center justify-center overflow-hidden text-white"
                        style={{
                          width: `${pct}%`,
                          background: HOUR_COLORS[i % HOUR_COLORS.length],
                        }}
                      >
                        {pct >= 5 && (
                          <>
                            <span className="text-[10px] font-semibold leading-none">
                              {h.label}
                            </span>
                            <span className="text-sm font-bold leading-tight">
                              {h.count}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <span className="text-sm font-bold text-red-900 underline">
                  {hourTotal}
                </span>
              </div>
            )}
          </div>

          {/* Concept */}
          <div className="rounded-lg bg-pink-50 p-4">
            <div className="space-y-2">
              {plan.conceptList.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  Chưa có dữ liệu
                </p>
              )}
              {plan.conceptList.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm font-bold text-slate-700">
                    {c.name}
                  </span>
                  <div className="h-6 flex-1">
                    <div
                      className="h-full bg-green-600"
                      style={{ width: `${(c.count / conceptMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-base font-bold text-red-900">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LichXuatHang;
