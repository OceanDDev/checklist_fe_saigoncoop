/* eslint-disable react/prop-types */
// pages/chamcong/ImportNangSuat.jsx
import { useState, useRef } from "react";
import { chamCongService } from "@/services/chamcong.service";
import ExcelJS from "exceljs";

// Đọc file .xlsx, parse sheet "NangSuat" hoặc sheet đầu tiên
async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  // Ưu tiên sheet tên "NangSuat", fallback sheet đầu tiên
  const ws = wb.getWorksheet("NangSuat") || wb.worksheets[0];
  if (!ws) throw new Error("Không tìm thấy sheet dữ liệu");

  // Tìm hàng header (chứa "id")
  let headerRow = null;
  let headerRowIdx = -1;
  ws.eachRow((row, idx) => {
    if (headerRow) return;
    const vals = row.values.map((v) =>
      String(v ?? "")
        .toLowerCase()
        .trim(),
    );
    if (vals.includes("id")) {
      headerRow = vals;
      headerRowIdx = idx;
    }
  });
  if (!headerRow) throw new Error('Không tìm thấy hàng header có cột "id"');

  const idxOf = (names) => {
    for (const n of names) {
      const i = headerRow.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  const iId = idxOf(["id", "mã nv", "ma_nhan_vien"]);
  const iNgay = idxOf(["ngay", "ngày", "ngay_nang_suat", "date"]);
  const iPhieu = idxOf(["phiếu", "phieu", "so_phieu"]);
  const iKien = idxOf(["kiện", "kien", "so_kien"]);
  const iDong = idxOf(["dòng", "dong", "so_dong"]);

  if (iId === -1) throw new Error('Không tìm thấy cột "id" trong header');
  if (iNgay === -1) throw new Error('Không tìm thấy cột "Ngay" trong header');

  const rows = [];
  ws.eachRow((row, idx) => {
    if (idx <= headerRowIdx) return; // bỏ qua header và trên
    const vals = row.values; // 1-indexed
    const id = String(vals[iId] ?? "")
      .trim()
      .toUpperCase();
    // Bỏ qua dòng rỗng, dòng ghi chú, dòng ví dụ
    // ID hợp lệ phải là dạng chữ + số: Y16, F25, NV001, ...
    if (!id) return;
    if (!/^[A-Z]{1,4}\d+$/i.test(id)) return;
    // Parse ngày — hỗ trợ Date object (ExcelJS tự parse), string DD/MM/YYYY, YYYY-MM-DD
    let ngay_nang_suat = "";
    const rawNgay = vals[iNgay];
    if (rawNgay instanceof Date) {
      const [y, m, d] = rawNgay.toISOString().slice(0, 10).split("-");
      ngay_nang_suat = `${y}-${d}-${m}`; // swap tháng ↔ ngày
    } else if (rawNgay) {
      const s = String(rawNgay).trim();
      const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmY)
        ngay_nang_suat = `${dmY[3]}-${dmY[2].padStart(2, "0")}-${dmY[1].padStart(2, "0")}`;
      else ngay_nang_suat = s;
    }
    if (!ngay_nang_suat) return; // bỏ qua dòng thiếu ngày
    const phieu = Number(vals[iPhieu]) || 0;
    const kien = Number(vals[iKien]) || 0;
    const dong = Number(vals[iDong]) || 0;
    rows.push({ id, ngay_nang_suat, phieu, kien, dong });
  });

  if (rows.length === 0)
    throw new Error("File không có dữ liệu (từ hàng 6 trở đi)");
  return rows;
}

// "2026-09-03" → "03/09/2026"
function fmtNgay(s) {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function ImportNangSuat({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("upload"); // upload | preview | result
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParsed(null);
    setError("");
    setResult(null);
    setLoading(false);
  };
  const handleClose = () => {
    setOpen(false);
    reset();
  };

  // Download template — tạo bằng ExcelJS ngay trên trình duyệt
  const handleDownloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("NangSuat");

    const thin = { style: "thin", color: { argb: "FFCCCCCC" } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    const mkFill = (hex) => ({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + hex },
    });

    ws.columns = [
      { key: "id", width: 14 },
      { key: "Ngay", width: 14 },
      { key: "Phieu", width: 12 },
      { key: "Kien", width: 12 },
      { key: "Dong", width: 12 },
      { key: "GhiChu", width: 26 },
    ];

    // Row 1 — title
    ws.mergeCells("A1:F1");
    const t = ws.getCell("A1");
    t.value = "BANG NANG SUAT CUOI NGAY";
    t.font = {
      name: "Arial",
      bold: true,
      size: 14,
      color: { argb: "FFFFFFFF" },
    };
    t.fill = mkFill("5B2D8E");
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // Row 2 — header
    const hdrs = ["id", "Ngay", "Phieu", "Kien", "Dong", "Ghi chu"];
    const hBgs = ["5B2D8E", "2E7D32", "1565C0", "00695C", "E65100", "424242"];
    hdrs.forEach((h, i) => {
      const c = ws.getCell(2, i + 1);
      c.value = h;
      c.font = {
        name: "Arial",
        bold: true,
        size: 11,
        color: { argb: "FFFFFFFF" },
      };
      c.fill = mkFill(hBgs[i]);
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = border;
    });
    ws.getRow(2).height = 26;

    ws.getRow(3).height = 20;

    // Rows 4-53 — empty data, cột Ngay (col 2) set text format
    const thin2 = { style: "thin", color: { argb: "FFDDDDDD" } };
    const b2 = { top: thin2, left: thin2, bottom: thin2, right: thin2 };
    for (let r = 4; r <= 53; r++) {
      const bg = r % 2 === 0 ? "FFFFFF" : "F3EEFF";
      for (let col = 1; col <= 6; col++) {
        const c = ws.getCell(r, col);
        if (col === 2) c.numFmt = "@"; // text format — tránh Excel tự đổi thành date
        c.fill = mkFill(bg);
        c.alignment = {
          horizontal: col < 5 ? "center" : "left",
          vertical: "middle",
        };
        c.border = b2;
      }
      ws.getRow(r).height = 20;
    }

    // Row 54 — note
    ws.mergeCells("A54:F54");
    const note = ws.getCell("A54");
    note.value =
      "LUU Y: id=Ma NV (VD: Y16). Ngay=YYYY-MM-DD (VD: 2026-03-10). So lieu la so nguyen. Khong xoa hang 2.";
    note.font = {
      name: "Arial",
      italic: true,
      size: 9,
      color: { argb: "FFCC0000" },
    };
    note.fill = mkFill("FFF8E1");
    note.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(54).height = 18;

    ws.views = [{ state: "frozen", ySplit: 2, xSplit: 0 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nang_suat_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Xử lý file drop/select
  const handleFile = async (f) => {
    if (!f) return;
    if (!f.name.match(/\.xlsx?$/i)) {
      setError("Chỉ hỗ trợ file .xlsx");
      return;
    }
    setError("");
    setFile(f);
    try {
      const rows = await parseExcelFile(f);
      setParsed(rows);
      setStep("preview");
    } catch (e) {
      setError(e.message || "Không đọc được file");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // Import
  const handleImport = async () => {
    if (!parsed?.length) return;
    setLoading(true);
    try {
      const res = await chamCongService.importNangSuat({ data: parsed });
      setResult(res);
      setStep("result");
      onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Import thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-sm font-semibold rounded-xl border border-violet-500/30 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Import Năng Suất
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  📊 Import Năng Suất Cuối Ngày
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload file Excel theo mẫu
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* ── STEP: UPLOAD ── */}
              {step === "upload" && (
                <>
                  {/* Download template */}
                  <div className="flex items-center justify-between px-4 py-3 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                    <div className="text-sm">
                      <p className="font-semibold text-violet-400">
                        📥 Tải file mẫu
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Điền dữ liệu vào mẫu rồi upload lại
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Tải mẫu .xlsx
                    </button>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all
                      ${
                        dragging
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-border hover:border-violet-500/50 hover:bg-muted/30 bg-muted/10"
                      }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files[0])}
                    />
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
                      ${dragging ? "bg-violet-500/20" : "bg-muted/40"}`}
                    >
                      <svg
                        className={`w-7 h-7 ${dragging ? "text-violet-400" : "text-muted-foreground"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">
                        {dragging
                          ? "Thả file vào đây"
                          : "Kéo thả hoặc click để chọn file"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Chỉ hỗ trợ .xlsx
                      </p>
                    </div>
                    {file && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <span className="text-emerald-400 text-sm">📄</span>
                        <span className="text-xs font-medium text-emerald-400 truncate max-w-xs">
                          {file.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/25 rounded-xl px-4 py-2.5">
                      ⚠ {error}
                    </p>
                  )}
                </>
              )}

              {/* ── STEP: PREVIEW ── */}
              {step === "preview" && parsed && (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                    <span className="text-emerald-400 text-lg">✓</span>
                    <div className="text-sm flex-1">
                      <span className="font-semibold text-foreground">
                        Đọc được {parsed.length} nhân viên
                      </span>
                      <span className="text-muted-foreground ml-2">từ</span>
                      <span className="text-emerald-400 ml-1 font-medium truncate">
                        {file?.name}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          {[
                            "#",
                            "Mã NV",
                            "Ngày NS",
                            "Phiếu",
                            "Kiện",
                            "Dòng",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                              {i + 1}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/8 px-2 py-0.5 rounded">
                                {row.id}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono text-emerald-400">
                              {fmtNgay(row.ngay_nang_suat)}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-violet-400">
                              {row.phieu.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-sky-400">
                              {row.kien.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-orange-400">
                              {row.dong.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/40 border-t-2 border-border font-bold">
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-xs text-muted-foreground uppercase"
                          >
                            Tổng
                          </td>
                          <td className="px-4 py-3 text-violet-400">
                            {parsed
                              .reduce((s, r) => s + r.phieu, 0)
                              .toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sky-400">
                            {parsed
                              .reduce((s, r) => s + r.kien, 0)
                              .toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-orange-400">
                            {parsed
                              .reduce((s, r) => s + r.dong, 0)
                              .toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/25 rounded-xl px-4 py-2.5">
                      ⚠ {error}
                    </p>
                  )}
                </>
              )}

              {/* ── STEP: RESULT ── */}
              {step === "result" && result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Tổng import",
                        value: result.tong_import,
                        color: "text-foreground",
                        bg: "bg-muted/40 border-border",
                      },
                      {
                        label: "Cập nhật thành công",
                        value: result.thanh_cong,
                        color: "text-emerald-400",
                        bg: "bg-emerald-500/8 border-emerald-500/20",
                      },
                      {
                        label: "Không đi làm",
                        value: result.khong_di_lam_so,
                        color: "text-red-400",
                        bg: "bg-red-500/8 border-red-500/20",
                      },
                    ].map(({ label, value, color, bg }) => (
                      <div
                        key={label}
                        className={`${bg} border rounded-xl px-4 py-3 text-center`}
                      >
                        <p className={`text-2xl font-black ${color}`}>
                          {value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {result.khong_di_lam?.length > 0 && (
                    <div className="bg-red-500/8 border border-red-500/20 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-red-500/20">
                        <p className="text-sm font-semibold text-red-400">
                          ⚠ Có năng suất nhưng không có dữ liệu chấm công ngày
                          đó
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-red-500/10">
                              {[
                                "Mã NV",
                                "Ngày NS",
                                "Phiếu",
                                "Kiện",
                                "Dòng",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.khong_di_lam.map((r) => (
                              <tr
                                key={r.ma_nhan_vien + r.ngay_nang_suat}
                                className="border-b border-red-500/10 last:border-0"
                              >
                                <td className="px-4 py-2.5 font-mono font-bold text-red-400">
                                  {r.ma_nhan_vien}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                                  {fmtNgay(r.ngay_nang_suat)}
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                  {r.so_phieu ?? "—"}
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                  {r.so_kien ?? "—"}
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                  {r.so_dong ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {result.thanh_cong > 0 && (
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-400 mb-2">
                        ✓ Đã cập nhật:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.cap_nhat_thanh_cong.map((ma) => (
                          <span
                            key={ma}
                            className="font-mono text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded"
                          >
                            {ma}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-5 border-t border-border shrink-0">
              {step === "upload" && (
                <button
                  onClick={handleClose}
                  className="w-full py-3 text-sm text-muted-foreground border border-border rounded-xl hover:border-ring hover:text-foreground transition-colors font-medium"
                >
                  Hủy
                </button>
              )}
              {step === "preview" && (
                <>
                  <button
                    onClick={() => {
                      setStep("upload");
                      setError("");
                    }}
                    className="flex-1 py-3 text-sm text-muted-foreground border border-border rounded-xl hover:border-ring hover:text-foreground transition-colors font-medium"
                  >
                    ← Quay lại
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex-1 py-3 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin">◌</span> Đang import...
                      </>
                    ) : (
                      "⬆ Import Ngay"
                    )}
                  </button>
                </>
              )}
              {step === "result" && (
                <button
                  onClick={handleClose}
                  className="w-full py-3 text-sm font-bold bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
