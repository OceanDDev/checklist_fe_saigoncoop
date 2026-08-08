/* eslint-disable react/prop-types */
// components/chamcong/ExportChamCongMau.jsx
// Xuất Excel theo mẫu chấm công chính thức — luôn xuất TOÀN BỘ dữ liệu của
// tháng/năm được chọn, KHÔNG phụ thuộc vào việc tích chọn (checkbox) ở bảng.
// Usage: <ExportChamCongMau records={data} />   // data = toàn bộ danh sách chấm công (chưa lọc)

import { useState } from "react";
import ExcelJS from "exceljs";

function tinhGioThuc(tongGio, gioVao) {
  if (!tongGio || tongGio <= 0) return 0;
  if (tongGio < 5) return tongGio;

  if (gioVao) {
    const d = new Date(gioVao);
    const isAfter11 =
      d.getHours() > 11 || (d.getHours() === 11 && d.getMinutes() > 0);
    if (isAfter11) return tongGio - 0.75; // trừ 45p
  }

  return tongGio - 1; // trừ 1 giờ
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

// ─── Hàm tạo file Excel thật (đổi tên để không trùng với component) ──────────
async function generateBangChamCongExcel(
  records,
  { year, month, donVi, boPhan, nguoiLap, phoGiamDoc, kqGiamDoc } = {},
) {
  const y = year || new Date().getFullYear();
  const m = month || new Date().getMonth() + 1;
  const days = daysInMonth(y, m);
  const thus = getThuInMonth(y, m, days);

  // Gom theo nhân viên, bỏ qua các ngày đã bị khóa
  const byNV = {};
  for (const r of records) {
    if (r.is_locked) continue;
    const ma = r.ma_nhan_vien;
    if (!byNV[ma]) byNV[ma] = { ...r, ngayMap: {} };
    byNV[ma].ngayMap[new Date(r.ngay).getDate()] = r;
  }
  const employees = Object.values(byNV);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`T${m}-${y}`, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", ySplit: 5, xSplit: 5 }],
  });

  const COL_START = 6;
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 13;
  for (let i = 0; i < days; i++) ws.getColumn(COL_START + i).width = 5.2;
  const colTongGio = COL_START + days;
  const colTongCong = colTongGio + 1;
  ws.getColumn(colTongGio).width = 10;
  ws.getColumn(colTongCong).width = 11;
  const lastCol = colTongCong;

  const thin = { style: "thin" };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

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

  // ── Letterhead: Đơn vị / Bộ phận ─────────────────────────────────────────
  ws.getRow(1).height = 18;
  ws.mergeCells(1, 1, 1, 4);
  const donViCell = ws.getCell(1, 1);
  donViCell.value = `Đơn vị: ${donVi || ""}`;
  donViCell.font = { bold: true, size: 11, name: "Arial" };
  donViCell.alignment = { horizontal: "left", vertical: "middle" };
  donViCell.border = {};

  ws.getRow(2).height = 18;
  ws.mergeCells(2, 1, 2, 4);
  const boPhanCell = ws.getCell(2, 1);
  boPhanCell.value = `Bộ phận: ${boPhan || ""}`;
  boPhanCell.font = { bold: true, size: 11, name: "Arial" };
  boPhanCell.alignment = { horizontal: "left", vertical: "middle" };
  boPhanCell.border = {};

  // ── Title ─────────────────────────────────────────────────────────────
  ws.getRow(3).height = 26;
  ws.mergeCells(3, 1, 3, lastCol);
  const title = ws.getCell(3, 1);
  title.value = `BẢNG CHẤM CÔNG THÁNG ${String(m).padStart(2, "0")} NĂM ${y}`;
  title.font = { bold: true, size: 14, name: "Arial" };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.border = {};

  // ── Header bảng ───────────────────────────────────────────────────────
  const HDR = {
    font: { bold: true, size: 10, name: "Arial", color: { argb: "FFFFFFFF" } },
    fill: "FF1F7A45",
    align: "center",
  };
  ws.getRow(4).height = 30;
  for (const [col, label] of [
    [1, "STT"],
    [2, "Mã NV"],
    [3, "Họ & Tên"],
    [4, "Bộ phận"],
    [5, "Chức danh"],
  ]) {
    ws.mergeCells(4, col, 5, col);
    cell(4, col, label, HDR);
  }
  for (let d = 1; d <= days; d++)
    cell(4, COL_START + d - 1, String(d).padStart(2, "0"), HDR);
  ws.mergeCells(4, colTongGio, 4, colTongCong);
  cell(4, colTongGio, "Tổng cộng", HDR);

  ws.getRow(5).height = 18;
  for (let d = 0; d < days; d++) {
    const thu = thus[d];
    cell(5, COL_START + d, thu, {
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
  cell(5, colTongGio, "Giờ công", subOpts);
  cell(5, colTongCong, "Tổng công", subOpts);

  // ── Dữ liệu nhân viên ─────────────────────────────────────────────────
  const DATA_START_ROW = 6;
  employees.forEach((emp, idx) => {
    const row = DATA_START_ROW + idx;
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
      const col = COL_START + d - 1;
      const rec = emp.ngayMap[d];
      if (!rec) {
        const c = ws.getCell(row, col);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        c.border = border;
        continue;
      }

      const vaoPhu = rec.gio_vao_phu ? new Date(rec.gio_vao_phu) : null;
      const raPhu = rec.gio_ra_phu ? new Date(rec.gio_ra_phu) : null;
      const vao = rec.gio_vao ? new Date(rec.gio_vao) : null;
      const ra = rec.gio_ra ? new Date(rec.gio_ra) : null;

      const gioStart = vaoPhu || vao;
      const gioEnd = raPhu || ra;

      if (gioStart && gioEnd && gioEnd > gioStart) {
        const raw = (gioEnd - gioStart) / 3_600_000;
        const thuc = tinhGioThuc(raw, gioStart);
        tongGioThuc += thuc;
        cell(row, col, parseFloat(thuc.toFixed(1)), {
          font: { size: 10, name: "Arial" },
          fill: vaoPhu || raPhu ? "FFD9EAD3" : "FFE2EFDA",
          align: "center",
        });
      } else {
        const c = ws.getCell(row, col);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        c.border = border;
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

  // ── Chữ ký cuối bảng ──────────────────────────────────────────────────
  const today = new Date();
  const signRow1 = DATA_START_ROW + employees.length + 2;
  ws.mergeCells(signRow1, lastCol - 4, signRow1, lastCol);
  const dateCell = ws.getCell(signRow1, lastCol - 4);
  dateCell.value = `Ngày ${String(today.getDate()).padStart(2, "0")} tháng ${String(today.getMonth() + 1).padStart(2, "0")} năm ${today.getFullYear()}`;
  dateCell.font = { italic: true, size: 10, name: "Arial" };
  dateCell.alignment = { horizontal: "center" };
  dateCell.border = {};

  const signRow2 = signRow1 + 1;
  const signLabelCols = [
    [1, Math.floor(lastCol / 3), "NGƯỜI LẬP", nguoiLap],
    [
      Math.floor(lastCol / 3) + 1,
      Math.floor((2 * lastCol) / 3),
      "PHÓ GIÁM ĐỐC",
      phoGiamDoc,
    ],
    [Math.floor((2 * lastCol) / 3) + 1, lastCol, "KQ. GIÁM ĐỐC", kqGiamDoc],
  ];
  for (const [start, end, label] of signLabelCols) {
    ws.mergeCells(signRow2, start, signRow2, end);
    const c = ws.getCell(signRow2, start);
    c.value = label;
    c.font = { bold: true, size: 10, name: "Arial" };
    c.alignment = { horizontal: "center" };
    c.border = {};
  }

  const signRow3 = signRow2 + 3; // để trống vài dòng cho chữ ký tay
  for (const [start, end, , name] of signLabelCols) {
    ws.mergeCells(signRow3, start, signRow3, end);
    const c = ws.getCell(signRow3, start);
    c.value = name || "";
    c.font = { italic: true, size: 10, name: "Arial" };
    c.alignment = { horizontal: "center" };
    c.border = {};
  }

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

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExportChamCongMau({ records = [] }) {
  const now = new Date();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [donVi, setDonVi] = useState("KHO VỆ TINH BÌNH DƯƠNG");
  const [boPhan, setBoPhan] = useState("XUẤT HÀNG");
  const [nguoiLap, setNguoiLap] = useState("Nguyễn Văn Nam");
  const [phoGD, setPhoGD] = useState("Huỳnh Đăng Khoa");
  const [kqGD, setKqGD] = useState("Đỗ Xuân Thành");

  const handleExport = async () => {
    setLoading(true);
    try {
      // Luôn lọc từ TOÀN BỘ `records` theo tháng/năm đang chọn —
      // không liên quan gì đến việc tích chọn dòng nào trên bảng.
      const filtered = records.filter((r) => {
        const d = new Date(r.ngay);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      if (filtered.length === 0) {
        alert(`Không có dữ liệu chấm công trong Tháng ${month}/${year}`);
        return;
      }

      await generateBangChamCongExcel(filtered, {
        year,
        month,
        donVi,
        boPhan,
        nguoiLap,
        phoGiamDoc: phoGD,
        kqGiamDoc: kqGD,
      });
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Xuất Excel thất bại: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all";

  return (
    <>
      {/* Trigger button */}
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
        Xuất Mẫu Chính Thức
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
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

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Tháng / Năm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tháng
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className={inputCls}
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
                    className={inputCls}
                    min={2020}
                    max={2099}
                  />
                </div>
              </div>

              {/* Đơn vị / Bộ phận */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Đơn vị
                </label>
                <input
                  type="text"
                  value={donVi}
                  onChange={(e) => setDonVi(e.target.value)}
                  placeholder="VD: KHO VỆ TINH BÌNH DƯƠNG"
                  className={inputCls}
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
                  placeholder="VD: XUẤT HÀNG"
                  className={inputCls}
                />
              </div>

              {/* Ký tên */}
              <div className="pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Ký tên
                </p>
                <div className="space-y-2.5">
                  {[
                    ["Người lập", nguoiLap, setNguoiLap],
                    ["Phó Giám đốc", phoGD, setPhoGD],
                    ["KQ. Giám đốc", kqGD, setKqGD],
                  ].map(([label, val, set]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 shrink-0">
                        {label}
                      </span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ghi chú */}
              <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-400 space-y-1">
                <p className="font-semibold">📌 Lưu ý:</p>
                <p>
                  • Xuất TOÀN BỘ nhân viên có dữ liệu trong tháng/năm đã chọn —
                  không cần tích chọn dòng nào trên bảng.
                </p>
                <p>• Ngày đã khóa sẽ không được tính công.</p>
                <p>
                  • Dưới 5h → giữ nguyên | Từ 5h trở lên → trừ 1h (giờ nghỉ).
                </p>
              </div>
            </div>

            {/* Footer */}
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
                className="flex-1 py-3 text-sm font-bold bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">◌</span>
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <span>⬇</span>
                    Xuất Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
