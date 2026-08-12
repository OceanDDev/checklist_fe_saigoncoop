/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  X,
  FileSpreadsheet,
  UploadCloud,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/** 1 ô upload file Excel — dùng chung, giờ chỉ nhận 1 file / lần import */
const FileDropZone = ({
  label,
  icon: Icon,
  accentColor,
  file,
  onSelect,
  onRemove,
}) => {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const colorMap = {
    blue: {
      border: "border-blue-300",
      borderActive: "border-blue-500",
      bg: "from-blue-50 to-indigo-50",
      bgActive: "from-blue-100 to-indigo-100",
      iconColor: "text-blue-500",
      badge: "bg-blue-100 text-blue-700 border-blue-300",
    },
    amber: {
      border: "border-amber-300",
      borderActive: "border-amber-500",
      bg: "from-amber-50 to-orange-50",
      bgActive: "from-amber-100 to-orange-100",
      iconColor: "text-amber-500",
      badge: "bg-amber-100 text-amber-700 border-amber-300",
    },
  };
  const c = colorMap[accentColor] || colorMap.blue;

  const handleFiles = (fileList) => {
    const picked = fileList?.[0];
    if (!picked) return;
    const ext = picked.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      alert("Chỉ chấp nhận file Excel (.xlsx, .xls)");
      return;
    }
    onSelect(picked);
  };

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={16} className={c.iconColor} strokeWidth={2.5} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-all bg-gradient-to-br ${
          isDragOver ? `${c.borderActive} ${c.bgActive}` : `${c.border} ${c.bg}`
        } ${!file ? "cursor-pointer hover:shadow-md" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {!file ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <UploadCloud size={28} className={c.iconColor} strokeWidth={1.5} />
            <p className="text-xs text-slate-500">
              Kéo thả file vào đây hoặc{" "}
              <span className="font-semibold text-slate-700 underline underline-offset-2">
                chọn file
              </span>
            </p>
            <p className="text-[11px] text-slate-400">Chỉ nhận .xlsx, .xls</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2.5 shadow-sm ring-1 ring-slate-200">
            <div className="flex min-w-0 items-center gap-2">
              <FileSpreadsheet
                size={18}
                className="shrink-0 text-emerald-600"
              />
              <span
                className="truncate text-xs font-medium text-slate-700"
                title={file.name}
              >
                {file.name}
              </span>
              <span
                className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${c.badge}`}
              >
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
                if (inputRef.current) inputRef.current.value = "";
              }}
              title="Bỏ chọn file"
              className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** 1 khối thống kê kết quả import (dùng cho cả WMS lẫn HĐ, field nào không có sẽ tự ẩn) */
const ResultStatBlock = ({ stats, accentColor }) => {
  const colorMap = {
    blue: "border-blue-200 bg-blue-50/50",
    amber: "border-amber-200 bg-amber-50/50",
  };
  return (
    <div
      className={`rounded-xl border p-3 ${colorMap[accentColor] || colorMap.blue}`}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <div className="text-slate-500">Tổng dòng đọc</div>
        <div className="text-right font-semibold text-slate-800">
          {stats?.totalRows ?? 0}
        </div>

        <div className="text-slate-500">Ghi thành công</div>
        <div className="text-right font-semibold text-emerald-600">
          {(stats?.upserted ?? 0) + (stats?.modified ?? 0)}
        </div>

        {typeof stats?.resolvedByName === "number" && (
          <>
            <div className="text-slate-500">Tra được theo tên</div>
            <div className="text-right font-semibold text-blue-600">
              {stats.resolvedByName}
            </div>
          </>
        )}

        <div className="text-slate-500">Dòng lỗi/bỏ qua</div>
        <div
          className={`text-right font-semibold ${
            stats?.invalidRows ? "text-red-600" : "text-slate-400"
          }`}
        >
          {stats?.invalidRows ?? 0}
        </div>

        {typeof stats?.unmatchedRows === "number" && (
          <>
            <div className="text-slate-500">Không khớp phiếu WMS</div>
            <div
              className={`text-right font-semibold ${
                stats.unmatchedRows ? "text-amber-600" : "text-slate-400"
              }`}
            >
              {stats.unmatchedRows}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** Danh sách chi tiết dòng lỗi/bỏ qua/không khớp — chỉ 1 nguồn (WMS hoặc HĐ) mỗi lần */
const IssueList = ({
  skippedDetails = [],
  errorDetails = [],
  unmatchedDetails = [],
}) => {
  const items = [
    ...skippedDetails.map((d) => ({ ...d, kind: "skip" })),
    ...unmatchedDetails.map((d) => ({ ...d, kind: "unmatch" })),
    ...errorDetails.map((d) => ({ ...d, kind: "error" })),
  ];
  if (items.length === 0) return null;

  const KIND_STYLE = {
    error: "bg-red-100 text-red-700",
    unmatch: "bg-blue-100 text-blue-700",
    skip: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        Chi tiết ({items.length})
      </div>
      <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-start gap-2 px-3 py-2 text-xs">
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-semibold whitespace-nowrap ${KIND_STYLE[it.kind]}`}
            >
              Dòng {it.rowNumber ?? "?"}
            </span>
            <span className="min-w-0 flex-1 text-slate-600">
              {it.reason || it.message}
              {it.sku ? (
                <span className="text-slate-400"> · SKU: {it.sku}</span>
              ) : null}
              {it.ma_ch ? (
                <span className="text-slate-400"> · Mã CH: {it.ma_ch}</span>
              ) : null}
              {it.so_hoa_don ? (
                <span className="text-slate-400"> · HĐ: {it.so_hoa_don}</span>
              ) : null}
              {it.so_phieu_hd ? (
                <span className="text-slate-400">
                  {" "}
                  · Số phiếu: {it.so_phieu_hd}
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Nút + modal import 1 file duy nhất (dùng chung cho cả WMS và Hóa Đơn — 2 luồng độc lập,
 * import lúc nào cũng được, không cần chờ đủ cả 2 file như trước).
 *
 * Props:
 * - buttonLabel: text trên nút mở modal (VD "Import WMS")
 * - modalTitle: tiêu đề modal lúc chọn file
 * - fileLabel: nhãn cho ô chọn file (VD "File WMS")
 * - fileIcon: icon cho ô chọn file
 * - accentColor: "blue" | "amber"
 * - onImport: async (file) => { durationSeconds, stats } — gọi API + trả kết quả để hiển thị
 */
const ImportSingleFile = ({
  buttonLabel,
  modalTitle,
  fileLabel,
  fileIcon,
  accentColor = "blue",
  onImport,
}) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { durationSeconds, stats }
  const [errorMsg, setErrorMsg] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const canSubmit = !!file && !submitting;

  const resetState = () => {
    setFile(null);
    setSubmitting(false);
    setResult(null);
    setErrorMsg("");
    setShowDetails(false);
  };

  const handleClose = () => {
    if (submitting) return; // không cho đóng khi đang xử lý
    setOpen(false);
    resetState();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await onImport?.(file);
      setResult(res); // hiển thị màn hình kết quả thay vì đóng modal ngay
    } catch (err) {
      console.error(`Lỗi ${buttonLabel}:`, err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Import thất bại, vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stats = result?.stats;
  const totalIssues =
    (stats?.skippedDetails?.length ?? 0) +
    (stats?.errorDetails?.length ?? 0) +
    (stats?.unmatchedDetails?.length ?? 0);

  // invalidRows (+ unmatchedRows nếu có) đếm TOÀN BỘ dòng cần chú ý, còn *Details có thể bị
  // giới hạn (MAX_DETAIL_ENTRIES ở BE) nên số lượng hiển thị chi tiết có thể ít hơn số đếm thực tế
  const totalInvalid = (stats?.invalidRows ?? 0) + (stats?.unmatchedRows ?? 0);

  const colorBtn =
    accentColor === "amber"
      ? "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
      : "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${colorBtn} px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95`}
      >
        <Upload size={16} />
        {buttonLabel}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={handleClose}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            >
              {/* Modal header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {result ? "Kết quả import" : modalTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {result
                      ? `Hoàn tất sau ${result.durationSeconds ?? "?"}s`
                      : "Chọn 1 file Excel để import"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="overflow-y-auto px-5 py-5">
                {result ? (
                  // Màn hình KẾT QUẢ sau khi import thành công
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">
                      <CheckCircle2 size={18} />
                      Import hoàn tất
                    </div>

                    <ResultStatBlock stats={stats} accentColor={accentColor} />

                    {totalInvalid > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDetails((v) => !v)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        {showDetails ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                        {showDetails ? "Ẩn" : "Xem"} chi tiết {totalInvalid}{" "}
                        dòng cần chú ý
                        {totalIssues < totalInvalid
                          ? ` (hiện ${totalIssues})`
                          : ""}
                      </button>
                    )}

                    {showDetails && (
                      <IssueList
                        skippedDetails={stats?.skippedDetails}
                        errorDetails={stats?.errorDetails}
                        unmatchedDetails={stats?.unmatchedDetails}
                      />
                    )}
                  </div>
                ) : (
                  // Màn hình CHỌN FILE
                  <>
                    {errorMsg && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                    <FileDropZone
                      label={fileLabel}
                      icon={fileIcon}
                      accentColor={accentColor}
                      file={file}
                      onSelect={setFile}
                      onRemove={() => setFile(null)}
                    />
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                {result ? (
                  <>
                    <button
                      type="button"
                      onClick={resetState}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <RotateCcw size={14} />
                      Import file khác
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className={`rounded-xl bg-gradient-to-r ${colorBtn} px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all`}
                    >
                      Đóng
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={submitting}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${colorBtn} px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95 disabled:opacity-40`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <Upload size={15} />
                          Import
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default ImportSingleFile;
