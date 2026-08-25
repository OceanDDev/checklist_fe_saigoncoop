/* eslint-disable react/prop-types */
// AddModals.jsx
import { useState } from "react";
import { X, Loader2, Plus } from "lucide-react";
import { formatBsx } from "./bsxUtils";

const ModalShell = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
    <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  </div>
);

const Field = ({ label, error, children }) => (
  <div className="mb-3">
    <label className="mb-1 block text-xs font-medium text-slate-600">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
  </div>
);

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40";

// ==========================
// ==========================
export const AddSllModal = ({ onClose, onSubmit, submitting }) => {
  const [nvc, setNvc] = useState("");
  const [bsx, setBsx] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!nvc.trim()) nextErrors.nvc = "Vui lòng nhập Nhà vận chuyển";

    const { formatted, error: bsxError } = formatBsx(bsx);
    if (bsxError) nextErrors.bsx = bsxError;

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitError("");

    try {
      await onSubmit({ nvc :nvc.trim(), bsx: formatted });
    } catch (err) {
      setSubmitError(err?.message || "Có lỗi xảy ra, vui lòng thử lại.");
    }
  };

  return (
    <ModalShell title="Thêm SLL (Số lượng lớn)" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nhà vận chuyển" error={errors.nvc}>
          <input
            className={inputCls}
            value={nvc}
            onChange={(e) => setNvc(e.target.value)}
            placeholder="Nhập tên NVC..."
            autoFocus
          />
        </Field>

        <Field label="Biển số xe" error={errors.bsx}>
          <input
            className={inputCls}
            value={bsx}
            onChange={(e) => setBsx(e.target.value)}
            placeholder="VD: 51C-123.45"
          />
        </Field>

        <p className="mb-3 text-xs text-slate-400">
          Chuyến sẽ tự động gán là <span className="font-medium text-slate-500">SLL</span>.
        </p>

        {submitError && (
          <p className="mb-3 text-xs text-rose-500">{submitError}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Thêm
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ==========================
// ==========================
export const AddNewModal = ({ onClose, onSubmit, submitting }) => {
  const [nvc, setNvc] = useState("");
  const [chuyen, setChuyen] = useState("");
  const [bsx, setBsx] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!nvc.trim()) nextErrors.nvc = "Vui lòng nhập Nhà vận chuyển";
    if (!chuyen.trim()) nextErrors.chuyen = "Vui lòng nhập Chuyến";

    const { formatted, error: bsxError } = formatBsx(bsx);
    if (bsxError) nextErrors.bsx = bsxError;

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await onSubmit({ nvc: nvc.trim(), chuyen: chuyen.trim(), bsx: formatted });
  };

  return (
    <ModalShell title="Thêm mới" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nhà vận chuyển" error={errors.nvc}>
          <input
            className={inputCls}
            value={nvc}
            onChange={(e) => setNvc(e.target.value)}
            placeholder="Nhập tên NVC..."
            autoFocus
          />
        </Field>

        <Field label="Chuyến" error={errors.chuyen}>
          <input
            className={inputCls}
            value={chuyen}
            onChange={(e) => setChuyen(e.target.value)}
            placeholder="Nhập chuyến..."
          />
        </Field>

        <Field label="Biển số xe" error={errors.bsx}>
          <input
            className={inputCls}
            value={bsx}
            onChange={(e) => setBsx(e.target.value)}
            placeholder="VD: 51C-123.45"
          />
        </Field>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Thêm
          </button>
        </div>
      </form>
    </ModalShell>
  );
};