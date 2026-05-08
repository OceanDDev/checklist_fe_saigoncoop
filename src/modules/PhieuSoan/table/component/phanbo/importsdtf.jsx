/* eslint-disable react/prop-types */
// components/phanbo/ImportSdTf.jsx
import { memo, useCallback, useRef, useState } from "react";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { phanBoService } from "@/services/phieusoan/phanbo.service";
import { phieuLeService } from "@/services/phieusoan/phieule.service";

dayjs.extend(customParseFormat);

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCEPTED_NGAY_KEYS = [
  "ngày_xử_lý",
  "ngày_xử_lí",
  "ngay_xu_ly",
  "ngay_xu_li",
  "ngày",
];
const ACCEPTED_TEN_PB_KEYS = ["tên_phân_bổ", "ten_phan_bo"];
const ACCEPTED_MACH_KEYS = ["mã_ch", "mach"];
const ACCEPTED_SKU_KEYS = ["sku"];
const ACCEPTED_SDTF_KEYS = ["sd_tf"];
const DATE_FORMATS = ["DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD"];
const STEPS = ["Đọc file", "Kiểm tra DB", "Cập nhật SD_TF", "Tạo phiếu soạn"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizeKey = (key) =>
  String(key).trim().toLowerCase().replace(/\s+/g, "_");

const parseNgay = (raw) => {
  const today = dayjs().format("YYYY-MM-DD");
  if (!raw) return today;
  if (raw instanceof Date) return dayjs(raw).format("YYYY-MM-DD");
  const str = String(raw).trim();
  for (const fmt of DATE_FORMATS) {
    const d = dayjs(str, fmt, true);
    if (d.isValid()) return d.format("YYYY-MM-DD");
  }
  return today;
};

const parseExcel = async (file) => {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("File không có sheet nào.");

  // Build header map → O(1) column lookup
  const headerRow = ws.getRow(1);
  const colIndex = {};
  headerRow.eachCell((cell, col) => {
    colIndex[normalizeKey(cell.value ?? "")] = Number(col);
  });

  const getCol = (keys) => {
    for (const k of keys) if (colIndex[k] !== undefined) return colIndex[k];
    return null;
  };

  const colTenPB = getCol(ACCEPTED_TEN_PB_KEYS);
  const colSdTf = getCol(ACCEPTED_SDTF_KEYS);
  const colMach = getCol(ACCEPTED_MACH_KEYS);
  const colSku = getCol(ACCEPTED_SKU_KEYS);
  const colNgay = getCol(ACCEPTED_NGAY_KEYS);

  if (!colTenPB || !colSdTf || !colMach || !colSku)
    throw new Error(
      "File thiếu cột bắt buộc: Tên Phân Bổ | SD_TF | Mã CH | SKU",
    );

  const rows = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const tenPhanBo = String(row.getCell(colTenPB).value ?? "").trim();
    const sdTf = String(row.getCell(colSdTf).value ?? "").trim();
    const mach = String(row.getCell(colMach).value ?? "").trim();
    const sku = String(row.getCell(colSku).value ?? "").trim();
    const rawNgay = colNgay ? row.getCell(colNgay).value : null;

    if (tenPhanBo && sdTf && mach && sku)
      rows.push({
        ten_phan_bo: tenPhanBo,
        sd_tf: sdTf,
        mach,
        sku,
        ngay_xu_li: parseNgay(rawNgay),
      });
  });

  return rows;
};

// Validate: cùng sd_tf không được dùng cho nhiều maCH
const validateRows = (rows) => {
  const sdTfToMach = new Map();
  for (const { sd_tf, mach } of rows) {
    if (!sdTfToMach.has(sd_tf)) sdTfToMach.set(sd_tf, new Set());
    sdTfToMach.get(sd_tf).add(mach);
  }
  return [...sdTfToMach.entries()]
    .filter(([, machs]) => machs.size > 1)
    .map(
      ([sd_tf, machs]) =>
        `SD_TF "${sd_tf}" đang dùng cho nhiều Mã CH: ${[...machs].join(", ")}`,
    );
};

// Fetch phanbo từ DB theo từng mach song song → Map key = mach__sku__ten_phan_bo
const fetchPhanBoMap = async (rows) => {
  const machs = [...new Set(rows.map((r) => r.mach))];
  const results = await Promise.all(
    machs.map((mach) =>
      phanBoService
        .getAllPhanBo({ limit: 9999, mach })
        .then((res) =>
          Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [],
        )
        .catch(() => []),
    ),
  );
  const map = new Map();
  for (const list of results)
    for (const pb of list)
      map.set(`${pb.mach}__${pb.sku}__${pb.ten_phan_bo}`, pb);
  return map;
};

// Group validRows theo (sd_tf + mach) → 1 phiếu per cửa hàng per sd_tf
const buildPhieuPayloads = (validRows, phanboMap) => {
  const grouped = new Map();
  for (const row of validRows) {
    const key = `${row.sd_tf}__${row.mach}`;
    const pb = phanboMap.get(`${row.mach}__${row.sku}__${row.ten_phan_bo}`);

    if (!grouped.has(key)) {
      grouped.set(key, {
        sd_tf: Number(row.sd_tf),
        mach: row.mach,
        ghi_chu_phieu: row.ten_phan_bo,
        loai_phieu: "8101",
        trang_thai: "Chờ xử lý",
        chi_tiet: [],
      });
    }

    const quantity = Number(pb?.luong_phan_bo ?? 0);
    const packUnit = pb?.pack ?? 1;
    grouped.get(key).chi_tiet.push({
      sku: Number(row.sku),
      name: pb?.name ?? "Không xác định",
      quantity,
      slot: "PB",
      pack_unit: packUnit,
      packs_to_pick: packUnit > 0 ? quantity / packUnit : 0,
    });
  }
  return [...grouped.values()];
};

// ── Step Indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center gap-1 w-full">
    {STEPS.map((label, i) => {
      const done = i < currentStep;
      const active = i === currentStep;
      return (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`h-1.5 w-full rounded-full transition-all duration-300 ${
              done
                ? "bg-emerald-400"
                : active
                  ? "bg-violet-400 animate-pulse"
                  : "bg-slate-200"
            }`}
          />
          <span
            className={`text-[10px] text-center leading-tight ${
              done
                ? "text-emerald-600"
                : active
                  ? "text-violet-600 font-medium"
                  : "text-slate-400"
            }`}
          >
            {label}
          </span>
        </div>
      );
    })}
  </div>
);

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ onClose, onImportSuccess }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(-1);
  const [state, setState] = useState({
    loading: false,
    errors: [],
    result: null,
    fileName: "",
  });

  const { loading, errors, result, fileName } = state;

  const processFile = useCallback(
    async (file) => {
      if (!file) return;
      setState({
        loading: true,
        errors: [],
        result: null,
        fileName: file.name,
      });
      setStep(0);

      try {
        // Step 0 — Parse Excel
        const rows = await parseExcel(file);
        if (rows.length === 0) {
          setState((s) => ({
            ...s,
            loading: false,
            errors: [
              "File không có dữ liệu hợp lệ. Kiểm tra cấu trúc: Tên Phân Bổ | SD_TF | Mã CH | SKU | Ngày xử lý.",
            ],
          }));
          setStep(-1);
          return;
        }

        const validationErrors = validateRows(rows);
        if (validationErrors.length > 0) {
          setState((s) => ({ ...s, loading: false, errors: validationErrors }));
          setStep(-1);
          return;
        }

        // Step 1 — Fetch & validate vs DB
        setStep(1);
        const phanboMap = await fetchPhanBoMap(rows);

        const validRows = [];
        const invalidRows = [];
        for (const row of rows) {
          (phanboMap.has(`${row.mach}__${row.sku}__${row.ten_phan_bo}`)
            ? validRows
            : invalidRows
          ).push(row);
        }

        if (validRows.length === 0) {
          setState((s) => ({
            ...s,
            loading: false,
            errors: invalidRows.map(
              (r) =>
                `Không tìm thấy: Tên PB "${r.ten_phan_bo}" · Mã CH "${r.mach}" · SKU "${r.sku}"`,
            ),
          }));
          setStep(-1);
          return;
        }

        // Step 2 — Import SD_TF
        setStep(2);
        const res = await phanBoService.importSdTf({ rows: validRows });

        // Step 3 — Tạo phiếu 8101
        setStep(3);
        const phieuPayloads = buildPhieuPayloads(validRows, phanboMap);
        const phieuResults = await Promise.allSettled(
          phieuPayloads.map((payload) =>
            phieuLeService.import8101PhieuLe(payload),
          ),
        );

        const successCount = phieuResults.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failedCount = phieuResults.filter(
          (r) => r.status === "rejected",
        ).length;

        setState((s) => ({
          ...s,
          loading: false,
          result: {
            updated: res?.updated ?? validRows.length,
            skipped: res?.skipped ?? 0,
            phieuSuccess: successCount,
            phieuFailed: failedCount,
            invalidRows: invalidRows.map(
              (r) => `"${r.ten_phan_bo}" · Mã CH "${r.mach}" · SKU ${r.sku}`,
            ),
            message: res?.message ?? "Import thành công!",
          },
        }));
        setStep(-1);
        onImportSuccess?.();
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          errors: [err?.message ?? "Lỗi không xác định khi import."],
        }));
        setStep(-1);
      }

      if (inputRef.current) inputRef.current.value = "";
    },
    [onImportSuccess],
  );

  const handleFileChange = (e) => processFile(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.name.endsWith(".xlsx")) processFile(file);
  };
  const resetFile = () => {
    setState({ loading: false, errors: [], result: null, fileName: "" });
    setStep(-1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-violet-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Import SD_TF
              </h2>
              <p className="text-xs text-slate-400">
                Cập nhật SD_TF · Tạo phiếu soạn 8101
              </p>
            </div>
          </div>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Step indicator */}
          {loading && step >= 0 && <StepIndicator currentStep={step} />}

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !loading && inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all
                ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                ${dragging ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/40"}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                disabled={loading}
                onChange={handleFileChange}
              />

              {loading ? (
                <div className="flex flex-col items-center gap-2 text-violet-600">
                  <svg
                    className="w-8 h-8 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
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
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <p className="text-sm font-medium">
                    {STEPS[step] ?? "Đang xử lý"}...
                  </p>
                  <p className="text-xs text-violet-400 truncate max-w-xs">
                    {fileName}
                  </p>
                </div>
              ) : fileName && errors.length === 0 ? (
                <div className="flex flex-col items-center gap-1 text-slate-600">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-1 text-xl">
                    📄
                  </div>
                  <p className="text-sm font-medium truncate max-w-xs">
                    {fileName}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFile();
                    }}
                    className="text-xs text-rose-400 hover:text-rose-600 mt-1"
                  >
                    Chọn file khác
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="h-12 w-12 rounded-full bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Kéo thả file vào đây hoặc{" "}
                      <span className="text-violet-600 underline underline-offset-2">
                        chọn file
                      </span>
                    </p>
                    <p className="text-xs mt-0.5">Chỉ chấp nhận file .xlsx</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lỗi */}
          {errors.length > 0 && (
            <div className="bg-rose-50 ring-1 ring-rose-200 rounded-xl px-4 py-3 space-y-1 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-rose-700 sticky top-0 bg-rose-50 pb-1">
                ❌ Lỗi validation:
              </p>
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-rose-600">
                  {e}
                </p>
              ))}
              <button
                onClick={resetFile}
                className="text-xs text-rose-400 hover:text-rose-600 underline underline-offset-2 mt-1"
              >
                Thử lại với file khác
              </button>
            </div>
          )}

          {/* Kết quả */}
          {result && (
            <div className="space-y-2">
              <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-lg shrink-0">
                  ✅
                </div>
                <p className="text-sm font-semibold text-emerald-700">
                  {result.message}
                </p>
              </div>

              <div className="bg-white ring-1 ring-slate-200 rounded-xl px-4 py-2.5">
                <p className="text-xs text-slate-500 font-medium mb-1">
                  📋 Cập nhật SD_TF
                </p>
                <p className="text-xs text-emerald-600">
                  ✅ Đã cập nhật <b>{result.updated}</b> dòng
                  {result.skipped > 0 && (
                    <span className="text-slate-400 ml-1">
                      (bỏ qua: {result.skipped})
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-white ring-1 ring-slate-200 rounded-xl px-4 py-2.5">
                <p className="text-xs text-slate-500 font-medium mb-1">
                  🧾 Phiếu soạn 8101
                </p>
                <p className="text-xs text-emerald-600">
                  ✅ Đã tạo <b>{result.phieuSuccess}</b> phiếu
                </p>
                {result.phieuFailed > 0 && (
                  <p className="text-xs text-rose-500">
                    ❌ Lỗi <b>{result.phieuFailed}</b> phiếu
                  </p>
                )}
              </div>

              {result.invalidRows?.length > 0 && (
                <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl px-4 py-2.5 max-h-32 overflow-y-auto">
                  <p className="text-xs text-amber-700 font-medium mb-1 sticky top-0 bg-amber-50">
                    ⚠️ Bỏ qua {result.invalidRows.length} dòng không tìm thấy
                    trong DB:
                  </p>
                  {result.invalidRows.map((msg, i) => (
                    <p key={i} className="text-xs text-amber-600">
                      • {msg}
                    </p>
                  ))}
                </div>
              )}

              <button
                onClick={resetFile}
                className="w-full text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 pt-1"
              >
                Import thêm file khác
              </button>
            </div>  
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors disabled:opacity-40"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ImportSdTf = memo(({ onImportSuccess }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 px-4 text-white font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Import SD_TF
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          onImportSuccess={onImportSuccess}
        />
      )}
    </>
  );
});

ImportSdTf.displayName = "ImportSdTf";
export default ImportSdTf;
