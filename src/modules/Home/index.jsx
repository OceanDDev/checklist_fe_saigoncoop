import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";

const images = ["/img/pic1.jpg", "/img/pic2.webp", "/img/pic3.jpg"];

const Home = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  // Preload images to avoid flicker
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Auto-rotate every 5s
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((p) => (p + 1) % images.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Inline style only for dynamic background image
  const bgStyle = useMemo(
    () => ({ backgroundImage: `url(${images[current]})` }),
    [current]
  );

  const cardBase =
    "cursor-pointer bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-md p-6 md:p-8 text-center transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  const iconBase = "w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 drop-shadow";
  const titleBase = "text-xl md:text-2xl font-semibold text-gray-900";

  return (
    <div className="relative min-h-svh grid place-items-center overflow-hidden">
      {/* Background slideshow */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm brightness-75 will-change-transform transition-[background-image] duration-700 ease-in-out"
        style={bgStyle}
        aria-hidden
      />

      {/* Subtle gradient overlay for consistent contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" aria-hidden />

      {/* Content */}
      <main className="relative z-10 w-full max-w-5xl px-4 md:px-6 lg:px-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Card: Nhà Kho */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/checklist")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/checklist")}
            className={cardBase}
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/2490/2490363.png"
              alt="Nhà Kho"
              className={iconBase}
              loading="lazy"
              decoding="async"
            />
            <h2 className={titleBase}>Nhà Kho</h2>
          </div>

          {/* Card: Ban Điều Hành */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/checklistbdh")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/checklistbdh")}
            className={cardBase}
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/552/552848.png"
              alt="Ban Điều Hành"
              className={iconBase}
              loading="lazy"
              decoding="async"
            />
            <h2 className={titleBase}>Ban Điều Hành</h2>
          </div>
        </section>
      </main>
    </div>
  );
}


export default Home;
