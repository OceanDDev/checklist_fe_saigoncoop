import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const images = ["/img/pic1.jpg", "/img/pic2.webp", "/img/pic3.jpg"];

const HomeKPI = () => {
  const [currentImage, setCurrentImage] = useState(0);

  // Tự động đổi ảnh nền
  useEffect(() => {
    const interval = setInterval(
      () => setCurrentImage((prev) => (prev + 1) % images.length),
      5000
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-svh flex items-center justify-center overflow-hidden">
      {/* Slideshow nền */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm brightness-75 transition-[background-image] duration-700 ease-in-out"
        style={{ backgroundImage: `url(${images[currentImage]})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40"></div>

      {/* Nội dung */}
      <div className="relative z-10 py-10 px-4 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl w-full">
          {/* KPI BDH */}
          <Link
            to="/kpi/bdh"
            className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-md p-6 md:p-8 text-center transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
          >
            <div className="flex flex-col items-center">
              <div className="text-4xl mb-3 drop-shadow">🧑‍💼</div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                KPI Ban Điều Hành (BDH)
              </h2>
              <p className="text-gray-700 mt-2">
                Quản lý và đánh giá KPI cho ban điều hành.
              </p>
            </div>
          </Link>

          {/* KPI Nhân viên */}
          <Link
            to="/kpi/homestaff"
            className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-md p-6 md:p-8 text-center transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
          >
            <div className="flex flex-col items-center">
              <div className="text-4xl mb-3 drop-shadow">👨‍🏭</div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                KPI Nhân Viên
              </h2>
              <p className="text-gray-700 mt-2">
                Theo dõi và đánh giá hiệu suất làm việc của nhân viên.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeKPI;
