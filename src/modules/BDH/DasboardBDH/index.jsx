import { useState, useEffect, useRef, useMemo } from "react";
import { checkListBDHService } from "@/services/checklistbdh.service";
import { staffService } from "@/services/staff.service";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Calendar,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

// Team configuration
const TEAM_CONFIG = {
  "Tổ Xuất Hàng": {
    employees: ["24373", "30541", "34278"],
    formId: "687f110132fbc64dbf1c0ac3",
    color: "rgba(59, 130, 246, 0.8)",
  },
  "Tổ Xuất Hàng - HT": {
    employees: ["23657"],
    formId: "687f12a132fbc64dbf1c0b48",
    color: "rgba(99, 102, 241, 0.8)",
  },
  "Tổ Nhập Hàng": {
    employees: ["23204", "40303", "20952"],
    formId: "687f155b32fbc64dbf1c0bb0",
    color: "rgba(16, 185, 129, 0.8)",
  },
  "Tổ Kế Toán": {
    employees: ["23475"],
    formId: "687f16a632fbc64dbf1c0c41",
    color: "rgba(245, 158, 11, 0.8)",
  },
  "Tổ Điều Vận": {
    employees: ["24859"],
    formId: "69e085056a96fc31947cfd18",
    color: "rgba(239, 68, 68, 0.8)",
  },
};

const DashboardBDH = () => {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState(7);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [employeeNames, setEmployeeNames] = useState({});
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [selectedView, setSelectedView] = useState("overview"); // ✅ THÊM: Tab view
  const datePickerRef = useRef(null);

  // ✅ THÊM: Badge cho loại quy định
  const getScheduleBadge = (loai) => {
    const badges = {
      ngày: {
        text: "Hàng ngày",
        color: "bg-green-500",
        icon: "📅",
        desc: "Công việc cần làm mỗi ngày",
      },
      tuần: {
        text: "Hàng tuần",
        color: "bg-blue-500",
        icon: "📆",
        desc: "Công việc theo lịch tuần",
      },
      tháng: {
        text: "Hàng tháng",
        color: "bg-purple-500",
        icon: "🗓️",
        desc: "Công việc theo ngày trong tháng",
      },
      "phát sinh": {
        text: "Phát sinh",
        color: "bg-orange-500",
        icon: "⚡",
        desc: "Công việc xảy ra đột xuất",
      },
      phat_sinh: {
        text: "Phát sinh",
        color: "bg-orange-500",
        icon: "⚡",
        desc: "Công việc xảy ra đột xuất",
      },
    };
    return badges[loai] || null;
  };

  // ✅ THÊM: Format ngày trong tuần
  const formatWeekDays = (days) => {
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return days.map((d) => dayNames[d]).join(", ");
  };

  // ✅ Hàm kiểm tra công việc có áp dụng cho ngày cụ thể không
  const shouldShowOnDate = (quy_dinh, checkDate) => {
    if (!quy_dinh) return true;

    const date = new Date(checkDate);
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    if (
      quy_dinh.loai === "ngày" ||
      quy_dinh.loai === "phát sinh" ||
      quy_dinh.loai === "phat_sinh"
    ) {
      return true;
    }

    if (quy_dinh.loai === "tuần") {
      if (!quy_dinh.ngay_trong_tuan || quy_dinh.ngay_trong_tuan.length === 0) {
        return false;
      }
      return quy_dinh.ngay_trong_tuan.includes(dayOfWeek);
    }

    if (quy_dinh.loai === "tháng") {
      if (
        !quy_dinh.ngay_trong_thang ||
        quy_dinh.ngay_trong_thang.length === 0
      ) {
        return false;
      }
      return quy_dinh.ngay_trong_thang.includes(dayOfMonth);
    }

    return true;
  };

  // Date utilities
  const formatDate = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const getDateRange = useMemo(() => {
    return () => {
      const startOfDay = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      };
      const endOfDay = (date) => {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
      };

      if (selectedRange === "custom" && customStartDate && customEndDate) {
        return {
          start: startOfDay(new Date(customStartDate)),
          end: endOfDay(new Date(customEndDate)),
        };
      }
      const end = new Date();
      const start =
        selectedRange === "all"
          ? new Date(2020, 0, 1)
          : new Date(end.getTime() - selectedRange * 24 * 60 * 60 * 1000);
      return { start: startOfDay(start), end: endOfDay(end) };
    };
  }, [selectedRange, customStartDate, customEndDate]);

  // Fetch data
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setShowCustomDate(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const formIds = Object.values(TEAM_CONFIG).map((t) => t.formId);
      const checklistPromises = formIds.map((formId) =>
        checkListBDHService.getCheckListsByFormBDHId(formId).catch(() => []),
      );

      const results = await Promise.all(checklistPromises);
      setChecklists(results.flat().filter(Boolean));

      const employeeIds = Object.values(TEAM_CONFIG).flatMap(
        (team) => team.employees,
      );
      const namePromises = employeeIds.map(async (empId) => {
        try {
          const result = await staffService.getStaff({ ma_nhan_vien: empId });
          return { id: empId, name: result?.ho_ten || `NV ${empId}` };
        } catch {
          return { id: empId, name: `NV ${empId}` };
        }
      });

      const names = await Promise.all(namePromises);
      setEmployeeNames(
        Object.fromEntries(names.map(({ id, name }) => [id, name])),
      );
    } catch (error) {
      setError(`Lỗi khi tải dữ liệu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Filter data by date range
  const filteredData = useMemo(() => {
    const { start, end } = getDateRange();
    return checklists.filter((item) => {
      const itemDate = new Date(
        item.ngay_tao || item.thoi_gian_tao || item.createdAt,
      );
      return !isNaN(itemDate.getTime()) && itemDate >= start && itemDate <= end;
    });
  }, [checklists, getDateRange]);

  // ✅ Helper function to check if checklist should be excluded from job calculations
  const isOffDuty = (checklist) => {
    const excludedStatuses = ["Nghỉ ca", "Nghỉ bù", "Nghỉ phép"];
    return checklist.status && excludedStatuses.includes(checklist.status);
  };

  // Get team by employee
  const getTeamByEmployee = (employeeId) => {
    for (const [teamName, teamData] of Object.entries(TEAM_CONFIG)) {
      if (teamData.employees.includes(String(employeeId))) {
        return teamName;
      }
    }
    return "Khác";
  };

  // ✅ THÊM: Thống kê theo loại quy định
  const scheduleTypeStats = useMemo(() => {
    const stats = {
      ngày: { total: 0, completed: 0 },
      tuần: { total: 0, completed: 0 },
      tháng: { total: 0, completed: 0 },
      phát_sinh: { total: 0, completed: 0 },
    };

    filteredData.forEach((checklist) => {
      const checklistDate = new Date(
        checklist.thoi_gian_tao || checklist.ngay_tao || checklist.createdAt,
      );

      if (!isOffDuty(checklist)) {
        checklist.cac_muc?.forEach((muc) => {
          muc.cong_viec?.forEach((job) => {
            if (shouldShowOnDate(job.quy_dinh, checklistDate)) {
              const loai =
                job.quy_dinh?.loai === "phat_sinh"
                  ? "phát_sinh"
                  : job.quy_dinh?.loai || "ngày";
              if (stats[loai]) {
                stats[loai].total++;
                if (job.da_chon) stats[loai].completed++;
              }
            }
          });
        });
      }
    });

    return stats;
  }, [filteredData]);

  // ✅ THÊM: Chi tiết công việc theo quy định
  const jobsByScheduleType = useMemo(() => {
    const jobs = {
      ngày: [],
      tuần: [],
      tháng: [],
      phát_sinh: [],
    };

    filteredData.forEach((checklist) => {
      const empName =
        employeeNames[checklist.ma_nhan_vien] || `NV ${checklist.ma_nhan_vien}`;
      const checklistDate = new Date(
        checklist.thoi_gian_tao || checklist.ngay_tao || checklist.createdAt,
      );

      if (!isOffDuty(checklist)) {
        checklist.cac_muc?.forEach((muc) => {
          muc.cong_viec?.forEach((job) => {
            if (shouldShowOnDate(job.quy_dinh, checklistDate)) {
              const loai =
                job.quy_dinh?.loai === "phat_sinh"
                  ? "phát_sinh"
                  : job.quy_dinh?.loai || "ngày";
              if (jobs[loai]) {
                jobs[loai].push({
                  ...job,
                  employeeName: empName,
                  section: muc.ten_muc,
                  date: checklistDate,
                  quy_dinh: job.quy_dinh,
                });
              }
            }
          });
        });
      }
    });

    return jobs;
  }, [filteredData, employeeNames]);

  // ✅ THÊM: Thống kê điểm danh hôm nay
  const employeeCheckStatus = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const status = {};

    Object.entries(TEAM_CONFIG).forEach(([teamName, teamData]) => {
      status[teamName] = {};
      teamData.employees.forEach((empId) => {
        status[teamName][empId] = {
          name: employeeNames[empId] || `NV ${empId}`,
          hasChecked: false,
          checkTime: null,
          totalJobs: 0,
          completedJobs: 0,
          status: "Chưa check",
        };
      });
    });

    checklists.forEach((checklist) => {
      const checkDate = new Date(
        checklist.thoi_gian_tao || checklist.ngay_tao || checklist.createdAt,
      );
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate.getTime() === today.getTime()) {
        const teamName = Object.keys(TEAM_CONFIG).find((team) =>
          TEAM_CONFIG[team].employees.includes(checklist.ma_nhan_vien),
        );

        if (teamName && status[teamName][checklist.ma_nhan_vien]) {
          status[teamName][checklist.ma_nhan_vien].hasChecked = true;
          status[teamName][checklist.ma_nhan_vien].checkTime =
            checklist.thoi_gian_tao ||
            checklist.ngay_tao ||
            checklist.createdAt;
          status[teamName][checklist.ma_nhan_vien].status =
            checklist.status || "Đi làm";

          if (!isOffDuty(checklist)) {
            checklist.cac_muc?.forEach((muc) => {
              muc.cong_viec?.forEach((job) => {
                if (shouldShowOnDate(job.quy_dinh, checkDate)) {
                  status[teamName][checklist.ma_nhan_vien].totalJobs++;
                  if (job.da_chon) {
                    status[teamName][checklist.ma_nhan_vien].completedJobs++;
                  }
                }
              });
            });
          }
        }
      }
    });

    return status;
  }, [checklists, employeeNames]);

  // ✅ Calculate employee statistics
  const employeeStats = useMemo(() => {
    const stats = {};

    Object.entries(TEAM_CONFIG).forEach(([teamName, teamData]) => {
      stats[teamName] = {};

      teamData.employees.forEach((empId) => {
        const empChecklists = filteredData.filter(
          (item) => String(item.ma_nhan_vien) === String(empId),
        );

        let totalJobs = 0;
        let completedJobs = 0;
        const incompleteBySection = {};
        const otherJobsList = [];

        empChecklists.forEach((checklist) => {
          const checklistDate = new Date(
            checklist.ngay_tao ||
              checklist.thoi_gian_tao ||
              checklist.createdAt,
          );

          if (!isOffDuty(checklist)) {
            checklist.cac_muc?.forEach((muc) => {
              const sectionName = muc.ten_muc || "Không có tiêu đề";
              muc.cong_viec?.forEach((job) => {
                if (shouldShowOnDate(job.quy_dinh, checklistDate)) {
                  totalJobs++;
                  if (job.da_chon) {
                    completedJobs++;
                  } else {
                    incompleteBySection[sectionName] =
                      (incompleteBySection[sectionName] || 0) + 1;
                  }
                }
              });
            });

            if (
              checklist.cong_viec_khac &&
              Array.isArray(checklist.cong_viec_khac)
            ) {
              checklist.cong_viec_khac.forEach((job) => {
                if (job.noidung) {
                  otherJobsList.push({
                    noidung: job.noidung,
                    da_chon: job.da_chon || false,
                    ngay_tao: checklistDate,
                  });
                }
              });
            }
          }
        });

        stats[teamName][empId] = {
          name: employeeNames[empId] || `NV ${empId}`,
          checklistCount: empChecklists.length,
          totalJobs,
          completedJobs,
          incompleteJobs: totalJobs - completedJobs,
          completionRate:
            totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : 0,
          incompleteBySection,
          otherJobs: otherJobsList,
        };
      });
    });

    return stats;
  }, [filteredData, employeeNames]);

  // ✅ Tổng hợp công việc khác
  const otherJobsStats = useMemo(() => {
    let total = 0;
    let completed = 0;

    Object.values(employeeStats).forEach((employees) => {
      Object.values(employees).forEach((emp) => {
        if (emp.otherJobs) {
          total += emp.otherJobs.length;
          completed += emp.otherJobs.filter((j) => j.da_chon).length;
        }
      });
    });

    return {
      total,
      completed,
      incomplete: total - completed,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
    };
  }, [employeeStats]);

  // Chart data generators (GIỮ NGUYÊN TẤT CẢ CÁC HÀM CHART GỐC)
  const getEmployeeChecklistChart = () => {
    const labels = [];
    const data = [];
    const colors = [];

    Object.entries(employeeStats).forEach(([teamName, employees]) => {
      Object.values(employees).forEach((emp) => {
        labels.push(emp.name);
        data.push(emp.checklistCount);
        colors.push(TEAM_CONFIG[teamName].color);
      });
    });

    return {
      labels,
      datasets: [
        { label: "Số lượng checklist", data, backgroundColor: colors },
      ],
    };
  };

  const getCompletionRateChart = () => {
    const labels = [];
    const completionData = [];
    const incompleteData = [];

    Object.values(employeeStats).forEach((employees) => {
      Object.values(employees).forEach((emp) => {
        labels.push(emp.name);
        const rate = parseFloat(emp.completionRate);
        completionData.push(rate);
        incompleteData.push(100 - rate);
      });
    });

    return {
      labels,
      datasets: [
        {
          label: "Đã hoàn thành (%)",
          data: completionData,
          backgroundColor: "rgba(34, 197, 94, 0.8)",
        },
        {
          label: "Chưa hoàn thành (%)",
          data: incompleteData,
          backgroundColor: "rgba(239, 68, 68, 0.8)",
        },
      ],
    };
  };

  const getTotalJobsChart = () => {
    const labels = [];
    const completedData = [];
    const incompleteData = [];

    Object.values(employeeStats).forEach((employees) => {
      Object.values(employees).forEach((emp) => {
        labels.push(emp.name);
        completedData.push(emp.completedJobs);
        incompleteData.push(emp.incompleteJobs);
      });
    });

    return {
      labels,
      datasets: [
        {
          label: "Đã hoàn thành",
          data: completedData,
          backgroundColor: "rgba(34, 197, 94, 0.8)",
        },
        {
          label: "Chưa hoàn thành",
          data: incompleteData,
          backgroundColor: "rgba(239, 68, 68, 0.8)",
        },
      ],
    };
  };

  const getOtherJobsChart = () => {
    const labels = [];
    const completedData = [];
    const incompleteData = [];

    Object.values(employeeStats).forEach((employees) => {
      Object.values(employees).forEach((emp) => {
        if (emp.otherJobs && emp.otherJobs.length > 0) {
          labels.push(emp.name);
          const completed = emp.otherJobs.filter((j) => j.da_chon).length;
          const incomplete = emp.otherJobs.length - completed;
          completedData.push(completed);
          incompleteData.push(incomplete);
        }
      });
    });

    return {
      labels,
      datasets: [
        {
          label: "Đã hoàn thành",
          data: completedData,
          backgroundColor: "rgba(139, 92, 246, 0.8)",
        },
        {
          label: "Chưa hoàn thành",
          data: incompleteData,
          backgroundColor: "rgba(236, 72, 153, 0.8)",
        },
      ],
    };
  };

  // ✅ THÊM: Biểu đồ theo loại quy định
  const getScheduleTypePieChart = () => {
    const labels = [];
    const data = [];
    const colors = [];

    Object.entries(scheduleTypeStats).forEach(([type, stats]) => {
      if (stats.total > 0) {
        const badge = getScheduleBadge(type);
        labels.push(`${badge?.icon || ""} ${badge?.text || type}`);
        data.push(stats.total);

        const colorMap = {
          ngày: "rgba(34, 197, 94, 0.8)",
          tuần: "rgba(59, 130, 246, 0.8)",
          tháng: "rgba(168, 85, 247, 0.8)",
          phát_sinh: "rgba(249, 115, 22, 0.8)",
        };
        colors.push(colorMap[type]);
      }
    });

    return {
      labels,
      datasets: [
        { data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" },
      ],
    };
  };

  const getScheduleTypeCompletionChart = () => {
    const labels = [];
    const completedData = [];
    const incompleteData = [];

    Object.entries(scheduleTypeStats).forEach(([type, stats]) => {
      if (stats.total > 0) {
        const badge = getScheduleBadge(type);
        labels.push(`${badge?.icon || ""} ${badge?.text || type}`);
        completedData.push(stats.completed);
        incompleteData.push(stats.total - stats.completed);
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Đã hoàn thành",
          data: completedData,
          backgroundColor: "rgba(34, 197, 94, 0.8)",
        },
        {
          label: "Chưa hoàn thành",
          data: incompleteData,
          backgroundColor: "rgba(239, 68, 68, 0.8)",
        },
      ],
    };
  };

  // Total stats
  const totalStats = useMemo(() => {
    const stats = { total: filteredData.length, byTeam: {} };
    Object.keys(TEAM_CONFIG).forEach((team) => {
      stats.byTeam[team] = 0;
    });
    filteredData.forEach((item) => {
      const team = getTeamByEmployee(item.ma_nhan_vien);
      if (stats.byTeam[team] !== undefined) stats.byTeam[team]++;
    });
    return stats;
  }, [filteredData]);

  const { start, end } = getDateRange();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <div className="text-xl text-gray-600">Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header - GIỮ NGUYÊN */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            📊 Dashboard Checklist BĐH
          </h1>
          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <RefreshCw size={18} />
            Làm mới
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="font-semibold text-red-800">Lỗi</div>
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        {/* ✅ THÊM: View Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedView("overview")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === "overview"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            📊 Tổng quan
          </button>
          <button
            onClick={() => setSelectedView("schedule")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === "schedule"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            📅 Theo quy định
          </button>
          <button
            onClick={() => setSelectedView("attendance")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === "attendance"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            👥 Điểm danh hôm nay
          </button>
        </div>

        {/* Date Range Controls - GIỮ NGUYÊN */}
        <div className="flex flex-wrap gap-3 items-center">
          {[7, 30].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedRange(days)}
              className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
                selectedRange === days
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {days} ngày
            </button>
          ))}
          <button
            onClick={() => setSelectedRange("all")}
            className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
              selectedRange === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Tất cả
          </button>

          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowCustomDate(!showCustomDate)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors ${
                selectedRange === "custom"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Calendar size={18} />
              Tùy chỉnh
            </button>

            {showCustomDate && (
              <div className="absolute z-50 mt-2 right-0 bg-white shadow-lg rounded-lg border p-4 w-80">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">
                    Chọn khoảng thời gian
                  </h3>
                  <button
                    onClick={() => setShowCustomDate(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (customStartDate && customEndDate) {
                        setSelectedRange("custom");
                        setShowCustomDate(false);
                      }
                    }}
                    disabled={!customStartDate || !customEndDate}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700">
            <Calendar size={18} />
            {formatDate(start)} - {formatDate(end)}
          </div>
        </div>
      </div>

      {/* ========== VIEW 1: TỔNG QUAN (Original Dashboard) ========== */}
      {selectedView === "overview" && (
        <>
          {/* Stats Cards - GIỮ NGUYÊN */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
              <div className="text-sm opacity-90 mb-1">Tổng Checklist</div>
              <div className="text-4xl font-bold">{totalStats.total}</div>
            </div>
            {Object.entries(totalStats.byTeam).map(([team, count]) => (
              <div
                key={team}
                className="bg-white p-6 rounded-xl shadow border-l-4"
                style={{ borderLeftColor: TEAM_CONFIG[team].color }}
              >
                <div className="text-sm text-gray-600 mb-1">{team}</div>
                <div className="text-3xl font-bold text-gray-800">{count}</div>
              </div>
            ))}
          </div>

          {/* Card công việc khác - GIỮ NGUYÊN */}
          {otherJobsStats.total > 0 && (
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 rounded-xl shadow-lg mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-1">
                    ✏️ Công Việc Khác
                  </div>
                  <div className="text-4xl font-bold">
                    {otherJobsStats.total}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90">Hoàn thành</div>
                  <div className="text-3xl font-bold">
                    {otherJobsStats.completionRate}%
                  </div>
                  <div className="text-xs opacity-75">
                    {otherJobsStats.completed}/{otherJobsStats.total} việc
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts - GIỮ NGUYÊN TẤT CẢ */}
          {filteredData.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    📊 Số Lượng Checklist
                  </h2>
                  <div style={{ height: "400px" }}>
                    <Bar
                      data={getEmployeeChecklistChart()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: "y",
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    📈 Tỷ Lệ Hoàn Thành (Chỉ công việc chính)
                  </h2>
                  <div style={{ height: "400px" }}>
                    <Bar
                      data={getCompletionRateChart()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: "y",
                        scales: {
                          x: {
                            stacked: true,
                            max: 100,
                            ticks: { callback: (value) => value + "%" },
                          },
                          y: { stacked: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  📋 Tổng Công Việc Chính - So Sánh Hoàn Thành vs Chưa Hoàn
                  Thành
                </h2>
                <div style={{ height: "400px" }}>
                  <Bar
                    data={getTotalJobsChart()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>

              {otherJobsStats.total > 0 && (
                <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    ✏️ Biểu Đồ Công Việc Khác
                  </h2>
                  <div style={{ height: "400px" }}>
                    <Bar
                      data={getOtherJobsChart()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: "y",
                        scales: {
                          x: { stacked: true, beginAtZero: true },
                          y: { stacked: true },
                        },
                        plugins: { legend: { position: "top" } },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Chi tiết công việc khác - GIỮ NGUYÊN */}
              <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  ✏️ Chi Tiết Công Việc Khác
                </h2>
                <div className="space-y-4">
                  {Object.entries(employeeStats).map(
                    ([teamName, employees]) => (
                      <div key={teamName}>
                        <h3
                          className="text-lg font-semibold mb-3 pb-2 border-b"
                          style={{ color: TEAM_CONFIG[teamName].color }}
                        >
                          {teamName}
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(employees).map(([empId, empData]) => {
                            const hasOtherJobs =
                              empData.otherJobs && empData.otherJobs.length > 0;
                            if (!hasOtherJobs) return null;

                            const isExpanded =
                              expandedEmployee === `${teamName}-${empId}`;

                            return (
                              <div
                                key={empId}
                                className="border rounded-lg overflow-hidden"
                              >
                                <button
                                  onClick={() =>
                                    setExpandedEmployee(
                                      isExpanded
                                        ? null
                                        : `${teamName}-${empId}`,
                                    )
                                  }
                                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium text-gray-800">
                                      {empData.name}
                                    </span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                      {empData.otherJobs.length} công việc
                                    </span>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp size={20} />
                                  ) : (
                                    <ChevronDown size={20} />
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="p-4 bg-white">
                                    <div className="space-y-2">
                                      {empData.otherJobs.map((job, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                                        >
                                          <div
                                            className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                              job.da_chon
                                                ? "bg-green-500"
                                                : "bg-gray-300"
                                            }`}
                                          />
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-800">
                                              {job.noidung}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              {formatDate(job.ngay_tao)}
                                            </p>
                                          </div>
                                          <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${
                                              job.da_chon
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-200 text-gray-600"
                                            }`}
                                          >
                                            {job.da_chon
                                              ? "Hoàn thành"
                                              : "Chưa làm"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl shadow text-center">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Không có dữ liệu
              </h3>
              <p className="text-gray-500">
                Vui lòng chọn khoảng thời gian khác
              </p>
            </div>
          )}
        </>
      )}

      {/* ========== VIEW 2: THEO QUY ĐỊNH ========== */}
      {selectedView === "schedule" && (
        <div className="space-y-6">
          {/* Stats Cards theo loại quy định */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(scheduleTypeStats).map(([type, stats]) => {
              const badge = getScheduleBadge(type);
              const rate =
                stats.total > 0
                  ? ((stats.completed / stats.total) * 100).toFixed(1)
                  : 0;

              return (
                <div
                  key={type}
                  className="bg-white p-6 rounded-xl shadow-lg border-l-4"
                  style={{
                    borderLeftColor: badge?.color
                      .replace("bg-", "")
                      .replace("-500", ""),
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{badge?.icon}</span>
                    <span
                      className={`px-2 py-1 ${badge?.color} text-white text-xs rounded-full`}
                    >
                      {badge?.text}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-800 mb-1">
                    {stats.total}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Tổng công việc
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${badge?.color}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {rate}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {stats.completed}/{stats.total} hoàn thành
                  </div>
                </div>
              );
            })}
          </div>

          {/* Biểu đồ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                📊 Phân bổ công việc theo quy định
              </h2>
              <div
                style={{ height: "300px" }}
                className="flex items-center justify-center"
              >
                <Doughnut
                  data={getScheduleTypePieChart()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom" },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label || "";
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce(
                              (a, b) => a + b,
                              0,
                            );
                            const percentage = ((value / total) * 100).toFixed(
                              1,
                            );
                            return `${label}: ${value} việc (${percentage}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                📈 Tỷ lệ hoàn thành theo loại
              </h2>
              <div style={{ height: "300px" }}>
                <Bar
                  data={getScheduleTypeCompletionChart()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true, beginAtZero: true },
                    },
                    plugins: { legend: { position: "top" } },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Giải thích quy định */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📖 Giải thích quy định
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["ngày", "tuần", "tháng", "phát_sinh"].map((type) => {
                const badge = getScheduleBadge(type);
                return (
                  <div
                    key={type}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                  >
                    <span
                      className={`${badge?.color} text-white px-3 py-1 rounded-full text-sm font-bold`}
                    >
                      {badge?.icon} {badge?.text}
                    </span>
                    <p className="text-sm text-gray-700 flex-1">
                      {badge?.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Công việc theo loại */}
          {Object.entries(jobsByScheduleType).map(([type, jobs]) => {
            if (jobs.length === 0) return null;
            const badge = getScheduleBadge(type);
            const completed = jobs.filter((j) => j.da_chon).length;
            const rate = ((completed / jobs.length) * 100).toFixed(1);

            return (
              <div key={type} className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <span
                      className={`${badge?.color} text-white px-3 py-1 rounded-full text-sm`}
                    >
                      {badge?.icon} {badge?.text}
                    </span>
                    <span className="text-gray-600 text-base">
                      ({jobs.length} công việc - {rate}% hoàn thành)
                    </span>
                  </h2>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {jobs.map((job, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${
                        job.da_chon
                          ? "bg-green-50 border-green-500"
                          : "bg-red-50 border-red-500"
                      }`}
                    >
                      <div
                        className={`mt-1 ${
                          job.da_chon ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {job.da_chon ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <AlertCircle size={20} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {job.noidung}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                          <span>👤 {job.employeeName}</span>
                          <span>📂 {job.section}</span>
                          <span>📅 {formatDate(job.date)}</span>
                          {job.quy_dinh?.ngay_trong_tuan && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {formatWeekDays(job.quy_dinh.ngay_trong_tuan)}
                            </span>
                          )}
                          {job.quy_dinh?.ngay_trong_thang && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              Ngày{" "}
                              {job.quy_dinh.ngay_trong_thang
                                .sort((a, b) => a - b)
                                .join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          job.da_chon
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {job.da_chon ? "✓ Xong" : "✗ Chưa"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== VIEW 3: ĐIỂM DANH HÔM NAY ========== */}
      {selectedView === "attendance" && (
        <div className="space-y-6">
          {/* Tổng quan điểm danh */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Đã check-in</span>
                <CheckCircle2 size={24} />
              </div>
              <div className="text-4xl font-bold">
                {
                  Object.values(employeeCheckStatus)
                    .flatMap((team) => Object.values(team))
                    .filter((e) => e.hasChecked).length
                }
              </div>
              <div className="text-sm opacity-90 mt-1">nhân viên</div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Chưa check-in</span>
                <AlertCircle size={24} />
              </div>
              <div className="text-4xl font-bold">
                {
                  Object.values(employeeCheckStatus)
                    .flatMap((team) => Object.values(team))
                    .filter((e) => !e.hasChecked).length
                }
              </div>
              <div className="text-sm opacity-90 mt-1">nhân viên</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Tỷ lệ check-in</span>
                <Clock size={24} />
              </div>
              <div className="text-4xl font-bold">
                {(() => {
                  const total = Object.values(employeeCheckStatus).flatMap(
                    (team) => Object.values(team),
                  ).length;
                  const checked = Object.values(employeeCheckStatus)
                    .flatMap((team) => Object.values(team))
                    .filter((e) => e.hasChecked).length;
                  return total > 0 ? Math.round((checked / total) * 100) : 0;
                })()}
                %
              </div>
              <div className="text-sm opacity-90 mt-1">hoàn thành</div>
            </div>
          </div>

          {/* Danh sách theo team */}
          {Object.entries(employeeCheckStatus).map(([teamName, employees]) => {
            const teamColor =
              TEAM_CONFIG[teamName]?.color || "rgba(156, 163, 175, 0.8)";
            const checked = Object.values(employees).filter(
              (e) => e.hasChecked,
            ).length;
            const total = Object.values(employees).length;
            const rate = total > 0 ? Math.round((checked / total) * 100) : 0;

            return (
              <div
                key={teamName}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                <div
                  className="p-4 border-l-4"
                  style={{ borderLeftColor: teamColor.replace("0.8", "1") }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {teamName}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {checked}/{total} đã check
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          rate === 100
                            ? "bg-green-100 text-green-700"
                            : rate >= 50
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {rate}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${rate}%`,
                        backgroundColor: teamColor.replace("0.8", "1"),
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(employees).map(([empId, empData]) => (
                      <div
                        key={empId}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          empData.hasChecked
                            ? "bg-green-50 border-green-300"
                            : "bg-red-50 border-red-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-lg ${
                                  empData.hasChecked
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {empData.hasChecked ? (
                                  <CheckCircle2 size={20} />
                                ) : (
                                  <AlertCircle size={20} />
                                )}
                              </span>
                              <span className="font-semibold text-gray-800">
                                {empData.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              Mã NV: {empId}
                            </p>

                            {empData.hasChecked ? (
                              <>
                                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                  <Clock size={14} />
                                  <span>
                                    {new Date(
                                      empData.checkTime,
                                    ).toLocaleTimeString("vi-VN")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                  <span className="text-xs text-gray-600">
                                    {empData.completedJobs}/{empData.totalJobs}{" "}
                                    công việc
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      empData.status === "Đi làm"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {empData.status}
                                  </span>
                                </div>
                                {empData.totalJobs > 0 && (
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-green-500 h-1.5 rounded-full transition-all"
                                      style={{
                                        width: `${
                                          (empData.completedJobs /
                                            empData.totalJobs) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  <AlertCircle size={12} />
                                  Chưa check-in hôm nay
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardBDH;
