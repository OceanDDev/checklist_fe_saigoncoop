/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { learningService } from "@/services/leaning.service";
import { toast } from "react-toastify";
import ModalTaoKhoaHoc from "./ModalTaoKhoaHoc";
import ModalChiTietKhoaHoc from "./ModalChiTietKhoaHoc";

const HomeLearningAdmin = () => {
  const navigate = useNavigate();
  const [danhSach, setDanhSach] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [khoaHocDangXem, setKhoaHocDangXem] = useState(null);

  const loadData = async () => {
    setDangTai(true);
    try {
      const res = await learningService.layTatCaKhoaHoc();
      setDanhSach(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      toast.error("Không thể tải danh sách khóa học");
      console.error(err);
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleXoa = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa khóa học này?")) {
      try {
        await learningService.xoaKhoaHoc(id);
        toast.success("Đã xóa khóa học thành công");
        loadData();
      } catch (err) {
        toast.error("Lỗi khi xóa khóa học", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-10">
      {/* HEADER STICKY */}
      <div className="bg-slate-900/60 border-y border-slate-800/50 px-4 py-3 sticky top-[72px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
            <h1 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Quản trị Đào tạo
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Nút sang trang QR + tạo quiz */}
            <button
              onClick={() => navigate("/learning/admin/quan-ly-qr")}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 hover:border-violet-500/40 text-slate-300 hover:text-violet-300 text-[10px] sm:text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z"
                />
              </svg>
              QR &amp; Quiz
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              + TẠO KHÓA HỌC
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Khóa học" value={danhSach.length} color="blue" />
          <StatCard label="Giờ học" value="--" color="cyan" />
          <StatCard label="Học viên" value="--" color="indigo" />
          <StatCard label="Hoàn thành" value="--" color="emerald" />
        </div>

        {/* TABLE */}
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="p-4 border-b border-slate-800/60 bg-slate-900/50 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-400">
              Danh sách quản lý
            </h2>
            <button
              onClick={loadData}
              className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-slate-500 ${dangTai ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-800/50 bg-slate-900/20">
                  <th className="px-6 py-4 font-black tracking-widest text-center w-16">
                    #
                  </th>
                  <th className="px-2 py-4 font-black tracking-widest">
                    Khóa học
                  </th>
                  <th className="px-4 py-4 font-black tracking-widest hidden md:table-cell">
                    Số bài
                  </th>
                  <th className="px-6 py-4 font-black tracking-widest text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {dangTai ? (
                  <TableSkeleton />
                ) : danhSach.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-20 text-center">
                      <p className="text-slate-600 text-xs font-bold uppercase tracking-[0.3em]">
                        Dữ liệu trống
                      </p>
                    </td>
                  </tr>
                ) : (
                  danhSach.map((item, index) => (
                    <tr
                      key={item._id}
                      className="hover:bg-blue-500/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4 text-center text-xs font-mono text-slate-600 italic">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700/50 shadow-inner">
                            {item.anhBia ? (
                              <img
                                src={item.anhBia}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                alt=""
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl grayscale opacity-30">
                                📚
                              </div>
                            )}
                          </div>
                          <div className="max-w-[150px] sm:max-w-xs">
                            <div className="text-xs sm:text-sm font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                              {item.tieuDe}
                            </div>
                            <div className="text-[9px] text-slate-600 mt-0.5 font-mono truncate">
                              {item._id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 border border-slate-700/30 rounded text-[10px] font-bold text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                          {item.danhSachBaiHoc?.length || 0} BÀI GIẢNG
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tạo quiz nhanh cho khóa học này → navigate sang QR page */}
                          <button
                            onClick={() =>
                              navigate(
                                `/learning/admin/quan-ly-qr?khoaHocId=${item._id}`,
                              )
                            }
                            className="p-2 hover:bg-violet-500/10 text-slate-500 hover:text-violet-400 rounded-lg transition-all"
                            title="Tạo quiz / Quản lý QR"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                              />
                            </svg>
                          </button>
                          {/* Chi tiết */}
                          <button
                            onClick={() => setKhoaHocDangXem(item)}
                            className="p-2 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all"
                            title="Quản lý nội dung"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                          </button>
                          {/* Xóa */}
                          <button
                            onClick={() => handleXoa(item._id)}
                            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                            title="Xóa"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModalTaoKhoaHoc
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
      <ModalChiTietKhoaHoc
        isOpen={!!khoaHocDangXem}
        onClose={() => setKhoaHocDangXem(null)}
        khoaHoc={khoaHocDangXem}
      />
    </div>
  );
};

const StatCard = ({ label, value, color }) => {
  const colors = {
    blue: "text-blue-400 border-blue-500/20",
    cyan: "text-cyan-400 border-cyan-500/20",
    indigo: "text-indigo-400 border-indigo-500/20",
    emerald: "text-emerald-400 border-emerald-500/20",
  };
  return (
    <div
      className={`bg-slate-900/40 border ${colors[color]} p-4 rounded-2xl shadow-xl backdrop-blur-sm`}
    >
      <div className="text-[9px] uppercase font-black text-slate-600 tracking-widest mb-1">
        {label}
      </div>
      <div className={`text-xl font-black ${colors[color].split(" ")[0]}`}>
        {value}
      </div>
    </div>
  );
};

const TableSkeleton = () => (
  <>
    {[1, 2, 3, 4].map((i) => (
      <tr key={i} className="animate-pulse border-b border-slate-800/20">
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-4 mx-auto" />
        </td>
        <td className="px-2 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800/50 rounded-xl" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-800/50 rounded w-32" />
              <div className="h-2 bg-slate-800/50 rounded w-20" />
            </div>
          </div>
        </td>
        <td className="px-4 py-4 hidden md:table-cell">
          <div className="h-4 bg-slate-800/50 rounded w-16" />
        </td>
        <td className="px-6 py-4">
          <div className="flex justify-end gap-2">
            <div className="w-8 h-8 bg-slate-800/50 rounded-lg" />
            <div className="w-8 h-8 bg-slate-800/50 rounded-lg" />
            <div className="w-8 h-8 bg-slate-800/50 rounded-lg" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

export default HomeLearningAdmin;
