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
import { Bar } from "react-chartjs-2";
import { Calendar, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement, 
  Title,
  Tooltip,
  Legend,
  ArcElement
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
  const datePickerRef = useRef(null);

  // Date utilities
  const formatDate = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
          end: endOfDay(new Date(customEndDate))
        };
      }
      const end = new Date();
      const start = selectedRange === "all" 
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
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
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
      
      // Fetch checklists
      const formIds = Object.values(TEAM_CONFIG).map(t => t.formId);
      const checklistPromises = formIds.map(formId =>
        checkListBDHService.getCheckListsByFormBDHId(formId).catch(() => [])
      );
      
      const results = await Promise.all(checklistPromises);
      setChecklists(results.flat().filter(Boolean));

      // Fetch employee names
      const employeeIds = Object.values(TEAM_CONFIG).flatMap(team => team.employees);
      const namePromises = employeeIds.map(async (empId) => {
        try {
          const result = await staffService.getStaff({ ma_nhan_vien: empId });
          return { id: empId, name: result?.ho_ten || `NV ${empId}` };
        } catch {
          return { id: empId, name: `NV ${empId}` };
        }
      });

      const names = await Promise.all(namePromises);
      setEmployeeNames(Object.fromEntries(names.map(({ id, name }) => [id, name])));

    } catch (error) {
      setError(`Lỗi khi tải dữ liệu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by date range
  const filteredData = useMemo(() => { 
    const { start, end } = getDateRange();
    return checklists.filter((item) => {
      const itemDate = new Date(item.ngay_tao || item.thoi_gian_tao || item.createdAt);
      return !isNaN(itemDate.getTime()) && itemDate >= start && itemDate <= end;
    });
  }, [checklists, getDateRange]);

  // Get team by employee
  const getTeamByEmployee = (employeeId) => {
    for (const [teamName, teamData] of Object.entries(TEAM_CONFIG)) {
      if (teamData.employees.includes(String(employeeId))) {
        return teamName;
      }
    }
    return "Khác";
  };

  // Calculate employee statistics
  const employeeStats = useMemo(() => {
    const stats = {};

    Object.entries(TEAM_CONFIG).forEach(([teamName, teamData]) => {
      stats[teamName] = {};
      
      teamData.employees.forEach(empId => {
        const empChecklists = filteredData.filter(item => 
          String(item.ma_nhan_vien) === String(empId)
        );

        let totalJobs = 0;
        let completedJobs = 0;
        const incompleteBySection = {};
        const otherJobsList = [];

        empChecklists.forEach(checklist => {
          // Regular jobs
          checklist.cac_muc?.forEach(muc => {
            const sectionName = muc.ten_muc || "Không có tiêu đề";
            muc.cong_viec?.forEach(job => {
              totalJobs++;
              if (job.da_chon) {
                completedJobs++;
              } else {
                incompleteBySection[sectionName] = (incompleteBySection[sectionName] || 0) + 1;
              }
            });
          });

          // Other jobs (cong_viec_khac)
          if (checklist.cong_viec_khac && Array.isArray(checklist.cong_viec_khac)) {
            checklist.cong_viec_khac.forEach(job => {
              if (job.noidung) {
                otherJobsList.push({
                  noidung: job.noidung,
                  da_chon: job.da_chon || false,
                  ngay_tao: checklist.ngay_tao || checklist.thoi_gian_tao || checklist.createdAt
                });
              }
            });
          }
        });

        stats[teamName][empId] = {
          name: employeeNames[empId] || `NV ${empId}`,
          checklistCount: empChecklists.length,
          totalJobs,
          completedJobs,
          incompleteJobs: totalJobs - completedJobs,
          completionRate: totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : 0,
          incompleteBySection,
          otherJobs: otherJobsList
        };
      });
    });

    return stats;
  }, [filteredData, employeeNames]);

  // Chart data generators
  const getEmployeeChecklistChart = () => {
    const labels = [];
    const data = [];
    const colors = [];

    Object.entries(employeeStats).forEach(([teamName, employees]) => {
      Object.values(employees).forEach(emp => {
        labels.push(emp.name);
        data.push(emp.checklistCount);
        colors.push(TEAM_CONFIG[teamName].color);
      });
    });

    return {
      labels,
      datasets: [{
        label: "Số lượng checklist",
        data,
        backgroundColor: colors,
      }]
    };
  };

  const getCompletionRateChart = () => {
    const labels = [];
    const completionData = [];
    const incompleteData = [];

    Object.values(employeeStats).forEach(employees => {
      Object.values(employees).forEach(emp => {
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
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
        {
          label: "Chưa hoàn thành (%)",
          data: incompleteData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        }
      ]
    };
  };

  const getTotalJobsChart = () => {
    const labels = [];
    const completedData = [];
    const incompleteData = [];

    Object.values(employeeStats).forEach(employees => {
      Object.values(employees).forEach(emp => {
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
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
        {
          label: "Chưa hoàn thành",
          data: incompleteData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        }
      ]
    };
  };

  // Total stats
  const totalStats = useMemo(() => {
    const stats = { total: filteredData.length, byTeam: {} };
    Object.keys(TEAM_CONFIG).forEach(team => { stats.byTeam[team] = 0; });
    filteredData.forEach(item => {
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-800">📊 Dashboard Checklist BĐH</h1>
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

        {/* Date Range Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          {[7, 30].map(days => (
            <button
              key={days}
              onClick={() => setSelectedRange(days)}
              className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
                selectedRange === days 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {days} ngày
            </button>
          ))}
          <button
            onClick={() => setSelectedRange("all")}
            className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
              selectedRange === "all" 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tất cả
          </button>
          
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowCustomDate(!showCustomDate)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors ${
                selectedRange === "custom" 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar size={18} />
              Tùy chỉnh
            </button>
            
            {showCustomDate && (
              <div className="absolute z-50 mt-2 right-0 bg-white shadow-lg rounded-lg border p-4 w-80">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Chọn khoảng thời gian</h3>
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

      {/* Stats Cards */}
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
    
      {/* Charts */}
      {filteredData.length > 0 ? (
        <div className="space-y-6">
          {/* Row 1: Checklist count and completion rate */}
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
                    indexAxis: 'y',
                    plugins: { legend: { display: false } }
                  }}
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                📈 Tỷ Lệ Hoàn Thành
              </h2>
              <div style={{ height: "400px" }}>
                <Bar
                  data={getCompletionRateChart()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                      x: {
                        stacked: true,
                        max: 100,
                        ticks: { callback: (value) => value + '%' }
                      },
                      y: { stacked: true }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Total jobs */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📋 Tổng Công Việc - So Sánh Hoàn Thành vs Chưa Hoàn Thành
            </h2>
            <div style={{ height: "400px" }}>
              <Bar
                data={getTotalJobsChart()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                  }
                }}
              />
            </div>
          </div>

          {/* Row 3: Other Jobs (Công việc khác) */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              ✏️ Công Việc Khác
            </h2>
            <div className="space-y-4">
              {Object.entries(employeeStats).map(([teamName, employees]) => (
                <div key={teamName}>
                  <h3 className="text-lg font-semibold mb-3 pb-2 border-b" style={{ color: TEAM_CONFIG[teamName].color }}>
                    {teamName}
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(employees).map(([empId, empData]) => {
                      const hasOtherJobs = empData.otherJobs && empData.otherJobs.length > 0;
                      if (!hasOtherJobs) return null;

                      const isExpanded = expandedEmployee === `${teamName}-${empId}`;

                      return (
                        <div key={empId} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedEmployee(isExpanded ? null : `${teamName}-${empId}`)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-800">{empData.name}</span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {empData.otherJobs.length} công việc
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                          
                          {isExpanded && (
                            <div className="p-4 bg-white">
                              <div className="space-y-2">
                                {empData.otherJobs.map((job, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                                  >
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                      job.da_chon ? 'bg-green-500' : 'bg-gray-300'
                                    }`} />
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-800">{job.noidung}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {formatDate(job.ngay_tao)}
                                      </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      job.da_chon 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                      {job.da_chon ? 'Hoàn thành' : 'Chưa làm'}
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
              ))}
              
              {/* Show message if no other jobs */}
              {Object.values(employeeStats).every(employees => 
                Object.values(employees).every(emp => !emp.otherJobs || emp.otherJobs.length === 0)
              ) && (
                <div className="text-center py-8 text-gray-500">
                  <p>Không có công việc khác nào được ghi nhận</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Không có dữ liệu</h3>
          <p className="text-gray-500">Vui lòng chọn khoảng thời gian khác</p>
        </div>
      )}
    </div>
  );
};

export default DashboardBDH;