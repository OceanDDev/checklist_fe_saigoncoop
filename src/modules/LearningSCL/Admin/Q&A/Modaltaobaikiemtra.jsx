/* eslint-disable react/prop-types */
import { useState } from "react";
import { learningService } from "@/services/leaning.service";
import { toast } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CAU_HOI_MAC_DINH = () => ({
  id: Date.now() + Math.random(),
  noiDung: "",
  dapAn: ["", "", "", ""],
  dapAnDung: 0,
  giaiThich: "",
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CHÍNH
// ─────────────────────────────────────────────────────────────────────────────
const ModalTaoBaiKiemTra = ({ isOpen, onClose, khoaHocId, onSuccess }) => {
  const [buoc, setBuoc] = useState(1); // 1: thông tin, 2: câu hỏi
  const [dangLuu, setDangLuu] = useState(false);

  // ── Form thông tin chung ──
  const [thongTin, setThongTin] = useState({
    tieuDe: "",
    moTa: "",
    thoiGianLamBai: 15,
    diemDauVao: 70,
    soLanLamToiDa: 1,
    troLaiXemDapAn: true,
  });

  // ── Danh sách câu hỏi ──
  const [cauHois, setCauHois] = useState([CAU_HOI_MAC_DINH()]);
  const [cauDangMo, setCauDangMo] = useState(0); // index câu đang expand

  // ─────────────────────────────────────────────
  // HANDLERS — THÔNG TIN
  // ─────────────────────────────────────────────
  const handleThongTin = (key, val) =>
    setThongTin((p) => ({ ...p, [key]: val }));

  // ─────────────────────────────────────────────
  // HANDLERS — CÂU HỎI
  // ─────────────────────────────────────────────
  const themCauHoi = () => {
    const moi = CAU_HOI_MAC_DINH();
    setCauHois((p) => [...p, moi]);
    setCauDangMo(cauHois.length);
  };

  const xoaCauHoi = (idx) => {
    if (cauHois.length === 1) return toast.warn("Phải có ít nhất 1 câu hỏi");
    setCauHois((p) => p.filter((_, i) => i !== idx));
    setCauDangMo((p) => Math.max(0, p > idx ? p - 1 : p));
  };

  const capNhatCau = (idx, key, val) =>
    setCauHois((p) =>
      p.map((c, i) => (i === idx ? { ...c, [key]: val } : c)),
    );

  const capNhatDapAn = (cauIdx, daIdx, val) =>
    setCauHois((p) =>
      p.map((c, i) =>
        i === cauIdx
          ? { ...c, dapAn: c.dapAn.map((d, j) => (j === daIdx ? val : d)) }
          : c,
      ),
    );

  // ─────────────────────────────────────────────
  // VALIDATE
  // ─────────────────────────────────────────────
  const validateBuoc1 = () => {
    if (!thongTin.tieuDe.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài kiểm tra");
      return false;
    }
    return true;
  };

  const validateBuoc2 = () => {
    for (let i = 0; i < cauHois.length; i++) {
      const c = cauHois[i];
      if (!c.noiDung.trim()) {
        toast.error(`Câu ${i + 1}: Chưa nhập nội dung câu hỏi`);
        setCauDangMo(i);
        return false;
      }
      for (let j = 0; j < c.dapAn.length; j++) {
        if (!c.dapAn[j].trim()) {
          toast.error(`Câu ${i + 1}: Đáp án ${String.fromCharCode(65 + j)} chưa điền`);
          setCauDangMo(i);
          return false;
        }
      }
    }
    return true;
  };

  // ─────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateBuoc2()) return;
    setDangLuu(true);
    try {
      const payload = {
        ...thongTin,
        khoaHocId,
        cauHoi: cauHois.map(({ noiDung, dapAn, dapAnDung, giaiThich }) => ({
          noiDung,
          dapAn,
          dapAnDung,
          giaiThich,
        })),
      };
      await learningService.taoBaiKiemTra(payload);
      toast.success("Tạo bài kiểm tra thành công!");
      handleClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Lỗi khi tạo bài kiểm tra");
    } finally {
      setDangLuu(false);
    }
  };

  const handleClose = () => {
    setBuoc(1);
    setThongTin({
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

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0d1117] border border-slate-800/60 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
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

        {/* ── STEP INDICATOR ── */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-slate-800/40 bg-slate-900/30 flex-shrink-0">
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  buoc === s.num
                    ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                    : buoc > s.num
                      ? "text-emerald-500"
                      : "text-slate-600"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border ${
                    buoc === s.num
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : buoc > s.num
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                        : "border-slate-700 text-slate-600"
                  }`}
                >
                  {buoc > s.num ? "✓" : s.num}
                </span>
                {s.label}
              </button>
              {i < 1 && (
                <div className="w-6 h-px bg-slate-800 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* ── BODY (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">
          {buoc === 1 ? (
            <BuocThongTin thongTin={thongTin} onChange={handleThongTin} />
          ) : (
            <BuocCauHoi
              cauHois={cauHois}
              cauDangMo={cauDangMo}
              onToggle={setCauDangMo}
              onThemCau={themCauHoi}
              onXoaCau={xoaCauHoi}
              onCapNhatCau={capNhatCau}
              onCapNhatDapAn={capNhatDapAn}
            />
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60 bg-slate-900/40 flex-shrink-0">
          <button
            onClick={handleClose}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors px-4 py-2 rounded-lg hover:bg-slate-800"
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
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/20 flex items-center gap-2"
              >
                {dangLuu ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  "✓ Tạo bài kiểm tra"
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
// BƯỚC 1 — THÔNG TIN CHUNG
// ─────────────────────────────────────────────────────────────────────────────
const BuocThongTin = ({ thongTin, onChange }) => (
  <div className="p-6 space-y-5">
    {/* Tiêu đề */}
    <Field label="Tiêu đề bài kiểm tra" required>
      <input
        type="text"
        value={thongTin.tieuDe}
        onChange={(e) => onChange("tieuDe", e.target.value)}
        placeholder="VD: Kiểm tra kiến thức an toàn thực phẩm"
        className={INPUT_CLS}
      />
    </Field>

    {/* Mô tả */}
    <Field label="Mô tả (tuỳ chọn)">
      <textarea
        value={thongTin.moTa}
        onChange={(e) => onChange("moTa", e.target.value)}
        placeholder="Hướng dẫn hoặc mô tả ngắn về bài kiểm tra..."
        rows={3}
        className={INPUT_CLS + " resize-none"}
      />
    </Field>

    {/* Grid 2 cột */}
    <div className="grid grid-cols-2 gap-4">
      <Field label="Thời gian làm bài (phút)">
        <div className="relative">
          <input
            type="number"
            min={1}
            max={180}
            value={thongTin.thoiGianLamBai}
            onChange={(e) => onChange("thoiGianLamBai", Number(e.target.value))}
            className={INPUT_CLS + " pr-12"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
            phút
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
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
            thongTin.troLaiXemDapAn
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
              : "bg-slate-800/40 border-slate-700/50 text-slate-500"
          }`}
        >
          <span>{thongTin.troLaiXemDapAn ? "Có" : "Không"}</span>
          <div
            className={`w-8 h-4 rounded-full transition-all relative ${
              thongTin.troLaiXemDapAn ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow ${
                thongTin.troLaiXemDapAn ? "left-4" : "left-0.5"
              }`}
            />
          </div>
        </button>
      </Field>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 2 — CÂU HỎI
// ─────────────────────────────────────────────────────────────────────────────
const BuocCauHoi = ({
  cauHois,
  cauDangMo,
  onToggle,
  onThemCau,
  onXoaCau,
  onCapNhatCau,
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
        onXoa={() => onXoaCau(idx)}
        onCapNhat={(key, val) => onCapNhatCau(idx, key, val)}
        onCapNhatDapAn={(daIdx, val) => onCapNhatDapAn(idx, daIdx, val)}
      />
    ))}

    {/* Nút thêm câu */}
    <button
      onClick={onThemCau}
      className="w-full py-3 border border-dashed border-slate-700/60 hover:border-violet-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-violet-400 transition-all flex items-center justify-center gap-2 group"
    >
      <span className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-violet-500/50 flex items-center justify-center text-sm leading-none group-hover:text-violet-400 transition-colors">
        +
      </span>
      Thêm câu hỏi
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CARD MỘT CÂU HỎI
// ─────────────────────────────────────────────────────────────────────────────
const LABEL_DAP_AN = ["A", "B", "C", "D"];

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
    className={`border rounded-xl overflow-hidden transition-all ${
      isOpen
        ? "border-violet-500/30 bg-violet-500/[0.03]"
        : "border-slate-800/60 bg-slate-900/20 hover:border-slate-700/60"
    }`}
  >
    {/* Header câu */}
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
        {/* Đáp án đúng badge */}
        {cau.noiDung && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            ĐÁ: {LABEL_DAP_AN[cau.dapAnDung]}
          </span>
        )}
        {/* Xóa */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onXoa();
          }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors text-sm"
        >
          ×
        </button>
        {/* Toggle arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    {/* Body câu */}
    {isOpen && (
      <div className="px-4 pb-4 space-y-3 border-t border-slate-800/40 pt-3">
        {/* Nội dung câu hỏi */}
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

        {/* 4 đáp án */}
        <div>
          <label className={LABEL_CLS}>Đáp án (chọn đáp án đúng)</label>
          <div className="space-y-2 mt-1.5">
            {cau.dapAn.map((da, daIdx) => (
              <div key={daIdx} className="flex items-center gap-2">
                {/* Radio chọn đúng */}
                <button
                  onClick={() => onCapNhat("dapAnDung", daIdx)}
                  className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                    cau.dapAnDung === daIdx
                      ? "border-emerald-500 bg-emerald-500/20"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {cau.dapAnDung === daIdx && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  )}
                </button>
                {/* Label A/B/C/D */}
                <span
                  className={`w-6 text-[10px] font-black flex-shrink-0 ${
                    cau.dapAnDung === daIdx ? "text-emerald-400" : "text-slate-600"
                  }`}
                >
                  {LABEL_DAP_AN[daIdx]}
                </span>
                {/* Input */}
                <input
                  type="text"
                  value={da}
                  onChange={(e) => onCapNhatDapAn(daIdx, e.target.value)}
                  placeholder={`Đáp án ${LABEL_DAP_AN[daIdx]}`}
                  className={`flex-1 ${INPUT_CLS} ${
                    cau.dapAnDung === daIdx
                      ? "border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-300"
                      : ""
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Giải thích */}
        <Field label="Giải thích đáp án (tuỳ chọn)">
          <input
            type="text"
            value={cau.giaiThich}
            onChange={(e) => onCapNhat("giaiThich", e.target.value)}
            placeholder="Hiển thị sau khi học viên nộp bài..."
            className={INPUT_CLS}
          />
        </Field>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const INPUT_CLS =
  "w-full bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-slate-800/60 transition-all";

const LABEL_CLS =
  "block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5";

const Field = ({ label, required, children }) => (
  <div>
    <label className={LABEL_CLS}>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default ModalTaoBaiKiemTra;