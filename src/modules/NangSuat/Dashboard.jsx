/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { nangsuatService } from "@/services/nangsuat.service";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const mergeDateTime = (dateVal, timeStr) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d)) return null;
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  }
  return d;
};

const calcPhieuLabel = (dateAssigned, timeAssigned, dateCompleted, timeCompleted) => {
  const assigned = mergeDateTime(dateAssigned, timeAssigned);
  if (!assigned) return "Đang Pick";
  const completed = mergeDateTime(dateCompleted, timeCompleted);
  const hasCompleted = !!completed;
  const diffHours = ((hasCompleted ? completed : new Date()) - assigned) / 3600000;
  if (!hasCompleted) return diffHours <= 24 ? "Đang Pick" : "Pick Trễ Hạn";
  return diffHours <= 24 ? "Đúng Hạn" : "Trễ Hạn";
};

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
const AnimatedNumber = ({ value, duration = 1200 }) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const startVal = 0;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
};

// ─── MINI SPARKLINE ───────────────────────────────────────────────────────────
const Sparkline = ({ data, color = "#22d3ee", height = 40 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${h} ` + pts + ` ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Last point dot */}
      {(() => {
        const last = data[data.length - 1];
        const x = w;
        const y = h - ((last - min) / range) * h;
        return <circle cx={x} cy={y} r="3" fill={color} />;
      })()}
    </svg>
  );
};


// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent, icon, sparkData, delay = 0 }) => (
  <div
    className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3"
    style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
      animation: `fadeSlideUp 0.6s ease ${delay}ms both`,
    }}
  >
    {/* Glow */}
    <div style={{
      position: "absolute", top: -30, right: -30,
      width: 100, height: 100, borderRadius: "50%",
      background: accent, opacity: 0.08, filter: "blur(30px)",
      pointerEvents: "none",
    }} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.7)", letterSpacing: "0.12em" }}>
          {label}
        </p>
        <p className="mt-1 text-3xl font-black" style={{ color: "#f1f5f9", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          <AnimatedNumber value={typeof value === "number" ? value : 0} />
        </p>
        {sub && <p className="mt-0.5 text-xs" style={{ color: accent }}>{sub}</p>}
      </div>
      <div className="rounded-xl p-2.5" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
        {icon}
      </div>
    </div>
    {sparkData && (
      <div style={{ opacity: 0.8 }}>
        <Sparkline data={sparkData} color={accent} height={36} />
      </div>
    )}
  </div>
);

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("overview");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await nangsuatService.getAll({ limit: 99999 });
        setData(res?.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Filter by date range ─────────────────────────────────────────────────────
  const filteredData = (() => {
    if (!dateRange.from && !dateRange.to) return data;
    const from = dateRange.from ? new Date(dateRange.from) : null;
    const to   = dateRange.to   ? new Date(dateRange.to + "T23:59:59") : null;
    return data.filter(r => {
      if (!r.date_assigned) return false;
      const d = new Date(r.date_assigned);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  })();

  // ── Compute stats ────────────────────────────────────────────────────────────
  const stats = (() => {
    if (!filteredData.length && !data.length) return null;
    const src = filteredData.length ? filteredData : (dateRange.from || dateRange.to ? [] : data);
    if (!src.length) return { total:0, processed:0, open:0, totalEaches:0, totalLines:0, totalReaches:0, phieuCounts:{"Đúng Hạn":0,"Trễ Hạn":0,"Pick Trễ Hạn":0,"Đang Pick":0}, topNV:[], topZones:[], avgHours:0, trendData:Array(14).fill(0) };

    const total       = src.length;
    const processed   = src.filter(r => r.status === "Processed").length;
    const open        = src.filter(r => r.status === "Open").length;
    const totalEaches = src.reduce((s, r) => s + (r.total_eaches || 0), 0);
    const totalLines  = src.reduce((s, r) => s + (r.total_lines || 0), 0);
    const totalReaches= src.reduce((s, r) => s + (r.total_reaches || 0), 0);

    // Status phiếu breakdown
    const phieuCounts = { "Đúng Hạn": 0, "Trễ Hạn": 0, "Pick Trễ Hạn": 0, "Đang Pick": 0 };
    src.forEach(r => {
      const l = calcPhieuLabel(r.date_assigned, r.time_assigned, r.date_completed, r.time_completed);
      phieuCounts[l] = (phieuCounts[l] || 0) + 1;
    });

    // Top nhân viên
    const nvMap = {};
    src.forEach(r => {
      if (!r.assigned_to) return;
      if (!nvMap[r.assigned_to]) nvMap[r.assigned_to] = { phieu: 0, eaches: 0, lines: 0 };
      nvMap[r.assigned_to].phieu++;
      nvMap[r.assigned_to].eaches += r.total_eaches || 0;
      nvMap[r.assigned_to].lines  += r.total_lines  || 0;
    });
    const topNV = Object.entries(nvMap)
      .sort((a, b) => b[1].eaches - a[1].eaches)
      .slice(0, 8);

    // From zone breakdown
    const zoneMap = {};
    src.forEach(r => {
      if (!r.from_zone) return;
      zoneMap[r.from_zone] = (zoneMap[r.from_zone] || 0) + 1;
    });
    const topZones = Object.entries(zoneMap).sort((a,b) => b[1]-a[1]).slice(0, 6);

    // Giờ HT avg
    let totalHours = 0, countHours = 0;
    src.forEach(r => {
      const a = mergeDateTime(r.date_assigned, r.time_assigned);
      const c = mergeDateTime(r.date_completed, r.time_completed);
      if (a && c) {
        totalHours += (c - a) / 3600000;
        countHours++;
      }
    });
    const avgHours = countHours ? (totalHours / countHours).toFixed(1) : 0;

    // Daily trend (last 14 days)
    const today = new Date();
    const dailyMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dailyMap[d.toDateString()] = 0;
    }
    src.forEach(r => {
      if (!r.date_assigned) return;
      const key = new Date(r.date_assigned).toDateString();
      if (key in dailyMap) dailyMap[key]++;
    });
    const trendData = Object.values(dailyMap);

    return { total, processed, open, totalEaches, totalLines, totalReaches,
             phieuCounts, topNV, topZones, avgHours, trendData };
  })();

  const ACCENT = { cyan: "#22d3ee", green: "#10b981", amber: "#f59e0b", red: "#ef4444", violet: "#8b5cf6", pink: "#ec4899" };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#020817" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-cyan-800 border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
        </div>
        <p className="text-sm font-mono text-cyan-500 tracking-widest animate-pulse">LOADING DATA...</p>
      </div>
    </div>
  );



  return (
    <div className="min-h-screen" style={{ background: "#020817", fontFamily: "'DM Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Lexend:wght@300;400;600;700;800&display=swap');
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.0); }
          50%       { box-shadow: 0 0 20px 4px rgba(34,211,238,0.15); }
        }
        .glow-cyan { animation: pulseGlow 3s ease infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(2,8,23,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22d3ee, #3b82f6)", boxShadow: "0 0 16px rgba(34,211,238,0.4)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontFamily: "'Lexend', sans-serif", fontWeight: 800, fontSize: "1rem", color: "#f1f5f9", letterSpacing: "-0.01em" }}>
                NĂNG SUẤT KHO
              </h1>
              <p style={{ fontSize: "0.65rem", color: "rgba(148,163,184,0.5)", letterSpacing: "0.1em" }}>
                WAREHOUSE PERFORMANCE CENTER
              </p>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.7)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulseGlow 2s infinite" }} />
            <span style={{ fontSize: "0.65rem", color: "#10b981", letterSpacing: "0.1em", fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

        {/* Tab nav */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-0">
          {[["overview", "Overview"], ["performance", "Performance"], ["workers", "Nhân viên"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-4 py-2.5 text-xs font-semibold transition-all relative"
              style={{
                fontFamily: "'Lexend', sans-serif",
                color: tab === key ? "#22d3ee" : "rgba(148,163,184,0.5)",
                letterSpacing: "0.05em",
              }}
            >
              {label}
              {tab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div style={{ background: "rgba(15,23,42,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.5)", letterSpacing: "0.08em", fontFamily: "'Lexend',sans-serif" }}>
            DATE RANGE
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
              className="text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: dateRange.from ? "#22d3ee" : "rgba(148,163,184,0.4)", colorScheme: "dark" }}
            />
            <span style={{ color: "rgba(100,116,139,0.5)", fontSize: "0.7rem" }}>→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
              className="text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: dateRange.to ? "#22d3ee" : "rgba(148,163,184,0.4)", colorScheme: "dark" }}
            />
          </div>
          {/* Quick presets */}
          {[
            { label: "7 ngày", days: 7 },
            { label: "30 ngày", days: 30 },
            { label: "Tháng này", days: 0 },
          ].map(({ label, days }) => (
            <button key={label} onClick={() => {
              const to = new Date();
              let from;
              if (days === 0) {
                from = new Date(to.getFullYear(), to.getMonth(), 1);
              } else {
                from = new Date(to);
                from.setDate(from.getDate() - days);
              }
              setDateRange({
                from: from.toISOString().slice(0, 10),
                to:   to.toISOString().slice(0, 10),
              });
            }}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", color: "#22d3ee" }}
            >
              {label}
            </button>
          ))}
          {(dateRange.from || dateRange.to) && (
            <button onClick={() => setDateRange({ from: "", to: "" })}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
            >
              Xóa ✕
            </button>
          )}
          {(dateRange.from || dateRange.to) && stats && (
            <span className="text-xs ml-auto" style={{ color: "rgba(148,163,184,0.4)" }}>
              Hiển thị <span style={{ color: "#22d3ee", fontWeight: 700 }}>{stats.total}</span> / {data.length} phiếu
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <StatCard label="Tổng phiếu" value={stats.total} sub={`${stats.processed} đã xử lý`} accent={ACCENT.cyan}
                sparkData={stats.trendData} delay={0}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#22d3ee" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
              />
              <StatCard label="Total Eaches" value={Math.round(stats.totalEaches)} sub="đơn vị đã xử lý" accent={ACCENT.green}
                sparkData={stats.trendData.map(v => v * 180)} delay={80}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4v10M12 11V7"/></svg>}
              />
              <StatCard label="Avg Giờ HT" value={Number(stats.avgHours)} sub="giờ/phiếu trung bình" accent={ACCENT.violet}
                delay={160}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth={2}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>}
              />
              <StatCard label="Open Docs" value={stats.open} sub={`${((stats.open/stats.total)*100).toFixed(1)}% chưa xử lý`} accent={ACCENT.amber}
                delay={240}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
              />
            </div>

            {/* Middle row */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr" }}>
              {/* Status Phiếu — 4 big cards */}
              <div className="flex flex-col gap-2.5" style={{ animation: "fadeSlideUp 0.6s ease 320ms both" }}>
                <p className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(148,163,184,0.6)", letterSpacing: "0.12em", fontFamily: "'Lexend',sans-serif" }}>
                  Status Phiếu
                </p>
                {[
                  { label: "Đúng Hạn",    count: stats.phieuCounts["Đúng Hạn"],    color: "#10b981", glyph: "✓" },
                  { label: "Đang Pick",   count: stats.phieuCounts["Đang Pick"],   color: "#22d3ee", glyph: "◎" },
                  { label: "Pick Trễ Hạn",count: stats.phieuCounts["Pick Trễ Hạn"],color: "#ef4444", glyph: "!" },
                  { label: "Trễ Hạn",    count: stats.phieuCounts["Trễ Hạn"],    color: "#f59e0b", glyph: "⚠" },
                ].map(({ label, count, color, glyph }) => {
                  const pct = stats.total ? ((count / stats.total) * 100) : 0;
                  return (
                    <div key={label} className="relative rounded-xl overflow-hidden flex items-center gap-3 px-4 py-3"
                      style={{ background: `${color}0d`, border: `1px solid ${color}30` }}>
                      {/* watermark */}
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 font-black select-none pointer-events-none"
                        style={{ fontSize: "3rem", color, opacity: 0.06, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                        {count}
                      </span>
                      {/* glyph badge */}
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-base shrink-0"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
                        {glyph}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: "rgba(148,163,184,0.55)", letterSpacing: "0.04em" }}>{label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="font-black" style={{ fontSize: "1.75rem", color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                            {count.toLocaleString()}
                          </span>
                          <span className="text-sm font-bold" style={{ color: `${color}99` }}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {/* bottom progress bar */}
                      <div className="absolute bottom-0 left-0 h-0.5" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}44, ${color})` }} />
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Bottom stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Lines",   value: stats.totalLines,   accent: "#ec4899", unit: "lines" },
                { label: "Total Reaches", value: stats.totalReaches, accent: "#f59e0b", unit: "reaches" },
                { label: "Processed",     value: stats.processed,    accent: "#10b981", unit: `${stats.total ? ((stats.processed/stats.total)*100).toFixed(1) : 0}% done` },
              ].map(({ label, value, accent, unit }, i) => (
                <div key={label} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.06)", animation: `fadeSlideUp 0.6s ease ${500+i*80}ms both` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                    <span className="text-lg font-black" style={{ color: accent }}>{["L","R","✓"][i]}</span>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)", letterSpacing: "0.08em" }}>{label}</p>
                    <p className="text-2xl font-black" style={{ color: "#f1f5f9", lineHeight: 1.2 }}>
                      <AnimatedNumber value={value} />
                    </p>
                    <p className="text-xs" style={{ color: accent }}>{unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PERFORMANCE TAB ── */}
        {tab === "performance" && stats && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "rgba(148,163,184,0.6)", letterSpacing: "0.12em", fontFamily: "'Lexend',sans-serif" }}>
                Trend 14 ngày · Số phiếu rút
              </p>
              <div className="flex items-end gap-1 h-24">
                {stats.trendData.map((v, i) => {
                  const max = Math.max(...stats.trendData) || 1;
                  const pct = (v / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full rounded-t-sm transition-all duration-500 relative" style={{
                        height: `${Math.max(pct, 4)}%`,
                        background: i === stats.trendData.length - 1
                          ? "linear-gradient(180deg,#22d3ee,#0e7490)"
                          : "linear-gradient(180deg,rgba(34,211,238,0.4),rgba(34,211,238,0.1))",
                        border: i === stats.trendData.length - 1 ? "1px solid #22d3ee" : "1px solid rgba(34,211,238,0.2)",
                      }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: "#22d3ee" }}>
                          {v}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>-13 ngày</span>
                <span className="text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>Hôm nay</span>
              </div>
            </div>

            {/* Efficiency metrics */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "On-Time Rate",
                  value: stats.total ? ((stats.phieuCounts["Đúng Hạn"] / (stats.phieuCounts["Đúng Hạn"] + stats.phieuCounts["Trễ Hạn"]) || 0) * 100).toFixed(1) : 0,
                  unit: "%",
                  accent: "#10b981",
                  desc: "Đúng Hạn / (Đúng + Trễ)",
                },
                {
                  label: "Pick In Progress",
                  value: stats.phieuCounts["Đang Pick"],
                  unit: " phiếu",
                  accent: "#22d3ee",
                  desc: "Chưa hoàn thành, trong hạn",
                },
                {
                  label: "Overdue Picks",
                  value: stats.phieuCounts["Pick Trễ Hạn"],
                  unit: " phiếu",
                  accent: "#ef4444",
                  desc: "Quá 24h chưa xử lý",
                },
                {
                  label: "Late Processed",
                  value: stats.phieuCounts["Trễ Hạn"],
                  unit: " phiếu",
                  accent: "#f59e0b",
                  desc: "Xử lý xong nhưng trễ",
                },
              ].map(({ label, value, unit, accent, desc }, i) => (
                <div key={label} className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: `1px solid ${accent}20`, animation: `fadeSlideUp 0.5s ease ${i*80}ms both` }}>
                  <p className="text-xs mb-1" style={{ color: "rgba(148,163,184,0.5)" }}>{label}</p>
                  <p className="text-4xl font-black" style={{ color: accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                    {value}<span className="text-lg">{unit}</span>
                  </p>
                  <p className="text-xs mt-2" style={{ color: "rgba(100,116,139,0.6)" }}>{desc}</p>
                  {/* Mini bar */}
                  <div className="mt-3 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min((Number(value)/stats.total)*100*3, 100)}%`, background: accent }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WORKERS TAB ── */}
        {tab === "workers" && stats && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.6)", letterSpacing: "0.12em", fontFamily: "'Lexend',sans-serif" }}>
                Top Nhân Viên · Ranked by Eaches
              </p>
            </div>
            <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
              {stats.topNV.map(([name, stat], i) => {
                const maxE = stats.topNV[0][1].eaches || 1;
                const pct = (stat.eaches / maxE) * 100;
                const colors = ["#22d3ee","#3b82f6","#8b5cf6","#ec4899","#10b981","#f59e0b","#ef4444","#06b6d4"];
                const color = colors[i % colors.length];
                return (
                  <div key={name} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors" style={{ animation: `fadeSlideUp 0.4s ease ${i*60}ms both` }}>
                    {/* Rank */}
                    <span className="w-6 text-center text-xs font-black shrink-0" style={{ color: i < 3 ? color : "rgba(100,116,139,0.4)" }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                    </span>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                      {name.split(" ").pop()?.[0] ?? "?"}
                    </div>
                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>{name}</p>
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}88,${color})`, transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-black" style={{ color, fontVariantNumeric: "tabular-nums" }}>{stat.eaches.toLocaleString()}</p>
                        <p className="text-xs" style={{ color: "rgba(100,116,139,0.5)", fontSize: "0.6rem" }}>EACHES</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold" style={{ color: "rgba(148,163,184,0.7)", fontVariantNumeric: "tabular-nums" }}>{stat.phieu}</p>
                        <p className="text-xs" style={{ color: "rgba(100,116,139,0.5)", fontSize: "0.6rem" }}>PHIẾU</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold" style={{ color: "rgba(148,163,184,0.7)", fontVariantNumeric: "tabular-nums" }}>{stat.lines}</p>
                        <p className="text-xs" style={{ color: "rgba(100,116,139,0.5)", fontSize: "0.6rem" }}>LINES</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {stats.topNV.length === 0 && (
                <div className="px-5 py-10 text-center text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>
                  Chưa có dữ liệu nhân viên
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;