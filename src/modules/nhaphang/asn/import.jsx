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
} from "lucide-react";
import { asnService } from "@/services/nhaphang/asn.service";

// 3 kho cố định — giống pattern bên Nhập Hàng
const KHO_LIST = [
  { kho: "810", label: "Kho 810" },
  { kho: "8101", label: "Kho 8101" },
  { kho: "8104", label: "Kho 8104" },
];

// ─────────────────────────────────────────────
// Map cột trong file Excel (Cxnk_nhap_kho / ASN) -> field trong DB, ĐỌC
// THEO VỊ TRÍ CỘT (index), KHÔNG đọc theo tên cột.
//
// Lý do: header thật của file có 2 nhóm cột "Kế Hoạch" và "Còn Lại", mỗi
// nhóm đều có 1 cột tên là "Kiện" (SheetJS ở chế độ đọc theo object sẽ bị
// trùng/ghi đè tên cột "Kiện" nếu đọc theo tên) — nên phải đọc bằng
// header: 1 (mảng thô theo hàng) rồi lấy đúng theo index cột dưới đây:
//
//  0  Số ASN            -> asn
//  1  Ngày ASN           -> ngay_asn
//  3  Document No        -> po
//  4  Mã NCC             -> ma_ncc
//  5  Tên NCC            -> ten_ncc
//  6  Loại Hình          -> loai_hinh
//  8  Kiện (Kế Hoạch)    -> kien_ke_hoach
//  12 Kiện (Còn Lại)     -> kien_con_lai
//  39 Tên Ngành Hàng     -> ten_nganh_hang
//
// Dòng dữ liệu thật bắt đầu từ hàng thứ 3 trong file (2 hàng đầu là
// header nhóm + header cột).
// ─────────────────────────────────────────────
const COL = {
  asn: 0,
  ngay_asn: 1,
  po: 3,
  ma_ncc: 4,
  ten_ncc: 5,
  loai_hinh: 6,
  kien_ke_hoach: 8,
  kien_con_lai: 12,
  ten_nganh_hang: 39,
};

const mapRow = (row, kho) => ({
  asn: String(row[COL.asn] ?? "").trim(),
  po: String(row[COL.po] ?? "").trim(),
  ngay_asn: parseExcelDate(row[COL.ngay_asn]),
  ma_ncc: row[COL.ma_ncc] !== "" ? Number(row[COL.ma_ncc]) : undefined,
  ten_ncc: String(row[COL.ten_ncc] ?? "").trim(),
  loai_hinh: String(row[COL.loai_hinh] ?? "").trim(),
  kien_ke_hoach: String(row[COL.kien_ke_hoach] ?? "").trim(),
  kien_con_lai: String(row[COL.kien_con_lai] ?? "").trim(),
  ten_nganh_hang: String(row[COL.ten_nganh_hang] ?? "").trim(),
  kho: String(kho),
  ngay_import: new Date(),
});

// Ghim date-only value về 12:00 trưa UTC — giữ đúng ngày Excel, không lệch theo timezone máy chạy
const toDateOnlyUTC = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

// Cùng logic parse ngày như bên NhapHangImportModal: workbook đọc với
// cellDates: false nên cột ngày luôn là số serial Excel, tính thẳng bằng
// UTC để không lệch ngày theo timezone trình duyệt.
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

// Đọc file theo header: 1 -> mảng thô từng hàng, bỏ 2 hàng header đầu
// (hàng 0: header nhóm "Kế Hoạch"/"Còn Lại", hàng 1: header cột con)
const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });
        // bỏ 2 hàng header, chỉ lấy hàng dữ liệu
        resolve(rows.slice(2));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsArrayBuffer(file);
  });

// ─────────────────────────────────────────────
// MODAL IMPORT ASN — chọn 1, 2 hoặc cả 3 kho cùng lúc, mỗi kho 1 file riêng
// (kho không nằm trong file Excel, gắn theo slot người dùng chọn khi import)
// ─────────────────────────────────────────────
const ASNImportModal = ({ onClose, onImported }) => {
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
    setSlot(kho, { loading: true, error: null, fileName: file.name });

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

      // Chỉ giữ dòng có "Số ASN", loại dòng trống và dòng tổng cuối file
      // (thường có Số ASN = "Total")
      const items = rows
        .map((row) => mapRow(row, kho))
        .filter((item) => item.asn && item.asn.toLowerCase() !== "total");

      setSlot(kho, { loading: false, items, fileName: file.name });
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setSlot(kho, {
        loading: false,
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
  const anyLoading = Object.values(slots).some((s) => s?.loading);

  const handleConfirmImport = async () => {
    if (selectedKhoList.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Mỗi item đã gắn sẵn field kho riêng -> gộp tất cả kho đã chọn.
      // Dùng importCapNhat (upsert theo asn + po + kho): file cũ đã có sẽ
      // được cập nhật thay vì tạo trùng bản ghi khi import lại.
      const allItems = selectedKhoList.flatMap(({ kho }) => slots[kho].items);
      const res = await asnService.importCapNhat(allItems);
      const khoLabel = selectedKhoList.map(({ label }) => label).join(", ");
      onImported({
        success: true,
        message:
          res?.message ||
          `Import thành công ${allItems.length} dòng (${khoLabel})`,
      });
    } catch (err) {
      console.error("Lỗi import ASN:", err);
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
          <h2 className="text-base font-semibold text-slate-800">Import ASN</h2>
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
            {selectedKhoList.length > 0
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
                selectedKhoList.length === 0 || submitting || anyLoading
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

export default ASNImportModal;
