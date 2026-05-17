/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { learningService } from "@/services/leaning.service";
import { toast } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────
// MODAL / TRANG XEM KẾT QUẢ BÀI KIỂM TRA
// Props: isOpen, onClose, quiz (object có _id, tieuDe)
// ─────────────────────────────────────────────────────────────────────────────
const XemKetQua = ({ isOpen, onClose, quiz }) => {
  const [dangTai, setDangTai] = useState(false);
  const [data, setData] = useState(null); // { ketQua: [], thongKe: {} }

  useEffect(() => {
    if (!isOpen || !quiz?._id) return;
    const load = async () => {
      setDangTai(true);
      setData(null);
      try {
        const res = await learningService.xemKetQua(quiz._id);
        setData(res?.data || res);
      } catch {
        toast.error("Không thể tải kết quả");
      } finally {
        setDangTai(false);
      }
    };
    load();
  }, [isOpen, quiz?._id]);

  if (!isOpen) return null;

  const ds = data?.ketQua || data?.danhSach || [];
  const tk = data?.thongKe || data?.tongHop || {};
  const tongNguoi = tk.tongNguoi ?? ds.length;
  const soDat = tk.soDat ?? ds.filter((r) => r.dat).length;
  const diemTB = tk.diemTrungBinh ?? tk.diemTB ??
    (ds.length ? Math.round(ds.reduce((s, r) => s + (r.diem ?? r.diemPhanTram ?? 0), 0) / ds.length) : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d1117] border border-slate-800/60 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-sm">
              📊
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200">
                Kết quả kiểm tra
              </h2>
              <p className="text-[9px] text-slate-500 font-mono truncate max-w-[240px]">
                {quiz?.tieuDe}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* ── STATS ── */}
        {!dangTai && data && (
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-slate-800/40 bg-slate-900/20 flex-shrink-0">
            <StatBox label="Tổng người nộp" value={tongNguoi} color="slate" />
            <StatBox
              label="Số đạt"
              value={`${soDat} / ${tongNguoi}`}
              color="emerald"
              sub={tongNguoi ? `${Math.round((soDat / tongNguoi) * 100)}%` : "--"}
            />
            <StatBox label="Điểm trung bình" value={`${diemTB}%`} color="blue" />
          </div>
        )}

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto">
          {dangTai ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Đang tải...
              </p>
            </div>
          ) : ds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-600">
              <span className="text-4xl opacity-20">📋</span>
              <p className="text-xs font-black uppercase tracking-widest">
                Chưa có ai nộp bài
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[9px] uppercase text-slate-500 border-b border-slate-800/50 bg-slate-900/20 sticky top-0">
                  <th className="px-4 py-3 font-black tracking-widest text-center w-12">#</th>
                  <th className="px-3 py-3 font-black tracking-widest">Họ tên</th>
                  <th className="px-3 py-3 font-black tracking-widest text-center">Điểm</th>
                  <th className="px-3 py-3 font-black tracking-widest text-center hidden sm:table-cell">
                    Đúng/Tổng
                  </th>
                  <th className="px-3 py-3 font-black tracking-widest text-center">Kết quả</th>
                  <th className="px-3 py-3 font-black tracking-widest text-center hidden md:table-cell">
                    Thời gian
                  </th>
                  <th className="px-3 py-3 font-black tracking-widest text-center hidden md:table-cell">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {ds.map((row, idx) => {
                  const diem = Math.round(row.diem ?? row.diemPhanTram ?? 0);
                  const dat = row.dat ?? false;
                  const thoiGian = row.thoiGianLam
                    ? `${Math.floor(row.thoiGianLam / 60)}p${row.thoiGianLam % 60}s`
                    : "--";

                  return (
                    <tr
                      key={row._id || idx}
                      className="hover:bg-slate-800/20 transition-colors group"
                    >
                      {/* STT */}
                      <td className="px-4 py-3 text-center text-[10px] font-mono text-slate-600 italic">
                        {String(idx + 1).padStart(2, "0")}
                      </td>

                      {/* Tên */}
                      <td className="px-3 py-3">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                          {row.ten || row.tenNguoiLam || "--"}
                        </span>
                      </td>

                      {/* Điểm % */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`text-sm font-black ${
                            dat ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {diem}%
                        </span>
                      </td>

                      {/* Đúng/Tổng */}
                      <td className="px-3 py-3 text-center hidden sm:table-cell">
                        <span className="text-[10px] font-mono text-slate-400">
                          {row.soCauDung ?? "--"}/{row.tongCau ?? "--"}
                        </span>
                      </td>

                      {/* Đạt/Trượt */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            dat
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {dat ? "ĐẠT" : "TRƯỢT"}
                        </span>
                      </td>

                      {/* Thời gian làm */}
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <span className="text-[10px] font-mono text-slate-500">{thoiGian}</span>
                      </td>

                      {/* Tự động nộp */}
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        {row.tuDongNop ? (
                          <span className="text-[9px] font-bold text-amber-500/70 uppercase tracking-widest">
                            Tự nộp
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-700">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800/40 bg-slate-900/30 flex-shrink-0">
          <p className="text-[9px] font-mono text-slate-600">
            {ds.length} bản ghi
          </p>
          <button
            onClick={onClose}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAT BOX
// ─────────────────────────────────────────────────────────────────────────────
const StatBox = ({ label, value, color, sub }) => {
  const c = {
    slate: "text-slate-200 border-slate-700/40",
    emerald: "text-emerald-400 border-emerald-500/20",
    blue: "text-blue-400 border-blue-500/20",
  };
  return (
    <div className={`bg-slate-900/50 border ${c[color]} rounded-xl p-3`}>
      <div className="text-[9px] uppercase font-black text-slate-600 tracking-widest mb-1">
        {label}
      </div>
      <div className={`text-lg font-black ${c[color].split(" ")[0]}`}>{value}</div>
      {sub && <div className="text-[9px] font-mono text-slate-600 mt-0.5">{sub} tỉ lệ đạt</div>}
    </div>
  );
};

export default XemKetQua;