/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { learningService } from "@/services/leaning.service";
import * as pdfjsLib from "pdfjs-dist";
import * as mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  // eslint-disable-next-line no-useless-escape
  const regExp =
    // eslint-disable-next-line no-useless-escape
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1`
    : null;
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

// ─── Word Viewer ──────────────────────────────────────────────────────────────
const WordViewer = ({ url }) => {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then((result) => {
        setHtml(result.value);
        setLoading(false);
      })
      .catch((err) => {
        setError("Không đọc được file: " + err.message);
        setLoading(false);
      });
  }, [url]);

  if (loading) return <Spinner />;
  if (error)
    return (
      <div className="text-center py-12 text-red-400 text-sm">{error}</div>
    );
  return (
    <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-2xl">
      <div
        className="prose prose-base max-w-none text-slate-900"
        style={{ fontFamily: "Georgia, serif", lineHeight: 1.9 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

// ─── PDF Viewer ───────────────────────────────────────────────────────────────
const PDFSlideViewer = ({ src }) => {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const renderTask = useRef(null);

  useEffect(() => {
    if (!src) return;
    setLoading(true);
    setPdf(null);
    setPage(1);
    pdfjsLib.getDocument(src).promise.then((doc) => {
      setPdf(doc);
      setTotal(doc.numPages);
      setLoading(false);
    });
  }, [src]);

  const renderPage = useCallback(
    async (n) => {
      if (!pdf || !canvasRef.current) return;
      if (renderTask.current) {
        renderTask.current.cancel();
        renderTask.current = null;
      }
      const p = await pdf.getPage(n);
      const vp = p.getViewport({ scale: 1.8 });
      const canvas = canvasRef.current;
      canvas.width = vp.width;
      canvas.height = vp.height;
      const task = p.render({
        canvasContext: canvas.getContext("2d"),
        viewport: vp,
      });
      renderTask.current = task;
      await task.promise.catch(() => {});
    },
    [pdf],
  );

  useEffect(() => {
    renderPage(page);
  }, [page, renderPage]);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(total, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [total]);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-950 rounded-2xl overflow-auto flex justify-center p-4 sm:p-6 shadow-2xl border border-slate-800/40">
        <canvas ref={canvasRef} className="rounded-xl shadow-2xl max-w-full" />
      </div>
      <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur rounded-xl px-5 py-3 border border-slate-700/30">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-all px-3 py-1.5 rounded-lg hover:bg-slate-700 active:scale-95"
        >
          ← <span className="hidden sm:inline">Trang trước</span>
        </button>
        <span className="text-sm text-slate-400 font-mono">
          <span className="text-white font-bold">{page}</span>
          <span className="text-slate-600 mx-1.5">/</span>
          <span>{total}</span>
        </span>
        <button
          onClick={() => setPage((p) => Math.min(total, p + 1))}
          disabled={page >= total}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-all px-3 py-1.5 rounded-lg hover:bg-slate-700 active:scale-95"
        >
          <span className="hidden sm:inline">Trang sau</span> →
        </button>
      </div>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 px-1">
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
};

const ThumbCanvas = ({ pdf, index, active, onClick }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!pdf || !ref.current) return;
    pdf.getPage(index).then((p) => {
      const vp = p.getViewport({ scale: 0.18 });
      const c = ref.current;
      if (!c) return;
      c.width = vp.width;
      c.height = vp.height;
      p.render({ canvasContext: c.getContext("2d"), viewport: vp });
    });
  }, [pdf, index]);
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${active ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-transparent opacity-40 hover:opacity-70"}`}
    >
      <canvas ref={ref} />
    </button>
  );
};

const TaiLieuViewer = ({ url, loai }) => {
  if (!url) return null;
  if (loai === "docx" || loai === "doc") return <WordViewer url={url} />;
  return <PDFSlideViewer src={url} />;
};

// ─── Tab Button ───────────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-95 ${
      active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
        : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/60"
    }`}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

// ─── Danh sách bài học ────────────────────────────────────────────────────────
const BaiHocList = ({ baiHocList, baiHienTai, chonBaiHoc }) => (
  <>
    {baiHocList.map((bh, idx) => {
      const isActive = baiHienTai?._id === bh._id;
      return (
        <button
          key={bh._id}
          onClick={() => chonBaiHoc(bh)}
          className={`w-full text-left px-5 py-4 flex items-start gap-3.5 transition-all hover:bg-slate-800/40 active:bg-slate-800/60 border-r-2 ${
            isActive ? "bg-blue-500/10 border-blue-500" : "border-transparent"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-bold leading-snug ${isActive ? "text-blue-400" : "text-slate-300"}`}
            >
              {bh.tieuDe}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {(bh.video?.duongDan || bh.youtubeUrl) && (
                <span className="text-[10px] text-slate-600">🎬 Video</span>
              )}
              {bh.taiLieu?.length > 0 && (
                <span className="text-[10px] text-slate-600">
                  📄 {bh.taiLieu.length} tài liệu
                </span>
              )}
            </div>
          </div>
          {isActive && (
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2 animate-pulse" />
          )}
        </button>
      );
    })}
  </>
);

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
            learningService.layMotBaiHoc(
              typeof bhId === "string" ? bhId : bhId._id,
            ),
          ),
        );
        const list = baiHocs.map((r) => r?.data || r);
        setBaiHocList(list);
        if (list.length > 0) chonBaiHoc(list[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const chonBaiHoc = (bh) => {
    setBaiHienTai(bh);
    setTaiLieuActive(null);
    const hasVideo = bh.video?.duongDan || bh.youtubeUrl;
    setTabActive(
      hasVideo ? "video" : bh.taiLieu?.length > 0 ? "tailieu" : "video",
    );
    setDrawerOpen(false);
  };

  const xemTaiLieu = async (baiHocId, taiLieu) => {
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
  };

  const currentIdx = baiHocList.findIndex((b) => b._id === baiHienTai?._id);

  if (loading)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      {/* ── TOP BAR ── */}
      <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center gap-4 backdrop-blur-md sticky top-[93px] z-20 shadow-lg">
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
          ☰ DS
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
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Danh sách bài học
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {baiHocList.length} bài
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <BaiHocList
                baiHocList={baiHocList}
                baiHienTai={baiHienTai}
                chonBaiHoc={chonBaiHoc}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── DESKTOP SIDEBAR ── */}
        {sidebarOpen && (
          <div className="hidden sm:flex w-80 xl:w-96 flex-shrink-0 border-r border-slate-800/60 bg-slate-900/20 flex-col">
            <div className="px-5 py-4 border-b border-slate-800/60">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Danh sách bài học
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {baiHocList.length} bài học
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <BaiHocList
                baiHocList={baiHocList}
                baiHienTai={baiHienTai}
                chonBaiHoc={chonBaiHoc}
              />
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          {baiHienTai ? (
            <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-7">
              {/* Tiêu đề */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest">
                  Bài {currentIdx + 1} / {baiHocList.length}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-100 leading-snug">
                  {baiHienTai.tieuDe}
                </h2>
              </div>

              {/* TABS */}
              {(baiHienTai.video?.duongDan ||
                baiHienTai.youtubeUrl ||
                baiHienTai.taiLieu?.length > 0) && (
                <div className="flex gap-2 bg-slate-900/60 border border-slate-800/50 rounded-2xl p-1.5 w-fit">
                  {(baiHienTai.video?.duongDan || baiHienTai.youtubeUrl) && (
                    <TabBtn
                      active={tabActive === "video"}
                      onClick={() => setTabActive("video")}
                      icon="🎬"
                      label="Video"
                    />
                  )}
                  {baiHienTai.taiLieu?.length > 0 && (
                    <TabBtn
                      active={tabActive === "tailieu"}
                      onClick={() => {
                        setTabActive("tailieu");
                        if (!taiLieuActive)
                          xemTaiLieu(baiHienTai._id, baiHienTai.taiLieu[0]);
                      }}
                      icon="📄"
                      label={`Tài liệu${baiHienTai.taiLieu.length > 1 ? ` (${baiHienTai.taiLieu.length})` : ""}`}
                    />
                  )}
                </div>
              )}

              {/* VIDEO */}
              {tabActive === "video" && (
                <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-slate-800/30">
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
                <div className="space-y-5">
                  {baiHienTai.taiLieu.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {baiHienTai.taiLieu.map((tl) => (
                        <button
                          key={tl._id}
                          onClick={() => xemTaiLieu(baiHienTai._id, tl)}
                          className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 active:scale-95 ${
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
                    <div className="flex items-center gap-3 py-14 justify-center">
                      <div className="w-6 h-6 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-sm text-slate-500">
                        Đang tải tài liệu...
                      </span>
                    </div>
                  )}
                  {!dangTaiUrl && taiLieuActive?.url && (
                    <TaiLieuViewer
                      url={taiLieuActive.url}
                      loai={taiLieuActive.loai}
                    />
                  )}
                </div>
              )}

              {/* ── ĐIỀU HƯỚNG ── */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-800/60 gap-4">
                <button
                  onClick={() => {
                    if (currentIdx > 0) chonBaiHoc(baiHocList[currentIdx - 1]);
                  }}
                  disabled={currentIdx <= 0}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 transition-all px-5 py-3 rounded-xl border border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40 active:scale-95 disabled:cursor-not-allowed"
                >
                  ← <span className="hidden sm:inline">Bài trước</span>
                </button>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-600 font-mono">
                    {currentIdx + 1} / {baiHocList.length}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {baiHocList.map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-full transition-all duration-300 ${
                          i === currentIdx
                            ? "w-5 h-1.5 bg-blue-500"
                            : "w-1.5 h-1.5 bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (currentIdx < baiHocList.length - 1)
                      chonBaiHoc(baiHocList[currentIdx + 1]);
                  }}
                  disabled={currentIdx >= baiHocList.length - 1}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 transition-all px-5 py-3 rounded-xl border border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40 active:scale-95 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Bài sau</span> →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-700 py-24">
              <span className="text-5xl opacity-20">📖</span>
              <p className="text-sm font-bold">Chọn bài học để bắt đầu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KhoaHocDetail;
