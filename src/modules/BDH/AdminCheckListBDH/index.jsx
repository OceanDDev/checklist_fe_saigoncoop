import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { checkListBDHService } from "@/services/checklistbdh.service";
import CustomPagination from "@/components/ui/customPagination";
// import { saveAs } from "file-saver";
import dayjs from "@/utils/dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import UserRowCheckListBDH from "./userRowBDH";
import { checkListFormServiceBDH } from "@/services/checklistbdhform.service";
// import ExcelJS from "exceljs";

const UserTableCheckListBDH = () => {
  const { formId } = useParams();
  const [checkListBDH, setCheckListBDH] = useState([]);
  const [title, setTitle] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchMaNV, setSearchMaNV] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;
  const isFiltering = !!(
    searchTerm ||
    selectedOption ||
    (dateRange[0].startDate && dateRange[0].endDate)
  );
  const fetchedTitle = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await checkListBDHService.getCheckListsByFormBDHId(formId);
        const sorted = Array.isArray(res)
          ? res.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao))
          : [];
        setCheckListBDH(sorted);
      } catch (error) {
        console.error("Lỗi lấy checklist BDH:", error);
      }
    };

    if (formId) fetchData();
  }, [formId]);

  useEffect(() => {
    const fetchTitle = async () => {
      try {
        if (!formId) return;
        const res = await checkListFormServiceBDH.getByIdCheckListBDHForm(formId);
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


  const allCheckTitles = Array.from(
    new Set(
      checkListBDH.flatMap((user) =>
        user.checklist_groups?.flatMap((group) =>
          group.items?.map((item) => item.noidung) || []
        ) || []
      )
    )
  );

  const filteredUsers = checkListBDH.filter((user) => {
    const matchSearchHoTen = user.ho_ten
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchSearchMaNV = user.ma_nhan_vien
      ?.toLowerCase()
      .includes(searchMaNV.toLowerCase());

    const matchOption =
      !selectedOption ||
      user.option_da_chon?.some((opt) => {
        const label = (opt.label || "").trim();
        const value = (opt.value || "").trim();
        const optionString = `${label}: ${value}`;
        return optionString === selectedOption;
      });

    let matchDate = true;
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const userDate = dayjs(user.ngay_tao);
      matchDate =
        userDate.isSameOrAfter(dateRange[0].startDate, 'day') &&
        userDate.isSameOrBefore(dateRange[0].endDate, 'day');
    }

    return matchSearchHoTen && matchSearchMaNV && matchOption && matchDate;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentUsers = isFiltering
    ? filteredUsers
    : filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const clearFilters = () => {
    setSearchTerm("");
    setSearchMaNV("");
    setSelectedOption("");
    setDateRange([{ startDate: null, endDate: null, key: "selection" }]);
    setShowCalendar(false);
    setCurrentPage(0);
  };

  return (
    <div className="px-4 sm:px-8 py-8">
      {title.map((form, index) => (
        <h2 key={index} className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
          {form.tieu_de || "Không có tiêu đề"}
        </h2>
      ))}

      {/* Bộ lọc */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="🔍 Tìm theo mã NV..."
          value={searchMaNV}
          onChange={(e) => {
            setSearchMaNV(e.target.value);
            setCurrentPage(0);
          }}
          className="border px-3 py-2 rounded shadow-sm w-60"
        />

        <div className="relative">
          <input
            readOnly
            onClick={() => setShowCalendar(!showCalendar)}
            value={
              dateRange[0].startDate && dateRange[0].endDate
                ? `${dayjs(dateRange[0].startDate).format("DD/MM/YYYY")} - ${dayjs(dateRange[0].endDate).format("DD/MM/YYYY")}`
                : ""
            }
            placeholder="📅 Khoảng ngày"
            className="border px-3 py-2 rounded shadow-sm cursor-pointer w-52"
          />
          {showCalendar && (
            <div className="absolute z-50 mt-2">
              <DateRange
                ranges={dateRange}
                onChange={(item) => setDateRange([item.selection])}
                moveRangeOnFirstSelection={false}
                maxDate={new Date()}
              />
            </div>
          )}
        </div>

        <button
          onClick={clearFilters}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          ❌ Xóa lọc
        </button>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto shadow border rounded">
        <table className="w-full text-sm text-left bg-white">
          <thead className="text-xs bg-gray-50 border-b text-center">
            <tr>
              <th className="px-4 py-3 font-semibold">STT</th>
              <th className="px-4 py-3 font-semibold">Mã NV</th>
              <th className="px-4 py-3 font-semibold">Họ tên</th>
              <th className="px-4 py-3 font-semibold">Bộ phận</th>
              <th className="px-4 py-3 font-semibold">Ngày điền</th>
              <th className="px-4 py-3 font-semibold">Chi tiết</th>
              <th className="px-4 py-3 font-semibold">Chức năng</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-5 text-gray-500">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : (
              currentUsers.map((user, index) => (
                <UserRowCheckListBDH
                  key={user._id}
                  user={user}
                  index={startIndex + index}
                  allCheckTitles={allCheckTitles}
                  fetchChecklists={async () => {
                    const res = await checkListBDHService.getCheckListsByFormBDHId(formId);
                    setCheckListBDH(res.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao)));
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isFiltering && totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <CustomPagination
            pageCount={totalPages}
            forcePage={currentPage}
            onPageChange={({ selected }) => setCurrentPage(selected)}
            additionalClassname="flex gap-2"
          />
        </div>
      )}
    </div>
  );
};

export default UserTableCheckListBDH;