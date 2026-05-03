/* eslint-disable react/prop-types */
import { learningService } from "@/services/leaning.service";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const HomeLearning = () => {
  const navigate = useNavigate();
  const [danhSachKhoaHoc, setDanhSachKhoaHoc] = useState([]);
  const [dangTai, setDangTai] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role;

  useEffect(() => {
    const layDuLieu = async () => {
      try {
        const res = await learningService.layTatCaKhoaHoc();
        setDanhSachKhoaHoc(Array.isArray(res) ? res : res.data || []);
      } catch (err) {
        console.error("Lỗi tải khóa học:", err);
      } finally {
        setDangTai(false);
      }
    };
    layDuLieu();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100   pb-10">
      {/* STATUS BAR - Tối ưu hiển thị 1 dòng trên mobile */}
      <div className="bg-slate-900/40 border-b border-slate-800/50 px-4 py-2.5 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse flex-shrink-0"></div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight truncate">
            {user?.username} • Đang trực tuyến
          </span>
        </div>
        {role === 50 && (
          <button
            onClick={() => navigate("/learning/admin")}
            className="text-[9px] sm:text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-md active:bg-blue-500 active:text-white transition-all font-bold"
          >
            QUẢN TRỊ
          </button>
        )}
      </div>

      {/* HERO - Gọn gàng hơn trên mobile */}
      <div className="relative px-5 py-8 sm:py-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full"></div>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
            KHOÁ HỌC CỦA BẠN
          </h1>
          <div className="h-1 w-10 bg-blue-500 rounded-full mb-3"></div>
          <p className="text-slate-400 text-xs sm:text-base max-w-md leading-relaxed opacity-80 font-medium">
            Nâng cao năng suất công việc thông qua các bài giảng nội bộ.
          </p>
        </div>
      </div>

      {/* DANH SÁCH KHÓA HỌC - Grid 2 cột cho Mobile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] sm:text-xs font-black text-blue-400 tracking-[0.2em] uppercase">
            Mới nhất
          </span>
          <div className="h-[1px] flex-1 bg-slate-800/50"></div>
        </div>

        {dangTai ? (
          <DanhSachSkeleton />
        ) : danhSachKhoaHoc.length === 0 ? (
          <ManHinhRong />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {danhSachKhoaHoc.map((khoaHoc) => (
              <KhoaHocCard
                key={khoaHoc._id}
                khoaHoc={khoaHoc}
                onClick={() => navigate(`/learning/khoa-hoc/${khoaHoc._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const KhoaHocCard = ({ khoaHoc, onClick }) => (
  <div
    onClick={onClick}
    className="group bg-slate-900/50 rounded-xl border border-slate-800/80 active:scale-[0.97] sm:hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden flex flex-col shadow-xl"
  >
    {/* Ảnh nền thu nhỏ chiều cao trên mobile */}
    <div className="h-24 sm:h-40 bg-slate-800 relative overflow-hidden">
      {khoaHoc.anhBia ? (
        <img
          src={khoaHoc.anhBia}
          alt={khoaHoc.tieuDe}
          className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-800">
          <span className="text-2xl sm:text-4xl opacity-30">📘</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
    </div>

    {/* Nội dung card */}
    <div className="p-3 sm:p-5 flex-1 flex flex-col">
      <h3 className="font-bold text-slate-100 text-xs sm:text-base mb-1.5 line-clamp-2 leading-tight min-h-[2.5em]">
        {khoaHoc.tieuDe}
      </h3>

      {/* Ẩn mô tả trên mobile để tiết kiệm không gian, chỉ hiện trên PC */}
      <p className="hidden sm:block text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">
        {khoaHoc.moTa || "Chưa có mô tả chi tiết."}
      </p>

      <div className="mt-auto pt-3 border-t border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-slate-800 px-1.5 py-0.5 rounded">
            {khoaHoc.danhSachBaiHoc?.length || 0} Bài
          </span>
        </div>
        <span className="text-[9px] sm:text-xs font-bold text-blue-400 uppercase tracking-tighter">
          Học ngay
        </span>
      </div>
    </div>
  </div>
);

const DanhSachSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden animate-pulse"
      >
        <div className="h-24 sm:h-40 bg-slate-800/50" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-800 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const ManHinhRong = () => (
  <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
    <div className="text-4xl mb-3 opacity-20">🌑</div>
    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
      Trống
    </p>
  </div>
);

export default HomeLearning;
