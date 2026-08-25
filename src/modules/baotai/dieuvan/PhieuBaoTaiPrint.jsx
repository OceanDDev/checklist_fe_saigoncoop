/* eslint-disable react/prop-types */
import { forwardRef, memo, useMemo } from "react";

export const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #phieu-bao-tai-print, #phieu-bao-tai-print * { visibility: visible; }
    #phieu-bao-tai-print {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
    }
    @page {
      size: A5;
      margin: 10mm;
    }
  }
`;

// Tách "chuyen" thành maCuaHang + tenCuaHang.
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
      const idx = p.indexOf("-");
      return idx > -1 ? p.slice(0, idx).trim() : p.trim();
    })
    .filter(Boolean);

  return {
    maCuaHang: codes.join(", "),
    tenCuaHang: parts.join("; "),
  };
};


const LOGO_URL = "/img/logonew.png";

const SCLogo = memo(() => (
  <img
    src={LOGO_URL}
    alt="SC Logistics"
    className="h-16 w-auto object-contain"
  />
));
SCLogo.displayName = "SCLogo";

const Field = memo(({ label, value }) => (
  <tr className="border-b border-slate-300 last:border-b-0">
    <td className="w-[38%] bg-slate-50 px-3 py-2.5 align-top text-[13px] font-bold text-slate-700">
      {label}
    </td>
    <td className="px-3 py-2.5 text-[14px] font-semibold text-slate-900">
      {value || <span className="text-slate-300">—</span>}
    </td>
  </tr>
));
Field.displayName = "Field";

const PhieuBaoTaiPrint = forwardRef(({ row }, ref) => {
  const { maCuaHang, tenCuaHang } = useMemo(
    () => parseChuyen(row?.chuyen),
    [row?.chuyen],
  );

  if (!row) return null;

  return (
    <div
      id="phieu-bao-tai-print"
      ref={ref}
      className="hidden print:block"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-[480px] p-2 text-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <SCLogo />
          <div className="text-3xl font-black text-slate-900">
            STT: {row.stt}
          </div>
        </div>

        {/* Title */}
        <h1 className="mt-4 text-center text-2xl font-black uppercase tracking-wide">
          Phiếu báo tài xuất
        </h1>

        {/* Note */}
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-relaxed">
          <span className="font-bold">* LƯU Ý:</span> Nhà cung cấp (NCC) sẽ
          được gọi nhập, xuất hàng theo{" "}
          <span className="font-bold text-rose-600">TÊN NCC</span> và{" "}
          <span className="font-bold text-rose-600">BIỂN SỐ XE</span>
        </div>

        {/* Info table */}
        <table className="mt-4 w-full border border-slate-300">
          <tbody>
            <Field label="BIỂN SỐ XE" value={row.bsx} />
            <Field label="TÊN NVC" value={row.nvc} />
            <Field label="THỜI GIAN VÀO" value={row.thoiGianVao} />
            <Field label="MÃ CỬA HÀNG" value={maCuaHang} />
            <Field label="TÊN CỬA HÀNG" value={tenCuaHang} />
            <Field label="GHI CHÚ" value={row.ghiChu} />
          </tbody>
        </table>
      </div>
    </div>
  );
});

PhieuBaoTaiPrint.displayName = "PhieuBaoTaiPrint";

export default memo(PhieuBaoTaiPrint);