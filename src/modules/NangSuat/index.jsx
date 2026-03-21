/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { nangsuatService } from "@/services/nangsuat.service";
import ImportNangSuat from "./ImportTF";
import { useNavigate } from "react-router-dom";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
/** Format ISO Date → "dd/MM/yy HH:MM" hoặc "dd/MM/yy" */
const fmtDate = (val, withTime = false) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  if (!withTime) return `${dd}/${mm}/${yy}`;
  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${HH}:${MM}`;
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Open: {
      label: "Open",
      cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
    },
    Processed: {
      label: "Processed",
      cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
    },
    pending: {
      label: "Chờ",
      cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
    },
    assigned: {
      label: "Đã giao",
      cls: "bg-blue-100 text-blue-700 ring-1 ring-blue-300",
    },
    completed: {
      label: "Hoàn thành",
      cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
    },
  };
  const { label, cls } = map[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
};

// ─── STATUS PHIEU BADGE ───────────────────────────────────────────────────────
/**
 * 4 trạng thái dựa trên date_assigned vs date_completed (ngưỡng 24h):
 *   Chưa có date_completed + diff ≤ 24h  → 🔵 Đang Pick
 *   Chưa có date_completed + diff > 24h  → 🔴 Pick Trễ Hạn
 *   Có date_completed   + diff ≤ 24h     → 🟢 Đúng Hạn
 *   Có date_completed   + diff > 24h     → 🟠 Trễ Hạn
 */
// Ghép Date object + time string "HH:MM" thành datetime đầy đủ
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

// 4 trạng thái, ngưỡng 24h — dùng datetime đầy đủ (date + time ghép lại)
const calcPhieu = (
  dateAssigned,
  timeAssigned,
  dateCompleted,
  timeCompleted,
) => {
  const assigned = mergeDateTime(dateAssigned, timeAssigned);
  if (!assigned)
    return { label: "Đang Pick", text: "text-blue-600", dot: "bg-blue-400" };

  const completed = mergeDateTime(dateCompleted, timeCompleted);
  const hasCompleted = !!completed;
  const diffHours =
    ((hasCompleted ? completed : new Date()) - assigned) / 3600000;

  if (!hasCompleted)
    return diffHours <= 24
      ? { label: "Đang Pick", text: "text-blue-600", dot: "bg-blue-400" }
      : { label: "Pick Trễ Hạn", text: "text-red-600", dot: "bg-red-400" };

  return diffHours <= 24
    ? { label: "Đúng Hạn", text: "text-emerald-600", dot: "bg-emerald-400" }
    : { label: "Trễ Hạn", text: "text-amber-600", dot: "bg-amber-400" };
};

const PhieuBadge = ({
  dateAssigned,
  timeAssigned,
  dateCompleted,
  timeCompleted,
}) => {
  const { label, text, dot } = calcPhieu(
    dateAssigned,
    timeAssigned,
    dateCompleted,
    timeCompleted,
  );
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${text}`}
    >
      <span className={`w-2 h-2 rounded-full inline-block ${dot}`} />
      {label}
    </span>
  );
};

const LIMIT = 30;

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const NangSuatPage = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLoai, setFilterLoai] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [colFilters, setColFilters] = useState({
    doc_number: "",
    status: "",
    loai: "",
    zone: "",
    assigned_to: "",
    status_phieu: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });
  const [clientPage, setClientPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const useClientFilter = !!(
        colFilters.doc_number ||
        colFilters.status ||
        colFilters.loai ||
        colFilters.zone ||
        colFilters.assigned_to ||
        colFilters.status_phieu
      );

      const res = await nangsuatService.getAll({
        page: useClientFilter ? 1 : page,
        limit: useClientFilter ? 99999 : LIMIT, // fetch all khi filter để paginate client-side
        status: filterStatus,
        loai: filterLoai,
      });
      setTotal(res.total);
      setData(res.data);
    } catch (err) {
      console.error("Lỗi fetchData NangSuatPage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filterStatus, filterLoai, search, colFilters]);

  // Reset clientPage khi colFilters thay đổi
  useEffect(() => {
    setClientPage(1);
  }, [colFilters]);

  // ── 1. hasClientFilter ─────────────────────────────────────
  const hasClientFilter = !!(
    colFilters.doc_number ||
    colFilters.status ||
    colFilters.loai ||
    colFilters.zone ||
    colFilters.assigned_to ||
    colFilters.status_phieu
  );

  // ── 2. filteredData ────────────────────────────────────────
  const filteredData = data.filter((row) => {
    const cf = colFilters;
    if (
      cf.doc_number &&
      !row.doc_number?.toLowerCase().includes(cf.doc_number.toLowerCase())
    )
      return false;
    if (cf.status && row.status !== cf.status) return false;
    if (cf.loai && row.loai !== cf.loai) return false;
    if (cf.zone) {
      const z = cf.zone.toUpperCase();
      if (!row.from_zone?.includes(z) && !row.to_zone?.includes(z))
        return false;
    }
    if (
      cf.assigned_to &&
      !row.assigned_to?.toLowerCase().includes(cf.assigned_to.toLowerCase())
    )
      return false;
    if (cf.status_phieu) {
      const { label } = calcPhieu(
        row.date_assigned,
        row.time_assigned,
        row.date_completed,
        row.time_completed,
      );
      if (label !== cf.status_phieu) return false;
    }
    return true;
  });

  // ── 3. sortedData ─────────────────────────────────────────
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const keyMap = {
      Document: "doc_number",
      "Nhân viên": "assigned_to",
      "Ngày giao": "date_assigned",
      "Ngày HT": "date_completed",
      Lines: "total_lines",
      Eaches: "total_eaches",
      Reaches: "total_reaches",
    };
    const field = keyMap[sortConfig.key];
    if (!field) return 0;
    const va = a[field] ?? "";
    const vb = b[field] ?? "";
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortConfig.dir === "asc" ? cmp : -cmp;
  });

  // ── 4. totalPages + pagedData (dùng sortedData đã có) ──────
  const totalPages = hasClientFilter
    ? Math.max(1, Math.ceil(sortedData.length / LIMIT))
    : Math.ceil(total / LIMIT);

  const pagedData = hasClientFilter
    ? sortedData.slice((clientPage - 1) * LIMIT, clientPage * LIMIT)
    : sortedData;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Quản lý Năng Suất
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasClientFilter ? (
              <>
                <span className="font-semibold text-slate-600">
                  {sortedData.length}
                </span>{" "}
                / {total} phiếu
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-600">{total}</span>{" "}
                phiếu
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/nangsuat/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#0f172a,#1e293b)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#22d3ee",
              boxShadow: "0 0 12px rgba(34,211,238,0.1)",
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Dashboard
          </button>
          <ImportNangSuat onImportSuccess={fetchData} />
        </div>
      </div>
      {/* Table */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Row 1: Column labels + sort */}
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">
                    #
                  </th>
                  {[
                    { label: "Document", sortable: true },
                    { label: "Status", sortable: false },
                    { label: "Loại", sortable: false },
                    { label: "Zone", sortable: false },
                    { label: "Nhân viên", sortable: true },
                    { label: "Ngày rút", sortable: true },
                    { label: "Ngày HT", sortable: true },
                    { label: "Lines", sortable: true },
                    { label: "Eaches", sortable: true },
                    { label: "Reaches", sortable: true },
                    { label: "Giờ HT", sortable: false },
                    { label: "Status phiếu", sortable: false },
                  ].map(({ label, sortable }) => (
                    <th
                      key={label}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {sortable && (
                          <button
                            onClick={() => {
                              const key = label;
                              setSortConfig((prev) =>
                                prev.key === key
                                  ? {
                                      key,
                                      dir: prev.dir === "asc" ? "desc" : "asc",
                                    }
                                  : { key, dir: "asc" },
                              );
                            }}
                            className="text-slate-300 hover:text-slate-500 transition-colors"
                          >
                            {sortConfig.key === label ? (
                              sortConfig.dir === "asc" ? (
                                "↑"
                              ) : (
                                "↓"
                              )
                            ) : (
                              <span className="text-[10px]">↕</span>
                            )}
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
                {/* Row 2: Inline filters */}
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-3 py-1.5" />
                  {/* Doc number filter */}
                  <th className="px-3 py-1.5">
                    <input
                      value={colFilters.doc_number}
                      onChange={(e) =>
                        setColFilters((p) => ({
                          ...p,
                          doc_number: e.target.value,
                        }))
                      }
                      placeholder="Lọc..."
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-slate-50"
                    />
                  </th>
                  {/* Status filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={colFilters.status}
                      onChange={(e) =>
                        setColFilters((p) => ({ ...p, status: e.target.value }))
                      }
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-slate-50"
                    >
                      <option value="">Tất cả</option>
                      <option value="Open">Open</option>
                      <option value="Processed">Processed</option>
                    </select>
                  </th>
                  {/* Loại filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={colFilters.loai}
                      onChange={(e) =>
                        setColFilters((p) => ({ ...p, loai: e.target.value }))
                      }
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-slate-50"
                    >
                      <option value="">Tất cả</option>
                      <option value="transfer">Transfer</option>
                      <option value="soda">Soda</option>
                    </select>
                  </th>
                  {/* Zone filter */}
                  <th className="px-3 py-1.5">
                    <input
                      value={colFilters.zone}
                      onChange={(e) =>
                        setColFilters((p) => ({ ...p, zone: e.target.value }))
                      }
                      placeholder="Lọc..."
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-slate-50"
                    />
                  </th>
                  {/* Nhân viên filter */}
                  <th className="px-3 py-1.5">
                    <input
                      value={colFilters.assigned_to}
                      onChange={(e) =>
                        setColFilters((p) => ({
                          ...p,
                          assigned_to: e.target.value,
                        }))
                      }
                      placeholder="Lọc..."
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-slate-50"
                    />
                  </th>
                  {/* Ngày giao / Ngày HT - empty */}
                  <th className="px-3 py-1.5" />
                  <th className="px-3 py-1.5" />
                  {/* Lines / Eaches / Reaches - empty */}
                  <th className="px-3 py-1.5" />
                  <th className="px-3 py-1.5" />
                  <th className="px-3 py-1.5" />
                  {/* Giờ HT / Status phiếu */}
                  <th className="px-3 py-1.5" />
                  {/* Status phiếu filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={colFilters.status_phieu}
                      onChange={(e) =>
                        setColFilters((p) => ({
                          ...p,
                          status_phieu: e.target.value,
                        }))
                      }
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-slate-50"
                    >
                      <option value="">Tất cả</option>
                      <option value="Đang Pick">Đang Pick</option>
                      <option value="Pick Trễ Hạn">Pick Trễ Hạn</option>
                      <option value="Đúng Hạn">Đúng Hạn</option>
                      <option value="Trễ Hạn">Trễ Hạn</option>
                    </select>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <svg
                          className="w-5 h-5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                        <span className="text-sm">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-12 text-center text-slate-400 text-sm"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  pagedData.map((row, idx) => (
                    <tr
                      key={row._id}
                      className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* # */}
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {(hasClientFilter ? clientPage : page - 1) * LIMIT +
                          idx +
                          (hasClientFilter ? 1 : 1)}
                      </td>

                      {/* Document */}
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-600 whitespace-nowrap">
                        {row.doc_number}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>

                      {/* Loại */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium capitalize">
                          {row.loai || "—"}
                        </span>
                      </td>

                      {/* Zone */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        <span className="font-semibold text-slate-700">
                          {row.from_zone}
                        </span>
                        <span className="mx-1.5 text-slate-300">→</span>
                        <span className="font-semibold text-slate-700">
                          {row.to_zone}
                        </span>
                      </td>

                      {/* Nhân viên */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.assigned_to ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                              {row.assigned_to[0]}
                            </div>
                            <span className="text-xs text-slate-600">
                              {row.assigned_to}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Ngày giao */}
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {row.date_assigned ? (
                          <>
                            {fmtDate(row.date_assigned)}
                            {row.time_assigned ? (
                              <span className="ml-1 text-slate-400">
                                {row.time_assigned}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Ngày HT */}
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {row.date_completed ? (
                          <>
                            {fmtDate(row.date_completed)}
                            {row.time_completed ? (
                              <span className="ml-1 text-slate-400">
                                {row.time_completed}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Lines */}
                      <td className="px-4 py-3 text-center font-mono text-slate-700 text-xs">
                        {row.total_lines}
                      </td>

                      {/* Eaches */}
                      <td className="px-4 py-3 text-center font-mono text-slate-700 text-xs">
                        {row.total_eaches}
                      </td>

                      {/* Reaches */}
                      <td className="px-4 py-3 text-center font-mono text-slate-700 text-xs">
                        {row.total_reaches}
                      </td>

                      {/* Giờ HT = Ngày HT - Ngày giao (ghép time) */}
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                        {(() => {
                          const a = mergeDateTime(
                            row.date_assigned,
                            row.time_assigned,
                          );
                          const c = mergeDateTime(
                            row.date_completed,
                            row.time_completed,
                          );
                          if (!a || !c)
                            return <span className="text-slate-300">—</span>;
                          const diffMin = Math.round((c - a) / 60000);
                          if (diffMin < 0)
                            return <span className="text-slate-300">—</span>;
                          const h = Math.floor(diffMin / 60);
                          const m = String(diffMin % 60).padStart(2, "0");
                          return `${h}:${m}`;
                        })()}
                      </td>

                      {/* Status phiếu */}
                      <td className="px-4 py-3">
                        <PhieuBadge
                          dateAssigned={row.date_assigned}
                          timeAssigned={row.time_assigned}
                          dateCompleted={row.date_completed}
                          timeCompleted={row.time_completed}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">
                Trang{" "}
                <span className="font-semibold text-slate-600">
                  {hasClientFilter ? clientPage : page}
                </span>{" "}
                / {totalPages}
                {hasClientFilter && (
                  <span className="ml-1 text-indigo-400">
                    ({sortedData.length} kết quả)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    hasClientFilter
                      ? setClientPage((p) => Math.max(1, p - 1))
                      : setPage((p) => Math.max(1, p - 1))
                  }
                  disabled={hasClientFilter ? clientPage === 1 : page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const curP = hasClientFilter ? clientPage : page;
                  const pg =
                    Math.max(1, Math.min(curP - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={pg}
                      onClick={() =>
                        hasClientFilter ? setClientPage(pg) : setPage(pg)
                      }
                      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${pg === curP ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() =>
                    hasClientFilter
                      ? setClientPage((p) => Math.min(totalPages, p + 1))
                      : setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={
                    hasClientFilter
                      ? clientPage === totalPages
                      : page === totalPages
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NangSuatPage;
