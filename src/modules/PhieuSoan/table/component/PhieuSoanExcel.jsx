/* eslint-disable react/prop-types */
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';

const PhieuSoanExcelExport = ({ 
  selectedRows, 
  rows, 
  disabled = false 
}) => {
  
  // Không hiển thị button nếu không có hàng nào được chọn
  if (selectedRows.length === 0) {
    return null;
  }

  const exportToExcel = async () => {
    // Lấy dữ liệu các hàng đã chọn
    const dataToExport = rows.filter(row => selectedRows.includes(row._id));

    if (dataToExport.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    try {
      // Tạo workbook và worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Phiếu Soạn', {
        properties: { defaultColWidth: 15 }
      });

      // Định nghĩa các cột với header
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã phiếu', key: 'maPhieu', width: 16 },
        { header: 'Cửa hàng', key: 'store', width: 10 },
        { header: 'SD/TF', key: 'sodaTf', width: 10 },
        { header: 'Tên sản phẩm', key: 'tenSp', width: 35 },
        { header: 'SKU', key: 'sku', width: 16 },
        { header: 'Vị trí', key: 'slot', width: 10 },
        { header: 'Pack', key: 'pack', width: 8 },
        { header: 'SL Gốc', key: 'slGoc', width: 10 },
        { header: 'SL Điều chỉnh', key: 'slDieuChinh', width: 14 },
        { header: 'SL Xuất', key: 'slXuat', width: 10 },
        { header: 'Kiện hàng', key: 'kienHang', width: 12 },
        { header: 'Chẵn/Lẻ', key: 'chanLe', width: 10 },
        { header: 'Trạng thái', key: 'trangThai', width: 12 },
        { header: 'Ngày tạo', key: 'ngayTao', width: 18 },
      ];

      // Style cho header
      worksheet.getRow(1).font = { bold: true, size: 11 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 25;

      // Thêm dữ liệu
      dataToExport.forEach((row, index) => {
        // Logic: Nếu có lượng điều chỉnh thì dùng, không thì dùng số lượng
        const luongChinh = (row.luong_dieu_chinh !== undefined && 
                            row.luong_dieu_chinh !== null && 
                            row.luong_dieu_chinh !== '') 
                            ? row.luong_dieu_chinh 
                            : row.luong;

        const rowData = {
          stt: index + 1,
          maPhieu: row.phieu_soan_id || '',
          store: row.store || '',
          sodaTf: row.soda_transfer || '',
          tenSp: row.name || '',
          sku: row.sku || '',
          slot: row.slot || '',
          pack: row.pack || '',
          slGoc: row.luong || 0,
          slDieuChinh: row.luong_dieu_chinh || '',
          slXuat: luongChinh || 0,
          kienHang: row.kien_hang || '',
          chanLe: row.chan_le || '',
          trangThai: row.trang_thai ? 'Hoàn thành' : 'Chờ xử lý',
          ngayTao: formatDate(row.ngay_ra_phieu),
        };

        const excelRow = worksheet.addRow(rowData);
        
        // Style cho từng dòng
        excelRow.alignment = { vertical: 'middle' };
        
        // Màu cho cột SL Xuất
        excelRow.getCell('slXuat').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' }
        };
        excelRow.getCell('slXuat').font = { bold: true };

        // Màu cho trạng thái
        if (row.trang_thai) {
          excelRow.getCell('trangThai').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' }
          };
          excelRow.getCell('trangThai').font = { color: { argb: 'FF006100' } };
        } else {
          excelRow.getCell('trangThai').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }
          };
          excelRow.getCell('trangThai').font = { color: { argb: 'FF9C0006' } };
        }

        // Màu cho Chẵn/Lẻ
        if (row.chan_le === 'Chẵn') {
          excelRow.getCell('chanLe').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCE6F1' }
          };
        } else if (row.chan_le === 'Lẻ') {
          excelRow.getCell('chanLe').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFCE4D6' }
          };
        }
      });

      // Thêm border cho tất cả cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
          };
        });
      });

      // Tạo tên file với timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `PhieuSoan_${timestamp}.xlsx`;

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Tạo link download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      
      // Cleanup
      URL.revokeObjectURL(link.href);

      // Thông báo thành công
      alert(`✅ Đã xuất ${selectedRows.length} phiếu soạn được chọn`);
    } catch (error) {
      console.error('❌ Lỗi xuất Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel!');
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateValue;
    }
  };

  return (
    <button
      onClick={exportToExcel}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-md transition-all
        ${disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-green-700 hover:shadow-lg'
        }
      `}
      title={`Xuất ${selectedRows.length} phiếu đã chọn`}
    >
      <Download className="w-5 h-5" />
      <span>Xuất Excel ({selectedRows.length})</span>
    </button>
  );
};

export default PhieuSoanExcelExport;