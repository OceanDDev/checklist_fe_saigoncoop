/* eslint-disable react/prop-types */

const KienHT = ({ data, onDelete, onUncomplete }) => {
  return (
    <div className="overflow-x-auto shadow border rounded">
      <table className="min-w-[800px] w-full text-sm text-left bg-white">
        <thead className="text-xs bg-gray-50 border-b text-center">
          <tr>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">STT</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">Mã CH</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">Tên CH</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">Số kiện rớt</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">Số soda</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">Ngày rớt kiện</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">Ghi chú</th>
            <th className="px-2 py-3 font-semibold whitespace-nowrap">Chức năng</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-5 text-gray-500">
                Không có dữ liệu đã hoàn thành
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={item._id}
                className="text-center border-b hover:bg-gray-50 transition"
              >
                <td className="px-2 py-3">{index + 1}</td>
                <td className="px-2 py-3">{item.maCH}</td>
                <td className="px-2 py-3">{item.tenCH}</td>
                <td className="px-2 py-3">{item.soKienRot}</td>
                <td className="px-2 py-3">{item.soSoda}</td>
                <td className="px-2 py-3">
                  {item.ngayRotKien
                    ? new Date(item.ngayRotKien).toLocaleDateString("vi-VN")
                    : ""}
                </td>
                <td className=" text-center px-2 py-3 max-w-[200px] truncate">
                  {item.ghiChu}
                </td>
                <td className="px-2 py-3">
                  <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => onUncomplete(item._id)}
                    >
                      ↩ Đã hoàn thành
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => onDelete(item._id)}
                    >
                      Xóa
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
