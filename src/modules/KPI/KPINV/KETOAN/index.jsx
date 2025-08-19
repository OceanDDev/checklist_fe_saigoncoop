/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const images = ["/img/pic1.jpg", "/img/pic2.webp", "/img/pic3.jpg"];

const HomeKeToan = () => {
  const [currentImage, setCurrentImage] = useState(0);

  // Slideshow nền
  useEffect(() => {
    const interval = setInterval(
      () => setCurrentImage((prev) => (prev + 1) % images.length),
      5000
    );
    return () => clearInterval(interval);
  }, []);

  // 4 năm liên tiếp kể từ năm hiện tại
  const yearList = useMemo(() => {
    const start = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, i) => start + i);
  }, []);

  return (
    <div className="relative min-h-svh flex items-center justify-center overflow-hidden">
      {/* Slideshow nền */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm brightness-75 transition-[background-image] duration-700 ease-in-out"
        style={{ backgroundImage: `url(${images[currentImage]})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />

      {/* Nội dung */}
      <div className="relative z-10 py-10 px-4 flex items-center justify-center w-full">
        <div className="max-w-5xl w-full">
          {/* Tiêu đề */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-white drop-shadow">
              KPI Kế Toán
            </h1>
            <p className="text-white/90 mt-2">Chọn năm để xem và chấm KPI</p>
          </div>

          {/* Lưới các năm */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {yearList.map((y) => (
              <Link
                key={y}
                to={`/kpi/homestaff/homeKeToan/table`}
                aria-label={`Mở KPI Kế Toán năm ${y}`}
                className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-md p-5 md:p-6 text-center transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
              >
                <div className="flex flex-col items-center">
                  <div className="text-4xl mb-3 drop-shadow">📅</div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    Năm {y}
                  </h2>
                  <p className="text-gray-700 mt-1">Xem & chấm KPI năm {y}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Điều hướng khác (nếu cần) */}
          <div className="mt-8 text-center">
            <Link
              to="/kpi/homestaff"
              className="inline-block bg-white/85 hover:bg-white text-gray-900 px-5 py-2 rounded-xl shadow border border-white/40 transition"
            >
              ← Về trang KPI tổng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeKeToan;
