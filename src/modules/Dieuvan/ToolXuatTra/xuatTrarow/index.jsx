/* eslint-disable react/prop-types */
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

const XuatTraRow = ({ item, index, onComplete, showAllColumns = false }) => {
  const fmtNum = (v) => {
    return v === 0 || v ? v : "—";
  };

  const fmtDate = (v) => {
    if (!v) return "—";
    return new Date(v).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const fmtMoney = (v) => {
    if (!v && v !== 0) return "—";
    return new Intl.NumberFormat("vi-VN").format(v);
  };

  const duplicateCount = item?.kiem_tra_trung || 1;
  const isDuplicate = duplicateCount > 1;

  return (
    <tr className="group align-middle odd:bg-white even:bg-slate-50 hover:bg-sky-50/60 border-b border-slate-200 transition-colors text-sm text-center">
      <td className="px-2 py-3 text-slate-600">{index + 1}</td>

      <td className="px-2 py-3">
        {isDuplicate ? (
          <Tippy
            content={`Bản ghi này trùng lặp ${duplicateCount} lần.`}
            placement="top"
            arrow={true}
          >
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 cursor-help">
              🚨 {duplicateCount}
            </span>
          </Tippy>
        ) : (
          <span className="text-xs text-green-600">—</span>
        )}
      </td>

      {showAllColumns && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-slate-600">
          {fmtDate(item?.ngayNhapTra)}
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3">
          <Tippy content={item?.so || "—"} placement="top" arrow={true}>
            <span className="block truncate max-w-[80px] mx-auto cursor-help text-xs">
              {item?.so || "—"}
            </span>
          </Tippy>
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3">
          <Tippy content={item?.taiXe || "—"} placement="top" arrow={true}>
            <span className="block truncate max-w-[100px] mx-auto cursor-help text-xs">
              {item?.taiXe || "—"}
            </span>
          </Tippy>
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3">
          <Tippy content={item?.bienSoXe || "—"} placement="top" arrow={true}>
            <span className="block truncate max-w-[100px] mx-auto cursor-help text-xs font-mono">
              {item?.bienSoXe || "—"}
            </span>
          </Tippy>
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-slate-600">
          {fmtDate(item?.ngayCHTraNVC)}
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3">
          <Tippy content={item?.nvNhapTra || "—"} placement="top" arrow={true}>
            <span className="block truncate max-w-[100px] mx-auto cursor-help text-xs">
              {item?.nvNhapTra || "—"}
            </span>
          </Tippy>
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3 text-xs text-slate-700">
          {item?.kyHieu || "—"}
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3">
          <Tippy content={item?.soHoaDon || "—"} placement="top" arrow={true}>
            <span className="block truncate max-w-[90px] mx-auto cursor-help text-xs font-mono text-blue-700">
              {item?.soHoaDon || "—"}
            </span>
          </Tippy>
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3 tabular-nums text-xs text-emerald-700 font-medium">
          {fmtMoney(item?.soTienSauThue)}
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-slate-600">
          {fmtDate(item?.ngayHoaDon)}
        </td>
      )}

      <td className="px-2 py-3 whitespace-nowrap">
        <span className="inline-flex items-center font-mono text-[11px] rounded border bg-slate-100 border-slate-200 px-1.5 py-0.5 text-slate-700">
          {item?.maCH || "—"}
        </span>
      </td>

      <td className="px-2 py-3 text-left">
        <Tippy
          content={item?.tenCH || "—"}
          placement="top"
          arrow={true}
          maxWidth="300px"
        >
          <span className="block truncate max-w-[150px] cursor-help text-xs text-slate-800">
            {item?.tenCH || "—"}
          </span>
        </Tippy>
        {item?.boPhan && (
          <span className="block text-[10px] text-slate-500 mt-0.5">
            ({item.boPhan})
          </span>
        )}
      </td>

      <td className="px-2 py-3 whitespace-nowrap">
        <span className="inline-flex items-center font-mono text-[11px] rounded border bg-blue-50 border-blue-200 px-1.5 py-0.5 text-blue-700">
          {item?.sku || "—"}
        </span>
      </td>

      <td className="px-2 py-3 whitespace-nowrap">
        <span className="inline-flex items-center font-mono text-[11px] rounded border bg-indigo-50 border-indigo-200 px-1.5 py-0.5 text-indigo-700">
          {item?.upc || "—"}
        </span>
      </td>

      <td className="px-2 py-3 text-left">
        <Tippy
          content={item?.tenHang || "—"}
          placement="top"
          arrow={true}
          maxWidth="400px"
        >
          <span className="block truncate max-w-[140px] cursor-help text-xs text-slate-800">
            {item?.tenHang || "—"}
          </span>
        </Tippy>
      </td>

      <td className="px-2 py-3 tabular-nums text-xs text-slate-800 font-medium">
        {fmtNum(item?.luong)}
      </td>

      <td className="px-2 py-3">
        <Tippy
          content={item?.vendorName || item?.vendor || "—"}
          placement="top"
          arrow={true}
          maxWidth="300px"
        >
          <span className="block truncate max-w-[100px] mx-auto cursor-help text-xs text-slate-700">
            {item?.vendorName || item?.vendor || "—"}
          </span>
        </Tippy>
      </td>

      {showAllColumns && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-slate-600">
          {fmtDate(item?.ngayBGKeToan)}
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3">
          <Tippy content={item?.soRTV || "—"} placement="top" arrow={true}>
            <span className="block truncate max-w-[80px] mx-auto cursor-help text-xs font-mono text-purple-700">
              {item?.soRTV || "—"}
            </span>
          </Tippy>
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3">
          <Tippy
            content={item?.nvKeToanNhapTra || "—"}
            placement="top"
            arrow={true}
          >
            <span className="block truncate max-w-[100px] mx-auto cursor-help text-xs">
              {item?.nvKeToanNhapTra || "—"}
            </span>
          </Tippy>
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-slate-600">
          {fmtDate(item?.ngayBGXuatTra)}
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-slate-600">
          {fmtDate(item?.ngaySanXuat)}
        </td>
      )}

      {showAllColumns && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-slate-600">
          {fmtDate(item?.hanSuDung)}
        </td>
      )}

      <td className="px-2 py-3">
        <Tippy
          content={item?.ghiChu || "—"}
          placement="top"
          arrow={true}
          maxWidth="400px"
        >
          <span className="block truncate max-w-[150px] text-left cursor-help text-xs text-slate-700">
            {item?.ghiChu || "—"}
          </span>
        </Tippy>
      </td>

      <td className="px-2 py-3">
        <div className="flex flex-col items-center justify-center gap-2">
          {onComplete && (
            <button
              onClick={() => onComplete(item._id)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Đánh dấu hoàn thành"
            >
              ✅ Hoàn thành
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default XuatTraRow;
