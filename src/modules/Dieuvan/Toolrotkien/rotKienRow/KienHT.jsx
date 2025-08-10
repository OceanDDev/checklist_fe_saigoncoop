/* eslint-disable react/prop-types */

const KienHT = ({ data, onUncomplete }) => {
  // dd/MM/yyyy HH:mm (24h), timezone VN, không CH/SA
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

  const fmtNum = (v) => v ?? "—"; // vẫn hiển thị 0

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow">
      <table className="min-w-[920px] w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur border-b border-slate-200">
          <tr className="text-[12px] uppercase tracking-wide text-slate-600 text-center">
            <th className="px-3 py-3 font-semibold whitespace-nowrap">STT</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">Mã CH</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">TÊN CH</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">SỐ KIỆN</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">SỐ SODA - HÓA ĐƠN</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">NGÀY GIỜ CẬP NHẬP</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">GHI CHÚ</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">CHỨC NĂNG</th>
                        <th className="px-3 py-3 font-semibold whitespace-nowrap">BỘ PHẬN</th>

            
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-8 text-slate-500 italic">
                Không có dữ liệu đã hoàn thành
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={item._id}
                className="
                  group 
                  odd:bg-white even:bg-slate-50
                  hover:bg-sky-50/70
                  border-b border-slate-200 transition-colors
                  text-center
                "
              >
                <td className="px-3 py-3 text-slate-600">{index + 1}</td>

                <td className="px-3 py-3">
                  <span
                    className="inline-flex items-center font-mono text-[12px] rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700"
                    title={item.maCH}
                  >
                    {item.maCH}
                  </span>
                </td>

                <td className="px-3 py-3 text-slate-800">{item.tenCH}</td>

                <td className="px-3 py-3 text-center tabular-nums text-slate-800">
                  {fmtNum(item.soKienRot)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-slate-800">
                  {fmtNum(item.soSoda)}
                </td>

                <td className="px-3 py-3">
                  <span
                    className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    title={fmtDateTimeVN(item.ngayRotKien)}
                  >
                    {fmtDateTimeVN(item.ngayRotKien)}
                  </span>
                </td>

                <td
                  className="px-3 py-3 max-w-[260px] md:max-w-[360px] truncate text-slate-700"
                  title={item.ghiChu || ""}
                >
                  {item.ghiChu || "—"}
                </td>
                <td className="px-3 py-3">
                  <span
                    className="inline-flex items-center font-mono text-[12px] rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700"
                    title={item.boPhan}
                  >
                    {item.boPhan}
                  </span>
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => onUncomplete(item._id)}
                      className="
                        inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                        border border-amber-200 bg-amber-50 text-amber-700
                        hover:bg-amber-100 shadow-sm transition
                        focus:outline-none focus:ring-2 focus:ring-amber-500
                      "
                      title="Đưa về trạng thái chưa hoàn thành"
                    >
                      ↩ Đã hoàn thành
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KienHT;
