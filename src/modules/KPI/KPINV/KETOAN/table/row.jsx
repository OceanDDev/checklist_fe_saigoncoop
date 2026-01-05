/* eslint-disable react/prop-types */
import { kpistaffService } from "@/services/kpistaff.service";

const RowKeToan = ({ item }) => {
  const handleDelete = async () => {
    if (confirm("Bạn có chắc muốn xoá KPI này?")) {
      try {
        await kpistaffService.deleteKPI(item._id);
        location.reload();
      } catch (err) {
        console.error("Xoá KPI lỗi:", err);
      }
    }
  };

  // Hiển thị thông tin Quý/Năm nếu có
  const displayQuarterYear = () => {
    if (item.quy && item.nam) {
      return `Q${item.quy}/${item.nam}`;
    }
    return "Chưa xác định";
  };

  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      <td className="p-3 font-mono text-[13px] text-slate-800 font-medium">
        {item.ma_nhan_vien}
      </td>
      <td className="p-3 text-slate-800 font-medium">{item.ho_ten}</td>
      <td className="p-3">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {item.don_vi}
        </span>
      </td>

      {/* Hiển thị Quý/Năm */}
      <td className="p-3 text-center">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
          {displayQuarterYear()}
        </span>
      </td>

      {/* Số lượng KPI */}
      <td className="p-3 text-center">
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {item.kpis?.length ?? 0} KPI
        </span>
      </td>

      {/* Tỷ trọng quý */}
      <td className="p-3 text-center">
        {item.ty_trong_quy !== undefined ? (
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-2",
              item.ty_trong_quy >= 90 &&
                "bg-emerald-50 text-emerald-700 ring-emerald-200",
              item.ty_trong_quy >= 80 &&
                item.ty_trong_quy < 90 &&
                "bg-blue-50 text-blue-700 ring-blue-200",
              item.ty_trong_quy >= 70 &&
                item.ty_trong_quy < 80 &&
                "bg-amber-50 text-amber-700 ring-amber-200",
              item.ty_trong_quy < 70 && "bg-red-50 text-red-700 ring-red-200",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.ty_trong_quy}%
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200 px-2.5 py-0.5 text-xs">
            Chưa có
          </span>
        )}
      </td>

      {/* Thao tác */}
      <td className="p-3">
        <div className="flex items-center justify-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition"
            aria-label={`Sửa KPI của ${item.ho_ten}`}
          >
            ✏️ Sửa
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-500 transition"
            aria-label={`Xoá KPI của ${item.ho_ten}`}
          >
            🗑️ Xoá
          </button>
        </div>
      </td>
    </tr>
  );
};

export default RowKeToan;
