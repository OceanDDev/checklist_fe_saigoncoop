/* eslint-disable react/prop-types */
    import { useState } from "react";
import { learningService } from "@/services/leaning.service";
import { toast } from "react-toastify";

const ModalTaoKhoaHoc = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tieuDe: "",
    moTa: "",
    anhBia: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tieuDe) return toast.warning("Vui lòng nhập tiêu đề");

    setLoading(true);
    try {
      await learningService.taoKhoaHoc(formData);
      toast.success("Tạo khóa học thành công!");
      setFormData({ tieuDe: "", moTa: "", anhBia: "" }); // Reset form
      onSuccess(); // Reload danh sách ở trang cha
      onClose();   // Đóng modal
    } catch (err) {
      toast.error("Có lỗi xảy ra khi tạo khóa học",err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
          <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Tạo khóa học mới</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-wider">Tên khóa học</label>
            <input
              type="text"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-slate-200 placeholder:text-slate-700"
              placeholder="Nhập tiêu đề khóa học..."
              value={formData.tieuDe}
              onChange={(e) => setFormData({...formData, tieuDe: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-wider">Mô tả ngắn</label>
            <textarea
              rows="3"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-slate-200 placeholder:text-slate-700"
              placeholder="Mô tả nội dung học tập..."
              value={formData.moTa}
              onChange={(e) => setFormData({...formData, moTa: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-wider">Link ảnh bìa (URL)</label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-slate-200 placeholder:text-slate-700"
              placeholder="https://example.com/image.jpg"
              value={formData.anhBia}
              onChange={(e) => setFormData({...formData, anhBia: e.target.value})}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : "Xác nhận tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalTaoKhoaHoc;