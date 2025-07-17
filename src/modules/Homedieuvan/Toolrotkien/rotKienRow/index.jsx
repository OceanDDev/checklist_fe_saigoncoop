/* eslint-disable react/prop-types */

const RotKienRow = ({
  data,
  index,
  onDelete,
  onComplete,
  isCompletedView = false,
}) => {
  return (
    <tr className="text-center border-b hover:bg-gray-50 transition">
      <td className="px-2 py-3 whitespace-nowrap">{index + 1}</td>
      <td className="px-2 py-3 whitespace-nowrap">{data.maCH}</td>
      <td className="px-2 py-3 whitespace-nowrap">{data.tenCH}</td>
      <td className="px-2 py-3 whitespace-nowrap">{data.soKienRot}</td>
      <td className="px-2 py-3 whitespace-nowrap">{data.soSoda}</td>
      <td className="px-2 py-3 whitespace-nowrap">
        {data.ngayRotKien
          ? new Date(data.ngayRotKien).toLocaleDateString("vi-VN")
          : ""}
      </td>
      <td className="px-2 py-3 text-center max-w-[200px] truncate">{data.ghiChu}</td>
      <td className="px-2 py-3">
        <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
          {onComplete && (
            <button
              className={`${
                isCompletedView
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white px-3 py-1 rounded text-xs`}
              onClick={() => onComplete(data._id)}
            >
              {isCompletedView ? "↩ Đã hoàn thành" : "✅ Hoàn thành"}
            </button>
          )}
          {onDelete && (
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
              onClick={() => onDelete(data._id)}
            >
              Xóa
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default RotKienRow;
