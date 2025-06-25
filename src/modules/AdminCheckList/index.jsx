import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import UserRowCheckList from "./userRow";
import { checkListService } from "@/services/checklist.service";
import CustomPagination from "@/components/ui/customPagination";
import { checkListFormService } from "@/services/checklistform.service";

const UserTableCheckList = () => {
  const { formId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [checkList, setCheckList] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;
  const [title, setTitle] = useState([]);

  // Flags để ngăn duplicate
  const fetchedCheckList = useRef(false);
  const fetchedTitle = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await checkListService.getCheckListsByFormId(formId);
        const sorted = (Array.isArray(res) ? res : []).sort(
          (a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao)
        );
        setCheckList(sorted);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu checklist theo form:", error);
      }
    };

    if (formId && !fetchedCheckList.current) {
      fetchedCheckList.current = true;
      fetchData();
    }
  }, [formId]);

  useEffect(() => {
    const fetchTitle = async () => {
      try {
        if (!formId) return;
        const res = await checkListFormService.getByIdCheckListForm(formId);
        setTitle([res]);
      } catch (error) {
        console.error(error);
      }
    };

    if (formId && !fetchedTitle.current) {
      fetchedTitle.current = true;
      fetchTitle();
    }
  }, [formId]);

  const filteredUsers = checkList.filter((item) =>
    item.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="px-4 sm:px-8 py-8">
      {title.map((form, index) => (
        <h2
          key={index}
          className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2"
        >
          {form.tieu_de || "Không có tiêu đề"}
        </h2>
      ))}

      <div className="mb-6 flex justify-end">
        <input
          type="text"
          placeholder="🔍 Tìm kiếm theo họ tên..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          className="w-full max-w-md border border-gray-300 px-4 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
        />
      </div>

      <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
        <table className="w-full text-sm text-left text-gray-800 bg-white">
          <thead className="text-xs uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold">STT</th>
              <th className="px-4 py-3 font-semibold">Mã NV</th>
              <th className="px-4 py-3 font-semibold">Họ tên</th>
              <th className="px-4 py-3 font-semibold">Đơn vị</th>
              <th className="px-4 py-3 font-semibold">Ngày điền</th>
              <th className="px-4 py-3 text-center font-semibold">Tổng quan</th>
              <th className="px-4 py-3 text-center font-semibold">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-5 text-gray-500">
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
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
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
