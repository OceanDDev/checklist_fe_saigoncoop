/* eslint-disable react/prop-types */

const RotKienRow = ({
  data,
  index,
  onDelete,
  onComplete,
  isCompletedView = false,
}) => {
  // dd/MM/yyyy HH:mm (24h), timezone VN
  const fmtDateTimeVN = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d
      .toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");
  };

  const fmtNum = (v) => (v ?? "—"); // giữ được số 0

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
      return { label: "ĐIỀU VẬN", cls: "bg-sky-50 text-sky-700 border-sky-200" };
    }
    if (n === "xu ly don hang") {
      return { label: "XLĐH", cls: "bg-violet-50 text-violet-700 border-violet-200" };
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
      "
    >
      {/* STT */}
      <td className="px-3 py-3 text-center text-slate-600">{index + 1}</td>

      {/* Mã CH (badge mono) */}
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

      {/* Số kiện / Số soda */}
      <td className="px-3 py-3 text-right tabular-nums text-slate-800">
        {fmtNum(data.soKienRot)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-slate-800">
        {fmtNum(data.soSoda)}
      </td>

      {/* Ngày giờ */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span
          className="inline-flex rounded-md border bg-white/70 backdrop-blur px-2 py-1 text-xs text-slate-700 border-slate-200"
          title={fmtDateTimeVN(data.ngayRotKien)}
        >
          {fmtDateTimeVN(data.ngayRotKien)}
        </span>
      </td>

      {/* Ghi chú (truncate + tooltip) */}
      <td
        className="px-3 py-3 max-w-[260px] md:max-w-[360px] truncate text-left text-slate-700"
        title={data.ghiChu || ""}
      >
        {data.ghiChu || "—"}
      </td>

      {/* Bộ phận (chip) */}
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
