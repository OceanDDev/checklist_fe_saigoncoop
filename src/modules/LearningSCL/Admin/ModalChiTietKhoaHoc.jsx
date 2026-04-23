/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { learningService } from "@/services/leaning.service";
import ModalTaoBaiHoc from "./ModalTaoBaiHoc";

const ModalChiTietKhoaHoc = ({ isOpen, onClose, khoaHoc }) => {
  const [danhSachBaiHoc, setDanhSachBaiHoc] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [isModalBaiHoc, setIsModalBaiHoc] = useState(false);

  const loadBaiHoc = async () => {
    if (!khoaHoc?._id) return;
    setDangTai(true);
    try {
      const res = await learningService.layMotKhoaHoc(khoaHoc._id);
      const data = Array.isArray(res) ? res : res?.danhSachBaiHoc || res?.data?.danhSachBaiHoc || [];
      setDanhSachBaiHoc(data);
    } catch (err) {
      toast.error("Không thể tải bài học");
      console.error(err);
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    if (isOpen && khoaHoc?._id) loadBaiHoc();
  }, [isOpen, khoaHoc?._id]);

  const handleXoaBaiHoc = async (id) => {
    if (!window.confirm("Xóa bài học này?")) return;
    try {
      await learningService.xoaBaiHoc(id);
      toast.success("Đã xóa bài học");
      loadBaiHoc();
    } catch (err) {
      toast.error("Lỗi khi xóa bài học");
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* OVERLAY */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">

          {/* HEADER */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">
                Chi tiết khóa học
              </p>
              <h2 className="text-sm font-black text-slate-100 uppercase truncate max-w-md">
                {khoaHoc?.tieuDe}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalBaiHoc(true)}
                className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              >
                + Thêm bài học
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="overflow-y-auto flex-1 p-5">
            {dangTai ? (
              <SkeletonBaiHoc />
            ) : danhSachBaiHoc.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                <div className="text-3xl mb-2 opacity-20">📭</div>
                <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
                  Chưa có bài học nào
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {danhSachBaiHoc.map((bai, index) => (
                  <BaiHocItem
                    key={bai._id}
                    baiHoc={bai}
                    soThuTu={index + 1}
                    onXoa={() => handleXoaBaiHoc(bai._id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-5 py-3 border-t border-slate-800 shrink-0">
            <p className="text-[9px] text-slate-600 font-mono">
              {danhSachBaiHoc.length} bài học • ID: {khoaHoc?._id}
            </p>
          </div>
        </div>
      </div>

      {/* MODAL TẠO BÀI HỌC */}
      <ModalTaoBaiHoc
        isOpen={isModalBaiHoc}
        onClose={() => setIsModalBaiHoc(false)}
        khoaHocId={khoaHoc?._id}
        onSuccess={() => {
          setIsModalBaiHoc(false);
          loadBaiHoc();
        }}
      />
    </>
  );
};

// ── ITEM BÀI HỌC ──────────────────────────────
const BaiHocItem = ({ baiHoc, soThuTu, onXoa }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/30 border border-slate-800/60 rounded-xl group hover:border-slate-700 transition-all">
    {/* Số thứ tự */}
    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-black text-slate-500 font-mono">
        {String(soThuTu).padStart(2, "0")}
      </span>
    </div>

    {/* Nội dung */}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-200 truncate uppercase tracking-tight">
        {baiHoc.tieuDe}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        {baiHoc.video?.duongDan && (
          <span className="text-[9px] text-cyan-500 font-bold">🎬 VIDEO</span>
        )}
        {baiHoc.taiLieu?.length > 0 && (
          <span className="text-[9px] text-blue-400 font-bold">
            📎 {baiHoc.taiLieu.length} TÀI LIỆU
          </span>
        )}
        {baiHoc.baiKiemTraId && (
          <span className="text-[9px] text-emerald-400 font-bold">✅ BÀI TEST</span>
        )}
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={onXoa}
        className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition-all"
        title="Xóa bài học"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
);

// ── SKELETON ───────────────────────────────────
const SkeletonBaiHoc = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-800/30 rounded-xl animate-pulse">
        <div className="w-7 h-7 bg-slate-800 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-slate-800 rounded w-1/2" />
          <div className="h-2 bg-slate-800 rounded w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export default ModalChiTietKhoaHoc;