/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
} from "lucide-react";
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

// Giá trị tab tổng (gộp cả 2 concept, không tính KPI)
const ALL_TAB = "ALL";

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
// Số chuyến / kiện trung bình (1 số lẻ, định dạng vi-VN)
const formatAvg = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })
    : "-";

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
        orders: 0, // số chuyến của nhân viên
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
      avgRate: tocDoThucTe, // Tốc độ thực tế — dùng xét Đạt/Không đạt KPI thực tế
      tocDoDuUoc,
      achieved: tocDoThucTe >= target,
      achievedDuUoc: tocDoDuUoc >= target,
      chuyenMoiNgay: soNgayLam > 0 ? g.orders / soNgayLam : 0, // TB chuyến / ngày
    };
  });

  // Đạt (dự ước) lên đầu, trong cùng nhóm thì tốc độ dự ước cao xếp trước
  rows.sort((a, b) => {
    if (a.achievedDuUoc !== b.achievedDuUoc) return a.achievedDuUoc ? -1 : 1;
    if (b.tocDoDuUoc !== a.tocDoDuUoc) return b.tocDoDuUoc - a.tocDoDuUoc;
    return b.avgRate - a.avgRate;
  });

  return { rows, skippedCount };
};

// Gộp CoopFood + CoopSmile theo nhân viên — KHÔNG tính KPI.
// Ngày công gộp theo union: làm cả CF và CS trong cùng 1 ngày chỉ tính 1 ngày,
// nên Giờ dự ước không bị nhân đôi.
const buildTotalRows = (kpiRows) => {
  const map = new Map();
  kpiRows.forEach((r) => {
    if (!map.has(r.employee)) {
      map.set(r.employee, {
        employee: r.employee,
        soKien: 0,
        hours: 0,
        orders: 0,
        days: new Set(),
        kienFood: 0,
        kienSmile: 0,
      });
    }
    const g = map.get(r.employee);
    g.soKien += r.soKien;
    g.hours += r.hours;
    g.orders += r.orders;
    r.days.forEach((d) => g.days.add(d));
    if (r.concept === "CoopFood") g.kienFood += r.soKien;
    if (r.concept === "CoopSmile") g.kienSmile += r.soKien;
  });

  return Array.from(map.values())
    .map((g) => {
      const soNgayLam = g.days.size;
      const gioDuUoc = soNgayLam * ESTIMATED_HOURS_PER_DAY;
      return {
        ...g,
        gioThucTe: g.hours,
        soNgayLam,
        gioDuUoc,
        tocDoThucTe: g.hours > 0 ? g.soKien / g.hours : 0,
        tocDoDuUoc: gioDuUoc > 0 ? g.soKien / gioDuUoc : 0,
        chuyenMoiNgay: soNgayLam > 0 ? g.orders / soNgayLam : 0,
      };
    })
    .sort((a, b) => b.soKien - a.soKien);
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

// Badge Đạt / Không đạt dùng chung cho cả trạng thái dự ước và thực tế
const StatusBadge = ({ achieved }) =>
  achieved ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <CheckCircle2 size={12} /> Đạt
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
      <XCircle size={12} /> Không đạt
    </span>
  );

// Bảng màu cho các con số (chỉ để phân biệt loại số liệu, không liên quan KPI)
const TONES = {
  indigo: { c: "#4F46E5", soft: "#EEF2FF", border: "#C7D2FE" },
  food: {
    c: CONCEPTS.CoopFood.accent,
    soft: CONCEPTS.CoopFood.accentSoft,
    border: CONCEPTS.CoopFood.accentBorder,
  },
  smile: {
    c: CONCEPTS.CoopSmile.accent,
    soft: CONCEPTS.CoopSmile.accentSoft,
    border: CONCEPTS.CoopSmile.accentBorder,
  },
  violet: { c: "#7C3AED", soft: "#F5F3FF", border: "#DDD6FE" },
  sky: { c: "#0284C7", soft: "#F0F9FF", border: "#BAE6FD" },
  teal: { c: "#0D9488", soft: "#F0FDFA", border: "#99F6E4" },
};

const Stat = ({ label, value, unit, tone = "indigo" }) => {
  const t = TONES[tone];
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ borderColor: t.border, backgroundColor: t.soft }}
    >
      <div className="text-xs font-medium" style={{ color: t.c, opacity: 0.8 }}>
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold" style={{ color: t.c }}>
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal opacity-60">{unit}</span>
        )}
      </div>
    </div>
  );
};

const TotalTable = ({ rows, employeeSearch }) => {
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

  const totalKien = filtered.reduce((s, r) => s + r.soKien, 0);
  const totalKienFood = filtered.reduce((s, r) => s + r.kienFood, 0);
  const totalKienSmile = filtered.reduce((s, r) => s + r.kienSmile, 0);
  const totalChuyen = filtered.reduce((s, r) => s + r.orders, 0);
  const totalGioThucTe = filtered.reduce((s, r) => s + r.gioThucTe, 0);
  const totalGioDuUoc = filtered.reduce((s, r) => s + r.gioDuUoc, 0);
  const totalNgayCong = filtered.reduce((s, r) => s + r.soNgayLam, 0);

  const rateThucTe = totalGioThucTe > 0 ? totalKien / totalGioThucTe : 0;
  const rateDuUoc = totalGioDuUoc > 0 ? totalKien / totalGioDuUoc : 0;
  const avgChuyen = totalNgayCong > 0 ? totalChuyen / totalNgayCong : 0;
  const avgKien = totalNgayCong > 0 ? totalKien / totalNgayCong : 0;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <div className="flex -space-x-2">
          {Object.entries(CONCEPTS).map(([k, c]) => (
            <img
              key={k}
              src={c.logo}
              alt={k}
              className="h-9 w-9 rounded-lg border border-white bg-white object-contain p-1 shadow-sm"
            />
          ))}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">
            Tổng CoopFood + CoopSmile
          </div>
          <div className="text-xs text-slate-500">
            Số liệu gộp, không tính KPI · Giờ dự ước {ESTIMATED_HOURS_PER_DAY}
            h/ngày
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
          <Users size={14} /> Bình quân 1 người / ngày
          <span className="font-normal text-blue-400">
            ({filtered.length} người)
          </span>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">
            Số chuyến / ngày
          </div>
          <div className="text-xl font-semibold text-blue-700">
            {formatAvg(avgChuyen)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              chuyến
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">
            Số kiện / ngày
          </div>
          <div className="text-xl font-semibold text-blue-700">
            {formatAvg(avgKien)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              kiện
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Tổng kiện" value={formatAvg(totalKien)} tone="indigo" />
        <Stat
          label="Kiện CoopFood"
          value={formatAvg(totalKienFood)}
          tone="food"
        />
        <Stat
          label="Kiện CoopSmile"
          value={formatAvg(totalKienSmile)}
          tone="smile"
        />
        <Stat
          label="Tổng chuyến"
          value={formatAvg(totalChuyen)}
          tone="violet"
        />
        <Stat
          label="Tốc độ dự ước"
          value={formatRate(rateDuUoc)}
          unit="kiện/h"
          tone="sky"
        />
        <Stat
          label="Tốc độ thực tế"
          value={formatRate(rateThucTe)}
          unit="kiện/h"
          tone="teal"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-4 py-2.5 font-medium">Nhân viên</th>
                <th className="px-4 py-2.5 text-right font-medium">Kiện CF</th>
                <th className="px-4 py-2.5 text-right font-medium">Kiện CS</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Tổng kiện
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Số chuyến
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  TB chuyến/ngày
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
                <th className="px-4 py-2.5 text-right font-medium">
                  Tốc độ thực tế
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.food.c }}
                    >
                      {r.kienFood}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.smile.c }}
                    >
                      {r.kienSmile}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-semibold tabular-nums"
                      style={{ color: TONES.indigo.c }}
                    >
                      {r.soKien}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.violet.c }}
                    >
                      {r.orders}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.violet.c, opacity: 0.75 }}
                    >
                      {formatAvg(r.chuyenMoiNgay)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.sky.c, opacity: 0.8 }}
                    >
                      {formatHours(r.gioDuUoc)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.teal.c, opacity: 0.8 }}
                    >
                      {formatHours(r.gioThucTe)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-medium tabular-nums"
                      style={{ color: TONES.sky.c }}
                    >
                      {formatRate(r.tocDoDuUoc)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-semibold tabular-nums"
                      style={{ color: TONES.teal.c }}
                    >
                      {formatRate(r.tocDoThucTe)}
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
  const totalChuyen = filtered.reduce((s, r) => s + r.orders, 0);
  const totalGioThucTe = filtered.reduce((s, r) => s + r.gioThucTe, 0);
  const totalGioDuUoc = filtered.reduce((s, r) => s + r.gioDuUoc, 0);
  const overallRateThucTe = totalGioThucTe > 0 ? totalKien / totalGioThucTe : 0;
  const overallRateDuUoc = totalGioDuUoc > 0 ? totalKien / totalGioDuUoc : 0;

  // Bình quân 1 người / ngày = tổng chuyến (kiện) ÷ tổng số ngày công của mọi người
  const totalNgayCong = filtered.reduce((s, r) => s + r.soNgayLam, 0);
  const soNguoi = filtered.length;
  const avgChuyenPerPersonDay =
    totalNgayCong > 0 ? totalChuyen / totalNgayCong : 0;
  const avgKienPerPersonDay = totalNgayCong > 0 ? totalKien / totalNgayCong : 0;
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

      <div className="mb-3 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
          <Users size={14} /> Bình quân 1 người / ngày
          <span className="font-normal text-blue-400">({soNguoi} người)</span>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">
            Số chuyến / ngày
          </div>
          <div className="text-xl font-semibold text-blue-700">
            {formatAvg(avgChuyenPerPersonDay)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              chuyến
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">
            Số kiện / ngày
          </div>
          <div className="text-xl font-semibold text-blue-700">
            {formatAvg(avgKienPerPersonDay)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              kiện
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Tốc độ dự ước"
          value={formatRate(overallRateDuUoc)}
          unit="kiện/h"
          tone="sky"
        />
        <Stat
          label="Tốc độ thực tế"
          value={formatRate(overallRateThucTe)}
          unit="kiện/h"
          tone="teal"
        />
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
                  Số chuyến
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  TB chuyến/ngày
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
                <th className="px-4 py-2.5 font-medium">Trạng thái dự ước</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Tốc độ thực tế
                </th>
                <th className="px-4 py-2.5 font-medium">
                  So với KPI (Thực tế)
                </th>
                <th className="px-4 py-2.5 font-medium">Trạng thái thực tế</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
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
                    <td
                      className="px-4 py-2.5 text-right font-semibold tabular-nums"
                      style={{ color: cfg.accent }}
                    >
                      {r.soKien}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.violet.c }}
                    >
                      {r.orders}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.violet.c, opacity: 0.75 }}
                    >
                      {formatAvg(r.chuyenMoiNgay)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.sky.c, opacity: 0.8 }}
                    >
                      {formatHours(r.gioDuUoc)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: TONES.teal.c, opacity: 0.8 }}
                    >
                      {formatHours(r.gioThucTe)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-medium tabular-nums"
                      style={{
                        color: r.achievedDuUoc
                          ? ACHIEVED_COLOR
                          : NOT_ACHIEVED_COLOR,
                      }}
                    >
                      {formatRate(r.tocDoDuUoc)}
                    </td>
                    <td className="px-4 py-2.5">
                      <RateBar rate={r.tocDoDuUoc} target={r.target} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge achieved={r.achievedDuUoc} />
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-semibold tabular-nums"
                      style={{
                        color: r.achieved ? ACHIEVED_COLOR : NOT_ACHIEVED_COLOR,
                      }}
                    >
                      {formatRate(r.avgRate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <RateBar rate={r.avgRate} target={r.target} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge achieved={r.achieved} />
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

  // Mặc định là tab Tổng (gộp 2 concept, không KPI)
  const [activeConcept, setActiveConcept] = useState(ALL_TAB);
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

  const totalRows = useMemo(() => buildTotalRows(kpiRows), [kpiRows]);

  const isAll = activeConcept === ALL_TAB;

  return (
    <div className="p-4 md:p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">
          KPI Nhân viên xuất hàng
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Tốc độ thực tế = Tổng số kiện ÷ Giờ thực tế (Kết thúc lên hàng − Bắt
          đầu lên hàng). Tốc độ dự ước = Tổng số kiện ÷ Giờ dự ước (số ngày có
          làm việc × {ESTIMATED_HOURS_PER_DAY}h). Trạng thái dự ước / thực tế
          xét theo tốc độ tương ứng so với mục tiêu. TB chuyến/ngày = Số chuyến
          ÷ số ngày có làm việc. Chỉ tính KPI cho hai concept CoopFood và
          CoopSmile. Tab Tổng gộp cả hai concept, không tính KPI; chọn CoopFood
          hoặc CoopSmile để xem KPI.
        </p>
      </div>

      <div className="mb-5 inline-flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
        {/* Tab Tổng */}
        <button
          type="button"
          onClick={() => setActiveConcept(ALL_TAB)}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all"
          style={
            isAll
              ? {
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.10)",
                  border: "1px solid #cbd5e1",
                }
              : { border: "1px solid transparent" }
          }
        >
          <span style={{ color: isAll ? "#1e293b" : "#64748b" }}>Tổng</span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
            style={
              isAll
                ? { backgroundColor: "#e2e8f0", color: "#1e293b" }
                : { backgroundColor: "#e2e8f0", color: "#94a3b8" }
            }
          >
            {totalRows.length}
          </span>
        </button>

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

          {isAll ? (
            <TotalTable rows={totalRows} employeeSearch={employeeSearch} />
          ) : (
            <ConceptKpiTable
              concept={activeConcept}
              rows={rowsByConcept[activeConcept] || []}
              employeeSearch={employeeSearch}
            />
          )}
        </>
      )}
    </div>
  );
};

export default KpiNhanVien;
