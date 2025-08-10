/* eslint-disable react/prop-types */

const RotKienRow = ({
  data,
  index,
  onDelete,
  onComplete,
  isCompletedView = false,
}) => {
  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");
  const fmtNum  = (v) => (v ?? "—"); // giữ được số 0

  return (
    <tr
      className="
        group text-sm md:text-[15px]
        odd:bg-white even:bg-slate-50
        hover:bg-sky-50/70
        border-b border-slate-200 transition-colors
        text-center
      "
    >
      <td className="px-3 py-3 text-slate-600 text-center">{index + 1}</td>

      <td className="px-3 py-3">
        <span
          className="
            inline-flex items-center font-mono text-[12px] md:text-xs
            rounded-md border border-slate-200 bg-slate-100
            px-2 py-0.5 text-slate-700
          "
          title={data.maCH}
        >
          {data.maCH}
        </span>
      </td>

      <td className="px-3 py-3 text-slate-800">{data.tenCH}</td>

      <td className="px-3 py-3 text-right tabular-nums text-slate-800">
        {fmtNum(data.soKienRot)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-slate-800">
        {fmtNum(data.soSoda)}
      </td>

      <td className="px-3 py-3">
        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {fmtDate(data.ngayRotKien)}
        </span>
      </td>

      <td
        className="px-3 py-3 max-w-[260px] md:max-w-[340px] truncate text-slate-700"
        title={data.ghiChu || ""}
      >
        {data.ghiChu || "—"}
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onComplete && (
            <button
              onClick={() => onComplete(data._id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                "border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-500",
                isCompletedView
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
              ].join(" ")}
              title={isCompletedView ? "Đưa về trạng thái chưa hoàn thành" : "Đánh dấu hoàn thành"}
            >
              {isCompletedView ? "↩ Đã hoàn thành" : "✅ Xác nhận hoàn thành"}
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
