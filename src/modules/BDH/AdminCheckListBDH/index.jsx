import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { checkListBDHService } from "@/services/checklistbdh.service";
import CustomPagination from "@/components/ui/customPagination";
import { saveAs } from "file-saver";
import dayjs from "@/utils/dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import UserRowCheckListBDH from "./userRowBDH";
import { checkListFormServiceBDH } from "@/services/checklistbdhform.service";
import ExcelJS from "exceljs";

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
  const [isExporting, setIsExporting] = useState(false);

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
      checkListBDH.flatMap((user) => [
        ...(user.cac_muc?.flatMap((muc) =>
          muc.cong_viec?.map((cv) => cv.noidung) || []
        ) || []),
        ...(user.cong_viec_khac?.map((cv) => cv.noidung) || [])
      ])
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





// HOẶC CÁCH ĐƠN GIẢN HỞN: Bỏ qua xử lý đặc biệt cho tổ trưởng
// Hàm xuất Excel với layout transpose (thông tin cá nhân dọc, checklist ngang)
const exportToExcel = async () => {
  try {
    setIsExporting(true);
    
    // Dữ liệu để xuất
    let dataToExport = filteredUsers;
    
    if (!dataToExport || dataToExport.length === 0) {
      alert('Không có dữ liệu để xuất Excel!');
      return;
    }
    
    console.log('Exporting data (transposed):', dataToExport.length, 'users');
    console.log('Checklist titles:', allCheckTitles);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Checklist BDH');
    
    // Tiêu đề form
    const formTitle = title[0]?.tieu_de || 'Checklist BDH';
    const totalColumns = 1 + dataToExport.length; // 1 cột field names + số user columns
    
    // Row 1: Tiêu đề form (merge toàn bộ)
    worksheet.addRow([formTitle]);
    worksheet.mergeCells(1, 1, 1, totalColumns);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF000080' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' }
    };
    
    // Row 2: Trống
    worksheet.addRow([]);
    
    // Row 3: Header với tên users
    const headerRow = ['Thông tin'];
    dataToExport.forEach((user, index) => {
      headerRow.push(`User ${index + 1}`);
    });
    
    const headerRowExcel = worksheet.addRow(headerRow);
    headerRowExcel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRowExcel.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Style cho header
    headerRow.forEach((_, index) => {
      const cell = headerRowExcel.getCell(index + 1);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Tạo map checklist data cho mỗi user
    const userData = dataToExport.map(user => {
      const checkedItems = new Set();
      
      // Thu thập từ cac_muc
      if (user.cac_muc && Array.isArray(user.cac_muc)) {
        user.cac_muc.forEach(muc => {
          if (muc.cong_viec && Array.isArray(muc.cong_viec)) {
            muc.cong_viec.forEach(cv => {
              if (cv.noidung && cv.da_chon) {
                checkedItems.add(cv.noidung);
              }
            });
          }
        });
      }
      
      // Thu thập từ cong_viec_khac
      if (user.cong_viec_khac && Array.isArray(user.cong_viec_khac)) {
        user.cong_viec_khac.forEach(cv => {
          if (cv.noidung && cv.da_chon) {
            checkedItems.add(cv.noidung);
          }
        });
      }
      
      return {
        ...user,
        checkedItems
      };
    });
    
    // Thêm các row thông tin cá nhân
    const personalInfoRows = [
      {
        label: 'STT',
        getValue: (user, index) => index + 1
      },
      {
        label: 'Mã NV',
        getValue: (user) => user.ma_nhan_vien || ''
      },
      {
        label: 'Họ tên',
        getValue: (user) => user.ho_ten || ''
      },
      {
        label: 'Bộ phận',
        getValue: (user) => user.don_vi || ''
      },
      {
        label: 'Ngày điền',
        getValue: (user) => user.ngay_tao ? dayjs(user.ngay_tao).format('DD/MM/YYYY HH:mm') : ''
      }
    ];
    
    // Thêm rows thông tin cá nhân
    personalInfoRows.forEach(rowInfo => {
      const rowData = [rowInfo.label];
      userData.forEach((user, index) => {
        rowData.push(rowInfo.getValue(user, index));
      });
      
      const dataRow = worksheet.addRow(rowData);
      
      // Style cho personal info rows
      rowData.forEach((_, cellIndex) => {
        const cell = dataRow.getCell(cellIndex + 1);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
        
        if (cellIndex === 0) {
          // Label column - bold và background
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE7E6E6' }
          };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          // Data columns
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });
    
    // Row trắng phân cách
    worksheet.addRow([]);
    
    // Thêm header cho checklist section
    const checklistHeaderRow = ['DANH SÁCH KIỂM TRA'];
    userData.forEach(() => {
      checklistHeaderRow.push('');
    });
    
    const checklistHeader = worksheet.addRow(checklistHeaderRow);
    worksheet.mergeCells(checklistHeader.number, 1, checklistHeader.number, totalColumns);
    const checklistHeaderCell = worksheet.getCell(checklistHeader.number, 1);
    checklistHeaderCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    checklistHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    checklistHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Thêm rows cho từng checklist item
    allCheckTitles.forEach(checkTitle => {
      const rowData = [checkTitle];
      userData.forEach(user => {
        const isChecked = user.checkedItems.has(checkTitle);
        rowData.push(isChecked ? '✓' : '');
      });
      
      const dataRow = worksheet.addRow(rowData);
      
      // Style cho checklist rows
      rowData.forEach((cellValue, cellIndex) => {
        const cell = dataRow.getCell(cellIndex + 1);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
        
        if (cellIndex === 0) {
          // Checklist item name - wrap text
          cell.alignment = { 
            horizontal: 'left', 
            vertical: 'middle',
            wrapText: true 
          };
          cell.font = { bold: false };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        } else {
          // Check status - center align
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (cellValue === '✓') {
            cell.font = { color: { argb: 'FF008000' }, bold: true, size: 14 };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F5E8' }
            };
          }
        }
      });
    });
    
    // Row trắng
    worksheet.addRow([]);
    
    // Thêm row ghi chú
    const noteRowData = ['Ghi chú'];
    userData.forEach(user => {
      noteRowData.push(user.ghi_chu || '');
    });
    
    const noteRow = worksheet.addRow(noteRowData);
    noteRowData.forEach((_, cellIndex) => {
      const cell = noteRow.getCell(cellIndex + 1);
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      if (cellIndex === 0) {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
    
    // Auto-fit column widths
    worksheet.columns.forEach((column, index) => {
      if (index === 0) {
        // Label column - wider để chứa checklist titles
        column.width = 40;
      } else {
        // User data columns
        column.width = 15;
      }
    });
    
    // Set row heights cho checklist items để text đọc được
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 8) { // Từ checklist section trở đi
        row.height = 20;
      }
    });
    
    // Tạo file và download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `${formTitle}_Transposed_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;
    saveAs(blob, fileName);
    
    console.log('Transposed Excel file created successfully!');
    
  } catch (error) {
    console.error('Lỗi xuất Excel:', error);
    alert(`Có lỗi xảy ra khi xuất file Excel: ${error.message}`);
  } finally {
    setIsExporting(false);
  }
};

  return (
    <div className="px-4 sm:px-8 py-8">
      {title.map((form, index) => (
        <h2 key={index} className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
          {form.tieu_de || "Không có tiêu đề"}
        </h2>
      ))}

      {/* Bộ lọc và nút xuất Excel */}
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

        {/* Nút xuất Excel */}
        <button
          onClick={exportToExcel}
          disabled={isExporting || filteredUsers.length === 0}
          className={`px-4 py-2 rounded font-medium ${
            isExporting || filteredUsers.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isExporting ? '📊 Đang xuất...' : '📊 Xuất Excel'}
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
                <td colSpan={7} className="text-center py-5 text-gray-500">
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