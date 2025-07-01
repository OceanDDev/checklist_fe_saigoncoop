import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { checkListService } from "@/services/checklist.service";
import { checkListFormService } from "@/services/checklistform.service";
import CustomPagination from "@/components/ui/customPagination";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import UserRowCheckList from "./userRow";
import * as XLSX from "xlsx-js-style";

const UserTableCheckList = () => {
  const { formId } = useParams();
  const [checkList, setCheckList] = useState([]);
  const [title, setTitle] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);

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
        const res = await checkListService.getCheckListsByFormId(formId);
        const sorted = Array.isArray(res)
          ? res.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao))
          : [];
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
      checkList.flatMap((user) =>
        [
          ...(user.kiem_tra_ben_ngoai || []),
          ...(user.kiem_tra_khi_van_hanh || []),
        ].map((item) => item.noidung)
      )
    )
  );

  const allOptionValues = Array.from(
    new Set(
      checkList.flatMap(
        (user) =>
          user.option_da_chon?.map((opt) => `${opt.label}: ${opt.value}`) || []
      )
    )
  );

  const filteredUsers = checkList.filter((user) => {
    const matchSearch = user.ho_ten
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchOption = selectedOption
      ? user.option_da_chon?.some(
          (opt) => `${opt.label}: ${opt.value}` === selectedOption
        )
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
    const exportMatrix = [];

    // ==== Header 3 dòng (KHÔNG còn cột trống đầu) ====
    exportMatrix.push(["BẢNG KIỂM TRA"]);
    exportMatrix.push([
      "Bộ phận:................................    Loại xe:................................",
    ]);
    exportMatrix.push([
      "Nhân viên vận hành:................................    Số hiệu xe:................................",
    ]);

    // ==== Cấu trúc các dòng nội dung ====
    const staticFields = ["Mã NV", "Họ tên", "Đơn vị", "Tùy chọn", "Ngày điền"];
    const dynamicFields = allCheckTitles;
    const finalFields = [...staticFields, ...dynamicFields, "Ghi chú"];

    // ==== Sắp xếp theo ngày điền tăng dần ====
    filteredUsers.sort((a, b) => new Date(a.ngay_tao) - new Date(b.ngay_tao));

    // ==== Tạo các dòng dữ liệu, thêm STT bên trái ====
    finalFields.forEach((field, index) => {
      const row = [];
      row.push(index + 1); // STT
      row.push(field); // Tên dòng

      filteredUsers.forEach((user) => {
        if (field === "Mã NV") return row.push(user.ma_nhan_vien || "");
        if (field === "Họ tên") return row.push(user.ho_ten || "");
        if (field === "Đơn vị") return row.push(user.don_vi || "");
        if (field === "Tùy chọn") {
          return row.push(
            user.option_da_chon
              ?.map((opt) => `${opt.label}: ${opt.value}`)
              .join(", ") || ""
          );
        }
        if (field === "Ngày điền") {
          return row.push(
            user.ngay_tao
              ? new Date(user.ngay_tao).toLocaleDateString("vi-VN")
              : ""
          );
        }
        if (field === "Ghi chú") return row.push(user.ghi_chu || "");

        const allAnswers = [
          ...(user.kiem_tra_ben_ngoai || []),
          ...(user.kiem_tra_khi_van_hanh || []),
        ];
        const found = allAnswers.find((item) => item.noidung === field);
        row.push(found?.dap_an || "");
      });

      exportMatrix.push(row);
    });

    // ==== Footer ====
    exportMatrix.push([]);
    exportMatrix.push(["", "Nhân viên kiểm tra ký xác nhận hoàn thành"]);

    // ==== Tạo worksheet ====
    const worksheet = XLSX.utils.aoa_to_sheet(exportMatrix);

    // ==== Merge các dòng đầu tiên ====
    const totalCols = filteredUsers.length + 2; // STT + tên dòng + n người
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // BẢNG KIỂM TRA
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // Bộ phận...
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }, // Nhân viên...
    ];

    // ==== Style toàn bộ bảng ====
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cell]) worksheet[cell] = { t: "s", v: "" };
        worksheet[cell].s = {
          font: { name: "Arial", sz: 12 },
          alignment: {
            horizontal: R <= 2 ? "left" : "center",
            vertical: "center",
            wrapText: true,
          },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }
    }

    // ==== Style riêng cho tiêu đề "BẢNG KIỂM TRA" ====
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    worksheet[titleCell].s = {
      ...worksheet[titleCell].s,
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "center", vertical: "center" },
    };

    // ==== Tạo và xuất workbook ====
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CheckList_Xoay_STT");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `CheckList_XOAY_STT_${new Date().toISOString()}.xlsx`);
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
        <h2
          key={index}
          className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2"
        >
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
                ? `${dayjs(dateRange[0].startDate).format(
                    "DD/MM/YYYY"
                  )} - ${dayjs(dateRange[0].endDate).format("DD/MM/YYYY")}`
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
          <thead className="text-xs bg-gray-50 border-b text-center">
            <tr>
              <th className="px-4 py-3 font-semibold">STT</th>
              <th className="px-4 py-3 font-semibold">Mã NV</th>
              <th className="px-4 py-3 font-semibold">Họ tên</th>
              <th className="px-4 py-3 font-semibold">Đơn vị</th>
              <th className="px-4 py-3 font-semibold">Tùy chọn</th>
              <th className="px-4 py-3 font-semibold">Ngày điền</th>
              <th className="px-4 py-3 font-semibold">Tổng quan</th>
              <th className="px-4 py-3 font-semibold">Chi tiết</th>

              {/* Các tiêu đề nội dung kiểm tra */}
              {/* {allCheckTitles.map((title, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 font-semibold whitespace-nowrap"
                >
                  {title}
                </th>
              ))} */}  
            </tr>
          </thead>

          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6 + allCheckTitles.length}
                  className="text-center py-5 text-gray-500"
                >
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
