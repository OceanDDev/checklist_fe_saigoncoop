import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom"; // Import useParams
import { formkpistaffService } from "@/services/formkpistaff.service";
import { checkKPIService } from "@/services/checkkpistaff.service";
import StaffKPIDetailModal from "./StaffKPIDetailModal";
import CheckKPISimpleModal from "./CheckKPISimpleModal";

const TableKeToan = () => {
  const { year } = useParams(); // Lấy năm từ URL parameter
  const selectedYear = parseInt(year) || new Date().getFullYear(); // Parse năm hoặc dùng năm hiện tại
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiStatusMap, setKpiStatusMap] = useState(new Map()); // Map để lưu trạng thái KPI
  const [yearlyWeightMap, setYearlyWeightMap] = useState(new Map()); // Map để lưu tỷ trọng năm
  
  // Modal states
  const [detailOpen, setDetailOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Fetch data
  const refreshList = useCallback(async () => {
    try {
      setLoading(true);
      const list = await formkpistaffService.getAllFormKPI();
      const staffList = Array.isArray(list) ? list : [];
      setData(staffList);
      
      // Sau khi có danh sách nhân viên, check trạng thái KPI cho từng người theo năm được chọn
      await checkAllKPIStatus(staffList);
      // Và tính tỷ trọng năm cho từng người theo năm được chọn
      await calculateYearlyWeights(staffList);
    } catch (err) {
      console.error("Lỗi khi load KPI:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]); // Thêm selectedYear vào dependencies

  // Tính tỷ trọng năm cho tất cả nhân viên theo năm được chọn
  const calculateYearlyWeights = async (staffList) => {
    const weightMap = new Map();

    try {
      // Lấy tất cả check KPI của năm được chọn
      const response = await checkKPIService.getAllCheckKPI({
        nam: selectedYear
      });

      // Xử lý response data
      let allCheckKPI = [];
      if (response && response.data && Array.isArray(response.data)) {
        allCheckKPI = response.data;
      } else if (Array.isArray(response)) {
        allCheckKPI = response;
      }

      // Nhóm theo mã nhân viên
      const kpiByStaff = new Map();
      allCheckKPI.forEach((checkKPI) => {
        if (checkKPI.ma_nhan_vien && checkKPI.ty_trong_thang !== undefined) {
          if (!kpiByStaff.has(checkKPI.ma_nhan_vien)) {
            kpiByStaff.set(checkKPI.ma_nhan_vien, []);
          }
          kpiByStaff.get(checkKPI.ma_nhan_vien).push({
            thang: checkKPI.thang,
            ty_trong_thang: Number(checkKPI.ty_trong_thang) || 0
          });
        }
      });

      // Tính trung bình cho từng nhân viên
      staffList.forEach(staff => {
        const staffKPIs = kpiByStaff.get(staff.ma_nhan_vien) || [];
        
        if (staffKPIs.length > 0) {
          // Tính trung bình tỷ trọng các tháng
          const totalWeight = staffKPIs.reduce((sum, kpi) => sum + kpi.ty_trong_thang, 0);
          const averageWeight = Math.round((totalWeight / staffKPIs.length) * 100) / 100; // Làm tròn 2 chữ số thập phân
          
          weightMap.set(staff.ma_nhan_vien, {
            averageWeight,
            monthCount: staffKPIs.length,
            months: staffKPIs.map(kpi => kpi.thang).sort((a, b) => a - b)
          });
        } else {
          // Chưa có dữ liệu KPI nào
          weightMap.set(staff.ma_nhan_vien, {
            averageWeight: null,
            monthCount: 0,
            months: []
          });
        }
      });

      setYearlyWeightMap(weightMap);
    } catch (error) {
      console.error("❌ Lỗi khi tính tỷ trọng năm:", error);
      
      // Nếu lỗi, set tất cả về null
      staffList.forEach(staff => {
        weightMap.set(staff.ma_nhan_vien, {
          averageWeight: null,
          monthCount: 0,
          months: []
        });
      });
      setYearlyWeightMap(weightMap);
    }
  };

  // Check trạng thái KPI cho tất cả nhân viên theo tháng hiện tại của năm được chọn
  const checkAllKPIStatus = async (staffList) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const statusMap = new Map();

    // Nếu năm được chọn là năm tương lai, sử dụng tháng 1
    // Nếu là năm hiện tại, dùng tháng hiện tại
    // Nếu là năm quá khứ, dùng tháng 12
    let targetMonth;
    if (selectedYear > currentYear) {
      targetMonth = 1; // Tháng đầu năm cho năm tương lai
    } else if (selectedYear === currentYear) {
      targetMonth = currentMonth; // Tháng hiện tại
    } else {
      targetMonth = 12; // Tháng cuối năm cho năm quá khứ
    }

    try {
      // Lấy tất cả check KPI của tháng target trong năm được chọn
      const response = await checkKPIService.getAllCheckKPI({
        thang: targetMonth,
        nam: selectedYear
      });

      // Xử lý response data - API trả về object có structure {success, count, data}
      let allCheckKPI = [];
      if (response && response.data && Array.isArray(response.data)) {
        allCheckKPI = response.data;
      } else if (Array.isArray(response)) {
        allCheckKPI = response;
      }

      // Tạo Set các mã nhân viên đã chấm KPI trong tháng
      const checkedStaffSet = new Set();
      allCheckKPI.forEach((checkKPI) => {
        if (checkKPI.ma_nhan_vien) {
          checkedStaffSet.add(checkKPI.ma_nhan_vien);
        }
      });

      // Check trạng thái cho từng nhân viên
      staffList.forEach(staff => {
        const hasKPI = checkedStaffSet.has(staff.ma_nhan_vien);
        const status = hasKPI ? 'completed' : 'pending';
        
        statusMap.set(staff.ma_nhan_vien, {
          status: status,
          monthYear: `${targetMonth}/${selectedYear}`
        });
      });

      setKpiStatusMap(statusMap);
    } catch (error) {
      console.error("❌ Lỗi khi check trạng thái KPI:", error);
      
      // Nếu lỗi, set tất cả về pending
      staffList.forEach(staff => {
        statusMap.set(staff.ma_nhan_vien, {
          status: 'pending',
          monthYear: `${targetMonth}/${selectedYear}`
        });
      });
      setKpiStatusMap(statusMap);
    }
  };

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const hasOpenModal = detailOpen || checkOpen;
    if (!hasOpenModal) return;
    
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = previousOverflow);
  }, [detailOpen, checkOpen]);

  const openDetail = (staff) => {
    setSelectedStaff({
      ...staff,
      selectedYear: selectedYear // Truyền thêm năm được chọn
    });
    setDetailOpen(true);
  };

  // Helper function để get trạng thái chấm KPI từ Map
  const getKPIStatus = (ma_nhan_vien) => {
    const status = kpiStatusMap.get(ma_nhan_vien);
    if (status) {
      return status;
    }
    
    // Default nếu chưa có trong map
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    
    let targetMonth;
    if (selectedYear > currentDate.getFullYear()) {
      targetMonth = 1;
    } else if (selectedYear === currentDate.getFullYear()) {
      targetMonth = currentMonth;
    } else {
      targetMonth = 12;
    }
    
    return {
      status: 'pending',
      monthYear: `${targetMonth}/${selectedYear}`
    };
  };

  // Helper function để get tỷ trọng năm từ Map
  const getYearlyWeight = (ma_nhan_vien) => {
    return yearlyWeightMap.get(ma_nhan_vien) || {
      averageWeight: null,
      monthCount: 0,
      months: []
    };
  };

  // Helper function để xác định trạng thái năm
  const getYearStatus = () => {
    const currentYear = new Date().getFullYear();
    if (selectedYear > currentYear) return 'future';
    if (selectedYear === currentYear) return 'current';
    return 'past';
  };

  const yearStatus = getYearStatus();

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-3xl border border-blue-100 p-6 shadow-xl shadow-blue-100/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                KPI Kế Toán - Năm {selectedYear}
              </h1>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                yearStatus === 'current' 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : yearStatus === 'future'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {yearStatus === 'current' ? '📅 Năm hiện tại' : yearStatus === 'future' ? '🚀 Năm tương lai' : '📚 Năm quá khứ'}
              </div>
            </div>
            <p className="text-slate-600 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {data.length}
              </span>
              nhân viên đang được theo dõi
              {yearStatus !== 'current' && (
                <span className="text-slate-500">
                  • {yearStatus === 'future' ? 'Chuẩn bị cho năm tới' : 'Dữ liệu lịch sử'}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-blue-200 shadow-sm">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                yearStatus === 'current' ? 'bg-green-500' : yearStatus === 'future' ? 'bg-blue-500' : 'bg-amber-500'
              }`}></div>
              <span className="text-sm font-medium text-slate-700">Kế toán</span>
            </div>
            
            <button
              onClick={() => setCheckOpen(true)}
              className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-lg">✨</span>
              Chấm KPI {selectedYear}
              <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* Table Header */}
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã NV</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Họ Tên</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bộ Phận</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng Thái KPI</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tỷ Trọng {selectedYear}</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thao Tác</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Loading Skeleton */}
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-slate-200 rounded-lg"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-slate-200 rounded-lg"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-slate-200 rounded-lg"></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-8 w-28 bg-slate-200 rounded-full mx-auto"></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-8 w-20 bg-slate-200 rounded-full mx-auto"></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-10 w-24 bg-slate-200 rounded-xl mx-auto"></div>
                    </td>
                  </tr>
                ))}

              {/* Data Rows */}
              {!loading && data.length > 0 &&
                data.map((item, index) => {
                  const kpiStatus = getKPIStatus(item.ma_nhan_vien);
                  const yearlyWeight = getYearlyWeight(item.ma_nhan_vien);
                  
                  return (
                  <tr 
                    key={item._id} 
                    className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          {item.ma_nhan_vien}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {item.ho_ten?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.ho_ten}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {item.don_vi}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      {kpiStatus.status === 'completed' ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold text-emerald-700">
                            Đã chấm {kpiStatus.monthYear}
                          </span>
                          <span className="text-emerald-600">✅</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold text-amber-700">
                            Chưa chấm {kpiStatus.monthYear}
                          </span>
                          <span className="text-amber-600">⏳</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {yearlyWeight.averageWeight !== null ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ring-2 ${
                            yearlyWeight.averageWeight >= 90 
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' 
                              : yearlyWeight.averageWeight >= 80
                              ? 'bg-blue-50 text-blue-700 ring-blue-200'
                              : yearlyWeight.averageWeight >= 70
                              ? 'bg-amber-50 text-amber-700 ring-amber-200'
                              : 'bg-red-50 text-red-700 ring-red-200'
                          }`}>
                            {yearlyWeight.averageWeight}%
                          </div>
                          <div className="text-xs text-slate-500" title={`Các tháng đã chấm: ${yearlyWeight.months.join(', ')}`}>
                            ({yearlyWeight.monthCount} tháng)
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                          {yearStatus === 'future' ? 'Sắp mở' : 'Chưa có dữ liệu'}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openDetail({
                          ma_nhan_vien: item.ma_nhan_vien,
                          ho_ten: item.ho_ten,
                          don_vi: item.don_vi,
                        })}
                        className="group/btn relative inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-lg shadow-blue-200 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span className="text-sm">📊</span>
                        Chi tiết {selectedYear}
                        <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover/btn:opacity-20 transition-opacity duration-200"></div>
                      </button>
                    </td>
                  </tr>
                  );
                })}

              {/* Empty State */}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-slate-200 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-3xl">📋</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900">Chưa có dữ liệu KPI năm {selectedYear}</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                          {yearStatus === 'future' 
                            ? `Năm ${selectedYear} chưa bắt đầu. Hãy chuẩn bị dữ liệu cho năm tới.`
                            : `Hiện tại chưa có dữ liệu KPI cho năm ${selectedYear}. Hãy thêm dữ liệu để bắt đầu quản lý.`
                          }
                        </p>
                      </div>
                      <button
                        onClick={refreshList}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
                      >
                        <span>🔄</span>
                        Tải lại dữ liệu
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {detailOpen && selectedStaff && (
        <StaffKPIDetailModal
          staff={selectedStaff}
          onClose={() => setDetailOpen(false)}
          selectedYear={selectedYear} // Truyền năm được chọn vào modal
        />
      )}

      {checkOpen && (
        <CheckKPISimpleModal
          onClose={() => setCheckOpen(false)}
          onSaved={() => {
            refreshList(); // Refresh toàn bộ sau khi chấm KPI
          }}
          selectedYear={selectedYear} // Truyền năm được chọn vào modal chấm KPI
        />
      )}
    </div>
  );
};

export default TableKeToan;