/* eslint-disable react/prop-types */

import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // style mặc định của tooltip

const RotKienRow = ({
  data,
  index,
  onDelete,
  onComplete,
  isCompletedView = false,
}) => {
  // Format ngày giờ VN (UTC+7), 24h chuẩn
  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    const vnTime = new Date(d.getTime() - 7 * 60 * 60 * 1000);
    return vnTime
      .toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");
  };

  const fmtNum = (v) => (v ?? v === 0 ? v : "—"); // giữ được số 0

  // Chuẩn hoá và map bộ phận -> chip + màu
  const normalize = (s = "") =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const getDeptChip = (raw) => {
    const n = normalize(raw || "");
    if (n === "dieu van") {
      return {
        label: "ĐIỀU VẬN",
        cls: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }
    if (n === "xu ly don hang") {
      return {
        label: "XLĐH",
        cls: "bg-violet-50 text-violet-700 border-violet-200",
      };
    }
    return {
      label: raw || "—",
      cls: "bg-slate-50 text-slate-700 border-slate-200",
    };
  };

  const dept = getDeptChip(data.boPhan);

  return (
    <tr
      className="
        group align-middle
        odd:bg-white even:bg-slate-50
        hover:bg-sky-50/60
        border-b border-slate-200 transition-colors
        text-sm md:text-[15px]
        text-center
      "
    >
      {/* STT */}
      <td className="px-3 py-3 text-center text-slate-600">{index + 1}</td>

      {/* Mã CH */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span
          className="
            inline-flex items-center font-mono text-[12px] md:text-xs
            rounded-md border bg-slate-100
            border-slate-200 px-2 py-0.5 text-slate-700
          "
          title={data.maCH}
        >
          {data.maCH}
        </span>
      </td>

      {/* Tên CH */}
      <td className="px-3 py-3 text-left text-slate-800">{data.tenCH}</td>

      {/* Số kiện */}
      <td className="px-3 py-3 tabular-nums text-slate-800">
        {fmtNum(data.soKienRot)}
      </td>

      {/* Số soda (không tooltip, tự xuống hàng nếu dài) */}
      {/* Số soda (truncate + tooltip) */}
      <td className="px-3 py-3 tabular-nums text-slate-800">
        <Tippy
          content={fmtNum(data.soSoda)}
          placement="top"
          arrow={true}
          maxWidth="400px"
        >
          <span className="block truncate max-w-[80px] mx-auto cursor-help">
            {fmtNum(data.soSoda)}
          </span>
        </Tippy>
      </td>

      {/* Ngày giờ */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span className="inline-flex rounded-md border bg-white/70 backdrop-blur px-2 py-1 text-xs text-slate-700 border-slate-200">
          {formatDate(data.ngayRotKien)}
        </span>
      </td>

      {/* Ghi chú (tooltip) */}
      <td className="px-3 py-3 text-slate-700">
        <Tippy
          content={data.ghiChu || "—"}
          placement="top"
          arrow={true}
          maxWidth="400px"
        >
          <span
            className="
              block truncate
              max-w-[260px] md:max-w-[360px]
              text-left cursor-help
            "
          >
            {data.ghiChu || "—"}
          </span>
        </Tippy>
      </td>

      {/* Bộ phận */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span
          className={[
            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
            dept.cls,
          ].join(" ")}
          title={data.boPhan || ""}
        >
          {dept.label}
        </span>
      </td>

      {/* Hành động */}
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onComplete && (
            <button
              onClick={() => onComplete(data._id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                "border shadow-sm transition focus:outline-none focus:ring-2",
                isCompletedView
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-500"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500",
              ].join(" ")}
              title={
                isCompletedView
                  ? "Đưa về trạng thái chưa hoàn thành"
                  : "Đánh dấu hoàn thành"
              }
            >
              {isCompletedView ? "↩ Hoàn tác" : "✅ Hoàn thành"}
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(data._id)}
              className="
                inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                border border-rose-200 bg-rose-50 text-rose-700
                hover:bg-rose-100 shadow-sm transition
                focus:outline-none focus:ring-2 focus:ring-rose-500
              "
              title="Xóa dòng này"
            >
              🗑️ Xóa
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default RotKienRow;
