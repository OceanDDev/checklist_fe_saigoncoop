import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { checkKPIService } from "@/services/checkkpistaff.service";

const images = ["/img/pic1.jpg", "/img/pic2.webp", "/img/pic3.jpg"];

const HomeHoTro = () => {
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

  // Lấy danh sách các năm có dữ liệu KPI
  const fetchAvailableYears = async () => {
    try {
      setLoading(true);
      const response = await checkKPIService.getAllCheckKPI();

      let allCheckKPI = [];
      if (response && response.data && Array.isArray(response.data)) {
        allCheckKPI = response.data;
      } else if (Array.isArray(response)) {
        allCheckKPI = response;
      }

      const actualYearsWithData = [
        ...new Set(allCheckKPI.map((kpi) => kpi.nam).filter((nam) => nam)),
      ];

      const currentYear = new Date().getFullYear();
      const importantYears = [
        currentYear,
        currentYear + 1,
        currentYear + 2,
        currentYear + 3,
      ];

      const allYears = [
        ...new Set([...actualYearsWithData, ...importantYears]),
      ];
      const sortedYears = allYears.sort((a, b) => b - a);

      const statsMap = new Map();
      sortedYears.forEach((year) => {
        const yearData = allCheckKPI.filter((kpi) => kpi.nam === year);

        if (yearData.length > 0) {
          const uniqueStaff = new Set(
            yearData.map((kpi) => kpi.ma_nhan_vien)
          ).size;
          const uniqueMonths = new Set(yearData.map((kpi) => kpi.thang)).size;
          const totalRecords = yearData.length;

          const validWeights = yearData
            .map((kpi) => Number(kpi.ty_trong_thang) || 0)
            .filter((weight) => weight > 0);
          const averageWeight =
            validWeights.length > 0
              ? Math.round(
                  (validWeights.reduce((sum, w) => sum + w, 0) /
                    validWeights.length) *
                    100
                ) / 100
              : 0;

          statsMap.set(year, {
            staffCount: uniqueStaff,
            monthCount: uniqueMonths,
            totalRecords,
            averageWeight,
            hasData: true,
          });
        } else {
          statsMap.set(year, {
            staffCount: 0,
            monthCount: 0,
            totalRecords: 0,
            averageWeight: 0,
            hasData: false,
          });
        }
      });

      setAvailableYears(sortedYears);
      setYearStatsMap(statsMap);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách năm:", error);

      const currentYear = new Date().getFullYear();
      const fallbackYears = [
        currentYear + 3,
        currentYear + 2,
        currentYear + 1,
        currentYear,
      ];
      setAvailableYears(fallbackYears);

      const fallbackStatsMap = new Map();
      fallbackYears.forEach((year) => {
        fallbackStatsMap.set(year, {
          staffCount: 0,
          monthCount: 0,
          totalRecords: 0,
          averageWeight: 0,
          hasData: false,
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

  const yearList = useMemo(() => {
    return availableYears;
  }, [availableYears]);

  const getYearStats = (year) => {
    return (
      yearStatsMap.get(year) || {
        staffCount: 0,
        monthCount: 0,
        totalRecords: 0,
        averageWeight: 0,
        hasData: false,
      }
    );
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
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60"
        aria-hidden="true"
      />

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-10 sm:pt-24">
        <header className="mb-8 sm:mb-10 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            KPI Hỗ Trợ Kho
          </h1>
          <p className="mt-2 text-white/85">
            {loading
              ? "Đang tải danh sách năm..."
              : `Có ${yearList.length} năm dữ liệu KPI. Chọn năm để xem và chấm KPI theo từng tháng.`}
          </p>
        </header>

        {/* Cards năm */}
        {!loading && (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {yearList.map((y) => {
              const currentYear = new Date().getFullYear();
              const isCurrentYear = y === currentYear;
              const isFutureYear = y > currentYear;
              const stats = getYearStats(y);

              return (
                <Link
                  key={y}
                  to={`/kpi/homestaff/homeHoTro/table/${y}`}
                  aria-label={`Mở KPI Hỗ Trợ Kho năm ${y}`}
                  className="outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
                >
                  <div
                    className="group relative h-full rounded-2xl border border-white/15
                               bg-white/10 backdrop-blur-md p-5 sm:p-6
                               shadow-[0_10px_30px_rgba(0,0,0,0.25)]
                               transition
                               hover:bg-white/15 hover:shadow-[0_16px_44px_rgba(0,0,0,0.35)]
                               focus-within:ring-2 focus-within:ring-white/40"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80">
                        {isCurrentYear
                          ? "Hiện tại"
                          : isFutureYear
                          ? "Tương lai"
                          : stats.hasData
                          ? "Có dữ liệu"
                          : "Trống"}
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
                          <span className="font-semibold text-emerald-200">
                            {stats.staffCount}
                          </span>{" "}
                          nhân viên,{" "}
                          <span className="font-semibold text-blue-200">
                            {stats.monthCount}
                          </span>{" "}
                          tháng
                        </>
                      ) : isCurrentYear ? (
                        `Bắt đầu quản lý KPI Hỗ Trợ Kho năm ${y}.`
                      ) : isFutureYear ? (
                        `Chuẩn bị dữ liệu KPI cho năm ${y}.`
                      ) : (
                        `Chưa có dữ liệu KPI năm ${y}.`
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
};

export default HomeHoTro;
