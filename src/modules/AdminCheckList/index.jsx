import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import UserRowCheckList from "./userRow";
import { checkListService } from "@/services/checklist.service";
import CustomPagination from "@/components/ui/customPagination";

const UserTableCheckList = () => {
  const { formId } = useParams(); // 🆔 Lấy form ID từ route
  const [searchTerm, setSearchTerm] = useState("");
  const [checkList, setCheckList] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;

  useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await checkListService.getCheckListsByFormId(formId);
      // 🔽 Sắp xếp bản ghi mới nhất lên đầu
      const sorted = (Array.isArray(res) ? res : []).sort(
        (a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao)
      );
      setCheckList(sorted);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu checklist theo form:", error);
    }
  };

  if (formId) fetchData();
}, [formId]);


  const filteredUsers = checkList.filter((item) =>
    item.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg m-5 pt-[50px]">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm theo họ tên..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          className="border border-gray-300 p-2 rounded-md w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <table className="w-full text-sm sm:text-base text-left text-gray-900 border border-gray-300">
        <thead className="text-xs sm:text-sm uppercase bg-gray-100 text-gray-700">
          <tr>
            <th className="border px-4 py-2">STT</th>
            <th className="border px-4 py-2">Mã NV</th>
            <th className="border px-4 py-2">Họ tên</th>
            <th className="border px-4 py-2">Đơn vị</th>
            <th className="border px-4 py-2">Ngày điền</th>
            <th className="border px-4 py-2 text-center">Tổng quan</th>
            <th className="border px-4 py-2 text-center">Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-4 text-gray-500">
                Không tìm thấy người dùng nào.
              </td>
            </tr>
          ) : (
            currentUsers.map((userCheckList, index) => (
              <UserRowCheckList
                key={userCheckList._id}
                user={userCheckList}
                index={startIndex + index}
              />
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <CustomPagination
            pageCount={totalPages}
            forcePage={currentPage}
            onPageChange={({ selected }) => setCurrentPage(selected)}
            additionalClassname="flex flex-wrap gap-2"
          />
        </div>
      )}
    </div>
  );
};

export default UserTableCheckList;
