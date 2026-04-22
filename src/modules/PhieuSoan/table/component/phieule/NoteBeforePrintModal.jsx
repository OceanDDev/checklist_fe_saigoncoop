// component/phieule/NoteBeforePrintModal.jsx
/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";

const NoteBeforePrintModal = ({ isOpen, onClose, selectedCount, onContinue }) => {
  const [note, setNote] = useState("KẸP PHIẾU SOẠN TRÊN XE SMT");
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset note khi modal mở
  useEffect(() => {
    if (isOpen) {
      setNote("KẸP PHIẾU SOẠN TRÊN XE SMT");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Tiếp tục in với ghi chú
  const handleContinue = async () => {
    setIsProcessing(true);
    try {
      await onContinue(note.trim()); // Truyền ghi chú (có thể rỗng)
      setNote("");
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra!");
    } finally {
      setIsProcessing(false);
    }
  };

  // Bỏ qua và in luôn
  const handleSkip = () => {
    onContinue(""); // Truyền ghi chú rỗng
    setNote("");
  };

  const handleCancel = () => {
    setNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Thêm Ghi Chú Trước Khi In
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sẽ in <span className="font-semibold text-blue-600">{selectedCount}</span> phiếu - Có thể thêm ghi chú hoặc bỏ qua
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            title="Đóng"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nội dung ghi chú <span className="text-slate-400">(Không bắt buộc)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú cho các phiếu... (VD: Ưu tiên giao hàng trước 10h, Hàng dễ vỡ - cẩn thận)"
              className="w-full h-32 rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
              disabled={isProcessing}
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">
                {note.length} ký tự
              </span>
              {note.length > 200 && (
                <span className="text-xs text-orange-600">
                  ⚠️ Ghi chú quá dài có thể ảnh hưởng đến bố cục in
                </span>
              )}
            </div>
          </div>

          {/* Preview */}
          {note.trim() && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Xem trước trên phiếu:
              </label>
              <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-lg shadow-sm">
                <p className="text-sm">
                  <span className="font-bold text-slate-900 text-base">📝 Ghi chú:</span>{" "}
                  <span className="font-bold text-slate-900 text-base">{note}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <div className="text-sm text-slate-600">
            Sẽ in <b className="text-blue-600">{selectedCount}</b> phiếu
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="h-10 px-6 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSkip}
              disabled={isProcessing}
              className="h-10 px-6 rounded-xl bg-slate-500 text-white hover:bg-slate-600 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Bỏ qua - In ngay
            </button>
            <button
              onClick={handleContinue}
              disabled={isProcessing}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  {note.trim() ? "Lưu & Tiếp tục in" : "Tiếp tục in"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteBeforePrintModal;