import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom"; // Import useParams
import { formkpistaffService } from "@/services/formkpistaff.service";
import { checkKPIService } from "@/services/checkkpistaff.service";
import StaffKPIDetailModal from "./StaffKPIDetailModal";
import CheckKPISimpleModal from "./CheckKPISimpleModal";
import ExportExcelModal from "./excel";
import AddStaffWithKPIModal from "./AddStaffWithKPIModal"; // ← NEW
import { ROLE_KPI } from "@/configs/constants";

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
  const [exportOpen, setExportOpen] = useState(false); // State cho Export Excel Modal
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [addOpen, setAddOpen] = useState(false); // ← NEW
  const [userRoles, setUserRoles] = useState([]);

  // Phân quyền
  useEffect(() => {
    try {
      const keys = [
        "user",
        "userData",
        "auth",
        "currentUser",
        "loginUser",
        "userInfo",
      ];
      let user = null;
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          user = JSON.parse(raw);
          break;
        }
      }
      // gom role về dạng mảng số
      const roles = new Set();
      if (user) {
        if (typeof user.role === "number") roles.add(user.role);
        const pools = [
          user.roles,
          user.role_kpi,
          user.kpi_roles,
          user.roleIds,
          user.permissions,
        ];
        for (const p of pools) {
          if (Array.isArray(p))
            p.forEach((r) => typeof r === "number" && roles.add(r));
        }
      }
      setUserRoles([...roles]);
    } catch (e) {
      setUserRoles([]);
      e;
    }
  }, []);

  const canManageKPI = useMemo(
    () =>
      userRoles.some((r) => [ROLE_KPI.KETOANTRUONG, ROLE_KPI.PGD].includes(r)),
    [userRoles]
  );

  // Fetch data
  const refreshList = useCallback(async () => {
    try {
      setLoading(true);
      const list = await formkpistaffService.getAllFormKPI();
      let staffList = Array.isArray(list) ? list : [];

      // chỉ giữ nhân viên có đơn vị là "Kế Toán"
      staffList = staffList.filter(
        (staff) => (staff.don_vi || "").trim().toLowerCase() === "kế toán"
      );

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
        nam: selectedYear,
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
            ty_trong_thang: Number(checkKPI.ty_trong_thang) || 0,
          });
        }
      });

      // Tính trung bình cho từng nhân viên
      staffList.forEach((staff) => {
        const staffKPIs = kpiByStaff.get(staff.ma_nhan_vien) || [];

        if (staffKPIs.length > 0) {
          // Tính trung bình tỷ trọng các tháng
          const totalWeight = staffKPIs.reduce(
            (sum, kpi) => sum + kpi.ty_trong_thang,
            0
          );
          const averageWeight =
            Math.round((totalWeight / staffKPIs.length) * 100) / 100; // Làm tròn 2 chữ số thập phân

          weightMap.set(staff.ma_nhan_vien, {
            averageWeight,
            monthCount: staffKPIs.length,
            months: staffKPIs.map((kpi) => kpi.thang).sort((a, b) => a - b),
          });
        } else {
          // Chưa có dữ liệu KPI nào
          weightMap.set(staff.ma_nhan_vien, {
            averageWeight: null,
            monthCount: 0,
            months: [],
          });
        }
      });

      setYearlyWeightMap(weightMap);
    } catch (error) {
      console.error("❌ Lỗi khi tính tỷ trọng năm:", error);

      // Nếu lỗi, set tất cả về null
      staffList.forEach((staff) => {
        weightMap.set(staff.ma_nhan_vien, {
          averageWeight: null,
          monthCount: 0,
          months: [],
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
        nam: selectedYear,
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
      staffList.forEach((staff) => {
        const hasKPI = checkedStaffSet.has(staff.ma_nhan_vien);
        const status = hasKPI ? "completed" : "pending";

        statusMap.set(staff.ma_nhan_vien, {
          status: status,
          monthYear: `${targetMonth}/${selectedYear}`,
        });
      });

      setKpiStatusMap(statusMap);
    } catch (error) {
      console.error("❌ Lỗi khi check trạng thái KPI:", error);

      // Nếu lỗi, set tất cả về pending
      staffList.forEach((staff) => {
        statusMap.set(staff.ma_nhan_vien, {
          status: "pending",
          monthYear: `${targetMonth}/${selectedYear}`,
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
    const hasOpenModal = detailOpen || checkOpen || exportOpen || addOpen; // Thêm exportOpen
    if (!hasOpenModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = previousOverflow);
  }, [detailOpen, checkOpen, exportOpen, addOpen]); // Thêm exportOpen vào dependencies

  const openDetail = (staff) => {
    setSelectedStaff({
      ...staff,
      selectedYear: selectedYear, // Truyền thêm năm được chọn
    });
    setDetailOpen(true);
  };

  // Function để mở Export Excel Modal
  const openExportModal = (staff) => {
    setSelectedStaff({
      ma_nhan_vien: staff.ma_nhan_vien,
      ho_ten: staff.ho_ten,
      don_vi: staff.don_vi,
    });
    setExportOpen(true);
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
      status: "pending",
      monthYear: `${targetMonth}/${selectedYear}`,
    };
  };

  // Helper function để get tỷ trọng năm từ Map
  const getYearlyWeight = (ma_nhan_vien) => {
    return (
      yearlyWeightMap.get(ma_nhan_vien) || {
        averageWeight: null,
        monthCount: 0,
        months: [],
      }
    );
  };

  // Helper function để xác định trạng thái năm
  const getYearStatus = () => {
    const currentYear = new Date().getFullYear();
    if (selectedYear > currentYear) return "future";
    if (selectedYear === currentYear) return "current";
    return "past";
  };

  const yearStatus = getYearStatus();

  return (
    <section className="container mx-auto max-w-screen-2xl p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md">
        <div className="grid gap-4 p-5 md:p-6 md:grid-cols-2 md:items-center">
          {/* Left: Title + meta */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                KPI Kế Toán — {selectedYear}
              </h1>

              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
                  yearStatus === "current" &&
                    "bg-emerald-50 text-emerald-700 border-emerald-200",
                  yearStatus === "future" &&
                    "bg-blue-50 text-blue-700 border-blue-200",
                  yearStatus === "past" &&
                    "bg-amber-50 text-amber-700 border-amber-200",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {yearStatus === "current"
                  ? "📅 Năm hiện tại"
                  : yearStatus === "future"
                  ? "🚀 Năm tương lai"
                  : "📚 Năm quá khứ"}
              </span>
            </div>

            <p className="text-slate-600 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {data.length}
              </span>
              nhân viên đang được theo dõi
              {yearStatus !== "current" && (
                <span className="text-slate-500">
                  •{" "}
                  {yearStatus === "future"
                    ? "Chuẩn bị cho năm tới"
                    : "Dữ liệu lịch sử"}
                </span>
              )}
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap justify-start md:justify-end gap-2">
            {canManageKPI && (
              <>
                <button
                  onClick={() => setAddOpen(true)}
                  className="w-full sm:w-auto inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white
                   bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700
                   shadow-md transition active:translate-y-[1px]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-fuchsia-400"
                >
                  <span className="text-base">➕</span>
                  Thêm nhân viên + KPI
                </button>

                <button
                  onClick={() => setCheckOpen(true)}
                  className="w-full sm:w-auto inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white
                   bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                   shadow-md transition active:translate-y-[1px]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400"
                >
                  <span className="text-base">✨</span>
                  Chấm KPI {selectedYear}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full">
            {/* Table Header (sticky) */}
            <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur border-b border-slate-200">
              <tr>
                {[
                  "Mã NV",
                  "Họ Tên",
                  "Bộ Phận",
                  "Trạng Thái KPI",
                  `Tỷ Trọng ${selectedYear}`,
                  "Thao Tác",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left md:text-center first:text-left"
                  >
                    <span className="text-[11px] md:text-xs font-bold uppercase tracking-wide text-slate-600">
                      {h}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Loading Skeleton */}
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-3.5 w-20 rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3.5 w-32 rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3.5 w-24 rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="h-7 w-28 rounded-full bg-slate-200 mx-auto" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="h-7 w-20 rounded-full bg-slate-200 mx-auto" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="h-9 w-44 rounded-xl bg-slate-200 mx-auto" />
                    </td>
                  </tr>
                ))}

              {/* Data Rows */}
              {!loading &&
                data.length > 0 &&
                data.map((item, index) => {
                  const kpiStatus = getKPIStatus(item.ma_nhan_vien);
                  const yearlyWeight = getYearlyWeight(item.ma_nhan_vien);

                  return (
                    <tr
                      key={item._id}
                      className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/60 transition-colors"
                    >
                      {/* Mã NV */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold grid place-items-center">
                            {index + 1}
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-800 whitespace-nowrap">
                            {item.ma_nhan_vien}
                          </span>
                        </div>
                      </td>

                      {/* Họ tên */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm grid place-items-center">
                            {item.ho_ten?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="font-semibold text-slate-900">
                            {item.ho_ten}
                          </div>
                        </div>
                      </td>

                      {/* Bộ phận */}
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {item.don_vi}
                        </span>
                      </td>

                      {/* Trạng thái KPI */}
                      <td className="px-5 py-3 text-center">
                        {kpiStatus.status === "completed" ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Đã chấm {kpiStatus.monthYear} ✅
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-sm font-semibold text-amber-700">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            Chưa chấm {kpiStatus.monthYear} ⏳
                          </span>
                        )}
                      </td>

                      {/* Tỷ trọng */}
                      <td className="px-5 py-3 text-center">
                        {yearlyWeight.averageWeight !== null ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ring-2",
                                yearlyWeight.averageWeight >= 90 &&
                                  "bg-emerald-50 text-emerald-700 ring-emerald-200",
                                yearlyWeight.averageWeight >= 80 &&
                                  yearlyWeight.averageWeight < 90 &&
                                  "bg-blue-50 text-blue-700 ring-blue-200",
                                yearlyWeight.averageWeight >= 70 &&
                                  yearlyWeight.averageWeight < 80 &&
                                  "bg-amber-50 text-amber-700 ring-amber-200",
                                yearlyWeight.averageWeight < 70 &&
                                  "bg-red-50 text-red-700 ring-red-200",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              title={`Các tháng đã chấm: ${yearlyWeight.months.join(
                                ", "
                              )}`}
                            >
                              {yearlyWeight.averageWeight}%
                            </span>
                            <span className="text-xs text-slate-500">
                              ({yearlyWeight.monthCount} tháng)
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200 px-3 py-1.5 text-sm">
                            {yearStatus === "future"
                              ? "Sắp mở"
                              : "Chưa có dữ liệu"}
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              openDetail({
                                ma_nhan_vien: item.ma_nhan_vien,
                                ho_ten: item.ho_ten,
                                don_vi: item.don_vi,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-sm transition"
                            aria-label={`Xem chi tiết KPI của ${item.ho_ten}`}
                          >
                            📊 Chi tiết
                          </button>

                          <button
                            onClick={() => openExportModal(item)}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-sm transition"
                            aria-label={`Xuất Excel KPI của ${item.ho_ten}`}
                          >
                            📤 Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {/* Empty State */}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="mx-auto max-w-md text-center space-y-4">
                      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                        <span className="text-3xl">📋</span>
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Chưa có dữ liệu KPI năm {selectedYear}
                        </h3>
                        <p className="text-slate-500">
                          {yearStatus === "future"
                            ? `Năm ${selectedYear} chưa bắt đầu. Hãy chuẩn bị dữ liệu cho năm tới.`
                            : `Hiện tại chưa có dữ liệu KPI cho năm ${selectedYear}. Hãy thêm dữ liệu để bắt đầu quản lý.`}
                        </p>
                      </div>
                      <button
                        onClick={refreshList}
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-md transition"
                      >
                        🔄 Tải lại dữ liệu
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
      {addOpen && (
        <AddStaffWithKPIModal
          selectedYear={selectedYear}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            refreshList();
          }}
        />
      )}

      {detailOpen && selectedStaff && (
        <StaffKPIDetailModal
          staff={selectedStaff}
          onClose={() => setDetailOpen(false)}
          selectedYear={selectedYear}
          canManageKPI={canManageKPI}
        />
      )}

      {checkOpen && (
        <CheckKPISimpleModal
          onClose={() => setCheckOpen(false)}
          onSaved={() => {
            refreshList();
          }}
          selectedYear={selectedYear}
        />
      )}

      {exportOpen && selectedStaff && (
        <ExportExcelModal
          staff={selectedStaff}
          selectedYear={selectedYear}
          onClose={() => setExportOpen(false)}
        />
      )}
    </section>
  );
};

export default TableKeToan;
