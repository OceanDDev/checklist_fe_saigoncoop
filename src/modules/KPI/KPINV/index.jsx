import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const images = ["/img/pic1.jpg", "/img/pic2.webp", "/img/pic3.jpg"];

const departments = [
  { key: "xuat",  title: "XUẤT HÀNG",  desc: "Theo dõi đơn xuất, đối chiếu phiếu xuất.", to: "/kpi/homestaff/xuat-hang" },
  { key: "nhap",  title: "NHẬP HÀNG",  desc: "Tiếp nhận, kiểm đếm, nhập kho theo quy trình.", to: "/kpi/homestaff/nhap-hang" },
  { key: "hotro", title: "HỖ TRỢ KHO", desc: "Điều phối, sắp xếp, kiểm tra tồn.",            to: "/kpi/homestaff/ho-tro-kho" },
  { key: "ketoan",title: "KẾ TOÁN",    desc: "Đối soát chứng từ, báo cáo thuế/kế toán.",     to: "/kpi/homestaff/homeKeToan" },
];

const HomeStaffKPI = () => {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => { 
    const id = setInterval(() => {
      setCurrentImage((p) => (p + 1) % images.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

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
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60" aria-hidden="true" />

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-10 sm:pt-24">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            KPI Bộ phận
          </h1>
          <p className="mt-2 text-white/85">
            Chọn bộ phận để vào màn hình chấm/đối soát KPI theo tháng.
          </p>
        </header>

        {/* Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {departments.map((d) => {
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
                  <span className="rounded-full border border-white/25 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80">
                    KPI
                  </span>
                  <span className="text-xs text-white/75 opacity-0 transition-opacity group-hover:opacity-100">
                    Chi tiết →
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  {d.title}
                </h2>
                <p className="mt-2 text-sm text-white/85">{d.desc}</p>

                <div className="mt-5 flex items-center justify-between text-xs">
                  <div className="text-white/75">
                    Tháng hiện tại: <span className="font-semibold text-white">—</span>
                  </div>
                  <div className="rounded-lg bg-black/35 px-2.5 py-1 text-white/85">
                    Trạng thái: <span className="font-semibold text-white">Đang mở</span>
                  </div>
                </div>
              </div>
            );

            // Ưu tiên Link nếu có route
            return d.to ? (
              <Link
                key={d.key}
                to={d.to}
                className="outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
              >
                {Card}
              </Link>
            ) : (
              <button
                key={d.key}
                type="button"
                className="text-left outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
                onClick={() => console.log("Go to:", d.key)}
              >
                {Card}
              </button>
            );
          })}
        </section>

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
      </main>
    </div>
  );
};

export default HomeStaffKPI;
