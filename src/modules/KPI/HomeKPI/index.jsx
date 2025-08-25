import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const images = ["/img/pic1.jpg", "/img/pic2.webp", "/img/pic3.jpg"];

const HomeKPI = () => {
  const [currentImage, setCurrentImage] = useState(0);

  // Auto change background
  useEffect(() => {
    const interval = setInterval(
      () => setCurrentImage((prev) => (prev + 1) % images.length),
      5000
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-svh flex items-center justify-center overflow-hidden">
      {/* Background slideshow */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-[background-image,transform,filter] duration-700"
        style={{ backgroundImage: `url(${images[currentImage]})`, filter: "blur(2px)", transform: "scale(1.04)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60" aria-hidden="true" />

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-4xl w-full px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* KPI BDH */}
          <Link
            to="/kpi/bdh"
            className="outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
          >
            <div
              className="group relative h-full rounded-2xl border border-white/15
                         bg-white/10 backdrop-blur-md p-8
                         shadow-[0_10px_30px_rgba(0,0,0,0.25)]
                         transition
                         hover:bg-white/15 hover:shadow-[0_16px_44px_rgba(0,0,0,0.35)]
                         focus-within:ring-2 focus-within:ring-white/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full border border-white/25 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80">
                  KPI
                </span>
                <span className="text-xs text-white/75 opacity-0 transition-opacity group-hover:opacity-100">
                  Chi tiết →
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="text-5xl mb-4 drop-shadow">📊</div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  KPI Ban Điều Hành (BDH)
                </h2>
                <p className="text-white/85 mt-3">
                  Quản lý và đánh giá KPI cho ban điều hành.
                </p>
              </div>
            </div>
          </Link>

          {/* KPI Nhân viên */}
          <Link
            to="/kpi/homestaff"
            className="outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
          >
            <div
              className="group relative h-full rounded-2xl border border-white/15
                         bg-white/10 backdrop-blur-md p-8
                         shadow-[0_10px_30px_rgba(0,0,0,0.25)]
                         transition
                         hover:bg-white/15 hover:shadow-[0_16px_44px_rgba(0,0,0,0.35)]
                         focus-within:ring-2 focus-within:ring-white/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full border border-white/25 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80">
                  KPI
                </span>
                <span className="text-xs text-white/75 opacity-0 transition-opacity group-hover:opacity-100">
                  Chi tiết →
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="text-5xl mb-4 drop-shadow">📈</div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  KPI Nhân Viên
                </h2>
                <p className="text-white/85 mt-3">
                  Theo dõi và đánh giá hiệu suất làm việc của nhân viên.
                </p>

                
              </div>
            </div>
          </Link>
        </div>

        {/* Slideshow dots */}
        <div className="mt-8 flex items-center justify-center gap-2">
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
      </main>
    </div>
  );
};

export default HomeKPI;
