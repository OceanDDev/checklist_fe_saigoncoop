/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
import { nangsuatService } from "@/services/nangsuat.service";

const REQUIRED_COLS = ["doc_number", "status", "from_zone", "to_zone"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "dd/MM/yy" → Date object (UTC midnight) | null */
const parseDateStr = (str) => {
  if (!str || str.startsWith("0/")) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const iso = `20${y.trim()}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const dt = new Date(iso);
  return isNaN(dt) ? null : dt;
};

// Ghép date "dd/MM/yy" + time "HH:MM" thành datetime đầy đủ
const mergeDateTimeStr = (dateStr, timeStr) => {
  const d = parseDateStr(dateStr);
  if (!d) return null;
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  }
  return d;
};

/**
 * 4 trạng thái, ngưỡng 24h — dùng datetime đầy đủ (date + time ghép lại)
 */
const calcStatusPhieu = (
  dateAssignedStr,
  timeAssignedStr,
  dateCompletedStr,
  timeCompletedStr,
) => {
  const assigned = mergeDateTimeStr(dateAssignedStr, timeAssignedStr);
  if (!assigned) return { value: 0, label: "Đang Pick" };

  const completed = mergeDateTimeStr(dateCompletedStr, timeCompletedStr);
  const hasCompleted = completed !== null;
  const diffHours =
    ((hasCompleted ? completed : new Date()) - assigned) / 3600000;

  if (!hasCompleted)
    return diffHours <= 24
      ? { value: 0, label: "Đang Pick" }
      : { value: 0, label: "Pick Trễ Hạn" };

  return diffHours <= 24
    ? { value: 1, label: "Đúng Hạn" }
    : { value: 0, label: "Trễ Hạn" };
};

// ─── Parser file TXT WHS144 (fixed-width character positions) ─────────────────
//
// Vị trí các cột đo từ file thực tế (0-indexed, slice end exclusive):
//   doc_number    [  6: 13]
//   status        [ 16: 25]
//   from_zone     [ 34: 36]
//   to_zone       [ 40: 42]
//   date_created  [ 46: 54]
//   date_assigned [ 56: 64]
//   time_assigned [ 66: 71]
//   date_completed[ 73: 81]
//   time_completed[ 83: 88]
//   assigned_to   [ 90:108]
//   total_lines   [110:113]
//   total_eaches  [115:124]
//   total_reaches [126:131]
//
const COLS = [
  { name: "doc_number", s: 6, e: 13 },
  { name: "status", s: 16, e: 25 },
  { name: "from_zone", s: 34, e: 36 },
  { name: "to_zone", s: 40, e: 42 },
  { name: "date_created", s: 46, e: 54 },
  { name: "date_assigned", s: 56, e: 64 },
  { name: "time_assigned", s: 66, e: 71 },
  { name: "date_completed", s: 73, e: 81 },
  { name: "time_completed", s: 83, e: 88 },
  { name: "assigned_to", s: 90, e: 108 },
  { name: "total_lines", s: 110, e: 113 },
  { name: "total_eaches", s: 115, e: 124 },
  { name: "total_reaches", s: 126, e: 131 },
];

const sliceField = (line, s, e) =>
  (line.length >= s ? line.slice(s, Math.min(e, line.length)) : "").trim();

const parseWHS144 = (text) => {
  const lines = text.split(/\r?\n/);
  const dataLines = lines.filter((line) => /^\s*\d{7,}/.test(line));

  return dataLines.map((line) => {
    // Đọc từng field theo vị trí cố định
    const f = {};
    for (const { name, s, e } of COLS) f[name] = sliceField(line, s, e);

    const isValidCompleted =
      f.date_completed && !f.date_completed.startsWith("0/");

    const sp = calcStatusPhieu(
      f.date_assigned,
      f.time_assigned,
      isValidCompleted ? f.date_completed : null,
      isValidCompleted ? f.time_completed : null,
    );

    return {
      // ── String ────────────────────────────────────────
      doc_number: f.doc_number,
      status: f.status,
      from_zone: f.from_zone.toUpperCase(),
      to_zone: f.to_zone.toUpperCase(),
      loai: "transfer",

      // ── Date (Date | null) ────────────────────────────
      date_created: parseDateStr(f.date_created),
      date_assigned: parseDateStr(f.date_assigned),
      date_completed: isValidCompleted ? parseDateStr(f.date_completed) : null,

      // ── Time "HH:MM" ──────────────────────────────────
      time_assigned: f.time_assigned,
      time_completed: isValidCompleted ? f.time_completed : "",

      // ── assigned_to: String — lưu thẳng tên từ TXT ─────
      assigned_to: f.assigned_to || null,

      // ── Numeric ───────────────────────────────────────
      total_lines: Number(f.total_lines) || 0,
      total_eaches: Number(f.total_eaches) || 0,
      total_reaches: Number(f.total_reaches) || 0,

      // ── status_phieu: Number (0|1) ────────────────────
      status_phieu: sp.value,

      // ── UI-only (strip trước khi gửi API) ─────────────
      _status_phieu_label: sp.label,
    };
  });
};

const validate = (rows) => {
  if (!rows.length) return "File không có dữ liệu hợp lệ";
  const missing = REQUIRED_COLS.filter((k) => !(k in rows[0]));
  if (missing.length) return `Thiếu cột bắt buộc: ${missing.join(", ")}`;
  return null;
};

/** Format Date object / ISO string → "dd/MM/yy" */
const fmtDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
};

const PhieuBadge = ({ val }) => {
  const map = {
    Pick: "bg-blue-100 text-blue-700",
    "Pick trễ hạn": "bg-red-100 text-red-700",
    "Đúng hạn": "bg-emerald-100 text-emerald-700",
    Trễ: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${map[val] ?? "bg-gray-100 text-gray-600"}`}
    >
      {val}
    </span>
  );
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const ImportNangSuat = ({ onImportSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseWHS144(e.target.result);
        const err = validate(rows);
        if (err) {
          setError(err);
          return;
        }
        setTotalRows(rows.length);
        setPreview(rows.slice(0, 5));
      } catch {
        setError("Không đọc được file");
      }
    };
    reader.readAsText(f, "utf-8");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file || error) return;
    setLoading(true);
    try {
      const text = await file.text();
      const docs = parseWHS144(text);
      // eslint-disable-next-line no-unused-vars
      const payload = docs.map(({ _status_phieu_label, ...rest }) => rest);

      // 1. Lấy tất cả doc_number hiện có trong DB
      setLoadingStep("Đang kiểm tra dữ liệu hiện có...");
      const existing = await nangsuatService.getAll({ limit: 99999 });
      const existingMap = new Map(
        (existing?.data ?? []).map((r) => [r.doc_number, r._id]),
      );

      // 2. Tách thành insert mới và update cũ
      const toInsert = payload.filter((d) => !existingMap.has(d.doc_number));
      const toUpdate = payload
        .filter((d) => existingMap.has(d.doc_number))
        .map((d) => ({ id: existingMap.get(d.doc_number), data: d }));

      setLoadingStep(
        `Đang thêm ${toInsert.length} mới · cập nhật ${toUpdate.length} phiếu...`,
      );

      // 3. Thực thi song song
      const [insertRes, updateRes] = await Promise.all([
        toInsert.length > 0
          ? nangsuatService.addMany(toInsert)
          : Promise.resolve({ inserted: 0 }),
        toUpdate.length > 0
          ? nangsuatService.updateMany(toUpdate)
          : Promise.resolve({ modified: 0 }),
      ]);

      const inserted =
        insertRes?.inserted ?? insertRes?.data?.inserted ?? toInsert.length;
      const updated =
        updateRes?.modified ?? updateRes?.data?.modified ?? toUpdate.length;
      setResult({ inserted, updated, total: docs.length });
      onImportSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setTotalRows(0);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };
  const close = () => {
    setOpen(false);
    reset();
  };

  const previewCols = [
    { key: "doc_number", label: "Doc #" },
    { key: "status", label: "Status" },
    { key: "from_zone", label: "From" },
    { key: "to_zone", label: "To" },
    { key: "date_assigned", label: "Date Assigned" },
    { key: "date_completed", label: "Date Completed" },
    { key: "assigned_to", label: "Nhân viên" },
    { key: "total_lines", label: "Lines" },
    { key: "total_eaches", label: "Eaches" },
    { key: "total_reaches", label: "Reaches" },
    { key: "_status_phieu_label", label: "Status phiếu" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-indigo-200 transition-all duration-150"
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
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4"
          />
        </svg>
        Import WHS144
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  Import Phiếu Năng Suất — WHS144
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  File TXT xuất từ JDA · Cột bắt buộc:{" "}
                  <span className="font-medium text-gray-500">
                    {REQUIRED_COLS.join(", ")}
                  </span>
                </p>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Drop zone */}
              {!result && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    file
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                  {file ? (
                    <>
                      <svg
                        className="w-7 h-7 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                      </svg>
                      <p className="text-sm font-semibold text-indigo-600">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB ·{" "}
                        <span className="font-semibold text-indigo-500">
                          {totalRows}
                        </span>{" "}
                        phiếu
                      </p>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-7 h-7 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8"
                        />
                      </svg>
                      <p className="text-sm text-gray-400">
                        Kéo thả hoặc{" "}
                        <span className="text-indigo-500 font-semibold">
                          chọn file TXT
                        </span>
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                  <svg
                    className="w-4 h-4 mt-0.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              )}

              {/* Preview table */}
              {preview.length > 0 && !result && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    Xem trước (5 dòng đầu)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          {previewCols.map((c) => (
                            <th
                              key={c.key}
                              className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            {previewCols.map((c) => (
                              <td
                                key={c.key}
                                className="px-2 py-1.5 text-gray-600 whitespace-nowrap max-w-[140px] truncate"
                              >
                                {c.key === "_status_phieu_label" ? (
                                  <PhieuBadge val={row[c.key]} />
                                ) : c.key === "date_assigned" ||
                                  c.key === "date_completed" ? (
                                  row[c.key] ? (
                                    <span>
                                      {fmtDate(row[c.key])}{" "}
                                      <span className="text-gray-400">
                                        {c.key === "date_assigned"
                                          ? row.time_assigned
                                          : row.time_completed}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )
                                ) : row[c.key] !== "" &&
                                  row[c.key] !== null &&
                                  row[c.key] !== undefined ? (
                                  String(row[c.key])
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Success */}
              {result && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg
                      className="w-7 h-7 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    Import thành công!
                  </p>
                  <p className="text-xs text-gray-400 text-center">
                    <span className="text-emerald-600 font-bold">
                      {result.inserted}
                    </span>{" "}
                    phiếu mới
                    {result.updated > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-blue-600 font-bold">
                          {result.updated}
                        </span>{" "}
                        cập nhật
                      </>
                    )}{" "}
                    / {result.total} tổng
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              {!result ? (
                <>
                  <button
                    onClick={reset}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Xóa file
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!file || !!error || loading}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-95"
                  >
                    {loading && (
                      <svg
                        className="w-4 h-4 animate-spin"
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
                    )}
                    {loading ? "Đang import..." : "Xác nhận import"}
                  </button>
                </>
              ) : (
                <button
                  onClick={close}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all active:scale-95"
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
};

export default ImportNangSuat;
