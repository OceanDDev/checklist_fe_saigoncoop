import { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { dinhViService } from "@/services/phieusoan/dinhvi.service";

// eslint-disable-next-line react/prop-types
const DinhViClearAll = ({ onClearSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = () => {
    setIsOpen(true);
    setConfirmation("");
    setError("");
  };

  const handleClose = () => {
    if (!isDeleting) {
      setIsOpen(false);
      setConfirmation("");
      setError("");
    }
  };

  const handleDelete = async () => {
    if (confirmation !== "DELETE_ALL") {
      setError('Vui lòng nhập chính xác "DELETE_ALL"');
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await dinhViService.clearAllDinhVi();

      // Đóng modal
      setIsOpen(false);
      setConfirmation("");

      // Callback để refresh table
      if (onClearSuccess) {
        onClearSuccess();
      }

      // Hiển thị thông báo sau khi refresh
      setTimeout(() => {
        alert(response?.message || "✅ Đã xóa toàn bộ dữ liệu thành công");
      }, 100);

    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "❌ Có lỗi xảy ra khi xóa dữ liệu";
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (e) => {
    setConfirmation(e.target.value);
    setError("");
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition"
      >
        <Trash2 className="w-4 h-4" />
        Xóa Data ĐV
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Xóa Toàn Bộ Dữ Liệu
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="p-1 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Cảnh báo: Hành động này không thể hoàn tác!
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Tất cả dữ liệu định vị sẽ bị DELETE_ALL.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                 Vui lòng nhập Password : 
                </label>
                <input
                  type="password"
                  value={confirmation}
                  onChange={handleInputChange}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-200">
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || confirmation !== "DELETE_ALL"}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Đang xóa..." : "Xóa Toàn Bộ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DinhViClearAll;