/* eslint-disable react/prop-types */
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // style mặc định của tooltip

const XuatTraRow = ({
  data,
  index,
}) => {
  // Format ngày giờ VN (24h), KHÔNG tự trừ/ cộng 7h
  const formatDateVN = (value) => {
    if (!value) return "—";
    const d = new Date(value); // hỗ trợ cả string lẫn Date
    if (isNaN(d.getTime())) return "—";
    return d
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

  // Fallback tên field cho chắc ăn
  const sku = data?.SKU ?? data?.sku ?? "—";
  const ngayAny =
    data?.ngayXuatTra ?? data?.ngayCapNhap ?? data?.updatedAt ?? data?.createdAt;

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
          title={data?.maCH}
        >
          {data?.maCH || "—"}
        </span>
      </td>

      {/* Tên CH */}
      <td className="px-3 py-3 text-left text-slate-800">{data?.tenCH || "—"}</td>

      {/* SKU */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span
          className="
            inline-flex items-center font-mono text-[12px] md:text-xs
            rounded-md border bg-blue-50
            border-blue-200 px-2 py-0.5 text-blue-700
          "
          title={sku}
        >
          {sku}
        </span>
      </td>

      {/* Số kiện xuất trả */}
      <td className="px-3 py-3 tabular-nums text-slate-800">
        {fmtNum(data?.soKien ?? data?.soKien ?? data?.soKienRot)}
      </td>

      {/* Số soda (truncate + tooltip) */}
      <td className="px-3 py-3 tabular-nums text-slate-800">
        <Tippy content={fmtNum(data?.soSoda)} placement="top" arrow={true} maxWidth="400px">
          <span className="block truncate max-w-[80px] mx-auto cursor-help">
            {fmtNum(data?.soSoda)}
          </span>
        </Tippy>
      </td>

      {/* Ngày giờ */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span className="inline-flex rounded-md border bg-white/70 backdrop-blur px-2 py-1 text-xs text-slate-700 border-slate-200">
          {formatDateVN(ngayAny)}
        </span>
      </td>

      {/* Ghi chú (tooltip) */}
      <td className="px-3 py-3 text-slate-700">
        <Tippy content={data?.ghiChu || "—"} placement="top" arrow={true} maxWidth="400px">
          <span className="block truncate max-w-[260px] md:max-w-[360px] text-left cursor-help">
            {data?.ghiChu || "—"}
          </span>
        </Tippy>
      </td>      
    </tr>
  );
};

export default XuatTraRow;
