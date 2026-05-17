/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { learningService } from "@/services/leaning.service";

const BUOC = {
  NHAP_TEN: "nhap_ten",
  LAM_BAI: "lam_bai",
  KET_QUA: "ket_qua",
  LOI: "loi",
};
const LABEL = ["A", "B", "C", "D"];

const TrangLamBai = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [buoc, setBuoc] = useState(BUOC.NHAP_TEN);
  const [dangTai, setDangTai] = useState(true);
  const [deBai, setDeBai] = useState(null);
  const [loiMsg, setLoiMsg] = useState("");

  const [ten, setTen] = useState("");
  const [ketQuaId, setKetQuaId] = useState(null);

  const [cauHienTai, setCauHienTai] = useState(0);
  const [dapAnChon, setDapAnChon] = useState({});
  const [dangNop, setDangNop] = useState(false);

  const [ketQua, setKetQua] = useState(null);

  // ── Xác thực QR ──
  useEffect(() => {
    if (!token) {
      setLoiMsg("Không tìm thấy mã QR. Vui lòng quét lại.");
      setBuoc(BUOC.LOI);
      setDangTai(false);
      return;
    }
    const xacThuc = async () => {
      try {
        const res = await learningService.xacThucQR(token);
        const data = res?.data || res;

        // BUG FIX 1: backend trả { hopLe, baiKiemTra } → phải unwrap đúng
        const baiKiemTra = data?.baiKiemTra || data;
        if (!baiKiemTra?._id) throw new Error("Dữ liệu không hợp lệ");

        setDeBai(baiKiemTra);
      } catch (err) {
        setLoiMsg(
          err?.response?.data?.loi ||
            err?.response?.data?.message ||
            err?.message ||
            "Mã QR không hợp lệ hoặc phiên đã kết thúc.",
        );
        setBuoc(BUOC.LOI);
      } finally {
        setDangTai(false);
      }
    };
    xacThuc();
  }, [token]);

  // ── Bắt đầu ──
  const handleBatDau = async () => {
    if (!ten.trim()) return;
    setDangTai(true);
    try {
      // BUG FIX 2: backend đọc "tenNguoiLam", không phải "ten"
      const res = await learningService.batDau(deBai._id, {
        tenNguoiLam: ten.trim(),
        token,
      });
      const data = res?.data || res;
      setKetQuaId(data.ketQuaId || data._id);
      setBuoc(BUOC.LAM_BAI);
    } catch (err) {
      setLoiMsg(
        err?.response?.data?.loi ||
          err?.response?.data?.message ||
          "Không thể bắt đầu bài làm.",
      );
      setBuoc(BUOC.LOI);
    } finally {
      setDangTai(false);
    }
  };

  // ── Nộp bài ──
  const handleNop = async () => {
    if (dangNop) return;
    setDangNop(true);
    try {
      // BUG FIX 3: backend dùng cauHoiIndex (số), không phải cauHoiId (string _id)
      const payload = {
        ketQuaId,
        danhSachCauTraLoi: Object.entries(dapAnChon).map(
          ([cauHoiIndex, dapAnChon]) => ({
            cauHoiIndex: Number(cauHoiIndex),
            dapAnChon,
          }),
        ),
      };
      const res = await learningService.nopBai(deBai._id, payload);
      setKetQua(res?.data || res);
      setBuoc(BUOC.KET_QUA);
    } catch (err) {
      setLoiMsg(
        err?.response?.data?.loi ||
          err?.response?.data?.message ||
          "Lỗi khi nộp bài.",
      );
      setBuoc(BUOC.LOI);
    } finally {
      setDangNop(false);
    }
  };

  // ── RENDER ──
  const wrap = (children) => (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col">
      {children}
    </div>
  );

  if (dangTai) return wrap(<TrangLoading />);
  if (buoc === BUOC.LOI) return wrap(<TrangLoi msg={loiMsg} />);
  if (buoc === BUOC.NHAP_TEN)
    return wrap(
      <MaNhapTen
        deBai={deBai}
        ten={ten}
        onChangeTen={setTen}
        onBatDau={handleBatDau}
        dangTai={dangTai}
      />,
    );
  if (buoc === BUOC.LAM_BAI)
    return wrap(
      <MaLamBai
        deBai={deBai}
        cauHienTai={cauHienTai}
        dapAnChon={dapAnChon}
        dangNop={dangNop}
        // BUG FIX 3 (tiếp): lưu theo index, không theo _id
        onChon={(cauIndex, daIdx) =>
          setDapAnChon((p) => ({ ...p, [cauIndex]: daIdx }))
        }
        onNext={() =>
          setCauHienTai((p) =>
            Math.min(p + 1, (deBai.danhSachCauHoi?.length || 1) - 1),
          )
        }
        onPrev={() => setCauHienTai((p) => Math.max(p - 1, 0))}
        onNop={handleNop}
      />,
    );
  if (buoc === BUOC.KET_QUA)
    return wrap(<MaKetQua ketQua={ketQua} ten={ten} deBai={deBai} />);

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────────────────────────────────────
const TrangLoading = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-5">
    <div className="w-12 h-12 rounded-full border-[3px] border-violet-500/20 border-t-violet-500 animate-spin" />
    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-600">
      Đang xác thực...
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LỖI
// ─────────────────────────────────────────────────────────────────────────────
const TrangLoi = ({ msg }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
    <div className="w-20 h-20 rounded-3xl bg-red-500/8 border border-red-500/20 flex items-center justify-center text-4xl">
      ⚠️
    </div>
    <div>
      <h2 className="text-lg font-black text-slate-200 mb-2">
        Không thể truy cập
      </h2>
      <p className="text-sm text-slate-500 leading-relaxed">{msg}</p>
    </div>
    <p className="text-[10px] font-mono text-slate-700 mt-4">
      Liên hệ giám sát để được hỗ trợ
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// NHẬP TÊN
// ─────────────────────────────────────────────────────────────────────────────
const MaNhapTen = ({ deBai, ten, onChangeTen, onBatDau, dangTai }) => (
  <div className="flex-1 flex flex-col px-6 pt-14 pb-10 max-w-sm mx-auto w-full">
    <div className="mb-10 text-center">
      <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-violet-900/10">
        📝
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-600 mb-2">
        Bài kiểm tra
      </p>
      <h1 className="text-xl font-black text-slate-100 leading-snug">
        {deBai?.tieuDe}
      </h1>
    </div>

    <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
      {[
        { icon: "📋", val: `${deBai?.danhSachCauHoi?.length || "--"} câu` },
        {
          icon: "⏱",
          val: `${deBai?.caiDat?.thoiGianLamBai || deBai?.thoiGianLamBai || "--"} phút`,
        },
        {
          icon: "🎯",
          val: `Đậu ${deBai?.caiDat?.diemDauVao ?? deBai?.diemDauVao ?? "--"}%`,
        },
      ].map((c) => (
        <span
          key={c.val}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/70 border border-slate-800/60 rounded-full text-[11px] font-bold text-slate-400"
        >
          <span>{c.icon}</span>
          {c.val}
        </span>
      ))}
    </div>

    <div className="flex-1 flex flex-col justify-end gap-4">
      <div>
        <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-600 mb-2.5">
          Họ và tên của bạn
        </label>
        <input
          type="text"
          value={ten}
          onChange={(e) => onChangeTen(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ten.trim() && onBatDau()}
          placeholder="Nhập họ tên..."
          autoFocus
          className="w-full bg-slate-900/60 border border-slate-700/60 rounded-2xl px-4 py-4 text-base text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/80 transition-all"
        />
      </div>

      <button
        onClick={onBatDau}
        disabled={!ten.trim() || dangTai}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-sm py-4 rounded-2xl transition-all active:scale-[0.97] shadow-xl shadow-violet-900/30"
      >
        {dangTai ? "Đang tải..." : "Bắt đầu làm bài →"}
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LÀM BÀI — WIZARD TỪNG CÂU
// ─────────────────────────────────────────────────────────────────────────────
const MaLamBai = ({
  deBai,
  cauHienTai,
  dapAnChon,
  dangNop,
  onChon,
  onNext,
  onPrev,
  onNop,
}) => {
  // Backend dùng "danhSachCauHoi", không phải "cauHoi"
  const cauHois = deBai?.danhSachCauHoi || deBai?.cauHoi || [];
  const tongCau = cauHois.length;
  const cau = cauHois[cauHienTai];
  const laCauCuoi = cauHienTai === tongCau - 1;
  // dapAnChon lưu theo index nên kiểm tra theo cauHienTai
  const daChon = dapAnChon[cauHienTai] !== undefined;

  if (!cau) return null;

  return (
    <div className="flex-1 flex flex-col max-w-sm mx-auto w-full">
      {/* ── HEADER ── */}
      <div className="px-5 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-1 mb-5 flex-wrap">
          {cauHois.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === cauHienTai
                  ? "w-6 bg-violet-500"
                  : dapAnChon[i] !== undefined
                    ? "w-3 bg-violet-500/40"
                    : "w-3 bg-slate-800"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
            Câu {cauHienTai + 1}
            <span className="text-slate-700"> / {tongCau}</span>
          </p>
          <p className="text-[10px] font-mono text-slate-700">
            {Object.keys(dapAnChon).length}/{tongCau} đã chọn
          </p>
        </div>
      </div>

      {/* ── NỘI DUNG CÂU HỎI ── */}
      <div className="flex-1 px-5 overflow-y-auto">
        <p className="text-lg font-bold text-slate-100 leading-relaxed mb-7">
          {cau.noiDung}
        </p>

        <div className="space-y-3 pb-4">
          {/* Backend dùng "cacLuaChon" hoặc "dapAn" */}
          {(cau.cacLuaChon || cau.dapAn || []).map((da, daIdx) => {
            const isChon = dapAnChon[cauHienTai] === daIdx;
            return (
              <button
                key={daIdx}
                // BUG FIX 3: truyền cauHienTai (index) thay vì cau._id
                onClick={() => onChon(cauHienTai, daIdx)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all active:scale-[0.97] ${
                  isChon
                    ? "bg-violet-500/12 border-violet-500/50 shadow-md shadow-violet-900/10"
                    : "bg-slate-900/50 border-slate-800/70 hover:border-slate-700 active:bg-slate-900/80"
                }`}
              >
                <span
                  className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                    isChon
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-slate-700 text-slate-500"
                  }`}
                >
                  {LABEL[daIdx]}
                </span>
                <span
                  className={`text-sm font-medium leading-snug flex-1 transition-colors ${
                    isChon ? "text-violet-100" : "text-slate-300"
                  }`}
                >
                  {da}
                </span>
                {isChon && (
                  <span className="w-5 h-5 flex-shrink-0 rounded-full bg-violet-500 flex items-center justify-center text-[10px] text-white font-black">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── NAVIGATION ── */}
      <div className="px-5 pb-8 pt-4 flex-shrink-0 flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={cauHienTai === 0}
          className="w-12 h-12 flex-shrink-0 rounded-2xl border border-slate-800/80 disabled:opacity-20 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all active:scale-95 flex items-center justify-center text-lg"
        >
          ←
        </button>

        {!laCauCuoi ? (
          <button
            onClick={onNext}
            className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.97] ${
              daChon
                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-slate-800/80 text-slate-400 hover:bg-slate-800"
            }`}
          >
            Tiếp theo →
          </button>
        ) : (
          <button
            onClick={onNop}
            disabled={dangNop}
            className="flex-1 py-4 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.97]"
          >
            {dangNop ? "Đang nộp..." : "✓ Nộp bài"}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KẾT QUẢ
// ─────────────────────────────────────────────────────────────────────────────
const MaKetQua = ({ ketQua, ten, deBai }) => {
  const diem = Math.round(ketQua?.diem ?? ketQua?.diemPhanTram ?? 0);
  const soDung = ketQua?.soCauDung ?? 0;
  const tongCau = deBai?.danhSachCauHoi?.length || deBai?.cauHoi?.length || 0;
  const diemDauVao = deBai?.caiDat?.diemDauVao ?? deBai?.diemDauVao ?? 70;
  const datYeuCau = ketQua?.dat ?? diem >= diemDauVao;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-0">
      <div
        className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center mb-8 border-[5px] shadow-2xl ${
          datYeuCau
            ? "border-emerald-500 bg-emerald-500/8 shadow-emerald-900/30"
            : "border-red-500 bg-red-500/8 shadow-red-900/30"
        }`}
      >
        <span
          className={`text-5xl font-black leading-none ${
            datYeuCau ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {diem}
          <span className="text-2xl">%</span>
        </span>
        <span
          className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${
            datYeuCau ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {datYeuCau ? "ĐẠT" : "CHƯA ĐẠT"}
        </span>
      </div>

      <h2 className="text-2xl font-black text-slate-100 mb-1">{ten}</h2>
      <p className="text-sm text-slate-500 mb-6">
        {soDung}/{tongCau} câu đúng
      </p>

      <p
        className={`text-base font-bold ${
          datYeuCau ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        {datYeuCau
          ? "Chúc mừng bạn đã hoàn thành! 🎉"
          : "Hãy cố gắng hơn lần sau nhé!"}
      </p>

      <p className="text-[10px] font-mono text-slate-700 mt-12">
        Kết quả đã được ghi nhận
      </p>
    </div>
  );
};

export default TrangLamBai;
