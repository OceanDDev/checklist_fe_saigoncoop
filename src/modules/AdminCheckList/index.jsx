import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserRowCheckList from "./userRow";
import { checkListService } from "@/services/checklist.service";

const UserTableCheckList = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [checkList, setCheckList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await checkListService.getCheckList();
      setCheckList(res);
    };

    fetchData();
  }, []);

  const filteredUsers = checkList.filter((item) =>
    item.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Header cố định */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-3 bg-white shadow border-b">
        <div className="flex items-center space-x-3">
          <img src="/img/logosc.png" alt="Logo" className="h-14 w-auto" />
          <span className="text-xl font-bold text-gray-800">
            Hệ thống kiểm tra xe
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-5 rounded shadow transition-all"
        >
          Đăng xuất
        </button>
      </header>

      {/* Nội dung bảng */}
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg m-5 pt-[100px]">
        {/* Thanh tìm kiếm */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm theo họ tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              <th className="border px-4 py-2 text-center">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-500">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : (
              filteredUsers.map((userCheckList, index) => (
                <UserRowCheckList
                  key={userCheckList._id}
                  user={userCheckList}
                  index={index}
                  
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default UserTableCheckList;
