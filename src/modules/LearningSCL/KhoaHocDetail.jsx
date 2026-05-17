/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { learningService } from "@/services/leaning.service";
import * as pdfjsLib from "pdfjs-dist";
import * as mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── Utils ────────────────────────────────────────────────────────────────────
const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return match?.[2]?.length === 11
    ? `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1`
    : null;
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = memo(({ size = "md" }) => {
  const cls = size === "sm" ? "w-5 h-5" : "w-8 h-8";
  return (
    <div className="flex items-center justify-center h-full min-h-[120px]">
      <div className={`${cls} border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin`} />
    </div>
  );
});

// ─── Word Viewer ──────────────────────────────────────────────────────────────
const WordViewer = memo(({ url }) => {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then((result) => {
        if (!cancelled) { setHtml(result.value); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) { setError("Không đọc được file: " + err.message); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <Spinner />;
  if (error) return <div className="text-center py-12 text-red-400 text-sm">{error}</div>;
  return (
    <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-2xl">
      <div
        className="prose prose-base max-w-none text-slate-900"
        style={{ fontFamily: "Georgia, serif", lineHeight: 1.9 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});

// ─── Thumbnail Canvas ─────────────────────────────────────────────────────────
const ThumbCanvas = memo(({ pdf, index, active, onClick }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!pdf || !ref.current) return;
    let task;
    pdf.getPage(index).then((p) => {
      if (!ref.current) return;
      const vp = p.getViewport({ scale: 0.18 });
      const c = ref.current;
      c.width = vp.width;
      c.height = vp.height;
      task = p.render({ canvasContext: c.getContext("2d"), viewport: vp });
    });
    return () => task?.cancel?.();
  }, [pdf, index]);

  return (
    <button
      onClick={onClick}
      aria-label={`Trang ${index}`}
      className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
        active
          ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-105"
          : "border-transparent opacity-40 hover:opacity-70"
      }`}
    >
      <canvas ref={ref} />
    </button>
  );
});

// ─── PDF Slide Viewer ─────────────────────────────────────────────────────────
const PDFSlideViewer = memo(({ src, onFullscreenRequest, onPageChange }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setLoading(true);
    setPdf(null);
    setPage(1);
    pdfjsLib.getDocument(src).promise.then((doc) => {
      if (!cancelled) { setPdf(doc); setTotal(doc.numPages); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [src]);

  const renderPage = useCallback(async (n) => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    renderTaskRef.current?.cancel();
    const p = await pdf.getPage(n);
    // Auto-fit width to container for both mobile & desktop
    const containerWidth = containerRef.current.clientWidth - 16;
    const baseVp = p.getViewport({ scale: 1 });
    const scale = Math.max(containerWidth / baseVp.width, 1.2);
    const vp = p.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.width = vp.width;
    canvas.height = vp.height;
    const task = p.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
    renderTaskRef.current = task;
    await task.promise.catch(() => {});
  }, [pdf]);

  useEffect(() => { renderPage(page); }, [page, renderPage]);

  // Re-render on resize (orientation change on mobile)
  useEffect(() => {
    const ro = new ResizeObserver(() => renderPage(page));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [page, renderPage]);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(total, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [total]);

  const goNext = useCallback(() => setPage((p) => Math.min(total, p + 1)), [total]);
  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);

  // Notify parent of page changes
  useEffect(() => { onPageChange?.(page); }, [page, onPageChange]);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative group bg-slate-950 rounded-xl sm:rounded-2xl overflow-hidden flex justify-center shadow-2xl border border-slate-800/40 -mx-4 sm:mx-0"
      >
        <div className="overflow-auto w-full flex justify-center">
          <canvas ref={canvasRef} className="max-w-full" style={{ display: "block" }} />
        </div>

        {/* Fullscreen button — always visible on mobile, hover on desktop */}
        {onFullscreenRequest && (
          <button
            onClick={onFullscreenRequest}
            title="Xem toàn màn hình"
            className="absolute top-2 right-2 z-10 bg-slate-900/85 hover:bg-slate-800 backdrop-blur text-slate-300 hover:text-white border border-slate-700/60 rounded-xl px-2.5 py-2 text-sm font-bold transition-all sm:opacity-0 sm:group-hover:opacity-100 opacity-100 active:scale-95 flex items-center gap-1.5 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="hidden sm:inline text-xs">Phóng to</span>
          </button>
        )}

        {/* Side nav arrows — desktop hover only */}
        <button
          onClick={goPrev}
          disabled={page <= 1}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-900/70 hover:bg-slate-800 backdrop-blur text-white rounded-full w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-all shadow-lg border border-slate-700/40 active:scale-90 text-lg"
        >‹</button>
        <button
          onClick={goNext}
          disabled={page >= total}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900/70 hover:bg-slate-800 backdrop-blur text-white rounded-full w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-all shadow-lg border border-slate-700/40 active:scale-90 text-lg"
        >›</button>

        {/* Page badge bottom-left */}
        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur border border-slate-700/40 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-400">
          <span className="text-white font-bold">{page}</span>
          <span className="text-slate-600 mx-1">/</span>
          <span>{total}</span>
        </div>
      </div>

      {/* Navigation bar — desktop only (mobile uses swipe area below) */}
      <div className="hidden sm:flex items-center justify-between bg-slate-800/50 backdrop-blur rounded-xl px-4 py-2.5 border border-slate-700/30">
        <button
          onClick={goPrev}
          disabled={page <= 1}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-all px-3 py-1.5 rounded-lg hover:bg-slate-700 active:scale-95"
        >
          ← Trước
        </button>
        <span className="text-sm text-slate-400 font-mono">
          <span className="text-white font-bold">{page}</span>
          <span className="text-slate-600 mx-1">/</span>
          <span>{total}</span>
        </span>
        <button
          onClick={goNext}
          disabled={page >= total}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-all px-3 py-1.5 rounded-lg hover:bg-slate-700 active:scale-95"
        >
          Sau →
        </button>
      </div>

      {/* Mobile slide navigation */}
      <div className="flex sm:hidden items-center gap-2 -mx-4 px-4 py-1">
        <button
          onClick={goPrev}
          disabled={page <= 1}
          className="flex-1 flex items-center justify-center gap-1 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 py-3 rounded-xl bg-slate-800/60 border border-slate-700/40 active:scale-95 transition-all"
        >
          ← Slide trước
        </button>
        <button
          onClick={goNext}
          disabled={page >= total}
          className="flex-1 flex items-center justify-center gap-1 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 py-3 rounded-xl bg-slate-800/60 border border-slate-700/40 active:scale-95 transition-all"
        >
          Slide sau →
        </button>
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
          {Array.from({ length: total }, (_, i) => (
            <ThumbCanvas
              key={i}
              pdf={pdf}
              index={i + 1}
              active={i + 1 === page}
              onClick={() => setPage(i + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Fullscreen PDF — PPT Presentation Mode ───────────────────────────────────
const FullscreenPDF = memo(({ src, startPage = 1, onClose }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const hideTimerRef = useRef(null);
  const thumbStripRef = useRef(null);

  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(startPage);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uiVisible, setUiVisible] = useState(true);
  const [thumbOpen, setThumbOpen] = useState(false);
  const [direction, setDirection] = useState(null); // 'next' | 'prev'
  const [animating, setAnimating] = useState(false);
  const [isNativeFS, setIsNativeFS] = useState(false);

  // ── Enter native fullscreen ──────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const req = el.requestFullscreen?.() ||
      el.webkitRequestFullscreen?.() ||
      el.mozRequestFullScreen?.();
    if (req) {
      req.then?.(() => setIsNativeFS(true)).catch(() => setIsNativeFS(false));
    }
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
    };
  }, []);

  // ── Exit on native FS close (user presses Esc via browser) ──────────────
  useEffect(() => {
    const fn = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, [onClose]);

  // ── Load PDF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    pdfjsLib.getDocument(src).promise.then((doc) => {
      if (!cancelled) { setPdf(doc); setTotal(doc.numPages); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [src]);

  // ── Render page ──────────────────────────────────────────────────────────
  const renderPage = useCallback(async (n) => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    renderTaskRef.current?.cancel();
    const p = await pdf.getPage(n);
    const baseVp = p.getViewport({ scale: 1 });
    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;
    const scale = Math.min(W / baseVp.width, H / baseVp.height) * 0.96;
    const vp = p.getViewport({ scale });
    const c = canvasRef.current;
    c.width = vp.width;
    c.height = vp.height;
    const task = p.render({ canvasContext: c.getContext("2d"), viewport: vp });
    renderTaskRef.current = task;
    await task.promise.catch(() => {});
  }, [pdf]);

  useEffect(() => { renderPage(page); }, [page, renderPage]);

  // Re-render on resize
  useEffect(() => {
    const ro = new ResizeObserver(() => renderPage(page));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [page, renderPage]);

  // ── Auto-hide UI after 3s of no activity ────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);

  // ── Navigate with animation ──────────────────────────────────────────────
  const navigate = useCallback((dir) => {
    if (animating) return;
    const next = dir === "next"
      ? Math.min(total, page + 1)
      : Math.max(1, page - 1);
    if (next === page) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setPage(next);
      setAnimating(false);
      setDirection(null);
    }, 220);
  }, [animating, page, total]);

  const goNext = useCallback(() => navigate("next"), [navigate]);
  const goPrev = useCallback(() => navigate("prev"), [navigate]);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      resetHideTimer();
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "t" || e.key === "T") setThumbOpen((v) => !v);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [goNext, goPrev, onClose, resetHideTimer]);

  // ── Scroll thumbnail strip to active ─────────────────────────────────────
  useEffect(() => {
    if (!thumbStripRef.current) return;
    const active = thumbStripRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [page, thumbOpen]);

  const progress = total > 1 ? ((page - 1) / (total - 1)) * 100 : 100;

  const slideStyle = {
    transition: animating ? "opacity 0.22s ease, transform 0.22s ease" : "none",
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${direction === "next" ? "-24px" : "24px"})`
      : "translateX(0)",
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={(e) => {
        // Click left/right half to navigate
        if (thumbOpen) return;
        const x = e.clientX / window.innerWidth;
        if (x < 0.15) goPrev();
        else if (x > 0.85) goNext();
        else resetHideTimer();
      }}
    >
      {/* ── Progress bar (always visible, thin) ── */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-20 pointer-events-none">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Top HUD (auto-hide) ── */}
      <div className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ${uiVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}`}>
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <span className="text-sm font-mono text-white/70">
            <span className="text-white font-bold text-base">{page}</span>
            <span className="text-white/30 mx-1.5">/</span>
            <span>{total}</span>
          </span>
          <div className="flex items-center gap-2">
            {/* Thumbnails toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setThumbOpen((v) => !v); resetHideTimer(); }}
              title="Danh sách slide (T)"
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                thumbOpen
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">Slide</span>
            </button>
            {/* Exit */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              title="Thoát (Esc)"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 border border-white/20 hover:border-red-400/40 text-white/70 hover:text-white transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main slide area ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {loading ? (
          <Spinner />
        ) : (
          <canvas ref={canvasRef} style={slideStyle} className="shadow-2xl max-w-full max-h-full" />
        )}

        {/* Left / Right click zones — visual hint on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={page <= 1}
          className={`absolute left-0 top-0 bottom-0 w-[14vw] flex items-center justify-start pl-4 transition-all group/nav ${uiVisible ? "opacity-100" : "opacity-0"}`}
          style={{ background: "none" }}
        >
          <div className="opacity-0 group-hover/nav:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl w-12 h-12 flex items-center justify-center text-white text-2xl shadow-xl disabled:hidden">
            ‹
          </div>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={page >= total}
          className={`absolute right-0 top-0 bottom-0 w-[14vw] flex items-center justify-end pr-4 transition-all group/nav ${uiVisible ? "opacity-100" : "opacity-0"}`}
          style={{ background: "none" }}
        >
          <div className="opacity-0 group-hover/nav:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl w-12 h-12 flex items-center justify-center text-white text-2xl shadow-xl">
            ›
          </div>
        </button>
      </div>

      {/* ── Bottom: dot indicators (auto-hide) ── */}
      {!thumbOpen && total <= 30 && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 transition-all duration-300 pointer-events-none ${uiVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${
              i === page - 1 ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30"
            }`} />
          ))}
        </div>
      )}

      {/* ── Thumbnail drawer (slides up from bottom) ── */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ease-out ${
        thumbOpen ? "translate-y-0" : "translate-y-full"
      }`}>
        <div className="bg-slate-950/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Tất cả slide</span>
            <button
              onClick={(e) => { e.stopPropagation(); setThumbOpen(false); }}
              className="text-white/40 hover:text-white transition-colors p-1"
            >✕</button>
          </div>
          <div
            ref={thumbStripRef}
            className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                <button
                  data-active={i + 1 === page ? "true" : "false"}
                  onClick={() => { setPage(i + 1); setThumbOpen(false); }}
                  className={`rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                    i + 1 === page
                      ? "border-blue-500 shadow-lg shadow-blue-500/30 scale-105"
                      : "border-white/10 opacity-60 hover:opacity-90 hover:border-white/30"
                  }`}
                >
                  <ThumbCanvas pdf={pdf} index={i + 1} active={i + 1 === page} onClick={() => {}} />
                </button>
                <span className={`text-[10px] font-mono ${i + 1 === page ? "text-blue-400" : "text-white/30"}`}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Tai Lieu Viewer ──────────────────────────────────────────────────────────
const TaiLieuViewer = memo(({ url, loai }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  if (!url) return null;
  if (loai === "docx" || loai === "doc") return <WordViewer url={url} />;

  return (
    <>
      <PDFSlideViewer
        src={url}
        onPageChange={setCurrentPage}
        onFullscreenRequest={() => setFullscreen(true)}
      />
      {fullscreen && (
        <FullscreenPDF
          src={url}
          startPage={currentPage}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
});

// ─── Tab Button ───────────────────────────────────────────────────────────────
const TabBtn = memo(({ active, onClick, icon, label, fullWidthMobile }) => (
  <button
    onClick={onClick}
    className={`text-sm font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
      fullWidthMobile ? "flex-1 sm:flex-none" : ""
    } ${
      active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
        : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/60"
    }`}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
));

// ─── Bai Hoc List Item ────────────────────────────────────────────────────────
const BaiHocItem = memo(({ bh, idx, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all hover:bg-slate-800/40 active:bg-slate-800/60 border-r-2 ${
      isActive ? "bg-blue-500/10 border-blue-500" : "border-transparent"
    }`}
  >
    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 transition-all ${
      isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-800 text-slate-500"
    }`}>
      {idx + 1}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-bold leading-snug ${isActive ? "text-blue-400" : "text-slate-300"}`}>
        {bh.tieuDe}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {(bh.video?.duongDan || bh.youtubeUrl) && (
          <span className="text-[10px] text-slate-600">🎬 Video</span>
        )}
        {bh.taiLieu?.length > 0 && (
          <span className="text-[10px] text-slate-600">📄 {bh.taiLieu.length} tài liệu</span>
        )}
      </div>
    </div>
    {isActive && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2 animate-pulse" />}
  </button>
));

// ─── Bai Hoc List ─────────────────────────────────────────────────────────────
const BaiHocList = memo(({ baiHocList, baiHienTai, chonBaiHoc }) => (
  <>
    {baiHocList.map((bh, idx) => (
      <BaiHocItem
        key={bh._id}
        bh={bh}
        idx={idx}
        isActive={baiHienTai?._id === bh._id}
        onClick={() => chonBaiHoc(bh)}
      />
    ))}
  </>
));

// ─── Progress Dots ────────────────────────────────────────────────────────────
const ProgressDots = memo(({ total, current }) => (
  <div className="flex gap-1.5 items-center">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className={`rounded-full transition-all duration-300 ${
        i === current ? "w-5 h-1.5 bg-blue-500" : "w-1.5 h-1.5 bg-slate-700"
      }`} />
    ))}
  </div>
));

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
const MobileBottomNav = memo(({ currentIdx, total, onPrev, onNext, onOpenList }) => (
  <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800/80 px-4 py-3 flex items-center gap-3 shadow-2xl">
    <button
      onClick={onPrev}
      disabled={currentIdx <= 0}
      className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 py-2.5 rounded-xl border border-slate-700/50 hover:bg-slate-800 active:scale-95 transition-all"
    >
      ← Trước
    </button>
    <button
      onClick={onOpenList}
      className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-slate-800 transition-all"
    >
      <span className="text-xs text-slate-500 font-mono">{currentIdx + 1}/{total}</span>
      <span className="text-[10px] text-slate-600">Bài học</span>
    </button>
    <button
      onClick={onNext}
      disabled={currentIdx >= total - 1}
      className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 py-2.5 rounded-xl border border-slate-700/50 hover:bg-slate-800 active:scale-95 transition-all"
    >
      Sau →
    </button>
  </div>
));

// ─── Main Page ────────────────────────────────────────────────────────────────
const KhoaHocDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [khoaHoc, setKhoaHoc] = useState(null);
  const [baiHocList, setBaiHocList] = useState([]);
  const [baiHienTai, setBaiHienTai] = useState(null);
  const [tabActive, setTabActive] = useState("video");
  const [taiLieuActive, setTaiLieuActive] = useState(null);
  const [dangTaiUrl, setDangTaiUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await learningService.layMotKhoaHoc(id);
        const kh = res?.data || res;
        setKhoaHoc(kh);
        const ids = kh.danhSachBaiHoc || [];
        const baiHocs = await Promise.all(
          ids.map((bhId) =>
            learningService.layMotBaiHoc(typeof bhId === "string" ? bhId : bhId._id)
          )
        );
        const list = baiHocs.map((r) => r?.data || r);
        setBaiHocList(list);
        if (list.length > 0) handleChonBaiHoc(list[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChonBaiHoc = useCallback((bh) => {
    setBaiHienTai(bh);
    setTaiLieuActive(null);
    const hasVideo = bh.video?.duongDan || bh.youtubeUrl;
    setTabActive(hasVideo ? "video" : bh.taiLieu?.length > 0 ? "tailieu" : "video");
    setDrawerOpen(false);
  }, []);

  const xemTaiLieu = useCallback(async (baiHocId, taiLieu) => {
    if (taiLieuActive?.id === taiLieu._id) return;
    setDangTaiUrl(true);
    try {
      const url = await learningService.layUrlTaiLieu(baiHocId, taiLieu._id);
      setTaiLieuActive({ id: taiLieu._id, url, loai: taiLieu.loai });
      setTabActive("tailieu");
    } catch (err) {
      console.error(err);
    } finally {
      setDangTaiUrl(false);
    }
  }, [taiLieuActive?.id]);

  const currentIdx = useMemo(
    () => baiHocList.findIndex((b) => b._id === baiHienTai?._id),
    [baiHocList, baiHienTai?._id]
  );

  const goPrev = useCallback(() => {
    if (currentIdx > 0) handleChonBaiHoc(baiHocList[currentIdx - 1]);
  }, [currentIdx, baiHocList, handleChonBaiHoc]);

  const goNext = useCallback(() => {
    if (currentIdx < baiHocList.length - 1) handleChonBaiHoc(baiHocList[currentIdx + 1]);
  }, [currentIdx, baiHocList, handleChonBaiHoc]);

  const hasVideo = baiHienTai?.video?.duongDan || baiHienTai?.youtubeUrl;
  const hasTaiLieu = baiHienTai?.taiLieu?.length > 0;

  // ── Đo chiều cao header động (tránh hardcode) ─────────────────────────
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector("header");
      if (el) setHeaderHeight(el.getBoundingClientRect().height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    const el = document.querySelector("header");
    if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      {/* ── TOP BAR ── */}
      <div
        className="bg-slate-900/95 border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center gap-3 backdrop-blur-md sticky z-20 shadow-lg"
        style={{ top: headerHeight }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800 active:scale-95"
        >
          ← <span className="hidden sm:inline">Quay lại</span>
        </button>
        <div className="w-px h-5 bg-slate-700/60" />
        <h1 className="text-sm sm:text-base font-bold text-slate-200 truncate flex-1 leading-tight">
          {khoaHoc?.tieuDe}
        </h1>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 px-3.5 py-2 rounded-xl transition-all hover:bg-slate-800"
        >
          {sidebarOpen ? "Ẩn DS" : "📋 Bài học"}
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="sm:hidden flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white border border-slate-700/50 px-3 py-2 rounded-xl transition-all"
        >
          ☰
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Danh sách bài học</p>
                <p className="text-xs text-slate-600 mt-0.5">{baiHocList.length} bài</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-all"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <BaiHocList baiHocList={baiHocList} baiHienTai={baiHienTai} chonBaiHoc={handleChonBaiHoc} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── DESKTOP SIDEBAR ── */}
        {sidebarOpen && (
          <aside className="hidden sm:flex w-72 xl:w-88 flex-shrink-0 border-r border-slate-800/60 bg-slate-900/20 flex-col">
            <div className="px-5 py-4 border-b border-slate-800/60">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Danh sách bài học</p>
              <p className="text-xs text-slate-600 mt-0.5">{baiHocList.length} bài học</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <BaiHocList baiHocList={baiHocList} baiHienTai={baiHienTai} chonBaiHoc={handleChonBaiHoc} />
            </div>
          </aside>
        )}

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto pb-24 sm:pb-0">
          {baiHienTai ? (
            <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-10 space-y-4 sm:space-y-6">

              {/* Tiêu đề */}
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest">
                  Bài {currentIdx + 1} / {baiHocList.length}
                </p>
                <h2 className="text-lg sm:text-2xl font-black text-slate-100 leading-snug">
                  {baiHienTai.tieuDe}
                </h2>
              </div>

              {/* TABS — pill style, full width on mobile */}
              {(hasVideo || hasTaiLieu) && (
                <div className="flex bg-slate-900/70 border border-slate-800/60 rounded-xl p-1 sm:w-fit sm:rounded-2xl sm:p-1.5">
                  {hasVideo && (
                    <TabBtn
                      active={tabActive === "video"}
                      onClick={() => setTabActive("video")}
                      icon="🎬"
                      label="Video"
                      fullWidthMobile
                    />
                  )}
                  {hasTaiLieu && (
                    <TabBtn
                      active={tabActive === "tailieu"}
                      onClick={() => {
                        setTabActive("tailieu");
                        if (!taiLieuActive) xemTaiLieu(baiHienTai._id, baiHienTai.taiLieu[0]);
                      }}
                      icon="📄"
                      label={`Tài liệu${baiHienTai.taiLieu.length > 1 ? ` (${baiHienTai.taiLieu.length})` : ""}`}
                      fullWidthMobile
                    />
                  )}
                </div>
              )}

              {/* VIDEO — edge-to-edge on mobile */}
              {tabActive === "video" && (
                <div className="-mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl sm:border sm:border-slate-800/30">
                  {baiHienTai.youtubeUrl ? (
                    <iframe
                      key={`yt-${baiHienTai._id}`}
                      className="w-full h-full"
                      src={getYoutubeEmbedUrl(baiHienTai.youtubeUrl)}
                      title="YouTube"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : baiHienTai.video?.duongDan ? (
                    <video
                      key={`vid-${baiHienTai._id}`}
                      controls
                      className="w-full h-full"
                      src={baiHienTai.video.duongDan}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-3">
                      <span className="text-4xl opacity-20">🎬</span>
                      <p className="text-sm">Không có video</p>
                    </div>
                  )}
                </div>
              )}

              {/* TÀI LIỆU */}
              {tabActive === "tailieu" && (
                <div className="space-y-3">
                  {baiHienTai.taiLieu.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {baiHienTai.taiLieu.map((tl) => (
                        <button
                          key={tl._id}
                          onClick={() => xemTaiLieu(baiHienTai._id, tl)}
                          className={`text-sm font-bold px-3.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${
                            taiLieuActive?.id === tl._id
                              ? "border-blue-500/60 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10"
                              : "border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200 bg-slate-900/40"
                          }`}
                        >
                          {tl.loai === "pdf" ? "📄" : "📝"} {tl.ten}
                        </button>
                      ))}
                    </div>
                  )}
                  {dangTaiUrl && (
                    <div className="flex items-center gap-3 py-10 justify-center">
                      <Spinner size="sm" />
                      <span className="text-sm text-slate-500">Đang tải tài liệu...</span>
                    </div>
                  )}
                  {!dangTaiUrl && taiLieuActive?.url && (
                    <TaiLieuViewer url={taiLieuActive.url} loai={taiLieuActive.loai} />
                  )}
                </div>
              )}

              {/* ── ĐIỀU HƯỚNG BÀI HỌC (Desktop only) ── */}
              <div className="hidden sm:flex items-center justify-between pt-6 border-t border-slate-800/60 gap-4">
                <button
                  onClick={goPrev}
                  disabled={currentIdx <= 0}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 transition-all px-5 py-3 rounded-xl border border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40 active:scale-95 disabled:cursor-not-allowed"
                >
                  ← Bài trước
                </button>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-600 font-mono">{currentIdx + 1} / {baiHocList.length}</span>
                  <ProgressDots total={baiHocList.length} current={currentIdx} />
                </div>
                <button
                  onClick={goNext}
                  disabled={currentIdx >= baiHocList.length - 1}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 transition-all px-5 py-3 rounded-xl border border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40 active:scale-95 disabled:cursor-not-allowed"
                >
                  Bài sau →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-700 py-24">
              <span className="text-5xl opacity-20">📖</span>
              <p className="text-sm font-bold">Chọn bài học để bắt đầu</p>
            </div>
          )}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {baiHienTai && (
        <MobileBottomNav
          currentIdx={currentIdx}
          total={baiHocList.length}
          onPrev={goPrev}
          onNext={goNext}
          onOpenList={() => setDrawerOpen(true)}
        />
      )}
    </div>
  );
};

export default KhoaHocDetail;