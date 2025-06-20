import { useState, useEffect } from "react";
import UserRowCheckList from "./userRow";
import { checkListService } from "@/services/checklist.service";
import CustomPagination from "@/components/ui/customPagination";

const UserTableCheckList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [checkList, setCheckList] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;

 

  useEffect(() => {
    const fetchData = async () => {
      const res = await checkListService.getCheckList();
      setCheckList(res);
    };

    fetchData();
  }, []);

  // Lọc theo tên
  const filteredUsers = checkList.filter((item) =>
    item.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Phân trang
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <>
      {/* Nội dung bảng */}
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg m-5 pt-[50px]">
        {/* Thanh tìm kiếm */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm theo họ tên..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0); // reset về trang đầu khi tìm kiếm
            }}
            className="border border-gray-300 p-2 rounded-md w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bảng */}
        <table className="w-full text-sm sm:text-base text-left text-gray-900 border border-gray-300">
          <thead className="text-xs sm:text-sm uppercase bg-gray-100 text-gray-700">
            <tr>
              <th className="border px-4 py-2">STT</th>
              <th className="border px-4 py-2">Mã NV</th>
              <th className="border px-4 py-2">Họ tên</th>
              <th className="border px-4 py-2">Đơn vị</th>
              <th className="border px-4 py-2">Số xe</th>
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
                  index={startIndex + index} // STT chính xác theo phân trang
                />
              ))
            )}
          </tbody>
        </table>

        {/* Phân trang */}
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
    </>
  );
};

export default UserTableCheckList;
