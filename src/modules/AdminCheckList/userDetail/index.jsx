import { checkListService } from "@/services/checklist.service";
import { useEffect, useState, useRef } from "react";

// eslint-disable-next-line react/prop-types
const UserDetailCheckList = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(false)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await checkListService.getByIdCheckList(userId);
        setData(res);
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết checklist:", error);
      } finally {
        setLoading(false);
      }
    };
    if(!fetchRef.current){
      fetchRef.current = true
      if (userId) {
        fetchDetail();
      }
    }
  }, [userId]);

  if (loading) return <div className="p-4 text-center">Đang tải dữ liệu...</div>;
  if (!data) return <div className="p-4 text-center">Không tìm thấy dữ liệu.</div>;

  const renderList = (items) =>
    items?.map((item, i) => (
      <li key={i} className="mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="font-medium text-gray-800 dark:text-gray-200">{item.noidung}</div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                item.dap_an === "Đ"
                  ? "bg-green-100 text-green-700"
                  : item.dap_an === "K"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {item.dap_an}
            </span>
          </div>
        </div>
      </li>
    ));

  return (
    <div className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
      <div>
        <h4 className="text-lg font-bold text-blue-600 mb-3">✔ Kiểm Tra Bên Ngoài</h4>
        <ul className="space-y-2">{renderList(data.kiem_tra_ben_ngoai)}</ul>
      </div>

      <div>
        <h4 className="text-lg font-bold text-blue-600 mb-3">✔ Kiểm Tra Khi Vận Hành</h4>
        <ul className="space-y-2">{renderList(data.kiem_tra_khi_van_hanh)}</ul>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-2">
        <p>
          <strong>Kết luận:</strong>{" "}
          <span className="text-gray-800 dark:text-gray-200">{data.ghi_chu}</span>
        </p>
        <p>
          <strong>Ngày tạo:</strong>{" "}
          <span className="text-gray-600 dark:text-gray-400">
            {new Date(data.ngay_tao).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
      </div>
    </div>
  );
};

export default UserDetailCheckList;
