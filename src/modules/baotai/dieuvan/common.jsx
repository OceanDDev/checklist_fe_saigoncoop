/* eslint-disable react/prop-types */
import { useState } from "react";
import { Volume2, X } from "lucide-react";

export const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  .font-display { font-family: 'Barlow Condensed', 'Inter', sans-serif; }
  .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

  .bt-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
  .bt-scroll::-webkit-scrollbar-track { background: transparent; }
  .bt-scroll::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.35); border-radius: 999px; }
  .bt-scroll::-webkit-scrollbar-thumb:hover { background: rgba(217, 119, 6, 0.55); }

  @keyframes bt-pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.45); }
    100% { box-shadow: 0 0 0 10px rgba(217, 119, 6, 0); }
  }
  .bt-pulsing { animation: bt-pulse-ring 0.7s ease-out; }
`;

export const GATES = ["X1", "X2", "X3", "X4", "X5", "X7", "X8", "X9"];

// Cột cần đọc trong file Excel "kế hoạch xe" (đúng tên header trong file mẫu)
export const EXCEL_COLS = {
  nvc: "Nhà vận chuyển",
  chuyen: "Siêu thị",
  bsx: "Số xe",
  trangThai: "Trạng thái",
};
export const REQUIRED_STATUS = "Xác nhận";

export function StatusBadge({ status }) {
  const styles = {
    "Chưa Vào": "bg-slate-100 text-slate-500 border-slate-300",
    "Đã Vào": "bg-emerald-50 text-emerald-600 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
        styles[status] || styles["Chưa Vào"]
      }`}
    >
      {status}
    </span>
  );
}
// Tách field "chuyen" thành maCuaHang + tenCuaHang.
// VD 1 mã: "CH00175-CO.OPSMILE 57 TRAN BINH TRONG"
//   -> maCuaHang: "CH00175"
//   -> tenCuaHang: "CH00175-CO.OPSMILE 57 TRAN BINH TRONG"
// VD nhiều mã: "CH00214-CO.OPSMILE 91 TRAN QUANG DIEU; CH00316-CO.OPSMILE 175 TRAN VAN DANG"
//   -> maCuaHang: "CH00214, CH00316"
//   -> tenCuaHang: nguyên văn (giữ dấu ";")
export const parseChuyen = (chuyen) => {
  if (!chuyen) return { maCuaHang: "", tenCuaHang: "" };

  const parts = chuyen
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  const codes = parts
    .map((p) => {
      // Lấy phần trước dấu "-" đầu tiên, vd "CH00175-CO.OPSMILE..." -> "CH00175"
      const idx = p.indexOf("-");
      return idx > -1 ? p.slice(0, idx).trim() : p.trim();
    })
    .filter(Boolean);

  return {
    maCuaHang: codes.join(", "),
    tenCuaHang: parts.join("; "),
  };
};
export function SpeakerButton({ label, tone, onPlay }) {
  const [pulsing, setPulsing] = useState(false);
  const toneClass =
    tone === "xe"
      ? "text-sky-600 border-sky-300 hover:bg-sky-50"
      : "text-amber-600 border-amber-300 hover:bg-amber-50";

  return (
    <button
      onClick={() => {
        setPulsing(true);
        setTimeout(() => setPulsing(false), 700);
        onPlay && onPlay();
        // TODO: gắn logic đọc loa thật (TTS / phát âm thanh qua loa trạm)
      }}
      className={`flex items-center gap-1 rounded-md border bg-white px-1.5 py-0.5 text-[10px] font-mono font-medium transition-colors ${toneClass} ${
        pulsing ? "bt-pulsing" : ""
      }`}
      title={`Đọc loa ${label}`}
    >
      <Volume2 className="h-3 w-3" />
      {label}
    </button>
  );
}

export function ModalShell({
  title,
  icon,
  onClose,
  children,
  widthClass = "max-w-lg",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div
        className={`w-full ${widthClass} rounded-xl border border-slate-200 bg-white shadow-xl`}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="font-display text-lg font-700 uppercase tracking-wide text-slate-900">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
