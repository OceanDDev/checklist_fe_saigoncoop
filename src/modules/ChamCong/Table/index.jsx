/* eslint-disable react/prop-types */
// pages/chamcong/Table.jsx
import { chamCongService } from "@/services/chamcong.service";
import { useState, useEffect, useCallback } from "react";
import ExcelJS from "exceljs";

// ─── Modal Ghi Chú ────────────────────────────────────────────────────────────
const GhiChuModal = ({ record, onClose, onSaved }) => {
  const [ghiChu, setGhiChu] = useState(record?.ghi_chu || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await chamCongService.updateGhiChu(record._id, { ghi_chu: ghiChu });
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.message || "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Ghi Chú Chấm Công
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {record?.ma_nhan_vien} — {record?.ten_nhan_vien}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <textarea
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          rows={4}
          placeholder="Nhập ghi chú..."
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
        />

        {error && (
          <p className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/25 rounded-xl px-4 py-2.5">
            ⚠ {error}
          </p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-muted-foreground border border-border rounded-xl hover:border-ring hover:text-foreground transition-colors font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang lưu..." : "Lưu Ghi Chú"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTongGio = (gio) => {
  if (!gio && gio !== 0) return "—";
  const h = Math.floor(gio);
  const m = Math.round((gio - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
};

// ─── Export Excel (ExcelJS) ───────────────────────────────────────────────────
const exportToExcel = async (data, dateFrom, dateTo) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ChamCong System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Chấm Công", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // ── Columns ──
  ws.columns = [
    { header: "Mã NV", key: "ma_nv", width: 14 },
    { header: "Tên Nhân Viên", key: "ten_nv", width: 26 },
    { header: "Bộ Phận", key: "bo_phan", width: 18 },
    { header: "Check-In", key: "check_in", width: 13 },
    { header: "Check-Out", key: "check_out", width: 13 },
    { header: "Tổng Giờ", key: "tong_gio", width: 13 },
    { header: "Ngày", key: "ngay", width: 15 },
    { header: "Trạng Thái", key: "trang_thai", width: 15 },
    { header: "Ghi Chú", key: "ghi_chu", width: 34 },
  ];

  // ── Header row style ──
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    cell.font = {
      bold: true,
      color: { argb: "FF000000" },
      size: 11,
      name: "Arial",
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF059669" } },
      bottom: { style: "thin", color: { argb: "FF059669" } },
      left: { style: "thin", color: { argb: "FF059669" } },
      right: { style: "thin", color: { argb: "FF059669" } },
    };
  });
  headerRow.height = 32;

  // ── Data rows ──
  data.forEach((r, idx) => {
    const isDu = !!r.gio_ra;
    const row = ws.addRow({
      ma_nv: r.ma_nhan_vien || "",
      ten_nv: r.ten_nhan_vien || "",
      bo_phan: r.bo_phan || "",
      check_in: formatTime(r.gio_vao) || "",
      check_out: formatTime(r.gio_ra) || "",
      tong_gio: r.tong_gio > 0 ? formatTongGio(r.tong_gio) : "",
      ngay: formatDate(r.ngay),
      trang_thai: isDu ? "Đủ công" : "Đang làm",
      ghi_chu: r.ghi_chu || "",
    });

    const rowBg = idx % 2 === 0 ? "FFFAFAFA" : "FFF0FDF4";
    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg },
      };
      cell.font = { size: 10, name: "Arial" };
      cell.alignment = { vertical: "middle" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
    row.height = 24;

    // Mã NV — center + green text
    const cellMaNV = row.getCell("ma_nv");
    cellMaNV.font = {
      bold: true,
      color: { argb: "FF059669" },
      size: 10,
      name: "Arial",
    };
    cellMaNV.alignment = { horizontal: "center", vertical: "middle" };

    // Check-In — center + blue
    const cellIn = row.getCell("check_in");
    cellIn.font = { color: { argb: "FF0284C7" }, size: 10, name: "Arial" };
    cellIn.alignment = { horizontal: "center", vertical: "middle" };

    // Check-Out — center + orange
    const cellOut = row.getCell("check_out");
    cellOut.font = { color: { argb: "FFF97316" }, size: 10, name: "Arial" };
    cellOut.alignment = { horizontal: "center", vertical: "middle" };

    // Tổng Giờ — center + violet
    const cellGio = row.getCell("tong_gio");
    cellGio.font = { color: { argb: "FF7C3AED" }, size: 10, name: "Arial" };
    cellGio.alignment = { horizontal: "center", vertical: "middle" };

    // Ngày — center
    row.getCell("ngay").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // Trạng thái — center + color
    const cellTT = row.getCell("trang_thai");
    cellTT.font = {
      bold: true,
      color: { argb: isDu ? "FF059669" : "FF0284C7" },
      size: 10,
      name: "Arial",
    };
    cellTT.alignment = { horizontal: "center", vertical: "middle" };
  });

  // ── File name ──
  let fileName = "cham-cong";
  if (dateFrom && dateTo) fileName += `_${dateFrom}_den_${dateTo}`;
  else if (dateFrom) fileName += `_tu_${dateFrom}`;
  else if (dateTo) fileName += `_den_${dateTo}`;
  fileName += ".xlsx";

  // ── Trigger download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChamCongTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ghiChuModal, setGhiChuModal] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.tu_ngay = dateFrom;
      if (dateTo) params.den_ngay = dateTo;
      const res = await chamCongService.getAllChamCong(params);
      setData(res?.data || []);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelected(new Set());
  }, [data]);

  const filtered = data.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.ma_nhan_vien?.toLowerCase().includes(q) ||
      r.ten_nhan_vien?.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r._id)));
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Xóa bản ghi chấm công của "${label}"?`)) return;
    try {
      await chamCongService.deleteChamCong(id);
      fetchData();
    } catch {
      alert("Xóa thất bại");
    }
  };

  const handleDeleteMany = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Xóa ${selected.size} bản ghi đã chọn?`)) return;
    try {
      await chamCongService.deleteManyChamCong([...selected]);
      fetchData();
    } catch {
      alert("Xóa hàng loạt thất bại");
    }
  };

  const handleClearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  const hasDateFilter = dateFrom || dateTo;

  const th =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 bg-muted/40 border-b border-border text-left whitespace-nowrap";
  const td = "px-5 py-4 text-sm border-b border-border/50 align-middle";

  return (
    <>
      {ghiChuModal && (
        <GhiChuModal
          record={ghiChuModal}
          onClose={() => setGhiChuModal(null)}
          onSaved={() => {
            setGhiChuModal(null);
            fetchData();
          }}
        />
      )}

      <div className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Dữ Liệu Chấm Công
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lịch sử check-in / check-out của nhân viên
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <button
                onClick={handleDeleteMany}
                className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-semibold rounded-xl border border-destructive/30 transition-colors"
              >
                🗑 Xóa {selected.size} mục đã chọn
              </button>
            )}
            {/* ── Nút Xuất Excel ── */}
            <button
              onClick={() =>
                exportToExcel(filtered, dateFrom, dateTo).catch(() =>
                  alert("Xuất Excel thất bại"),
                )
              }
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold rounded-xl border border-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Xuất Excel
              {filtered.length > 0 && (
                <span className="text-xs opacity-70">({filtered.length})</span>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm mã / tên nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all w-64"
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-ring transition-all">
              <span className="text-base">📅</span>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Từ ngày
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none cursor-pointer [color-scheme:dark] w-32"
              />
            </div>

            <span className="text-muted-foreground text-sm font-medium">→</span>

            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-ring transition-all">
              <span className="text-base">📅</span>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Đến ngày
              </span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none cursor-pointer [color-scheme:dark] w-32"
              />
            </div>
          </div>

          {hasDateFilter && (
            <button
              onClick={handleClearDateFilter}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground border border-border rounded-xl hover:text-foreground hover:border-ring transition-colors"
            >
              ✕ Xóa lọc ngày
            </button>
          )}
        </div>

        {/* Active date filter badge */}
        {hasDateFilter && (
          <div className="flex items-center gap-2 text-xs text-sky-400 bg-sky-500/8 border border-sky-500/20 rounded-xl px-4 py-2 w-fit">
            <span>📅</span>
            <span>
              Đang lọc:{" "}
              {dateFrom ? (
                <span className="font-semibold">{dateFrom}</span>
              ) : (
                "..."
              )}{" "}
              →{" "}
              {dateTo ? <span className="font-semibold">{dateTo}</span> : "..."}
            </span>
          </div>
        )}

        {/* Table Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Lịch sử chấm công
            </span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {filtered.length} bản ghi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${th} w-12`}>
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 && selected.size === filtered.length
                      }
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className={th}>#</th>
                  <th className={th}>Mã NV</th>
                  <th className={th}>Tên Nhân Viên</th>
                  <th className={th}>Bộ Phận</th>
                  <th className={th}>Check-In</th>
                  <th className={th}>Check-Out</th>
                  <th className={th}>Tổng Giờ</th>
                  <th className={th}>Ngày</th>
                  <th className={th}>Trạng Thái</th>
                  <th className={th}>Ghi Chú</th>
                  <th className={`${th} text-center`}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="text-center py-16 text-sm text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="animate-spin">◌</span> Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="text-center py-16 text-sm text-muted-foreground"
                    >
                      <div className="text-4xl mb-3 opacity-30">⏱</div>
                      Chưa có dữ liệu chấm công
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const isChecked = selected.has(r._id);
                    const hasCheckout = !!r.gio_ra;

                    return (
                      <tr
                        key={r._id}
                        className={`transition-colors ${isChecked ? "bg-emerald-500/5" : "hover:bg-muted/20"}`}
                      >
                        <td className={td}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(r._id)}
                            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td
                          className={`${td} text-muted-foreground text-xs font-mono`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className={td}>
                          <span className="font-mono text-sm font-semibold text-emerald-400 bg-emerald-500/8 px-2 py-0.5 rounded-md">
                            {r.ma_nhan_vien}
                          </span>
                        </td>
                        <td className={`${td} font-medium text-foreground`}>
                          {r.ten_nhan_vien}
                        </td>
                        <td className={`${td} text-muted-foreground`}>
                          {r.bo_phan || "—"}
                        </td>
                        <td className={td}>
                          <span className="font-mono text-sm text-sky-400 font-semibold">
                            {formatTime(r.gio_vao) || "—"}
                          </span>
                        </td>
                        <td className={td}>
                          <span
                            className={`font-mono text-sm font-semibold ${hasCheckout ? "text-orange-400" : "text-muted-foreground/50"}`}
                          >
                            {formatTime(r.gio_ra) || "—"}
                          </span>
                        </td>
                        <td className={td}>
                          <span
                            className={`font-mono text-sm font-semibold ${r.tong_gio > 0 ? "text-violet-400" : "text-muted-foreground/50"}`}
                          >
                            {r.tong_gio > 0 ? formatTongGio(r.tong_gio) : "—"}
                          </span>
                        </td>
                        <td className={`${td} text-muted-foreground`}>
                          {formatDate(r.ngay)}
                        </td>
                        <td className={td}>
                          {hasCheckout ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Đủ công
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                              Đang làm
                            </span>
                          )}
                        </td>
                        <td
                          className={`${td} text-muted-foreground max-w-[160px] truncate`}
                          title={r.ghi_chu}
                        >
                          {r.ghi_chu || (
                            <span className="opacity-40 italic">Chưa có</span>
                          )}
                        </td>
                        <td className={`${td} text-center`}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setGhiChuModal(r)}
                              className="px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:border-ring hover:text-foreground transition-colors"
                            >
                              Ghi chú
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(r._id, r.ten_nhan_vien)
                              }
                              className="px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 bg-destructive/5 rounded-lg hover:bg-destructive/15 transition-colors"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
