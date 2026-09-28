/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { xuatHangService } from "@/services/xuathang/xuathang.service";
import DateRangeFilter from "@/modules/nhaphang/dash/date";

// KPI mục tiêu theo Concept (đơn vị: kiện / giờ) — CHỈ 2 concept này được
// tính KPI, mọi concept khác bị loại khỏi thống kê.
const CONCEPTS = {
  CoopFood: {
    target: 114,
    logo: "/img/coopfood.png",
    accent: "#C2703D",
    accentSoft: "#FBF1EA",
    accentBorder: "#EBD3C0",
  },
  CoopSmile: {
    target: 50,
    logo: "/img/coopsmile.png",
    accent: "#2E9E6D",
    accentSoft: "#EAF7F0",
    accentBorder: "#C3E9D6",
  },
};

// Giờ dự ước bình quân MỖI NGÀY làm việc — 1 nhân viên làm N ngày (có phát
// sinh đơn) thì Giờ dự ước = N x giá trị này, dùng để so sánh với giờ
// thực tế nhân viên làm được.
const ESTIMATED_HOURS_PER_DAY = 6.5;

// Màu cố định khi đạt KPI — dùng chung cho mọi concept, không đổi theo accent
const ACHIEVED_COLOR = "#22c55e";
const NOT_ACHIEVED_COLOR = "#DC5B5B";

const FETCH_ALL_LIMIT = 100000;

const toDateOnlyUTC = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
};

const formatHours = (hours) =>
  Number.isFinite(hours) ? `${hours.toFixed(1)}h` : "-";
const formatRate = (rate) => (Number.isFinite(rate) ? rate.toFixed(1) : "-");

const parseEmployees = (str) =>
  String(str || "")
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);

const roundHalfUp = (n) => Math.round(n);

const buildKpiRows = (rawRows) => {
  const map = new Map();
  let skippedCount = 0;

  const addToGroup = (employee, concept, soKien, hours, target, dayKey) => {
    const key = `${employee}||${concept}`;
    if (!map.has(key)) {
      map.set(key, {
        employee,
        concept,
        soKien: 0,
        hours: 0, // giờ THỰC TẾ (Kết thúc - Bắt đầu), cộng dồn theo từng đơn
        orders: 0,
        ordersAchieved: 0,
        days: new Set(), // các ngày (YYYY-MM-DD) có phát sinh đơn — dùng tính Giờ dự ước
      });
    }
    const g = map.get(key);
    const rate = soKien / hours;
    g.soKien += soKien;
    g.hours += hours;
    g.orders += 1;
    if (dayKey) g.days.add(dayKey);
    if (rate >= target) g.ordersAchieved += 1;
  };

  rawRows.forEach((row) => {
    const concept = (row.concept || "").trim();
    const cfg = CONCEPTS[concept];
    if (!cfg) {
      skippedCount += 1;
      return;
    }

    const start = row.ngay_bat_dau_len_hang
      ? new Date(row.ngay_bat_dau_len_hang)
      : null;
    const end = row.ngay_ket_thuc_len_hang
      ? new Date(row.ngay_ket_thuc_len_hang)
      : null;
    const soKienGoc = Number(row.so_kien) || 0;

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      skippedCount += 1;
      return;
    }

    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours <= 0 || soKienGoc <= 0) {
      skippedCount += 1;
      return;
    }

    const phuEmployees = parseEmployees(row.nhan_vien_xuat_phu);
    const hasPhu = phuEmployees.length > 0;

    const hangKien = hasPhu ? roundHalfUp(soKienGoc * 0.7) : soKienGoc;
    const phuKien = hasPhu ? roundHalfUp(soKienGoc * 0.3) : 0;

    const hangEmployees = parseEmployees(row.nhan_vien_xuat_hang);
    const hangList = hangEmployees.length > 0 ? hangEmployees : ["Chưa gán"];
    const dayKey = toDateOnlyUTC(start);

    hangList.forEach((emp) =>
      addToGroup(emp, concept, hangKien, hours, cfg.target, dayKey),
    );
    if (hasPhu) {
      phuEmployees.forEach((emp) =>
        addToGroup(emp, concept, phuKien, hours, cfg.target, dayKey),
      );
    }
  });

  const rows = Array.from(map.values()).map((g) => {
    const target = CONCEPTS[g.concept].target;
    const gioThucTe = g.hours;
    const soNgayLam = g.days.size;
    const gioDuUoc = soNgayLam * ESTIMATED_HOURS_PER_DAY;
    const tocDoThucTe = gioThucTe > 0 ? g.soKien / gioThucTe : 0;
    const tocDoDuUoc = gioDuUoc > 0 ? g.soKien / gioDuUoc : 0;
    return {
      ...g,
      target,
      gioThucTe,
      soNgayLam,
      gioDuUoc,
      avgRate: tocDoThucTe, // Tốc độ thực tế — vẫn dùng để xét Đạt/Không đạt KPI
      tocDoDuUoc,
      achieved: tocDoThucTe >= target,
    };
  });

  rows.sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? 1 : -1;
    return b.avgRate - a.avgRate;
  });

  return { rows, skippedCount };
};

const RateBar = ({ rate, target }) => {
  const pct = Math.min(100, Math.round((rate / target) * 100));
  const achieved = rate >= target;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: achieved ? ACHIEVED_COLOR : NOT_ACHIEVED_COLOR,
          }}
        />
      </div>
      <span className="tabular-nums text-xs text-slate-400">{pct}%</span>
    </div>
  );
};

const ConceptKpiTable = ({ concept, rows, employeeSearch }) => {
  const cfg = CONCEPTS[concept];

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !employeeSearch ||
          r.employee
            .toLowerCase()
            .includes(employeeSearch.trim().toLowerCase()),
      ),
    [rows, employeeSearch],
  );

  const achieved = filtered.filter((r) => r.achieved).length;
  const notAchieved = filtered.length - achieved;
  const totalKien = filtered.reduce((s, r) => s + r.soKien, 0);
  const totalGioThucTe = filtered.reduce((s, r) => s + r.gioThucTe, 0);
  const totalGioDuUoc = filtered.reduce((s, r) => s + r.gioDuUoc, 0);
  const overallRateThucTe = totalGioThucTe > 0 ? totalKien / totalGioThucTe : 0;
  const overallRateDuUoc = totalGioDuUoc > 0 ? totalKien / totalGioDuUoc : 0;

  return (
    <div>
      <div
        className="mb-4 flex items-center gap-3 rounded-xl border p-3.5"
        style={{
          borderColor: cfg.accentBorder,
          backgroundColor: cfg.accentSoft,
        }}
      >
        <img
          src={cfg.logo}
          alt={concept}
          className="h-9 w-9 rounded-lg bg-white object-contain p-1 shadow-sm"
        />
        <div>
          <div className="text-sm font-semibold text-slate-800">{concept}</div>
          <div className="text-xs text-slate-500">
            KPI mục tiêu{" "}
            <span className="font-medium" style={{ color: cfg.accent }}>
              {cfg.target} kiện/h
            </span>
            {" · "}Giờ dự ước {ESTIMATED_HOURS_PER_DAY}h/ngày
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-3.5">
          <div className="text-xs font-medium text-slate-500">
            Tốc độ dự ước
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-800">
            {formatRate(overallRateDuUoc)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              kiện/h
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3.5">
          <div className="text-xs font-medium text-slate-500">
            Tốc độ thực tế
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-800">
            {formatRate(overallRateThucTe)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              kiện/h
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={13} /> Đạt KPI
          </div>
          <div className="mt-1 text-xl font-semibold text-emerald-700">
            {achieved}
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5">
          <div className="flex items-center gap-1 text-xs font-medium text-red-700">
            <XCircle size={13} /> Không đạt
          </div>
          <div className="mt-1 text-xl font-semibold text-red-700">
            {notAchieved}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-4 py-2.5 font-medium">Nhân viên</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Tổng kiện
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Số ngày làm
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Giờ dự ước
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Giờ thực tế
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Tốc độ dự ước
                </th>
                <th className="px-4 py-2.5 font-medium">So với KPI (Dự ước)</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Tốc độ thực tế
                </th>
                <th className="px-4 py-2.5 font-medium">
                  So với KPI (Thực tế)
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Đơn đạt</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.employee}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {r.employee}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {r.soKien}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                      {r.soNgayLam}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                      {formatHours(r.gioDuUoc)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {formatHours(r.gioThucTe)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                      {formatRate(r.tocDoDuUoc)}
                    </td>
                    <td className="px-4 py-2.5">
                      <RateBar rate={r.tocDoDuUoc} target={r.target} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                      {formatRate(r.avgRate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <RateBar rate={r.avgRate} target={r.target} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                      {r.ordersAchieved}/{r.orders}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.achieved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 size={12} /> Đạt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          <XCircle size={12} /> Không đạt
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KpiNhanVien = () => {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [activeConcept, setActiveConcept] = useState("CoopFood");
  // Khoảng ngày lọc theo "Ngày bắt đầu lên hàng" — chuỗi "YYYY-MM-DD",
  // rỗng nghĩa là chưa lọc. Điều khiển bởi DateRangeFilter dùng chung.
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await xuatHangService.getDanhSach({
        page: 1,
        limit: FETCH_ALL_LIMIT,
      });
      setRawRows(res?.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu KPI:", err);
      setErrorMsg("Không tải được dữ liệu, thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredRawRows = useMemo(() => {
    return rawRows.filter((row) => {
      if (tuNgay || denNgay) {
        const d = row.ngay_bat_dau_len_hang
          ? toDateOnlyUTC(row.ngay_bat_dau_len_hang)
          : null;
        if (!d) return false;
        if (tuNgay && d < tuNgay) return false;
        if (denNgay && d > denNgay) return false;
      }
      return true;
    });
  }, [rawRows, tuNgay, denNgay]);

  const { rows: kpiRows, skippedCount } = useMemo(
    () => buildKpiRows(filteredRawRows),
    [filteredRawRows],
  );

  const rowsByConcept = useMemo(() => {
    const map = { CoopFood: [], CoopSmile: [] };
    kpiRows.forEach((r) => map[r.concept]?.push(r));
    return map;
  }, [kpiRows]);

  return (
    <div className="p-4 md:p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">
          KPI Nhân viên xuất hàng
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Tốc độ thực tế = Tổng số kiện ÷ Giờ thực tế (Kết thúc lên hàng − Bắt
          đầu lên hàng). Tốc độ dự ước = Tổng số kiện ÷ Giờ dự ước (số ngày có
          làm việc × {ESTIMATED_HOURS_PER_DAY}h). Đạt/Không đạt KPI xét theo Tốc
          độ thực tế so với mục tiêu. Chỉ tính KPI cho hai concept CoopFood và
          CoopSmile.
        </p>
      </div>

      <div className="mb-5 inline-flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
        {Object.entries(CONCEPTS).map(([key, cfg]) => {
          const isActive = activeConcept === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveConcept(key)}
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all"
              style={
                isActive
                  ? {
                      backgroundColor: "#fff",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.10)",
                      border: `1px solid ${cfg.accentBorder}`,
                    }
                  : { border: "1px solid transparent" }
              }
            >
              <img
                src={cfg.logo}
                alt={key}
                className="h-6 w-6 rounded-md object-contain"
                style={{ opacity: isActive ? 1 : 0.55 }}
              />
              <span style={{ color: isActive ? cfg.accent : "#64748b" }}>
                {key}
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={
                  isActive
                    ? { backgroundColor: cfg.accentSoft, color: cfg.accent }
                    : { backgroundColor: "#e2e8f0", color: "#94a3b8" }
                }
              >
                {rowsByConcept[key]?.length ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="w-64">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Ngày bắt đầu lên hàng
          </label>
          <DateRangeFilter
            label="Chọn khoảng ngày..."
            startValue={tuNgay}
            endValue={denNgay}
            onChange={(start, end) => {
              setTuNgay(start);
              setDenNgay(end);
            }}
            onClear={() => {
              setTuNgay("");
              setDenNgay("");
            }}
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Tìm nhân viên
          </label>
          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Nhập tên hoặc mã..."
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <XCircle size={16} />
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          {skippedCount > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              <AlertTriangle size={15} className="shrink-0" />
              {skippedCount} đơn không được tính (concept khác
              CoopFood/CoopSmile, hoặc thiếu ngày bắt đầu/kết thúc lên hàng,
              hoặc số liệu không hợp lệ).
            </div>
          )}

          <ConceptKpiTable
            concept={activeConcept}
            rows={rowsByConcept[activeConcept] || []}
            employeeSearch={employeeSearch}
          />
        </>
      )}
    </div>
  );
};

export default KpiNhanVien;
