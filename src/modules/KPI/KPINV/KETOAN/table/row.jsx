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

  return (
    <tr className="hover:bg-slate-50/60">
      <td className="p-3 font-mono text-[13px] text-slate-800">{item.ma_nhan_vien}</td>
      <td className="p-3 text-slate-800">{item.ho_ten}</td>
      <td className="p-3 text-slate-700">{item.don_vi}</td>
      {/* BỎ Tháng/Năm */}
      <td className="p-3 text-center">
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {item.kpis?.length ?? 0}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center justify-center gap-2">
          <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
            ✏️ Sửa
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-500"
          >
            🗑️ Xoá
          </button>
        </div>
      </td>
    </tr>
  );
};

export default RowKeToan;
