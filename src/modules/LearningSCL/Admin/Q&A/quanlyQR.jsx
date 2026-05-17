/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { learningService } from "@/services/leaning.service";
import { toast } from "react-toastify";
import QRCode from "qrcode";
import XemKetQua from "./Ketqua";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const CAU_HOI_MAC_DINH = () => ({
  id: Date.now() + Math.random(),
  noiDung: "",
  dapAn: ["", "", "", ""],
  dapAnDung: 0,
  giaiThich: "",
});

const INPUT_CLS =
  "w-full bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-slate-800/60 transition-all";
const LABEL_CLS =
  "block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
const LABEL_DAP_AN = ["A", "B", "C", "D"];

const Field = ({ label, required, children }) => (
  <div>
    <label className={LABEL_CLS}>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TRANG QUẢN LÝ QR + TẠO QUIZ
// ─────────────────────────────────────────────────────────────────────────────
const QuanLyQR = () => {
  const [danhSachKhoa, setDanhSachKhoa] = useState([]);
  const [khoaChon] = useState("all");
  const [danhSachQuiz, setDanhSachQuiz] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState({});
  const [quizXemKetQua, setQuizXemKetQua] = useState(null);
  const [showFormTao, setShowFormTao] = useState(false);

  // Load khóa học
  useEffect(() => {
    const load = async () => {
      try {
        const res = await learningService.layTatCaKhoaHoc();
        setDanhSachKhoa(Array.isArray(res) ? res : res.data || []);
      } catch {
        toast.error("Không thể tải danh sách khóa học");
      }
    };
    load();
  }, []);

  // Load quiz
  useEffect(() => {
    loadQuiz();
  }, [khoaChon]);

  const loadQuiz = async () => {
    setDangTai(true);
    try {
      if (khoaChon === "all") {
        // Gọi thẳng API lấy tất cả, không loop qua khóa học
        const res = await learningService.layTatCaBaiKiemTra();
        const list = Array.isArray(res) ? res : res?.data || [];
        setDanhSachQuiz(list);
      } else {
        const res = await learningService.layTatCaBaiKiemTra();
        const list = Array.isArray(res) ? res : res?.data || [];
        // Lọc theo khóa học được chọn
        setDanhSachQuiz(list.filter((q) => q.khoaHocId === khoaChon));
      }
    } catch {
      toast.error("Không thể tải danh sách bài kiểm tra");
    } finally {
      setDangTai(false);
    }
  };
  const handleReset = async (quiz) => {
    if (!window.confirm("Reset phiên? Toàn bộ kết quả người làm sẽ bị xóa."))
      return;
    setDangXuLy((p) => ({ ...p, [quiz._id]: true }));
    try {
      await learningService.resetPhien(quiz._id);
      toast.success("Đã reset phiên");
      setDanhSachQuiz((p) =>
        p.map((q) =>
          q._id === quiz._id
            ? {
                ...q,
                trangThai: "nhap",
                thoiGianMo: null,
                thoiGianKetThuc: null,
              }
            : q,
        ),
      );
    } catch {
      toast.error("Lỗi khi reset phiên");
    } finally {
      setDangXuLy((p) => ({ ...p, [quiz._id]: false }));
    }
  };
  const handleMoPhien = async (quiz) => {
    setDangXuLy((p) => ({ ...p, [quiz._id]: true }));
    try {
      await learningService.moPhien(quiz._id);
      toast.success(`Đã mở phiên: ${quiz.tieuDe}`);
      setDanhSachQuiz((p) =>
        p.map((q) => (q._id === quiz._id ? { ...q, trangThai: "dang_mo" } : q)),
      );
    } catch {
      toast.error("Lỗi khi mở phiên");
    } finally {
      setDangXuLy((p) => ({ ...p, [quiz._id]: false }));
    }
  };

  const handleKetThuc = async (quiz) => {
    if (!window.confirm("Kết thúc phiên? Học viên chưa nộp sẽ bị tự động nộp."))
      return;
    setDangXuLy((p) => ({ ...p, [quiz._id]: true }));
    try {
      await learningService.ketThuc(quiz._id);
      toast.success(`Đã kết thúc phiên: ${quiz.tieuDe}`);
      setDanhSachQuiz((p) =>
        p.map((q) => (q._id === quiz._id ? { ...q, trangThai: "da_dong" } : q)),
      );
    } catch {
      toast.error("Lỗi khi kết thúc phiên");
    } finally {
      setDangXuLy((p) => ({ ...p, [quiz._id]: false }));
    }
  };

  // Callback sau khi tạo quiz xong → reload + mở phiên luôn nếu muốn
  const handleTaoXong = (quizMoi) => {
    setShowFormTao(false);
    loadQuiz();
    // Nếu backend trả về quiz mới có _id, tự mở phiên luôn
    if (quizMoi?._id) {
      handleMoPhien(quizMoi);
    }
  };


  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-12">
      {/* ── HEADER STICKY ── */}
      <div className="bg-slate-900/60 border-y border-slate-800/50 px-4 py-3 sticky top-[72px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.6)] animate-pulse" />
            <h1 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Quản lý QR Kiểm tra
            </h1>
          </div>
          <div className="flex items-center gap-2">
          
            <button
              onClick={() => setShowFormTao(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] sm:text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-violet-900/20 whitespace-nowrap"
            >
              + TẠO QUIZ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
    

        {/* GRID CARDS */}
        {dangTai ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 bg-slate-900/30 border border-slate-800/40 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : danhSachQuiz.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-600 gap-4">
            <span className="text-5xl opacity-20">📋</span>
            <p className="text-xs font-black uppercase tracking-widest">
              Chưa có bài kiểm tra nào
            </p>
            <button
              onClick={() => setShowFormTao(true)}
              className="mt-2 bg-violet-600/80 hover:bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95"
            >
              + Tạo quiz đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {danhSachQuiz.map((quiz) => (
              <QuizQRCard
                onReset={() => handleReset(quiz)}
                key={quiz._id}
                quiz={quiz}
                dangXuLy={!!dangXuLy[quiz._id]}
                onMoPhien={() => handleMoPhien(quiz)}
                onKetThuc={() => handleKetThuc(quiz)}
                onXemKetQua={() => setQuizXemKetQua(quiz)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL TẠO QUIZ ── */}
      <ModalTaoQuiz
        isOpen={showFormTao}
        danhSachKhoa={danhSachKhoa}
        khoaChonSan={khoaChon !== "all" ? khoaChon : ""}
        onClose={() => setShowFormTao(false)}
        onSuccess={handleTaoXong}
      />

      {/* ── MODAL KẾT QUẢ ── */}
      <XemKetQua
        isOpen={!!quizXemKetQua}
        onClose={() => setQuizXemKetQua(null)}
        quiz={quizXemKetQua}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL TẠO QUIZ (tích hợp trong trang này)
// ─────────────────────────────────────────────────────────────────────────────
const ModalTaoQuiz = ({
  isOpen,
  danhSachKhoa,
  khoaChonSan,
  onClose,
  onSuccess,
}) => {
  const [buoc, setBuoc] = useState(1);
  const [dangLuu, setDangLuu] = useState(false);
  const [thongTin, setThongTin] = useState({
    khoaHocId: khoaChonSan || "",
    tieuDe: "",
    moTa: "",
    thoiGianLamBai: 15,
    diemDauVao: 70,
    soLanLamToiDa: 1,
    troLaiXemDapAn: true,
  });
  const [cauHois, setCauHois] = useState([CAU_HOI_MAC_DINH()]);
  const [cauDangMo, setCauDangMo] = useState(0);

  // Sync khoaChonSan vào form khi mở
  useEffect(() => {
    if (isOpen) {
      setThongTin((p) => ({ ...p, khoaHocId: khoaChonSan || "" }));
    }
  }, [isOpen, khoaChonSan]);

  const handleThongTin = (key, val) =>
    setThongTin((p) => ({ ...p, [key]: val }));

  const themCauHoi = () => {
    setCauHois((p) => [...p, CAU_HOI_MAC_DINH()]);
    setCauDangMo(cauHois.length);
  };
  const xoaCauHoi = (idx) => {
    if (cauHois.length === 1) return toast.warn("Phải có ít nhất 1 câu hỏi");
    setCauHois((p) => p.filter((_, i) => i !== idx));
    setCauDangMo((p) => Math.max(0, p > idx ? p - 1 : p));
  };
  const capNhatCau = (idx, key, val) =>
    setCauHois((p) => p.map((c, i) => (i === idx ? { ...c, [key]: val } : c)));
  const capNhatDapAn = (cauIdx, daIdx, val) =>
    setCauHois((p) =>
      p.map((c, i) =>
        i === cauIdx
          ? { ...c, dapAn: c.dapAn.map((d, j) => (j === daIdx ? val : d)) }
          : c,
      ),
    );

  const validateBuoc1 = () => {
    if (!thongTin.tieuDe.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return false;
    }
    return true;
  };
  const validateBuoc2 = () => {
    for (let i = 0; i < cauHois.length; i++) {
      const c = cauHois[i];
      if (!c.noiDung.trim()) {
        toast.error(`Câu ${i + 1}: Chưa nhập nội dung`);
        setCauDangMo(i);
        return false;
      }
      for (let j = 0; j < c.dapAn.length; j++) {
        if (!c.dapAn[j].trim()) {
          toast.error(`Câu ${i + 1}: Đáp án ${LABEL_DAP_AN[j]} chưa điền`);
          setCauDangMo(i);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateBuoc2()) return;
    setDangLuu(true);
    try {
      const payload = {
        ...thongTin,
        cauHoi: cauHois.map(({ noiDung, dapAn, dapAnDung, giaiThich }) => ({
          noiDung,
          dapAn,
          dapAnDung,
          giaiThich,
        })),
      };
      const res = await learningService.taoBaiKiemTra(payload);
      toast.success("Tạo bài kiểm tra thành công!");
      handleClose();
      onSuccess?.(res?.data || res);
    } catch (err) {
      toast.error(err?.message || "Lỗi khi tạo bài kiểm tra");
    } finally {
      setDangLuu(false);
    }
  };

  const handleClose = () => {
    setBuoc(1);
    setThongTin({
      khoaHocId: "",
      tieuDe: "",
      moTa: "",
      thoiGianLamBai: 15,
      diemDauVao: 70,
      soLanLamToiDa: 1,
      troLaiXemDapAn: true,
    });
    setCauHois([CAU_HOI_MAC_DINH()]);
    setCauDangMo(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0d1117] border border-slate-800/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-sm">
              📝
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200">
                Tạo bài kiểm tra
              </h2>
              <p className="text-[9px] text-slate-600 font-mono">
                {cauHois.length} câu hỏi
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* STEP INDICATOR */}
        <div className="flex items-center px-6 py-3 border-b border-slate-800/40 bg-slate-900/30 flex-shrink-0 gap-1">
          {[
            { num: 1, label: "Thông tin" },
            { num: 2, label: "Câu hỏi" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => {
                  if (s.num === 2 && !validateBuoc1()) return;
                  setBuoc(s.num);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${buoc === s.num ? "bg-violet-500/15 text-violet-400 border border-violet-500/30" : buoc > s.num ? "text-emerald-500" : "text-slate-600"}`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border ${buoc === s.num ? "border-violet-500 bg-violet-500/20 text-violet-300" : buoc > s.num ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-slate-700 text-slate-600"}`}
                >
                  {buoc > s.num ? "✓" : s.num}
                </span>
                {s.label}
              </button>
              {i < 1 && <div className="w-6 h-px bg-slate-800 mx-1" />}
            </div>
          ))}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">
          {buoc === 1 ? (
            <FormThongTin
              thongTin={thongTin}
              onChange={handleThongTin}
              danhSachKhoa={danhSachKhoa}
            />
          ) : (
            <FormCauHoi
              cauHois={cauHois}
              cauDangMo={cauDangMo}
              onToggle={setCauDangMo}
              onThem={themCauHoi}
              onXoa={xoaCauHoi}
              onCapNhat={capNhatCau}
              onCapNhatDapAn={capNhatDapAn}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60 bg-slate-900/40 flex-shrink-0">
          <button
            onClick={handleClose}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
          >
            Huỷ
          </button>
          <div className="flex items-center gap-2">
            {buoc === 2 && (
              <button
                onClick={() => setBuoc(1)}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                ← Quay lại
              </button>
            )}
            {buoc === 1 ? (
              <button
                onClick={() => {
                  if (validateBuoc1()) setBuoc(2);
                }}
                className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-violet-900/20"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={dangLuu}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-2"
              >
                {dangLuu ? (
                  <>
                    <svg
                      className="w-3 h-3 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="32"
                        strokeDashoffset="12"
                      />
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  "✓ Tạo & hiển thị QR"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM BƯỚC 1 — THÔNG TIN
// ─────────────────────────────────────────────────────────────────────────────
const FormThongTin = ({ thongTin, onChange }) => (
  <div className="p-6 space-y-5">
   
    <Field label="Tiêu đề bài kiểm tra" required>
      <input
        type="text"
        value={thongTin.tieuDe}
        onChange={(e) => onChange("tieuDe", e.target.value)}
        placeholder="VD: Kiểm tra an toàn thực phẩm"
        className={INPUT_CLS}
      />
    </Field>
    <Field label="Mô tả (tuỳ chọn)">
      <textarea
        value={thongTin.moTa}
        onChange={(e) => onChange("moTa", e.target.value)}
        placeholder="Hướng dẫn ngắn..."
        rows={2}
        className={INPUT_CLS + " resize-none"}
      />
    </Field>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Thời gian (phút)">
        <div className="relative">
          <input
            type="number"
            min={1}
            max={180}
            value={thongTin.thoiGianLamBai}
            onChange={(e) => onChange("thoiGianLamBai", Number(e.target.value))}
            className={INPUT_CLS + " pr-10"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
            p
          </span>
        </div>
      </Field>
      <Field label="Điểm đậu (%)">
        <div className="relative">
          <input
            type="number"
            min={0}
            max={100}
            value={thongTin.diemDauVao}
            onChange={(e) => onChange("diemDauVao", Number(e.target.value))}
            className={INPUT_CLS + " pr-6"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
            %
          </span>
        </div>
      </Field>
      <Field label="Số lần làm tối đa">
        <input
          type="number"
          min={1}
          max={10}
          value={thongTin.soLanLamToiDa}
          onChange={(e) => onChange("soLanLamToiDa", Number(e.target.value))}
          className={INPUT_CLS}
        />
      </Field>
      <Field label="Cho xem lại đáp án">
        <button
          onClick={() => onChange("troLaiXemDapAn", !thongTin.troLaiXemDapAn)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${thongTin.troLaiXemDapAn ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-slate-800/40 border-slate-700/50 text-slate-500"}`}
        >
          <span>{thongTin.troLaiXemDapAn ? "Có" : "Không"}</span>
          <div
            className={`w-8 h-4 rounded-full relative transition-all ${thongTin.troLaiXemDapAn ? "bg-emerald-500" : "bg-slate-700"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${thongTin.troLaiXemDapAn ? "left-4" : "left-0.5"}`}
            />
          </div>
        </button>
      </Field>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FORM BƯỚC 2 — CÂU HỎI
// ─────────────────────────────────────────────────────────────────────────────
const FormCauHoi = ({
  cauHois,
  cauDangMo,
  onToggle,
  onThem,
  onXoa,
  onCapNhat,
  onCapNhatDapAn,
}) => (
  <div className="p-4 space-y-2">
    {cauHois.map((cau, idx) => (
      <CauHoiCard
        key={cau.id}
        cau={cau}
        idx={idx}
        isOpen={cauDangMo === idx}
        onToggle={() => onToggle(cauDangMo === idx ? -1 : idx)}
        onXoa={() => onXoa(idx)}
        onCapNhat={(key, val) => onCapNhat(idx, key, val)}
        onCapNhatDapAn={(daIdx, val) => onCapNhatDapAn(idx, daIdx, val)}
      />
    ))}
    <button
      onClick={onThem}
      className="w-full py-3 border border-dashed border-slate-700/60 hover:border-violet-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-violet-400 transition-all flex items-center justify-center gap-2 group"
    >
      <span className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-violet-500/50 flex items-center justify-center text-sm leading-none">
        +
      </span>
      Thêm câu hỏi
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CARD CÂU HỎI
// ─────────────────────────────────────────────────────────────────────────────
const CauHoiCard = ({
  cau,
  idx,
  isOpen,
  onToggle,
  onXoa,
  onCapNhat,
  onCapNhatDapAn,
}) => (
  <div
    className={`border rounded-xl overflow-hidden transition-all ${isOpen ? "border-violet-500/30 bg-violet-500/[0.03]" : "border-slate-800/60 bg-slate-900/20 hover:border-slate-700/60"}`}
  >
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
      onClick={onToggle}
    >
      <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center text-[10px] font-black text-slate-400 flex-shrink-0">
        {idx + 1}
      </span>
      <p className="flex-1 text-xs text-slate-400 truncate font-medium">
        {cau.noiDung || (
          <span className="text-slate-600 italic">Chưa nhập nội dung...</span>
        )}
      </p>
      <div className="flex items-center gap-1 flex-shrink-0">
        {cau.noiDung && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            ĐÁ: {LABEL_DAP_AN[cau.dapAnDung]}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onXoa();
          }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors text-sm"
        >
          ×
        </button>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
    {isOpen && (
      <div className="px-4 pb-4 space-y-3 border-t border-slate-800/40 pt-3">
        <Field label="Nội dung câu hỏi" required>
          <textarea
            value={cau.noiDung}
            onChange={(e) => onCapNhat("noiDung", e.target.value)}
            placeholder="Nhập câu hỏi..."
            rows={2}
            className={INPUT_CLS + " resize-none text-sm"}
            autoFocus
          />
        </Field>
        <div>
          <label className={LABEL_CLS}>Đáp án (chọn đáp án đúng)</label>
          <div className="space-y-2 mt-1.5">
            {cau.dapAn.map((da, daIdx) => (
              <div key={daIdx} className="flex items-center gap-2">
                <button
                  onClick={() => onCapNhat("dapAnDung", daIdx)}
                  className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${cau.dapAnDung === daIdx ? "border-emerald-500 bg-emerald-500/20" : "border-slate-700 hover:border-slate-500"}`}
                >
                  {cau.dapAnDung === daIdx && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  )}
                </button>
                <span
                  className={`w-6 text-[10px] font-black flex-shrink-0 ${cau.dapAnDung === daIdx ? "text-emerald-400" : "text-slate-600"}`}
                >
                  {LABEL_DAP_AN[daIdx]}
                </span>
                <input
                  type="text"
                  value={da}
                  onChange={(e) => onCapNhatDapAn(daIdx, e.target.value)}
                  placeholder={`Đáp án ${LABEL_DAP_AN[daIdx]}`}
                  className={`flex-1 ${INPUT_CLS} ${cau.dapAnDung === daIdx ? "border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-300" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>
        <Field label="Giải thích (tuỳ chọn)">
          <input
            type="text"
            value={cau.giaiThich}
            onChange={(e) => onCapNhat("giaiThich", e.target.value)}
            placeholder="Hiển thị sau khi nộp bài..."
            className={INPUT_CLS}
          />
        </Field>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CARD QR MỖI QUIZ
// ─────────────────────────────────────────────────────────────────────────────
const QuizQRCard = ({
  quiz,
  dangXuLy,
  onMoPhien,
  onKetThuc,
  onXemKetQua,
  onReset,
}) => {
  const canvasRef = useRef(null);
  const [qrUrl, setQrUrl] = useState("");
  const trangThai = quiz.trangThai || "nhap";
  const lamBaiUrl = `${window.location.origin}/lam-bai?token=${quiz.qrToken || quiz._id}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, lamBaiUrl, {
      width: 160,
      margin: 1,
      color: { dark: "#e2e8f0", light: "#0f172a" },
    }).catch(console.error);
    QRCode.toDataURL(lamBaiUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    })
      .then(setQrUrl)
      .catch(console.error);
  }, [lamBaiUrl]);

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `QR-${quiz.tieuDe}.png`;
    a.click();
  };

  const STATUS = {
    nhap: {
      label: "Chưa mở",
      cls: "bg-slate-700/50 text-slate-400 border-slate-600/30",
    },
    dang_mo: {
      label: "Đang mở",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    da_dong: {
      label: "Đã đóng",
      cls: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    da_ket_thuc: {
      // ← thêm vào
      label: "Đã đóng",
      cls: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  };
  const s = STATUS[trangThai] || STATUS.nhap;

  return (
    <div
      className={`flex flex-col bg-slate-900/30 border rounded-2xl overflow-hidden backdrop-blur-sm transition-all ${trangThai === "dang_mo" ? "border-emerald-500/30 shadow-lg shadow-emerald-900/10" : trangThai === "da_dong" ? "border-slate-700/40 opacity-80" : "border-slate-800/60"}`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/40">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">
              {quiz.tenKhoaHoc}
            </p>
            <h3 className="text-sm font-black text-slate-200 mt-0.5 line-clamp-2 leading-tight">
              {quiz.tieuDe}
            </h3>
          </div>
          <span
            className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${s.cls}`}
          >
            {s.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600 font-mono">
          <span>⏱ {quiz.thoiGianLamBai || "--"} phút</span>
          <span>·</span>
          <span>📝 {quiz.cauHoi?.length || 0} câu</span>
          <span>·</span>
          <span>🎯 {quiz.diemDauVao || "--"}%</span>
        </div>
      </div>

      {/* QR */}
      <div className="flex flex-col items-center py-6 bg-slate-950/20">
        <div
          className={`p-3 rounded-2xl border transition-all ${trangThai === "dang_mo" ? "border-emerald-500/20 bg-slate-900/80 shadow-md shadow-emerald-900/10" : "border-slate-800/50 bg-slate-900/50 opacity-50 grayscale"}`}
        >
          <canvas ref={canvasRef} className="block rounded-lg" />
        </div>
        {trangThai === "nhap" && (
          <p className="text-[9px] text-slate-700 mt-3 font-bold uppercase tracking-widest">
            Mở phiên để kích hoạt QR
          </p>
        )}
        {trangThai === "da_dong" && (
          <p className="text-[9px] text-slate-700 mt-3 font-bold uppercase tracking-widest">
            Phiên đã kết thúc
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2 mt-auto">
        {trangThai === "nhap" && (
          <button
            onClick={onMoPhien}
            disabled={dangXuLy}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95"
          >
            {dangXuLy ? "Đang xử lý..." : "▶ Mở phiên"}
          </button>
        )}
        {trangThai === "dang_mo" && (
          <>
            <button
              onClick={handleDownload}
              className="flex-shrink-0 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 text-slate-400 hover:text-slate-200 transition-all"
              title="Tải QR"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
            <button
              onClick={onKetThuc}
              disabled={dangXuLy}
              className="flex-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95"
            >
              {dangXuLy ? "Đang xử lý..." : "■ Kết thúc phiên"}
            </button>
          </>
        )}
        {(trangThai === "da_dong" || trangThai === "da_ket_thuc") && (
          <>
            <button
              onClick={onXemKetQua}
              className="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95"
            >
              Xem kết quả
            </button>
            <button
              onClick={onReset}
              className="flex-shrink-0 p-3 rounded-xl border border-slate-700/50 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 transition-all"
              title="Reset & dùng lại"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </>
        )}

   
      </div>
    </div>
  );
};



export default QuanLyQR;
