/* eslint-disable react/jsx-key */
/* eslint-disable react/prop-types */
// pages/chamcong/Table.jsx
import { chamCongService } from "@/services/chamcong.service";
import { useState, useEffect, useCallback, useRef } from "react";
import ExcelJS from "exceljs";
import ImportNangSuat from "./ImportNangSuat";

// ─── Helpers ngày ─────────────────────────────────────────────────────────────
function tinhGioThuc(tongGio) {
  if (!tongGio || tongGio <= 0) return 0;
  return tongGio >= 5 ? tongGio - 1 : tongGio;
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
function getThuInMonth(year, month, totalDays) {
  const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return Array.from(
    { length: totalDays },
    (_, i) => THU[new Date(year, month - 1, i + 1).getDay()],
  );
}
function toDisplayStr(date) {
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
function toApiStr(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Export Excel ─────────────────────────────────────────────────────────────
async function exportChamCongMau(records, { year, month } = {}) {
  const y = year || new Date().getFullYear();
  const m = month || new Date().getMonth() + 1;
  const days = daysInMonth(y, m);
  const thus = getThuInMonth(y, m, days);
  const byNV = {};
  for (const r of records) {
    if (r.is_locked) continue; // bỏ qua ngày bị khóa
    const ma = r.ma_nhan_vien;
    if (!byNV[ma]) byNV[ma] = { ...r, ngayMap: {} };
    byNV[ma].ngayMap[new Date(r.ngay).getDate()] = r;
  }
  const employees = Object.values(byNV);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`T${m}-${y}`, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", ySplit: 3, xSplit: 5 }],
  });
  const COL_START = 6;
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 13;
  for (let i = 0; i < days; i++) ws.getColumn(COL_START + i).width = 5.2;
  const colTongGio = COL_START + days,
    colTongCong = colTongGio + 1;
  ws.getColumn(colTongGio).width = 10;
  ws.getColumn(colTongCong).width = 11;
  const lastCol = colTongCong;
  const thin = { style: "thin" },
    border = { top: thin, left: thin, bottom: thin, right: thin };
  function cell(row, col, value, opts = {}) {
    const c = ws.getCell(row, col);
    c.value = value ?? null;
    if (opts.font) c.font = opts.font;
    if (opts.fill)
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: opts.fill },
      };
    if (opts.align)
      c.alignment = {
        horizontal: opts.align,
        vertical: "middle",
        wrapText: !!opts.wrap,
      };
    c.border = border;
    return c;
  }
  const HDR = {
    font: { bold: true, size: 10, name: "Arial", color: { argb: "FFFFFFFF" } },
    fill: "FF1F7A45",
    align: "center",
  };
  ws.getRow(1).height = 26;
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = `BẢNG CHẤM CÔNG THÁNG ${String(m).padStart(2, "0")} NĂM ${y}`;
  title.font = { bold: true, size: 14, name: "Arial" };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.border = {};
  ws.getRow(2).height = 30;
  for (const [col, label] of [
    [1, "STT"],
    [2, "Mã NV"],
    [3, "Họ & Tên"],
    [4, "Bộ phận"],
    [5, "Chức danh"],
  ]) {
    ws.mergeCells(2, col, 3, col);
    cell(2, col, label, HDR);
  }
  for (let d = 1; d <= days; d++)
    cell(2, COL_START + d - 1, String(d).padStart(2, "0"), HDR);
  ws.mergeCells(2, colTongGio, 2, colTongCong);
  cell(2, colTongGio, "Tổng cộng", HDR);
  ws.getRow(3).height = 18;
  for (let d = 0; d < days; d++) {
    const thu = thus[d];
    cell(3, COL_START + d, thu, {
      font: { bold: true, size: 9, name: "Arial" },
      fill: thu === "CN" ? "FFFFCCCC" : "FFFFE699",
      align: "center",
    });
  }
  const subOpts = {
    font: { bold: true, size: 9, name: "Arial" },
    fill: "FFD9D9D9",
    align: "center",
  };
  cell(3, colTongGio, "Giờ công", subOpts);
  cell(3, colTongCong, "Tổng công", subOpts);
  employees.forEach((emp, idx) => {
    const row = 4 + idx;
    ws.getRow(row).height = 20;
    const bg = idx % 2 === 0 ? "FFFAFAFA" : "FFEDF7ED";
    cell(row, 1, idx + 1, {
      font: { size: 10, name: "Arial" },
      fill: bg,
      align: "center",
    });
    cell(row, 2, emp.ma_nhan_vien, {
      font: {
        bold: true,
        size: 10,
        name: "Arial",
        color: { argb: "FF1F7A45" },
      },
      fill: bg,
      align: "center",
    });
    cell(row, 3, emp.ten_nhan_vien, {
      font: { size: 10, name: "Arial" },
      fill: bg,
      align: "left",
    });
    cell(row, 4, emp.bo_phan || "", {
      font: { size: 10, name: "Arial" },
      fill: bg,
      align: "left",
    });
    cell(row, 5, emp.chuc_vu || "Nhân Viên", {
      font: { size: 10, name: "Arial" },
      fill: bg,
      align: "left",
    });
    let tongGioThuc = 0;
    for (let d = 1; d <= days; d++) {
      const col = COL_START + d - 1,
        rec = emp.ngayMap[d];
      if (!rec) {
        const c = ws.getCell(row, col);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        c.border = border;
      } else {
        const gioVao = rec.gio_vao ? new Date(rec.gio_vao) : null,
          gioRa = rec.gio_ra ? new Date(rec.gio_ra) : null;
        if (gioVao && gioRa) {
          const raw = (gioRa - gioVao) / 3_600_000,
            thuc = tinhGioThuc(raw);
          tongGioThuc += thuc;
          cell(row, col, parseFloat(thuc.toFixed(1)), {
            font: { size: 10, name: "Arial" },
            fill: "FFE2EFDA",
            align: "center",
          });
        } else {
          const c = ws.getCell(row, col);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          c.border = border;
        }
      }
    }
    const tongCong = parseFloat((tongGioThuc / 8).toFixed(1));
    cell(row, colTongGio, tongGioThuc, {
      font: {
        bold: true,
        size: 10,
        name: "Arial",
        color: { argb: "FF7030A0" },
      },
      fill: "FFFFFF99",
      align: "center",
    });
    cell(row, colTongCong, tongCong, {
      font: {
        bold: true,
        size: 10,
        name: "Arial",
        color: { argb: "FFFFC000" },
      },
      fill: "FFFFFF99",
      align: "center",
    });
  });
  const fileName = `bang-cham-cong_thang-${String(m).padStart(2, "0")}-${y}.xlsx`;
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
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const MONTHS_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const DAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const MiniCalendar = ({
  viewYear,
  viewMonth,
  startDate,
  endDate,
  hovered,
  onDayClick,
  onDayHover,
  onPrev,
  onNext,
}) => {
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const total = daysInMonth(viewYear, viewMonth + 1);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(viewYear, viewMonth, d));
  const rangeEnd = endDate || hovered;

  return (
    <div className="select-none w-full">
      <div className="flex items-center justify-between px-1 py-2">
        <button
          onClick={onPrev}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTHS_VI[viewMonth]} {viewYear}
        </span>
        <button
          onClick={onNext}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_VI.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="h-9" />;
          const isStart = isSameDay(day, startDate);
          const isEnd = isSameDay(day, endDate);
          const isHov = isSameDay(day, hovered) && !endDate;
          const inRange =
            rangeEnd && startDate && day > startDate && day < rangeEnd;
          const isToday = isSameDay(day, new Date());

          let stripCls = "absolute inset-y-1 left-0 right-0 ";
          let showStrip = false;
          if (inRange) {
            stripCls += "bg-emerald-500/15";
            showStrip = true;
          } else if (isStart && rangeEnd && day < rangeEnd) {
            stripCls += "bg-emerald-500/15 left-1/2";
            showStrip = true;
          } else if ((isEnd || isHov) && startDate && day > startDate) {
            stripCls += "bg-emerald-500/15 right-1/2";
            showStrip = true;
          }

          let dotCls =
            "relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ";
          if (isStart || isEnd)
            dotCls += "bg-emerald-500 text-white font-bold ";
          else if (isHov)
            dotCls += "bg-emerald-500/25 text-emerald-400 font-medium ";
          else if (inRange) dotCls += "text-foreground ";
          else if (isToday)
            dotCls +=
              "ring-1 ring-emerald-500/60 text-emerald-400 hover:bg-muted/60 ";
          else dotCls += "text-foreground hover:bg-muted/50 ";

          return (
            <div
              key={i}
              className="relative h-9 flex items-center justify-center cursor-pointer"
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
            >
              {showStrip && <div className={stripCls} />}
              <span className={dotCls}>{day.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── DateRange Picker ─────────────────────────────────────────────────────────
const DateRangePicker = ({ startDate, endDate, onChange }) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [hovered, setHovered] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleDayClick = (day) => {
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: day, endDate: null });
    } else {
      if (day < startDate) onChange({ startDate: day, endDate: startDate });
      else if (isSameDay(day, startDate))
        onChange({ startDate: day, endDate: day });
      else onChange({ startDate, endDate: day });
      setOpen(false);
    }
  };

  const prev = () =>
    viewMonth === 0
      ? (setViewMonth(11), setViewYear((y) => y - 1))
      : setViewMonth((m) => m - 1);
  const next = () =>
    viewMonth === 11
      ? (setViewMonth(0), setViewYear((y) => y + 1))
      : setViewMonth((m) => m + 1);

  const fromLabel = startDate ? toDisplayStr(startDate) : "";
  const toLabel = endDate ? toDisplayStr(endDate) : "";
  const hasRange = startDate || endDate;

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-0 rounded-xl border cursor-pointer transition-all overflow-hidden
          ${open ? "border-emerald-500/60 ring-2 ring-emerald-500/20" : "border-border hover:border-ring"} bg-card`}
      >
        <div
          className={`flex items-center gap-2 px-3.5 py-2.5 border-r transition-colors ${open || startDate ? "border-emerald-500/20" : "border-border"}`}
        >
          <span className="text-base shrink-0">📅</span>
          <div className="text-sm min-w-[90px]">
            {fromLabel ? (
              <span className="text-foreground font-medium">{fromLabel}</span>
            ) : (
              <span className="text-muted-foreground">Từ ngày</span>
            )}
          </div>
        </div>
        <span className="px-1 text-muted-foreground text-sm select-none">
          →
        </span>
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <div className="text-sm min-w-[90px]">
            {toLabel ? (
              <span className="text-foreground font-medium">{toLabel}</span>
            ) : (
              <span className="text-muted-foreground">Đến ngày</span>
            )}
          </div>
          {hasRange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange({ startDate: null, endDate: null });
              }}
              className="ml-1 w-4 h-4 shrink-0 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-card border border-border rounded-2xl shadow-2xl p-4 w-80">
          <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-border">
            {[
              {
                label: "Hôm nay",
                fn: () => {
                  const t = new Date();
                  onChange({ startDate: t, endDate: t });
                  setOpen(false);
                },
              },
              {
                label: "7 ngày",
                fn: () => {
                  const e = new Date(),
                    s = new Date();
                  s.setDate(s.getDate() - 6);
                  onChange({ startDate: s, endDate: e });
                  setOpen(false);
                },
              },
              {
                label: "30 ngày",
                fn: () => {
                  const e = new Date(),
                    s = new Date();
                  s.setDate(s.getDate() - 29);
                  onChange({ startDate: s, endDate: e });
                  setOpen(false);
                },
              },
              {
                label: "Tháng này",
                fn: () => {
                  const n = new Date();
                  onChange({
                    startDate: new Date(n.getFullYear(), n.getMonth(), 1),
                    endDate: new Date(n.getFullYear(), n.getMonth() + 1, 0),
                  });
                  setOpen(false);
                },
              },
              {
                label: "Tháng trước",
                fn: () => {
                  const n = new Date();
                  onChange({
                    startDate: new Date(n.getFullYear(), n.getMonth() - 1, 1),
                    endDate: new Date(n.getFullYear(), n.getMonth(), 0),
                  });
                  setOpen(false);
                },
              },
            ].map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-muted/50 hover:bg-emerald-500/15 hover:text-emerald-400 text-muted-foreground border border-border hover:border-emerald-500/30 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
          <MiniCalendar
            viewYear={viewYear}
            viewMonth={viewMonth}
            startDate={startDate}
            endDate={endDate}
            hovered={hovered}
            onDayClick={handleDayClick}
            onDayHover={setHovered}
            onPrev={prev}
            onNext={next}
          />
          {startDate && !endDate && (
            <p className="text-center text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
              Chọn ngày kết thúc...
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Modal Xuất Excel ─────────────────────────────────────────────────────────
const ExportChamCongMau = ({ records = [] }) => {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [donVi, setDonVi] = useState("KHO VỆ TINH BÌNH DƯƠNG");
  const [boPhan, setBoPhan] = useState("XUẤT HÀNG");

  const handleExport = async () => {
    setLoading(true);
    try {
      // Lọc theo tháng/năm VÀ bỏ qua bản ghi bị khóa
      const filtered = records.filter((r) => {
        if (r.is_locked) return false;
        const d = new Date(r.ngay);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      await exportChamCongMau(filtered, { year, month, donVi, boPhan });
      setOpen(false);
    } catch (e) {
      alert("Xuất Excel thất bại: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const inp =
    "w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-semibold rounded-xl border border-blue-500/30 transition-colors"
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
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Xuất Bảng Chấm Công
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Theo mẫu chính thức Saigon Co.op
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tháng
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className={inp}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Tháng {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Năm
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className={inp}
                    min={2020}
                    max={2099}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Đơn vị
                </label>
                <input
                  type="text"
                  value={donVi}
                  onChange={(e) => setDonVi(e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Bộ phận
                </label>
                <input
                  type="text"
                  value={boPhan}
                  onChange={(e) => setBoPhan(e.target.value)}
                  className={inp}
                />
              </div>
              {/* Ghi chú về bản ghi bị khóa */}
              <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-orange-400">
                🔒 Các ngày đã khóa sẽ{" "}
                <span className="font-bold">không được tính công</span> trong
                file Excel.
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 text-sm text-muted-foreground border border-border rounded-xl hover:border-ring hover:text-foreground transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex-1 py-3 text-sm font-bold bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">◌</span> Đang xuất...
                  </>
                ) : (
                  <>⬇ Xuất Excel</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── TimePicker24 ─────────────────────────────────────────────────────────────
const TimePicker24 = ({ value, onChange, minTime, optional }) => {
  const selCls =
    "bg-muted/40 border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-all text-center cursor-pointer py-2.5";
  const [hh, mm] = value ? value.split(":") : ["", ""];
  const emit = (h, m) => {
    if (!h || !m) {
      onChange("");
      return;
    }
    onChange(`${h}:${m}`);
  };
  const minH = minTime ? Number(minTime.split(":")[0]) : -1;
  const minM = minTime ? Number(minTime.split(":")[1]) : -1;
  const validMinutes = (h) => {
    const all = Array.from({ length: 12 }, (_, i) => i * 5);
    if (minTime && Number(h) === minH) return all.filter((m) => m > minM);
    return all;
  };
  return (
    <div className="flex items-center gap-2">
      <select
        value={hh}
        onChange={(e) => {
          const newH = e.target.value;
          const valid = validMinutes(newH);
          const newM = valid.map((v) => String(v).padStart(2, "0")).includes(mm)
            ? mm
            : valid.length
              ? String(valid[0]).padStart(2, "0")
              : "";
          emit(newH, newM);
        }}
        className={`${selCls} flex-1`}
      >
        <option value="">-- Giờ --</option>
        {Array.from({ length: 24 }, (_, i) => i).map((h) => {
          const hStr = String(h).padStart(2, "0");
          return (
            <option key={h} value={hStr} disabled={minTime && h < minH}>
              {hStr}:00
            </option>
          );
        })}
      </select>
      <span className="text-muted-foreground font-bold shrink-0">:</span>
      <select
        value={mm}
        onChange={(e) => emit(hh, e.target.value)}
        disabled={!hh}
        className={`${selCls} flex-1 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <option value="">-- Phút --</option>
        {validMinutes(hh).map((m) => {
          const mStr = String(m).padStart(2, "0");
          return (
            <option key={m} value={mStr}>
              {mStr}
            </option>
          );
        })}
      </select>
      {optional && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-colors text-xs"
          title="Xóa giờ"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ─── Icon bút chì ─────────────────────────────────────────────────────────────
const PencilIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ─── Inline Cell Edit ─────────────────────────────────────────────────────────
const InlineCellEdit = ({ record, field, minTimeField, onSaved }) => {
  const toTimeStr = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(toTimeStr(record[field]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setVal(toTimeStr(record[field]));
    setEditing(false);
    setError("");
  }, [record[field]]);

  const displayVal = record[field]
    ? new Date(record[field]).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : null;

  const minTime = minTimeField ? toTimeStr(record[minTimeField]) : undefined;

  // ── Nếu bị khóa: chỉ hiển thị giá trị, không cho edit ──
  if (record.is_locked) {
    return (
      <span
        className={`font-mono text-sm font-semibold ${displayVal ? "text-teal-400/50" : "text-muted-foreground/20"}`}
      >
        {displayVal || "—"}
      </span>
    );
  }

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const payload = { [field]: val || "" };
      if (field === "gio_vao_phu" && !val) payload.gio_ra_phu = "";
      await chamCongService.adminEditChamCong(record._id, payload);
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setVal(toTimeStr(record[field]));
    setEditing(false);
    setError("");
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 group min-w-[80px]">
        <span
          className={`font-mono text-sm font-semibold ${displayVal ? "text-teal-400" : "text-muted-foreground/30"}`}
        >
          {displayVal || "—"}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
          title="Chỉnh sửa"
        >
          <PencilIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <TimePicker24 value={val} onChange={setVal} minTime={minTime} optional />
      {error && (
        <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5 leading-tight">
          ⚠ {error}
        </p>
      )}
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <span className="animate-spin text-xs">◌</span> : "💾 Lưu"}
        </button>
        <button
          onClick={handleCancel}
          className="px-2 py-1 text-[11px] text-muted-foreground border border-border rounded-lg hover:border-ring hover:text-foreground transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  );
};

// ─── Modal Khóa / Mở Khóa ────────────────────────────────────────────────────
const KhoaModal = ({ record, onClose, onSaved }) => {
  const isLocked = !!record?.is_locked;
  const [lyDo, setLyDo] = useState(record?.ly_do_khoa || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!isLocked && !lyDo.trim()) return setError("Vui lòng nhập lý do khóa");
    setError("");
    setLoading(true);
    try {
      await chamCongService.toggleKhoa(record._id, { ly_do_khoa: lyDo.trim() });
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div
        className={`w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden border-2 ${isLocked ? "border-emerald-500/40" : "border-orange-500/40"}`}
      >
        <div
          className={`px-6 py-4 flex items-center justify-between ${isLocked ? "bg-emerald-600" : "bg-orange-500"}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isLocked ? "🔓" : "🔒"}</span>
            <div>
              <h2 className="font-black text-white text-sm tracking-wide uppercase">
                {isLocked ? "Mở Khóa Chấm Công" : "Khóa Chấm Công"}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {record?.ma_nhan_vien} — {record?.ten_nhan_vien}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          {isLocked ? (
            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
              Mở khóa sẽ cho phép ngày{" "}
              <span className="font-bold">
                {new Date(record.ngay).toLocaleDateString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </span>{" "}
              được tính công trở lại trong Excel.
            </div>
          ) : (
            <>
              <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl px-4 py-3 text-sm text-orange-400">
                Khi khóa, ngày{" "}
                <span className="font-bold">
                  {new Date(record.ngay).toLocaleDateString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </span>{" "}
                sẽ <span className="font-bold">không được tính công</span> khi
                xuất Excel.
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Lý do khóa <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value)}
                  rows={3}
                  placeholder="VD: Nghỉ không phép, vắng mặt không lý do..."
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/25 rounded-xl px-4 py-2.5">
              ⚠ {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-muted-foreground border border-border rounded-xl hover:border-ring hover:text-foreground transition-colors font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${isLocked ? "bg-emerald-500 hover:bg-emerald-400 text-black" : "bg-orange-500 hover:bg-orange-400 text-white"}`}
          >
            {loading ? (
              <>
                <span className="animate-spin">◌</span> Đang xử lý...
              </>
            ) : isLocked ? (
              "🔓 Mở Khóa"
            ) : (
              "🔒 Xác nhận Khóa"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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
      setError(e?.message || "Lưu thất bại");
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
            className="flex-1 py-3 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Đang lưu..." : "Lưu Ghi Chú"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Vi Phạm ────────────────────────────────────────────────────────────
const ViPhamModal = ({ record, onClose }) => {
  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
    const date = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    return `${date} ${time}`;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border-2 border-red-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-red-500/10">
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h2 className="font-black text-white text-sm tracking-wide uppercase">
                Vi Phạm Chấm Công Hộ
              </h2>
              <p className="text-red-200 text-xs mt-0.5">
                Biên bản kỷ luật tự động
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Nhân viên bị chấm hộ
            </p>
            {[
              [
                "Mã NV",
                <span className="font-mono font-bold text-emerald-400">
                  {record.ma_nhan_vien}
                </span>,
              ],
              [
                "Tên",
                <span className="font-semibold text-foreground">
                  {record.ten_nhan_vien}
                </span>,
              ],
              [
                "Bộ phận",
                <span className="text-foreground">{record.bo_phan}</span>,
              ],
              [
                "Ngày",
                <span className="text-foreground">
                  {new Date(record.ngay).toLocaleDateString("vi-VN")}
                </span>,
              ],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                {val}
              </div>
            ))}
          </div>
          <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
              Chi tiết vi phạm
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Device ID vi phạm</span>
              <span className="font-mono text-xs text-red-300 bg-red-500/10 px-2 py-0.5 rounded">
                {record.vi_pham_device_id?.slice(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Thời điểm phát hiện</span>
              <span className="text-red-300 text-xs">
                {fmt(record.vi_pham_thoi_gian)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số lần cố tình</span>
              <span
                className={`font-bold text-sm ${record.vi_pham_so_lan >= 3 ? "text-red-400" : "text-orange-400"}`}
              >
                {record.vi_pham_so_lan} lần{record.vi_pham_so_lan >= 3 && " ⚠️"}
              </span>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors"
          >
            Đóng
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
    timeZone: "Asia/Ho_Chi_Minh",
  });
};
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};
const formatTongGio = (gio) => {
  if (!gio && gio !== 0) return "—";
  const h = Math.floor(gio);
  const m = Math.round((gio - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChamCongTable({ role }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ghiChuModal, setGhiChuModal] = useState(null);
  const [viPhamModal, setViPhamModal] = useState(null);
  const [khoaModal, setKhoaModal] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [filterViPham] = useState(false);
  const [filterBoPhan, setFilterBoPhan] = useState("");
  const [filterChucVu, setFilterChucVu] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: now,
      endDate: now,
    };
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.startDate) params.tu_ngay = toApiStr(dateRange.startDate);
      if (dateRange.endDate) params.den_ngay = toApiStr(dateRange.endDate);
      const res = await chamCongService.getAllChamCong(params);
      setData(res?.data || []);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    setSelected(new Set());
  }, [data]);

  const boPhanList = [
    ...new Set(data.map((r) => r.bo_phan).filter(Boolean)),
  ].sort();
  const chucVuList = [
    ...new Set(data.map((r) => r.chuc_vu).filter(Boolean)),
  ].sort();

  const filtered = data.filter((r) => {
    if (role === 30 && r.bo_phan?.toLowerCase() !== "ngọc phú") return false;
    if (filterViPham && !r.vi_pham_cham_ho) return false;
    if (filterBoPhan && r.bo_phan !== filterBoPhan) return false;
    if (filterChucVu && r.chuc_vu !== filterChucVu) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.ma_nhan_vien?.toLowerCase().includes(q) ||
      r.ten_nhan_vien?.toLowerCase().includes(q)
    );
  });

  const soViPham = data.filter((r) => r.vi_pham_cham_ho).length;

  // Chỉ cho phép select những row KHÔNG bị khóa
  const toggleSelect = (id) => {
    const record = data.find((r) => r._id === id);
    if (record?.is_locked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    const selectableIds = filtered
      .filter((r) => !r.is_locked)
      .map((r) => r._id);
    if (selected.size === selectableIds.length && selectableIds.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const exportSelected = async () => {
    const rows = filtered.filter((r) => selected.has(r._id) && !r.is_locked);
    if (rows.length === 0) return;

    const fmtTime = (iso) => {
      if (!iso) return "";
      return new Date(iso).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      });
    };
    const fmtDate = (iso) => {
      if (!iso) return "";
      return new Date(iso).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      });
    };
    const fmtGio = (gio) => {
      if (!gio && gio !== 0) return "";
      const h = Math.floor(gio),
        m = Math.round((gio - h) * 60);
      return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
    };

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chấm Công");
    const COLS = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Mã NV", key: "ma_nhan_vien", width: 10 },
      { header: "Tên Nhân Viên", key: "ten_nhan_vien", width: 24 },
      { header: "Bộ Phận", key: "bo_phan", width: 16 },
      { header: "Chức Vụ", key: "chuc_vu", width: 16 },
      { header: "Check-In", key: "gio_vao", width: 10 },
      { header: "Check-Out", key: "gio_ra", width: 10 },
      { header: "Tổng Giờ", key: "tong_gio", width: 10 },
      ...(role !== 30
        ? [
            { header: "Vào Phụ", key: "gio_vao_phu", width: 10 },
            { header: "Ra Phụ", key: "gio_ra_phu", width: 10 },
            { header: "T.Giờ Phụ", key: "tong_gio_phu", width: 11 },
          ]
        : []),
      { header: "Ngày", key: "ngay", width: 13 },
      { header: "Trạng Thái", key: "trang_thai", width: 14 },
      { header: "Phiếu", key: "so_phieu", width: 8 },
      { header: "Kiện", key: "so_kien", width: 8 },
      { header: "Dòng", key: "so_dong", width: 8 },
      { header: "Ghi Chú", key: "ghi_chu", width: 24 },
    ];
    ws.columns = COLS.map(({ header, key, width }) => ({ header, key, width }));
    const headerRow = ws.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 10,
        name: "Arial",
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F7A45" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    rows.forEach((r, idx) => {
      const hasCheckout = !!r.gio_ra;
      const row = ws.addRow({
        stt: idx + 1,
        ma_nhan_vien: r.ma_nhan_vien,
        ten_nhan_vien: r.ten_nhan_vien,
        bo_phan: r.bo_phan || "",
        chuc_vu: r.chuc_vu || "",
        gio_vao: fmtTime(r.gio_vao),
        gio_ra: fmtTime(r.gio_ra),
        tong_gio: fmtGio(r.tong_gio),
        ...(role !== 30
          ? {
              gio_vao_phu: fmtTime(r.gio_vao_phu),
              gio_ra_phu: fmtTime(r.gio_ra_phu),
              tong_gio_phu: fmtGio(r.tong_gio_phu),
            }
          : {}),
        ngay: fmtDate(r.ngay),
        trang_thai: hasCheckout ? "Hợp lệ" : "Chưa hợp lệ",
        so_phieu: r.so_phieu ?? "",
        so_kien: r.so_kien ?? "",
        so_dong: r.so_dong ?? "",
        ghi_chu: r.ghi_chu || "",
      });
      row.height = 18;
      const bg = idx % 2 === 0 ? "FFFAFAFA" : "FFEDF7ED";
      row.eachCell((cell) => {
        cell.font = { size: 10, name: "Arial" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bg },
        };
        cell.alignment = { vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cham-cong_${rows.length}-ban-ghi.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const th =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 bg-muted/40 border-b border-border text-left whitespace-nowrap";
  const td = "px-5 py-4 text-sm border-b border-border/50 align-middle";

  // Tính số row có thể select (không bị khóa)
  const selectableCount = filtered.filter((r) => !r.is_locked).length;

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
      {viPhamModal && (
        <ViPhamModal
          record={viPhamModal}
          onClose={() => setViPhamModal(null)}
        />
      )}
      {khoaModal && (
        <KhoaModal
          record={khoaModal}
          onClose={() => setKhoaModal(null)}
          onSaved={() => {
            setKhoaModal(null);
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
                onClick={exportSelected}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold rounded-xl border border-emerald-500/30 transition-colors"
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
                Xuất {selected.size} mục
              </button>
            )}
            {role !== 27 && role !== 30 && (
              <ImportNangSuat onSuccess={fetchData} />
            )}
            {role !== 27 && role !== 30 && <ExportChamCongMau records={data} />}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
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
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
          <select
            value={filterBoPhan}
            onChange={(e) => setFilterBoPhan(e.target.value)}
            className="bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">Tất cả bộ phận</option>
            {boPhanList.map((bp) => (
              <option key={bp} value={bp}>
                {bp}
              </option>
            ))}
          </select>
          <select
            value={filterChucVu}
            onChange={(e) => setFilterChucVu(e.target.value)}
            className="bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">Tất cả chức vụ</option>
            {chucVuList.map((cv) => (
              <option key={cv} value={cv}>
                {cv}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Lịch sử chấm công
            </span>
            <div className="flex items-center gap-2">
              {soViPham > 0 && (
                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                  🚨 {soViPham} vi phạm
                </span>
              )}
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {filtered.length} bản ghi
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${th} w-12`}>
                    <input
                      type="checkbox"
                      checked={
                        selectableCount > 0 && selected.size === selectableCount
                      }
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className={th}>#</th>
                  <th className={th}>Mã NV</th>
                  <th className={th}>Tên Nhân Viên</th>
                  <th className={th}>Bộ Phận</th>
                  <th className={th}>Chức Vụ</th>
                  <th className={th}>Check-In</th>
                  <th className={th}>Check-Out</th>
                  <th className={th}>Tổng Giờ</th>
                  {role !== 30 && <th className={th}>Vào Phụ</th>}
                  {role !== 30 && <th className={th}>Ra Phụ</th>}
                  {role !== 30 && <th className={th}>T.Giờ Phụ</th>}
                  <th className={th}>Ngày</th>
                  <th className={th}>Trạng Thái</th>
                  <th className={`${th} text-center`}>Phiếu</th>
                  <th className={`${th} text-center`}>Kiện</th>
                  <th className={`${th} text-center`}>Dòng</th>
                  <th className={th}>Ghi Chú</th>
                  {role !== 30 && (
                    <th className={`${th} text-center`}>Thao Tác</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={role === 30 ? 14 : 19}
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
                      colSpan={role === 30 ? 14 : 19}
                      className="text-center py-16 text-sm text-muted-foreground"
                    >
                      <div className="text-4xl mb-3 opacity-30">⏱</div>Chưa có
                      dữ liệu chấm công
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const isChecked = selected.has(r._id);
                    const hasCheckout = !!r.gio_ra;
                    const isViPham = !!r.vi_pham_cham_ho;
                    const isLocked = !!r.is_locked;

                    return (
                      <tr
                        key={r._id}
                        className={`transition-colors ${
                          isLocked
                            ? "bg-orange-500/5 hover:bg-orange-500/8 opacity-60"
                            : isViPham
                              ? "bg-red-500/5 hover:bg-red-500/10"
                              : isChecked
                                ? "bg-emerald-500/5"
                                : "hover:bg-muted/20"
                        }`}
                      >
                        <td className={td}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(r._id)}
                            disabled={isLocked}
                            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
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
                        <td className={`${td} text-muted-foreground`}>
                          {r.chuc_vu || "—"}
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

                        {role !== 30 && (
                          <td className={td}>
                            <InlineCellEdit
                              record={r}
                              field="gio_vao_phu"
                              onSaved={fetchData}
                            />
                          </td>
                        )}
                        {role !== 30 && (
                          <td className={td}>
                            <InlineCellEdit
                              record={r}
                              field="gio_ra_phu"
                              minTimeField="gio_vao_phu"
                              onSaved={fetchData}
                            />
                          </td>
                        )}
                        {role !== 30 && (
                          <td className={td}>
                            <span
                              className={`font-mono text-sm font-semibold ${r.tong_gio_phu > 0 ? "text-teal-400" : "text-muted-foreground/30"}`}
                            >
                              {r.tong_gio_phu > 0
                                ? formatTongGio(r.tong_gio_phu)
                                : "—"}
                            </span>
                          </td>
                        )}

                        <td className={`${td} text-muted-foreground`}>
                          {formatDate(r.ngay)}
                        </td>

                        <td className={td}>
                          <div className="flex flex-col gap-1.5">
                            {isLocked ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                title={r.ly_do_khoa}
                              >
                                🔒 Đã khóa
                              </span>
                            ) : hasCheckout ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Hợp lệ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                                Chưa Hợp lệ
                              </span>
                            )}
                            {isViPham && (
                              <button
                                onClick={() => setViPhamModal(r)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/25 transition-colors cursor-pointer"
                              >
                                <span className="animate-pulse">🚨</span>Vi phạm
                                {r.vi_pham_so_lan > 1 && (
                                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                    {r.vi_pham_so_lan}x
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className={`${td} text-center`}>
                          {r.so_phieu != null ? (
                            <span className="font-semibold text-violet-400 bg-violet-500/8 px-2 py-0.5 rounded text-xs">
                              {r.so_phieu.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td className={`${td} text-center`}>
                          {r.so_kien != null ? (
                            <span className="font-semibold text-sky-400 bg-sky-500/8 px-2 py-0.5 rounded text-xs">
                              {r.so_kien.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td className={`${td} text-center`}>
                          {r.so_dong != null ? (
                            <span className="font-semibold text-orange-400 bg-orange-500/8 px-2 py-0.5 rounded text-xs">
                              {r.so_dong.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">
                              —
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

                        {/* Thao tác — chỉ hiện với role !== 30 */}
                        {role !== 30 && (
                          <td className={`${td} text-center`}>
                            <div className="flex items-center justify-center gap-1.5">
                              {!isLocked && (
                                <button
                                  onClick={() => setGhiChuModal(r)}
                                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:border-ring hover:text-foreground transition-colors"
                                >
                                  Ghi chú
                                </button>
                              )}
                              <button
                                onClick={() => setKhoaModal(r)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                  isLocked
                                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15"
                                    : "text-orange-400 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15"
                                }`}
                              >
                                {isLocked ? "🔓 Mở khóa" : "🔒 Khóa"}
                              </button>
                            </div>
                          </td>
                        )}
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
