import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { checkKPIService } from "@/services/checkkpistaff.service";

const images = ["/img/pic1.jpg", "/img/pic2.webp", "/img/pic3.jpg"];

const HomeBDH = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [availableYears, setAvailableYears] = useState([]);
  const [yearStatsMap, setYearStatsMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  // Slideshow nền
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentImage((p) => (p + 1) % images.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Lấy danh sách các năm có dữ liệu KPI từ API và thống kê
  const fetchAvailableYears = async () => {
    try {
      setLoading(true);
      
      // Gọi API một lần duy nhất
      const response = await checkKPIService.getAllCheckKPI();
      
      let allCheckKPI = [];
      if (response && response.data && Array.isArray(response.data)) {
        allCheckKPI = response.data;
      } else if (Array.isArray(response)) {
        allCheckKPI = response;
      }

      
      // Lấy các năm thực tế có dữ liệu
      const actualYearsWithData = [...new Set(allCheckKPI.map(kpi => kpi.nam).filter(nam => nam))];
      
      // Tạo danh sách năm hiển thị (bao gồm cả năm có dữ liệu + năm hiện tại/tương lai)
      const currentYear = new Date().getFullYear();
      const importantYears = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
      
      // Kết hợp các năm có dữ liệu với các năm quan trọng
      const allYears = [...new Set([...actualYearsWithData, ...importantYears])];
      const sortedYears = allYears.sort((a, b) => b - a);
      

      // Tính thống kê cho từng năm
      const statsMap = new Map();
      sortedYears.forEach(year => {
        const yearData = allCheckKPI.filter(kpi => kpi.nam === year);
        
        if (yearData.length > 0) {
          const uniqueStaff = new Set(yearData.map(kpi => kpi.ma_nhan_vien)).size;
          const uniqueQuarters = new Set(yearData.map(kpi => kpi.quy)).size; // ✅ ĐỔI: quarters thay vì months
          const totalRecords = yearData.length;
          
          // Tính trung bình tỷ trọng
          const validWeights = yearData
            .map(kpi => Number(kpi.ty_trong_quy) || 0) // ✅ ĐỔI: ty_trong_quy thay vì ty_trong_thang
            .filter(weight => weight > 0);
          const averageWeight = validWeights.length > 0 
            ? Math.round((validWeights.reduce((sum, w) => sum + w, 0) / validWeights.length) * 100) / 100
            : 0;

          statsMap.set(year, {
            staffCount: uniqueStaff,
            quarterCount: uniqueQuarters, // ✅ ĐỔI: quarterCount thay vì monthCount
            totalRecords,
            averageWeight,
            hasData: true
          });
        } else {
          // Năm không có dữ liệu
          statsMap.set(year, {
            staffCount: 0,
            quarterCount: 0, // ✅ ĐỔI
            totalRecords: 0,
            averageWeight: 0,
            hasData: false
          });
        }
      });
      
      setAvailableYears(sortedYears);
      setYearStatsMap(statsMap);

    } catch (error) {
      console.error("Lỗi khi lấy danh sách năm:", error);
      
      // Fallback: hiển thị năm hiện tại và 3 năm tiếp theo
      const currentYear = new Date().getFullYear();
      const fallbackYears = [currentYear + 3, currentYear + 2, currentYear + 1, currentYear];
      setAvailableYears(fallbackYears);
      
      const fallbackStatsMap = new Map();
      fallbackYears.forEach(year => {
        fallbackStatsMap.set(year, {
          staffCount: 0,
          quarterCount: 0, // ✅ ĐỔI
          totalRecords: 0,
          averageWeight: 0,
          hasData: false
        });
      });
      setYearStatsMap(fallbackStatsMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  // Tính toán yearList dựa trên dữ liệu từ API
  const yearList = useMemo(() => {
    return availableYears;
  }, [availableYears]);

  // Helper function để lấy stats của năm
  const getYearStats = (year) => {
    return yearStatsMap.get(year) || {
      staffCount: 0,
      quarterCount: 0, // ✅ ĐỔI
      totalRecords: 0,
      averageWeight: 0,
      hasData: false
    };
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background slideshow */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-[background-image,transform,filter] duration-700"
        style={{
          backgroundImage: `url(${images[currentImage]})`,
          filter: "blur(2px)",
          transform: "scale(1.04)",
        }}
        aria-hidden="true"
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60"
        aria-hidden="true"
      />

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-10 sm:pt-24">
        <header className="mb-8 sm:mb-10 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            KPI Ban Điều Hành {/* ✅ ĐỔI */}
          </h1>
          <p className="mt-2 text-white/85">
            {loading 
              ? "Đang tải danh sách năm..." 
              : `Có ${yearList.length} năm dữ liệu KPI. Chọn năm để xem và chấm KPI theo từng quý.` // ✅ ĐỔI: quý thay vì tháng
            }
          </p>
        </header>

        {/* Loading skeleton cho cards */}
        {loading && (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="h-44 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] animate-pulse"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="rounded-full border border-white/25 px-3 py-1 bg-white/20 h-6 w-12"></div>
                </div>
                <div className="bg-white/30 h-6 w-20 rounded mb-2"></div>
                <div className="bg-white/20 h-4 w-full rounded mb-1"></div>
                <div className="bg-white/20 h-4 w-3/4 rounded"></div>
                <div className="mt-5 flex items-center justify-between">
                  <div className="bg-white/20 h-4 w-16 rounded"></div>
                  <div className="bg-white/20 h-6 w-20 rounded-lg"></div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Cards năm - chỉ hiển thị khi không loading */}
        {!loading && (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {yearList.map((y) => {
              const currentYear = new Date().getFullYear();
              const isCurrentYear = y === currentYear;
              const isFutureYear = y > currentYear;
              const stats = getYearStats(y);
              
              const Card = (
                <div
                  className="group relative h-full rounded-2xl border border-white/15
                             bg-white/10 backdrop-blur-md p-5 sm:p-6
                             shadow-[0_10px_30px_rgba(0,0,0,0.25)]
                             transition
                             hover:bg-white/15 hover:shadow-[0_16px_44px_rgba(0,0,0,0.35)]
                             focus-within:ring-2 focus-within:ring-white/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-wider ${
                      isCurrentYear 
                        ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-200' 
                        : isFutureYear
                        ? 'border-blue-400/50 bg-blue-400/20 text-blue-200'
                        : stats.hasData
                        ? 'border-green-400/50 bg-green-400/20 text-green-200'
                        : 'border-white/25 text-white/80'
                    }`}>
                      {isCurrentYear ? 'Hiện tại' : isFutureYear ? 'Tương lai' : stats.hasData ? 'Có dữ liệu' : 'Trống'}
                    </span>
                    <span className="text-xs text-white/75 opacity-0 transition-opacity group-hover:opacity-100">
                      Chi tiết →
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-semibold text-white">
                    Năm {y}
                  </h2>
                  <p className="mt-2 text-sm text-white/85">
                    {stats.hasData ? (
                      <>
                        <span className="font-semibold text-emerald-200">{stats.staffCount}</span> nhân viên, {' '}
                        <span className="font-semibold text-blue-200">{stats.quarterCount}</span> quý {/* ✅ ĐỔI: quý thay vì tháng */}
                        {stats.averageWeight > 0 && (
                          <>, TB: <span className="font-semibold text-yellow-200">{stats.averageWeight}%</span></>
                        )}
                      </>
                    ) : (
                      isCurrentYear 
                        ? `Bắt đầu quản lý KPI Ban Điều Hành năm ${y}.` // ✅ ĐỔI
                        : isFutureYear
                        ? `Chuẩn bị dữ liệu KPI cho năm ${y}.`
                        : `Chưa có dữ liệu KPI năm ${y}.`
                    )}
                  </p>

                  <div className="mt-5 flex items-center justify-between text-xs">
                    <div className="text-white/75">
                      {stats.hasData ? (
                        <span><span className="font-semibold text-white">{stats.totalRecords}</span> bản ghi</span>
                      ) : (
                        <span>Kỳ: <span className="font-semibold text-white">4 quý</span></span> // ✅ ĐỔI: 4 quý thay vì 12 tháng
                      )}
                    </div>
                    <div className={`rounded-lg px-2.5 py-1 text-white/85 ${
                      isCurrentYear 
                        ? 'bg-emerald-500/35' 
                        : isFutureYear
                        ? 'bg-blue-500/35'
                        : stats.hasData
                        ? 'bg-green-500/35'
                        : 'bg-black/35'
                    }`}>
                      <span className="font-semibold text-white">
                        {isCurrentYear ? 'Đang diễn ra' : isFutureYear ? 'Sắp mở' : stats.hasData ? 'Có dữ liệu' : 'Trống'}
                      </span>
                    </div>
                  </div>
                </div>
              );

              return (
                <Link
                  key={y}
                  to={`/kpi/homestaff/ban-dieu-hanh/table/${y}`} // ✅ ĐỔI: URL route
                  aria-label={`Mở KPI Ban Điều Hành năm ${y}`} // ✅ ĐỔI
                  className="outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
                >
                  {Card}
                </Link>
              );
            })}
          </section>
        )}

        {/* Empty state nếu không có dữ liệu */}
        {!loading && yearList.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/10 rounded-full mx-auto flex items-center justify-center mb-6">
              <span className="text-4xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Chưa có dữ liệu KPI</h3>
            <p className="text-white/75 mb-6 max-w-md mx-auto">
              Hệ thống chưa có dữ liệu KPI nào. Hãy bắt đầu bằng cách tạo KPI cho năm hiện tại.
            </p>
            <button
              onClick={fetchAvailableYears}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/25 text-white px-6 py-3 rounded-2xl font-medium backdrop-blur-md transition-all duration-200 hover:shadow-lg"
            >
              <span>🔄</span>
              Tải lại dữ liệu
            </button>
          </div>
        )}

        {/* Slideshow dots */}
        <div className="mt-8 flex items-center gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImage(idx)}
              aria-label={`Chuyển ảnh ${idx + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition 
                ${idx === currentImage ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>

        {/* Điều hướng khác (nếu cần) */}
        <div className="mt-6">
          <Link
            to="/kpi/homestaff"
            className="inline-block rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-white/90 backdrop-blur-md transition hover:bg-white/15"
          >
            ← Về trang KPI tổng
          </Link>
        </div>       
      </main>
    </div>
  );
};

export default HomeBDH;