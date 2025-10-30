/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { phieuSoanService } from "@/services/phieusoan/phieusoan.service";

const HangDacThuModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [specialPhieuSoans, setSpecialPhieuSoans] = useState([]);
  const [chanLeChoices, setChanLeChoices] = useState({});
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [error, setError] = useState("");

  // Fetch danh sách PHIẾU SOẠN đặc thù (pack=1) khi modal mở
  useEffect(() => {
    if (isOpen) {
      fetchSpecialPhieuSoans();
      setSelectedForDelete([]);
    }
  }, [isOpen]);

  const fetchSpecialPhieuSoans = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await phieuSoanService.getSpecialOrders({ limit: 1000 });
      const phieuSoans = response?.data || [];
      
      console.log("📦 Tổng số phiếu soạn đặc thù (pack=1):", phieuSoans.length);
      
      setSpecialPhieuSoans(phieuSoans);
      
      // Khởi tạo choices: giữ nguyên giá trị hiện tại hoặc mặc định "Chẵn"
      const initialChoices = {};
      phieuSoans.forEach(ps => {
        initialChoices[ps._id] = ps.chan_le || "Chẵn";
      });
      setChanLeChoices(initialChoices);
    } catch (err) {
      console.error("❌ Lỗi fetchSpecialPhieuSoans:", err);
      setError("Không thể tải danh sách phiếu soạn đặc thù");
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceChange = (phieuSoanId, value) => {
    setChanLeChoices(prev => ({
      ...prev,
      [phieuSoanId]: value
    }));
  };

  const handleSelectForDelete = (phieuSoanId, checked) => {
    if (checked) {
      setSelectedForDelete(prev => [...prev, phieuSoanId]);
    } else {
      setSelectedForDelete(prev => prev.filter(id => id !== phieuSoanId));
    }
  };

  const handleSelectAllForDelete = (checked) => {
    if (checked) {
      setSelectedForDelete(specialPhieuSoans.map(ps => ps._id));
    } else {
      setSelectedForDelete([]);
    }
  };

const handleDeleteSelected = async () => {
  if (selectedForDelete.length === 0) {
    alert("Chưa chọn phiếu nào để xóa!");
    return;
  }

  const confirmed = window.confirm(
    `⚠️ Xác nhận xóa ${selectedForDelete.length} phiếu soạn đặc thù?\n\nHành động này không thể hoàn tác!`
  );

  if (!confirmed) return;

  setLoading(true);
  setError("");

  try {
    console.log("🗑️ Đang xóa phiếu soạn:", selectedForDelete);
    
    await phieuSoanService.deleteManyPhieuSoan(selectedForDelete);

    alert(`✅ Đã xóa thành công ${selectedForDelete.length} phiếu soạn đặc thù!`);
    
    setSelectedForDelete([]);
    await fetchSpecialPhieuSoans();
    onSuccess();
  } catch (err) {
    console.error("❌ Lỗi xóa phiếu soạn:", err);
    setError(err.response?.data?.message || "Có lỗi xảy ra khi xóa");
  } finally {
    setLoading(false);
  }
};

  const handleUpdate = async () => {
    if (specialPhieuSoans.length === 0) {
      alert("Không có phiếu soạn nào để cập nhật");
      return;
    }

    // ✅ Kiểm tra xem có phiếu nào cần update không
    const needsUpdate = specialPhieuSoans.filter(ps => 
      ps.chan_le !== chanLeChoices[ps._id]
    );

    const confirmed = window.confirm(
      `Xác nhận cập nhật chẵn/lẻ cho ${needsUpdate.length} phiếu soạn?`
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      // ✅ Chuẩn bị updates array
      const updates = specialPhieuSoans.map(ps => ({
        phieuSoanId: ps._id,
        chan_le: chanLeChoices[ps._id]
      }));
      
      console.log("🚀 Đang cập nhật chẵn/lẻ cho phiếu soạn:");
      console.log("   - Số lượng:", updates.length);
      console.log("   - Cần update:", needsUpdate.length);
      
      const result = await phieuSoanService.updateSpecialChanLe(updates);

      console.log("✅ Kết quả cập nhật:", result);
      
      const successCount = result?.data?.length || result?.summary?.processed || 0;
      alert(`Cập nhật thành công ${successCount} phiếu soạn đặc thù!`);
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error("❌ Lỗi updateSpecialChanLe:", err);
      setError(err.response?.data?.message || "Có lỗi xảy ra khi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSpecialPhieuSoans();
    setSelectedForDelete([]);
  };

  if (!isOpen) return null;

  const allSelected = specialPhieuSoans.length > 0 && selectedForDelete.length === specialPhieuSoans.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Cập nhật Chẵn/Lẻ - Hàng Đặc Thù
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Phiếu soạn có pack = 1 cần chọn chẵn/lẻ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {loading && specialPhieuSoans.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : specialPhieuSoans.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-slate-600 text-lg font-medium">Không có phiếu soạn đặc thù nào</div>
              <p className="text-slate-400 text-sm mt-1">
                Tất cả phiếu soạn đã được xử lý hoặc không có pack = 1
              </p>
            </div>
          ) : (
            <>
              {/* Info card */}
              <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-orange-800">
                  <div className="font-semibold">
                    Tìm thấy {specialPhieuSoans.length} phiếu soạn đặc thù (pack = 1)
                  </div>
                  <div className="text-orange-600 mt-0.5">
                    Đây là các phiếu soạn đã được tạo từ đơn hàng, cần chọn chẵn/lẻ để hoàn thiện
                  </div>
                </div>
              </div>

              {/* Select all & Delete button */}
              {specialPhieuSoans.length > 0 && (
                <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAllForDelete(e.target.checked)}
                      className="w-4 h-4 text-blue-600 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Chọn tất cả ({specialPhieuSoans.length})
                    </span>
                  </label>
                  
                  {selectedForDelete.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Xóa ({selectedForDelete.length})
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {specialPhieuSoans.map((phieuSoan, index) => {
                  const currentChoice = chanLeChoices[phieuSoan._id];
                  const hasChanged = phieuSoan.chan_le !== currentChoice;
                  const isSelectedForDelete = selectedForDelete.includes(phieuSoan._id);
                  
                  return (
                    <div
                      key={phieuSoan._id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelectedForDelete
                          ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
                          : hasChanged 
                          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox xóa */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelectedForDelete}
                            onChange={(e) => handleSelectForDelete(phieuSoan._id, e.target.checked)}
                            className="w-4 h-4 text-red-600 cursor-pointer"
                          />
                        </div>

                        {/* Thông tin phiếu soạn */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                              {index + 1}
                            </span>
                            <div className="font-semibold text-slate-800">
                              {phieuSoan.name}
                            </div>
                            {hasChanged && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                                Đã thay đổi
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span className="font-mono">SKU: {phieuSoan.sku}</span>
                            <span>•</span>
                            <span>Store: {phieuSoan.store}</span>
                            <span>•</span>
                            <span>Slot: {phieuSoan.slot}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-blue-600">
                              Số lượng: {phieuSoan.luong}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 font-medium">
                              Pack = 1
                            </span>
                            {phieuSoan.chan_le && (
                              <span className="text-xs text-slate-500">
                                Hiện tại: <b>{phieuSoan.chan_le}</b>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Radio buttons chẵn/lẻ */}
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name={`chanle-${phieuSoan._id}`}
                              value="Chẵn"
                              checked={currentChoice === "Chẵn"}
                              onChange={(e) => handleChoiceChange(phieuSoan._id, e.target.value)}
                              disabled={isSelectedForDelete}
                              className="w-4 h-4 text-blue-600 cursor-pointer disabled:opacity-50"
                            />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                              Chẵn
                            </span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name={`chanle-${phieuSoan._id}`}
                              value="Lẻ"
                              checked={currentChoice === "Lẻ"}
                              onChange={(e) => handleChoiceChange(phieuSoan._id, e.target.value)}
                              disabled={isSelectedForDelete}
                              className="w-4 h-4 text-amber-600 cursor-pointer disabled:opacity-50"
                            />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-amber-600 transition-colors">
                              Lẻ
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            Tổng: <b className="text-slate-800">{specialPhieuSoans.length}</b> phiếu soạn
            {selectedForDelete.length > 0 && (
              <span className="ml-2 text-red-600">
                | Đã chọn: <b>{selectedForDelete.length}</b>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading || specialPhieuSoans.length === 0}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cập nhật ({specialPhieuSoans.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HangDacThuModal;