/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Loader2,
  XCircle,
  X,
  Warehouse,
  FileCheck2,
  Trash2,
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

// Map cột trong file Excel (Cxnk_ton_kho) -> field trong DB
// Tên cột lấy đúng theo header thật của file export (Cxnk_ton_kho-Export_Excel_Custom):
// Ngày Nhập, Mã Hàng, Tên Hàng, Vị trí, Số kiện nhập, Tổng SL nhập, Trạng Thái,
// Số LPN, NV nhận, NV Putaway
const mapRow = (row, kho) => ({
  sku: String(row["Mã Hàng"] ?? "").trim(),
  name: String(row["Tên Hàng"] ?? "").trim(),
  vi_tri: String(row["Vị trí"] ?? "").trim(),
  kien: Number(row["Số kiện nhập"] ?? 0),
  kho: Number(kho),
  tong_sl: Number(row["Tổng SL nhập"] ?? 0),
  lpn: String(row["Số LPN"] ?? "").trim(),
  trang_thai: String(row["Trạng Thái"] ?? "").trim(),
  loai_hinh: "Nhập",
  nhan_vien_nhap: String(row["NV nhận"] ?? "").trim(),
  nhan_vien_put: String(row["NV Putaway"] ?? "").trim(),
  ngay_nhap_kho: parseExcelDate(row["Ngày Nhập"]),
});

// Ghim date-only value về 12:00 trưa UTC — giữ đúng ngày Excel, không lệch theo timezone máy chạy
const toDateOnlyUTC = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

// ⚠️ QUAN TRỌNG: workbook được đọc với cellDates: false (xem parseExcelFile
// bên dưới) nên cột ngày luôn tới đây dưới dạng SỐ SERIAL Excel (vd 46265),
// không phải Date object. Lý do: XLSX.read({ cellDates: true }) dựng Date
// object bằng giờ LOCAL của trình duyệt, nên với người dùng ở múi giờ VN
// (UTC+7) ngày bị lùi 1 ngày khi đọc lại bằng getUTC*() (31/08 -> ra 30/08).
// Nhánh "typeof value === 'number'" dưới đây tính thẳng từ serial bằng
// công thức UTC cố định, không phụ thuộc timezone máy chạy -> luôn đúng.
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

const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
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
// LOGIC QC ĐẶC THÙ — KIỆN = TỔNG SL
//
// Khi file Excel bị nhập nhầm số lượng đơn vị vào cột "Số kiện nhập" (kiện
// = tổng SL nhập), ta không thể biết chính xác 1 kiện gồm bao nhiêu đơn vị
// nếu không tra "Quy cách" đã khai báo sẵn cho SKU đó bên bảng QC Đặc Thù.
//
// - Nếu SKU có trong QC Đặc Thù (quy_cách là số thuần, vd "12"):
//   kiện đúng = tổng SL / quy_cách (ví dụ 780 / 10 = 78).
// - Nếu SKU KHÔNG có trong QC Đặc Thù: không tự tính được -> đưa vào danh
//   sách "thiếu quy cách", chặn import cho tới khi được bổ sung.
//
// Ngoại lệ: SKU "HANGTRUNGCHUYEN" (hàng trung chuyển) không bị áp rule này
// — luôn cho qua dù kiện = tổng SL, không cần tra quy cách.
// ─────────────────────────────────────────────
const SKU_KHONG_AP_QC_DAC_THU = ["HANGTRUNGCHUYEN"];

const isKienBangTongSl = (item) =>
  !SKU_KHONG_AP_QC_DAC_THU.includes(item.sku) &&
  Number(item.kien) > 0 &&
  Number(item.kien) === Number(item.tong_sl);

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

    // Làm tròn chuẩn: phần dư >= 0.5 thì lên 1, < 0.5 thì xuống 0
    // (Math.round đúng theo quy tắc này: 0.5 -> 1, 0.4 -> 0)
    return { ...item, kien: Math.round(Number(item.tong_sl) / quyCach) };
  });

  return { items: nextItems, missingSkus };
};

// ─────────────────────────────────────────────
// MODAL IMPORT — chọn 1, 2 hoặc cả 3 kho cùng lúc, mỗi kho 1 file riêng
// ─────────────────────────────────────────────
const NhapHangImportModal = ({ onClose, onImported }) => {
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
      skippedLpnCount: 0,
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
      const mappedItems = rows
        .map((row) => mapRow(row, kho))
        .filter((item) => item.sku);

      // Bỏ qua dòng thiếu LPN hoặc LPN bị trùng trong cùng file — chỉ giữ
      // lần xuất hiện đầu tiên của mỗi LPN, các dòng thiếu/trùng sau đó bị
      // loại khỏi danh sách import.
      const lpnIndexMap = new Map(); // lpn -> index trong rawItems
      const rawItems = [];
      let skippedLpnCount = 0;

      mappedItems.forEach((item) => {
        if (!item.lpn) {
          skippedLpnCount++;
          return;
        }
        if (lpnIndexMap.has(item.lpn)) {
          rawItems[lpnIndexMap.get(item.lpn)] = item; // ghi đè bằng dòng mới hơn
        } else {
          lpnIndexMap.set(item.lpn, rawItems.length);
          rawItems.push(item);
        }
      });
      // Đang tra QC Đặc Thù để tự tính lại kiện cho các SKU bị kiện = tổng SL
      setSlot(kho, { checking: true });
      const { items, missingSkus } = await resolveKienForItems(rawItems);

      setSlot(kho, {
        loading: false,
        checking: false,
        items,
        missingSkus,
        skippedLpnCount,
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
            Import : Chi tiết hàng nhập - vị trí (9011)
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
                    <div className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-sm text-emerald-700">
                        <FileCheck2 size={14} className="shrink-0" />
                        <span className="truncate">{slot.fileName}</span>
                        <span className="shrink-0 text-slate-400">
                          ({slot.items.length} dòng)
                        </span>
                      </span>
                      {slot.skippedLpnCount > 0 && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle size={12} className="shrink-0" />
                          Đã bỏ qua {slot.skippedLpnCount} dòng thiếu LPN
                        </span>
                      )}
                    </div>
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

export default NhapHangImportModal;
