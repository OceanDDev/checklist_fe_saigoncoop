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
    const matchSearchHoTen = user.ho_ten
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchSearchMaNV = user.ma_nhan_vien
      ?.toLowerCase()
      .includes(searchMaNV.toLowerCase());

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

    return matchSearchHoTen && matchSearchMaNV && matchOption && matchDate;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentUsers = isFiltering
    ? filteredUsers // khi đang lọc thì không phân trang
    : filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const exportToExcel = () => {
    const exportMatrix = [];

    // === Header
    const firstUser = filteredUsers[0];
    const user_donvi = firstUser?.don_vi || "................................";
    const so_hieu_xe =
      firstUser?.option_da_chon
        ?.map((opt) => `${opt.label}: ${opt.value}`)
        .join(", ") || "................................";

    exportMatrix.push(["BẢNG KIỂM TRA " + (title?.[0]?.tieu_de || "")]);
    exportMatrix.push([
      `Bộ phận: ${user_donvi}  -  Loại xe:................................`,
    ]);
    exportMatrix.push([
      `Nhân viên vận hành:................................   -  ${so_hieu_xe}`,
    ]);

    const staticFields = ["Mã NV", "Ngày điền"];
    const dynamicFields = allCheckTitles;
    const finalFields = [...staticFields, ...dynamicFields, "Ghi chú"];

    filteredUsers.sort((a, b) => new Date(a.ngay_tao) - new Date(b.ngay_tao));

    // ==== Nội dung chính
    // Tách Ghi chú khỏi danh sách
    const contentFields = finalFields.filter((f) => f !== "Ghi chú");

    // Xuất tất cả các trường trừ Ghi chú
    contentFields.forEach((field, index) => {
      const row = [index + 1, field];

      filteredUsers.forEach((user) => {
        if (field === "Mã NV") return row.push(user.ma_nhan_vien || "");
        if (field === "Ngày điền") {
          return row.push(
            user.ngay_tao
              ? new Date(user.ngay_tao).toLocaleDateString("vi-VN")
              : ""
          );
        }

        const allAnswers = [
          ...(user.kiem_tra_ben_ngoai || []),
          ...(user.kiem_tra_khi_van_hanh || []),
        ];
        const found = allAnswers.find((item) => item.noidung === field);
        row.push(found?.dap_an || "");
      });

      exportMatrix.push(row);
    });
    exportMatrix.push([]);

    exportMatrix.push(["", "Nội dung không đạt(nếu có)"]);
    // Tạo dòng ghi chú riêng
    const noteRow = ["", "Ghi chú"];
    filteredUsers.forEach((user) => {
      noteRow.push(user.ghi_chu || "");
    });
    exportMatrix.push(noteRow);
    exportMatrix.push(["", "Nhân viên kiểm tra ký xác nhận hoàn thành"]);

    // ==== Ghi chú + Footer
    exportMatrix.push([]);
    exportMatrix.push([
      `Ghi chú:
- Khi có bất kì dấu hiệu bất thường/không đúng tiêu chuẩn vận hành của mục nào bên trên phải lập tức báo cáo ngay cho giám sát kho và ngưng vận hành hoàn toàn cho 
  đến khi sự cố được khắc phục đảm bảo an toàn vận hành
- Nhân viên kiểm tra là nhân viên đầu tiên vận hành trong ngày và chịu trách nhiệm kết quả kiểm tra
- Nếu ở tình trạng bình thường đánh dấu (Đ) Đạt, nếu dấu hiệu bất thường/ không đúng tiêu chuẩn vận hành đánh dấu (K) không đạt và miêu tả tình trạng ở cột ghi chú`,
    ]);

    exportMatrix.push([
      "          BM-478.KTTTB                                                                                                       Ban hành lần 1                                                                                                      Trang 1/1",
    ]);

    // ==== Tạo worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(exportMatrix);
    const totalCols = filteredUsers.length + 2;

    const lastNoteRow = exportMatrix.length - 2;
    const lastFooterRow = exportMatrix.length - 1;

    // ==== Merge các dòng
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
      { s: { r: lastNoteRow, c: 0 }, e: { r: lastNoteRow, c: totalCols - 1 } },
      {
        s: { r: lastFooterRow, c: 0 },
        e: { r: lastFooterRow, c: totalCols - 1 },
      },
    ];

    // ==== Cài chiều cao dòng cho ghi chú
    worksheet["!rows"] = [];
    exportMatrix.forEach((_, idx) => {
      worksheet["!rows"].push({
        hpt: idx === lastNoteRow ? 100 : undefined,
      });
    });

    // ==== Style toàn bảng
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cell]) worksheet[cell] = { t: "s", v: "" };

        const isHeader = R === 0;
        const isNoteRow = R === lastNoteRow;
        const isFooterRow = R === lastFooterRow;

        let fontSize = 12;
        let hAlign = "center";

        if (isNoteRow || isFooterRow) {
          fontSize = 8;
          hAlign = "left";
        } else if (R === 1 || R === 2) {
          // Bộ phận + Nhân viên vận hành
          hAlign = "left";
        } else if (isHeader) {
          fontSize = 14;
          hAlign = "center";
        }

        worksheet[cell].s = {
          font: {
            name: "Arial",
            sz: fontSize,
            bold: isHeader,
          },
          alignment: {
            horizontal: hAlign,
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

    // ==== Xuất file
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "CheckList");

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `CheckList_${new Date().toISOString()}.xlsx`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSearchMaNV(""); // reset thêm mã NV
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
