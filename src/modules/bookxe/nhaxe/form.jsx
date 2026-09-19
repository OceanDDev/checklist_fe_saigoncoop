/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const FIELDS = [
  { key: "ma_ch", label: "Mã CH", required: true },
  { key: "ten_ch", label: "Tên CH" },
  { key: "quan", label: "Quận" },
  { key: "thoi_gian_xuat", label: "Thời gian xuất", placeholder: "vd: 08:00" },
  { key: "nvc", label: "Nhà vận chuyển (NVC)" },
  { key: "lich_di_hang", label: "Lịch đi hàng", placeholder: "vd: T2 - T4 - T6" },
  { key: "ghi_chu", label: "Ghi chú", multiline: true },
];

// Ở chế độ bulk không cho sửa mã CH / tên CH (mỗi cửa hàng một giá trị riêng)
const BULK_HIDDEN = ["ma_ch", "ten_ch"];

const emptyForm = () =>
  FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: "" }), {});

const inputClass =
  "w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

/**
 * mode: "create" | "edit" | "bulk"
 * - create: thêm mới
 * - edit: sửa 1 bản ghi (initialData)
 * - bulk: cập nhật cùng giá trị cho `count` bản ghi đã chọn — chỉ ô nào có nhập mới được gửi đi
 * onSubmit(payload): async, throw lỗi để modal hiển thị
 */
const NhaXeFormModal = ({
  open,
  mode = "create",
  initialData = null,
  count = 0,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);
    if (mode === "edit" && initialData) {
      const next = emptyForm();
      FIELDS.forEach(({ key }) => {
        next[key] = initialData[key] ?? "";
      });
      setForm(next);
    } else {
      setForm(emptyForm());
    }
  }, [open, mode, initialData]);

  if (!open) return null;

  const isBulk = mode === "bulk";
  const visibleFields = isBulk
    ? FIELDS.filter((f) => !BULK_HIDDEN.includes(f.key))
    : FIELDS;

  const title =
    mode === "create"
      ? "Thêm nhà xe"
      : mode === "edit"
        ? "Sửa nhà xe"
        : `Cập nhật ${count} bản ghi đã chọn`;

  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError("");

    if (!isBulk && !form.ma_ch.trim()) {
      setError("Vui lòng nhập mã cửa hàng");
      return;
    }

    const payload = {};
    visibleFields.forEach(({ key }) => {
      const value = String(form[key] ?? "").trim();
      if (isBulk) {
        if (value) payload[key] = value;
      } else {
        payload[key] = value;
      }
    });

    if (isBulk && Object.keys(payload).length === 0) {
      setError("Nhập ít nhất một trường cần cập nhật");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Có lỗi xảy ra",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          {isBulk && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Chỉ những ô có nhập mới được cập nhật, ô để trống sẽ giữ nguyên
              giá trị cũ.
            </p>
          )}

          {visibleFields.map(({ key, label, required, multiline, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {label}
                {required && !isBulk && (
                  <span className="ml-0.5 text-red-500">*</span>
                )}
              </label>
              {multiline ? (
                <textarea
                  rows={3}
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                />
              ) : (
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NhaXeFormModal;