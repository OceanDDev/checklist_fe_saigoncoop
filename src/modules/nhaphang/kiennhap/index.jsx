/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Warehouse,
  FileCheck2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";
import { qcDacThuService } from "@/services/nhaphang/qcdacthu.service";

// 3 kho cố định
const KHO_LIST = [
  { kho: 810, label: "Kho 810" },
  { kho: 8101, label: "Kho 8101" },
  { kho: 8104, label: "Kho 8104" },
];

const PAGE_SIZE = 20;

// Cột của bảng + key filter tương ứng gửi lên backend qua query string
const COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Tên SP" },
  { key: "vi_tri", label: "Vị trí" },
  { key: "kien", label: "Kiện" },
  { key: "kho", label: "Kho" },
  { key: "tong_sl", label: "Tổng SL" },
  { key: "trang_thai", label: "Trạng thái" },
  { key: "ngay_nhap_kho", label: "Ngày nhập kho" },
  { key: "ngay_import", label: "Ngày import" },
];

// Map cột trong file Excel (Cxnk_ton_kho) -> field trong DB
const mapRow = (row, kho) => ({
  sku: String(row["Mã Sản Phẩm"] ?? "").trim(),
  name: String(row["Tên Sản Phẩm"] ?? "").trim(),
  vi_tri: String(row["Vị trí"] ?? "").trim(),
  kien: Number(row["Kiện"] ?? 0),
  kho: Number(kho),
  tong_sl: Number(row["Tổng SL"] ?? 0),
  trang_thai: String(row["Trạng thái phiếu"] ?? "").trim(),
  loai_hinh: "Nhập",
  ngay_nhap_kho: parseExcelDate(row["Ngày Nhập Kho"]),
});

// Ghim date-only value về 12:00 trưa UTC — giữ đúng ngày Excel, không lệch theo timezone máy chạy
const toDateOnlyUTC = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

const parseExcelDate = (value) => {
  if (!value) return undefined;

  if (value instanceof Date) {
    return toDateOnlyUTC(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }

  if (typeof value === "number") {
    const utcMs = Math.round((value - 25569) * 86400 * 1000);
    const tmp = new Date(utcMs);
    return toDateOnlyUTC(
      tmp.getUTCFullYear(),
      tmp.getUTCMonth() + 1,
      tmp.getUTCDate(),
    );
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return undefined;
  return toDateOnlyUTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
  );
};

// Đọc lại date-only bằng UTC getters — khớp với cách ghim ở trên, không phụ thuộc timezone
const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsArrayBuffer(file);
  });

// ─────────────────────────────────────────────
// LOGIC KIỆN = TỔNG SL
//
// Khi file Excel bị nhập nhầm số lượng đơn vị vào cột "Kiện" (kiện = tổng
// SL), ta không thể biết chính xác 1 kiện gồm bao nhiêu đơn vị nếu không
// tra "Quy cách" đã khai báo sẵn cho SKU đó bên bảng QC Đặc Thù.
//
// - Nếu SKU có trong QC Đặc Thù (quy_cách là số thuần, vd "12"):
//   kiện đúng = tổng SL / quy_cách (ví dụ 780 / 10 = 78).
// - Nếu SKU KHÔNG có trong QC Đặc Thù: không tự tính được -> đưa vào danh
//   sách "thiếu quy cách", chặn import cho tới khi được bổ sung.
// ─────────────────────────────────────────────
const isKienBangTongSl = (item) =>
  Number(item.kien) > 0 && Number(item.kien) === Number(item.tong_sl);

// Tra QC Đặc Thù cho 1 danh sách SKU, trả về Map<sku, quy_cach (number)>
// — chỉ nhận kết quả khớp CHÍNH XÁC sku (phòng trường hợp backend search
// theo kiểu "chứa chuỗi" trả về nhiều bản ghi gần đúng).
const fetchQuyCachMap = async (skus) => {
  const map = new Map();
  await Promise.all(
    skus.map(async (sku) => {
      try {
        const res = await qcDacThuService.getDanhSach({ sku, limit: 50 });
        const found = (res?.data || []).find((r) => r.sku === sku);
        const quyCach = found ? Number(found.quy_cach) : NaN;
        if (found && quyCach > 0) map.set(sku, quyCach);
      } catch (err) {
        console.error("Lỗi tra QC Đặc Thù cho SKU", sku, err);
      }
    }),
  );
  return map;
};

// Áp logic kiện = tổng SL lên 1 danh sách item đã map (mapRow) —
// trả về { items: [...], missingSkus: [...] }.
// missingSkus: SKU bị cảnh báo (kiện = tổng SL) nhưng chưa có quy cách
// bên QC Đặc Thù -> chặn import.
const resolveKienForItems = async (items) => {
  const flaggedSkus = [
    ...new Set(items.filter(isKienBangTongSl).map((it) => it.sku)),
  ];

  if (flaggedSkus.length === 0) {
    return { items, missingSkus: [] };
  }

  const quyCachMap = await fetchQuyCachMap(flaggedSkus);
  const missingSkus = [];

  const nextItems = items.map((item) => {
    if (!isKienBangTongSl(item)) return item;

    const quyCach = quyCachMap.get(item.sku);
    if (!quyCach) {
      if (!missingSkus.includes(item.sku)) missingSkus.push(item.sku);
      return item; // giữ nguyên số kiện cũ (sai) — sẽ bị chặn import
    }

    return { ...item, kien: Number(item.tong_sl) / quyCach };
  });

  return { items: nextItems, missingSkus };
};

// ─────────────────────────────────────────────
// MODAL IMPORT — chọn 1, 2 hoặc cả 3 kho cùng lúc, mỗi kho 1 file riêng
// ─────────────────────────────────────────────
const ImportModal = ({ onClose, onImported }) => {
  const fileInputRefs = useRef({}); // { [kho]: inputEl }
  // slots: { [kho]: { fileName, items, loading, error } | undefined }
  const [slots, setSlots] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const setSlot = (kho, patch) =>
    setSlots((prev) => ({ ...prev, [kho]: { ...prev[kho], ...patch } }));

  const handlePickFile = (kho) => {
    fileInputRefs.current[kho]?.click();
  };

  const handleFileChange = async (kho, e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file lần sau
    if (!file) return;

    setSubmitError(null);
    setSlot(kho, {
      loading: true,
      error: null,
      fileName: file.name,
      missingSkus: [],
    });

    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) {
        setSlot(kho, {
          loading: false,
          error: "File không có dữ liệu",
          items: null,
        });
        return;
      }
      const rawItems = rows
        .map((row) => mapRow(row, kho))
        .filter((item) => item.sku);

      // Đang tra QC Đặc Thù để tự tính lại kiện cho các SKU bị kiện = tổng SL
      setSlot(kho, { checking: true });
      const { items, missingSkus } = await resolveKienForItems(rawItems);

      setSlot(kho, {
        loading: false,
        checking: false,
        items,
        missingSkus,
        fileName: file.name,
      });
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setSlot(kho, {
        loading: false,
        checking: false,
        error: "Lỗi đọc file: " + err.message,
        items: null,
      });
    }
  };

  const handleRemoveSlot = (kho) => {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[kho];
      return next;
    });
  };

  const selectedKhoList = KHO_LIST.filter(
    ({ kho }) => slots[kho]?.items?.length,
  );
  const totalItems = selectedKhoList.reduce(
    (sum, { kho }) => sum + slots[kho].items.length,
    0,
  );
  const anyLoading = Object.values(slots).some(
    (s) => s?.loading || s?.checking,
  );

  // Danh sách SKU (gộp mọi kho) bị cảnh báo kiện = tổng SL nhưng chưa có
  // quy cách bên QC Đặc Thù -> chặn import toàn bộ file cho tới khi được
  // bổ sung quy cách.
  const allMissingSkus = [
    ...new Set(Object.values(slots).flatMap((s) => s?.missingSkus || [])),
  ];
  const anyMissing = allMissingSkus.length > 0;

  const handleConfirmImport = async () => {
    if (selectedKhoList.length === 0 || anyMissing) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Mỗi item đã gắn sẵn field kho riêng -> gộp tất cả kho đã chọn, import 1 lần
      const allItems = selectedKhoList.flatMap(({ kho }) => slots[kho].items);
      const res = await nhapHangService.importNhieu(allItems);
      const khoLabel = selectedKhoList.map(({ label }) => label).join(", ");
      onImported({
        success: true,
        message:
          res?.message ||
          `Import thành công ${allItems.length} dòng (${khoLabel})`,
      });
    } catch (err) {
      console.error("Lỗi import:", err);
      setSubmitError(err?.response?.data?.message || "Import thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import Tồn Kho Từ Excel
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-auto p-5">
          <p className="text-sm text-slate-400">
            Chọn file Excel cho 1, 2 hoặc cả 3 kho — có thể import cùng lúc.
          </p>

          {KHO_LIST.map(({ kho, label }) => {
            const slot = slots[kho];
            return (
              <div
                key={kho}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
              >
                <input
                  ref={(el) => (fileInputRefs.current[kho] = el)}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileChange(kho, e)}
                />

                <div className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium text-slate-700">
                  <Warehouse size={16} className="text-blue-600" />
                  {label}
                </div>

                <div className="min-w-0 flex-1">
                  {slot?.loading ? (
                    <span className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Loader2 size={14} className="animate-spin" /> Đang đọc
                      file...
                    </span>
                  ) : slot?.checking ? (
                    <span className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Loader2 size={14} className="animate-spin" /> Đang kiểm
                      tra quy cách...
                    </span>
                  ) : slot?.error ? (
                    <span className="flex items-center gap-1.5 text-sm text-red-600">
                      <XCircle size={14} /> {slot.error}
                    </span>
                  ) : slot?.items ? (
                    <span className="flex items-center gap-1.5 truncate text-sm text-emerald-700">
                      <FileCheck2 size={14} className="shrink-0" />
                      <span className="truncate">{slot.fileName}</span>
                      <span className="shrink-0 text-slate-400">
                        ({slot.items.length} dòng)
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Chưa chọn file
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handlePickFile(kho)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {slot?.items ? "Đổi file" : "Chọn file"}
                  </button>
                  {slot?.items && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemoveSlot(kho)}
                      className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Cảnh báo: SKU có kiện = tổng SL nhưng chưa có quy cách bên QC
              Đặc Thù -> không tự tính lại được kiện, chặn import cả file
              cho tới khi được bổ sung quy cách. */}
          {anyMissing && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  {allMissingSkus.length} SKU có Kiện = Tổng SL nhưng chưa có
                  Quy cách trong QC Đặc Thù — không thể import cho tới khi bổ
                  sung:
                </p>
                <p className="mt-1 break-words font-mono text-xs text-amber-700">
                  {allMissingSkus.join(", ")}
                </p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <XCircle size={16} />
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <span className="text-sm text-slate-500">
            {anyMissing
              ? "Còn SKU chưa có quy cách — xem cảnh báo phía trên"
              : selectedKhoList.length > 0
                ? `${selectedKhoList.length}/3 kho — tổng ${totalItems} dòng`
                : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={
                selectedKhoList.length === 0 ||
                submitting ||
                anyLoading ||
                anyMissing
              }
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Xác nhận Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TABLE + SEARCH + PAGINATION
//
// Props MỚI (tuỳ chọn):
// - initialFilters: object filter muốn áp ngay khi bảng mở ra (ví dụ khi
//   click từ donut Put Hàng bên Dashboard qua: { vi_tri: "RZ" }).
// - initialFiltersToken: 1 giá trị (số/tem thời gian) đổi mỗi lần cần áp
//   lại initialFilters — kể cả khi filter object giống lần trước, để đảm
//   bảo useEffect chạy lại và bảng luôn phản ánh đúng lần click mới nhất.
// ─────────────────────────────────────────────
const NhapHangForm = ({ initialFilters, initialFiltersToken }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // filter theo từng field, key khớp với COLUMNS
  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);

  const fetchTable = async (targetPage = page, activeFilters = filters) => {
    setLoadingTable(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE, loai_hinh: "Nhập" };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params[key] = value;
      });
      const res = await nhapHangService.getDanhSach(params);
      setRows(res?.data || []);
      setTotalPages(res?.totalPages || 1);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error("Lỗi getDanhSach:", err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchTable(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Áp filter khởi tạo từ bên ngoài (vd click donut Put Hàng ở Dashboard).
  // Chạy lại mỗi khi initialFiltersToken đổi, kể cả filter giống lần trước.
  useEffect(() => {
    if (!initialFilters || initialFiltersToken === undefined) return;
    setFilters(initialFilters);
    setPage(1);
    fetchTable(1, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltersToken]);

  // debounce khi gõ filter — reset về trang 1
  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTable(1, next);
    }, 400);
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    fetchTable(p, filters);
  };

  const handleImported = (res) => {
    setResult(res);
    setModalOpen(false);
    setPage(1);
    fetchTable(1, filters);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UploadCloud size={16} />
          Import Excel
        </button>

        <span className="text-sm text-slate-500">
          {total > 0 && `${total} bản ghi`}
        </span>
      </div>

      {result && (
        <div
          className={[
            "mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm",
            result.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700",
          ].join(" ")}
        >
          {result.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {result.message}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-2 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-slate-200 bg-white">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-2 py-1.5 font-normal">
                    <input
                      type="text"
                      value={filters[col.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(col.key, e.target.value)
                      }
                      placeholder="Tìm..."
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 outline-none focus:border-blue-400"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.vi_tri}</td>
                    <td className="px-3 py-2">{r.kien}</td>
                    <td className="px-3 py-2">{r.kho}</td>
                    <td className="px-3 py-2">{r.tong_sl}</td>
                    <td className="px-3 py-2">{r.trang_thai}</td>
                    <td className="px-3 py-2">
                      {formatDateOnly(r.ngay_nhap_kho)}
                    </td>
                    <td className="px-3 py-2">
                      {r.ngay_import
                        ? new Date(r.ngay_import).toLocaleString("vi-VN")
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
          <span className="text-xs text-slate-500">
            Trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ImportModal
          onClose={() => setModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
};

export default NhapHangForm;
