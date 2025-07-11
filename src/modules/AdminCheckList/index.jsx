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
import ExcelJS from "exceljs";

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
      checkList.flatMap((user) => {
        // Lấy từ tất cả các nhóm kiểm tra
        const allGroupItems = [];
        if (user.checklist_groups && Array.isArray(user.checklist_groups)) {
          user.checklist_groups.forEach((group) => {
            if (group.items && Array.isArray(group.items)) {
              group.items.forEach((item) => {
                allGroupItems.push(item.noidung);
              });
            }
          });
        }
        return allGroupItems;
      })
    )
  );

  // Thay thế phần tạo allOptionValues
  const allOptionValues = Array.from(
    new Set(
      checkList
        .flatMap((user) => {
          if (!user.option_da_chon || !Array.isArray(user.option_da_chon)) {
            return [];
          }
          return user.option_da_chon.map((opt) => {
            const label = (opt.label || "").trim();
            const value = (opt.value || "").trim();
            return `${label}: ${value}`;
          });
        })
        .filter((option) => {
          const trimmed = option.trim();
          return trimmed && trimmed !== ":" && trimmed !== ": ";
        })
    )
  ).sort();

  const filteredUsers = checkList.filter((user) => {
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
      const userDateString = dayjs(user.ngay_tao).format("YYYY-MM-DD");
      const startDateString = dayjs(dateRange[0].startDate).format(
        "YYYY-MM-DD"
      );
      const endDateString = dayjs(dateRange[0].endDate).format("YYYY-MM-DD");

      // So sánh string đơn giản
      matchDate =
        userDateString >= startDateString && userDateString <= endDateString;
    }

    return matchSearchHoTen && matchSearchMaNV && matchOption && matchDate;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentUsers = isFiltering
    ? filteredUsers // khi đang lọc thì không phân trang
    : filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("CheckList");

    // ===== SẮP XẾP USERS THEO NGÀY TẠO TĂNG DẦN NGAY TỪ ĐẦU
    const sortedFilteredUsers = [...filteredUsers].sort(
      (a, b) => new Date(a.ngay_tao) - new Date(b.ngay_tao)
    );

    const firstUser = sortedFilteredUsers[0];
    const user_donvi = firstUser?.don_vi || "................................";
    const so_hieu_xe =
      firstUser?.option_da_chon
        ?.map((opt) => `${opt.label}: ${opt.value}`)
        .join(", ") || "................................";

    // ===== HEADER
    worksheet.addRow([`BẢNG KIỂM TRA ${title?.[0]?.tieu_de || ""}`]);
    const row1 = worksheet.addRow([
      `Bộ phận: ${user_donvi}  -  Loại xe:................................`,
    ]);
    const row2 = worksheet.addRow([
      `Nhân viên vận hành:................................   -  ${so_hieu_xe}`,
    ]);
    row1.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    row2.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // ===== HEADER BẢNG - HÀNG MÃ NHÂN VIÊN (sử dụng sortedFilteredUsers)
    const maNVRow = worksheet.addRow(["STT", "Mã NV"]);
    sortedFilteredUsers.forEach((user) => {
      maNVRow.getCell(maNVRow.cellCount + 1).value = user.ma_nhan_vien || "";
    });

    // ===== HEADER BẢNG - HÀNG STT VÀ NGÀY/MỤC KIỂM TRA (sử dụng sortedFilteredUsers)
    const headerMainRow = worksheet.addRow([
      "STT",
      "Ngày Kiểm tra\n        ╱\nMục Kiểm tra",
    ]);
    sortedFilteredUsers.forEach((user) => {
      headerMainRow.getCell(headerMainRow.cellCount + 1).value = user.ngay_tao
        ? new Date(user.ngay_tao).toLocaleDateString("vi-VN")
        : "";
    });

    // ===== NỘI DUNG CHÍNH - Cập nhật theo schema mới
    // Thêm các hàng nội dung kiểm tra
    allCheckTitles.forEach((fieldContent, index) => {
      const row = [index + 1, fieldContent];
      sortedFilteredUsers.forEach((user) => {
        // Tìm đáp án trong tất cả các nhóm
        let foundAnswer = "";
        if (user.checklist_groups && Array.isArray(user.checklist_groups)) {
          user.checklist_groups.forEach((group) => {
            if (group.items && Array.isArray(group.items)) {
              const foundItem = group.items.find(
                (item) => item.noidung === fieldContent
              );
              if (foundItem && foundItem.dap_an) {
                foundAnswer = foundItem.dap_an;
              }
            }
          });
        }
        row.push(foundAnswer);
      });
      worksheet.addRow(row);
    });

    worksheet.addRow([]);

    const totalCols = sortedFilteredUsers.length + 2;

    // ===== GHI CHÚ VÀ CHỮ KÝ (sử dụng sortedFilteredUsers)
    worksheet.addRow([
      "",
      "Nội dung không đạt (nếu có)",
      ...Array(sortedFilteredUsers.length).fill(""),
    ]);

    const noteRow = ["", "Ghi chú"];
    sortedFilteredUsers.forEach((user) => {
      noteRow.push(user.ghi_chu || "");
    });
    worksheet.addRow(noteRow);

    worksheet.addRow([
      "",
      "Nhân viên kiểm tra ký xác nhận hoàn thành",
      ...Array(sortedFilteredUsers.length).fill(""),
    ]);
    worksheet.addRow([]);

    worksheet.addRow([
      `Ghi chú:\n- Khi có bất kì dấu hiệu bất thường/không đúng tiêu chuẩn vận hành của mục nào bên trên phải lập tức báo cáo ngay cho giám sát kho và ngưng vận hành hoàn toàn cho đến khi sự cố được khắc phục đảm bảo an toàn vận hành\n- Nhân viên kiểm tra là nhân viên đầu tiên vận hành trong ngày và chịu trách nhiệm kết quả kiểm tra\n- Nếu ở tình trạng bình thường đánh dấu (Đ) Đạt, nếu dấu hiệu bất thường/ không đúng tiêu chuẩn vận hành đánh dấu (KĐ) không đạt và miêu tả tình trạng ở cột ghi chú`,
    ]);

    // ===== MERGE CELLS
    [1, 2, 3].forEach((i) => {
      worksheet.mergeCells(
        `A${i}:` + String.fromCharCode(65 + totalCols - 1) + `${i}`
      );
    });

    worksheet.mergeCells("A4:A5");

    const lastRow = worksheet.lastRow.number;
    worksheet.mergeCells(
      `A${lastRow}:` + String.fromCharCode(65 + totalCols - 1) + `${lastRow}`
    );

    // ===== FILL EMPTY CELLS FOR BORDER
    worksheet.eachRow((row) => {
      for (let i = 1; i <= totalCols; i++) {
        if (!row.getCell(i).value) {
          row.getCell(i).value = "";
        }
      }
    });

    // ===== STYLE
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        const isFirstRow = rowNumber === 1;
        const isLastRow = rowNumber >= lastRow;

        const cellText = (cell.value || "").toString().trim().toUpperCase();
        const isBold = isFirstRow || (cellText !== "Đ" && cellText !== "KĐ");

        cell.alignment = {
          vertical: "middle",
          horizontal: rowNumber >= 6 ? "left" : "center",
          wrapText: true,
        };
        cell.font = {
          name: "Arial",
          size: isFirstRow ? 14 : isLastRow ? 8 : 12,
          bold: isBold,
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      if (rowNumber === lastRow) row.height = 100;
      if (rowNumber === 4 || rowNumber === 5) row.height = 30;
    });

    // ===== PAGE SETUP + FOOTER
    worksheet.pageSetup = {
      orientation: "landscape",
      paperSize: 9,
      horizontalCentered: true,
    };
    worksheet.headerFooter = {
      oddFooter: "&L&8 BM-478.KTTTB &C&8 Ban hành lần 1 &R&8 Trang &P/&N",
    };

    // ===== EXPORT
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
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
          <option value="">Tùy chọn</option>
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
              <th className="px-4 py-3 font-semibold">Bộ phận</th>
              <th className="px-4 py-3 font-semibold">Tùy chọn</th>
              <th className="px-4 py-3 font-semibold">Ngày điền</th>
              <th className="px-4 py-3 font-semibold">Tổng quan</th>
              <th className="px-4 py-3 font-semibold">Chi tiết</th>
              <th className="px-4 py-3 font-semibold">Chức năng</th>

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
                  fetchChecklists={() => {
                    const fetchData = async () => {
                      const res = await checkListService.getCheckListsByFormId(
                        formId
                      );
                      setCheckList(
                        res.sort(
                          (a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao)
                        )
                      );
                    };
                    fetchData();
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

export default UserTableCheckList;
