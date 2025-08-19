/* eslint-disable react/prop-types */
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; // style mặc định của tooltip

const KienHT = ({ data, onUncomplete }) => {
  // Hàm format giờ theo Asia/Ho_Chi_Minh
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

  const fmtNum = (v) => (v ?? v === 0 ? v : "—"); // vẫn hiển thị 0

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
            <th className="px-3 py-3 font-semibold whitespace-nowrap">BỘ PHẬN</th>
            <th className="px-3 py-3 font-semibold whitespace-nowrap">CHỨC NĂNG</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-8 text-slate-500 italic">
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

                {/* Số SODA (truncate + tooltip) */}
                <td className="px-3 py-3 text-center tabular-nums text-slate-800">
                  <Tippy
                    content={fmtNum(item.soSoda)}
                    placement="top"
                    arrow={true}
                    maxWidth="400px"
                  >
                    <span className="block truncate max-w-[120px] mx-auto cursor-help">
                      {fmtNum(item.soSoda)}
                    </span>
                  </Tippy>
                </td>

                <td className="px-3 py-3">
                  <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {formatDate(item.ngayRotKien)}
                  </span>
                </td>

                {/* Ghi chú (truncate + tooltip) */}
                <td className="px-3 py-3 text-slate-700">
                  <Tippy
                    content={item.ghiChu || "—"}
                    placement="top"
                    arrow={true}
                    maxWidth="400px"
                  >
                    <span className="block truncate max-w-[260px] md:max-w-[360px] text-left cursor-help">
                      {item.ghiChu || "—"}
                    </span>
                  </Tippy>
                </td>

                {/* Bộ phận */}
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
