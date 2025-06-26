import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { checkListService } from "@/services/checklist.service";
import { checkListFormService } from "@/services/checklistform.service";
import CustomPagination from "@/components/ui/customPagination";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import UserRowCheckList from "./userRow";
import * as XLSX from "xlsx-js-style";

const UserTableCheckList = () => {
  const { formId } = useParams();
  const [checkList, setCheckList] = useState([]);
  const [title, setTitle] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: "selection" }]);
  const [showCalendar, setShowCalendar] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;
  const isFiltering = !!(searchTerm || selectedOption || (dateRange[0].startDate && dateRange[0].endDate));
  const fetchedTitle = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await checkListService.getCheckListsByFormId(formId);
        const sorted = Array.isArray(res) ? res.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao)) : [];
        setCheckList(sorted);
      } catch (error) {
        console.error("Lỗi lấy checklist:", error);
      }
    };

    if (formId) fetchData();
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

  const allCheckTitles = Array.from(
    new Set(
      checkList.flatMap(user =>
        [...(user.kiem_tra_ben_ngoai || []), ...(user.kiem_tra_khi_van_hanh || [])].map(item => item.noidung)
      )
    )
  );

  const allOptionValues = Array.from(
    new Set(
      checkList.flatMap(user =>
        user.option_da_chon?.map(opt => `${opt.label}: ${opt.value}`) || []
      )
    )
  );

  const filteredUsers = checkList.filter(user => {
    const matchSearch = user.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchOption = selectedOption
      ? user.option_da_chon?.some(opt => `${opt.label}: ${opt.value}` === selectedOption)
      : true;

    const itemDate = dayjs(user.ngay_tao);
    const matchDate =
      dateRange[0].startDate && dateRange[0].endDate
        ? itemDate.isAfter(dayjs(dateRange[0].startDate).subtract(1, "day")) &&
          itemDate.isBefore(dayjs(dateRange[0].endDate).add(1, "day"))
        : true;

    return matchSearch && matchOption && matchDate;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
const currentUsers = isFiltering
  ? filteredUsers // khi đang lọc thì không phân trang
  : filteredUsers.slice(startIndex, startIndex + itemsPerPage);
const exportToExcel = () => {
  const exportData = filteredUsers.map((user, index) => {
    const allAnswers = [...(user.kiem_tra_ben_ngoai || []), ...(user.kiem_tra_khi_van_hanh || [])];
    const result = {
      STT: index + 1,
      "Mã NV": user.ma_nhan_vien,
      "Họ tên": user.ho_ten,
      "Đơn vị": user.don_vi,
      "Tùy chọn": user.option_da_chon?.map(opt => `${opt.label}: ${opt.value}`).join(", ") || "",
      "Ngày điền": user.ngay_tao ? new Date(user.ngay_tao).toLocaleString("vi-VN") : "",
    };

    allCheckTitles.forEach(title => {
      const found = allAnswers.find(item => item.noidung === title);
      result[title] = found?.dap_an || "";
    });
    result["Ghi chú"] = user.ghi_chu || "";

    return result;
  });

  // Bước 1: Tạo worksheet từ dữ liệu
  const worksheet = XLSX.utils.json_to_sheet(exportData, { origin: "A3" });

  // Bước 2: Thêm tiêu đề (Header)
  const title = "BẢNG KIỂM TRA .... ";
  XLSX.utils.sheet_add_aoa(worksheet, [[title]], { origin: "A1" });

  // Merge header từ A1 đến cột cuối
  const totalColumns = Object.keys(exportData[0] || {}).length;
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } }];

  // Style cho dòng tiêu đề chính
  worksheet["A1"].s = {
    font: { name: "Arial", sz: 16, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "305496" } },
  };

  // Bước 3: Style phần nội dung
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let R = range.s.r + 2; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { name: "Arial", sz: 12 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };
    }
  }

  // Bước 4: Style dòng tiêu đề cột (hàng 3)
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCell = XLSX.utils.encode_cell({ r: 2, c: C });
    if (worksheet[headerCell]) {
      worksheet[headerCell].s = {
        font: { name: "Arial", sz: 12, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "D9E1F2" } },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };
    }
  }

  // Bước 5: Thêm dòng Footer
  const footerRowIndex = range.e.r + 2;
  const footerText = "Nhân viên kiểm tra ký xác nhận hoàn thành";
  XLSX.utils.sheet_add_aoa(worksheet, [[footerText]], { origin: { r: footerRowIndex, c: 0 } });
  worksheet["!merges"].push({ s: { r: footerRowIndex, c: 0 }, e: { r: footerRowIndex, c: totalColumns - 1 } });
  const footerCell = XLSX.utils.encode_cell({ r: footerRowIndex, c: 0 });
  worksheet[footerCell].s = {
    font: { name: "Arial", sz: 12, italic: true },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "FFF2CC" } },
  };

  // Bước 6: Ghi file
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "CheckList");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `CheckList_${new Date().toISOString()}.xlsx`);
};




  const clearFilters = () => {
    setSearchTerm("");
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

      {/* Filter Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          ⬇️ Xuất Excel
        </button>

        <input
          type="text"
          placeholder="🔍 Tìm theo họ tên..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          className="border px-3 py-2 rounded shadow-sm w-60"
        />

        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          className="border px-3 py-2 rounded shadow-sm"
        >
          <option value="">Số xe</option>
          {allOptionValues.map((option, idx) => (
            <option key={idx} value={option}>
              {option}
            </option>
          ))}
        </select>

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

      {/* Table */}
      <div className="overflow-x-auto shadow border rounded">
        <table className="w-full text-sm text-left bg-white">
          <thead className="text-xs bg-gray-50 border-b">
  <tr>
    <th className="px-4 py-3 font-semibold">STT</th>
    <th className="px-4 py-3 font-semibold">Mã NV</th>
    <th className="px-4 py-3 font-semibold">Họ tên</th>
    <th className="px-4 py-3 font-semibold">Đơn vị</th>
    <th className="px-4 py-3 font-semibold">Tùy chọn</th>
    <th className="px-4 py-3 font-semibold">Ngày điền</th>

    {/* Các tiêu đề nội dung kiểm tra */}
    {allCheckTitles.map((title, idx) => (
      <th key={idx} className="px-4 py-3 font-semibold whitespace-nowrap">
        {title}
      </th>
    ))}

    {/* Ghi chú nằm sau cùng */}
    <th className="px-4 py-3 font-semibold">Ghi chú</th>
  </tr>
</thead>

          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td colSpan={6 + allCheckTitles.length} className="text-center py-5 text-gray-500">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : (
              currentUsers.map((user, index) => (
                <UserRowCheckList
                  key={user._id}
                  user={user}
                  index={startIndex + index}
                  allCheckTitles={allCheckTitles}
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

export default UserTableCheckList;

