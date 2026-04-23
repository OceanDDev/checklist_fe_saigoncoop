/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { learningService } from "@/services/leaning.service";
import * as pdfjsLib from "pdfjs-dist";
import * as mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── HELPER: Chuyển đổi link YouTube sang dạng Embed ──────────────────────────
const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  // eslint-disable-next-line no-useless-escape
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) 
    ? `https://www.youtube.com/embed/${match[2]}` 
    : null;
};

// ─── Word Viewer ─────────────────────────────────────────────────────────────
const WordViewer = ({ url }) => {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then((result) => {
        setHtml(result.value);
        setLoading(false);
      })
      .catch((err) => {
        setError("Không đọc được file Word: " + err.message);
        setLoading(false);
      });
  }, [url]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="text-center py-12 text-red-400 text-sm">{error}</div>
    );

  return (
    <div className="bg-white rounded-xl p-6 sm:p-10 shadow-2xl">
      <div
        className="prose prose-sm max-w-none text-slate-900"
        style={{ fontFamily: "Arial, sans-serif", lineHeight: 1.8 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

// ─── PDF Slide Viewer ────────────────────────────────────────────────────────
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
      const vp = p.getViewport({ scale: 1.6 });
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-slate-950 rounded-xl overflow-auto flex justify-center p-4">
        <canvas ref={canvasRef} className="rounded-lg shadow-2xl max-w-full" />
      </div>
      <div className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-2.5">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700"
        >
          ← Trước
        </button>
        <span className="text-xs text-slate-400 font-mono">
          <span className="text-white font-bold">{page}</span> / {total}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(total, p + 1))}
          disabled={page >= total}
          className="text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700"
        >
          Sau →
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
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
    </div>
  );
};

const ThumbCanvas = ({ pdf, index, active, onClick }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!pdf || !ref.current) return;
    pdf.getPage(index).then((p) => {
      const vp = p.getViewport({ scale: 0.15 });
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
      className={`flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${active ? "border-blue-500" : "border-transparent opacity-50 hover:opacity-80"}`}
    >
      <canvas ref={ref} />
    </button>
  );
};

// ─── Tài Liệu Viewer (PDF hoặc Word) ─────────────────────────────────────────
const TaiLieuViewer = ({ url, loai }) => {
  if (!url) return null;
  if (loai === "docx" || loai === "doc") return <WordViewer url={url} />;
  return <PDFSlideViewer src={url} />;
};

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
    
    // Kiểm tra nội dung: ưu tiên video/youtube rồi đến tài liệu
    const hasVideo = bh.video?.duongDan || bh.youtubeUrl;
    
    if (hasVideo) {
      setTabActive("video");
    } else if (bh.taiLieu?.length > 0) {
      setTabActive("tailieu");
    } else {
      setTabActive("video");
    }
  };

  const xemTaiLieu = async (baiHocId, taiLieu) => {
    if (taiLieuActive?.id === taiLieu._id) return;
    setDangTaiUrl(true);
    try {
      const url = await learningService.layUrlTaiLieu(baiHocId, taiLieu._id);
      setTaiLieuActive({ id: taiLieu._id, url, loai: taiLieu.loai });
      setTabActive("tailieu");
    } catch (err) {
      console.error("Lỗi lấy URL tài liệu:", err);
    } finally {
      setDangTaiUrl(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pt-[72px] flex flex-col">
      {/* TOP BAR */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex items-center gap-3 backdrop-blur-sm sticky top-[72px] z-20">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-white transition-colors text-sm"
        >
          ←
        </button>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-sm font-bold text-slate-200 truncate flex-1">
          {khoaHoc?.tieuDe}
        </h1>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="text-[10px] font-bold text-slate-500 hover:text-white border border-slate-700 px-2.5 py-1 rounded-lg transition-colors"
        >
          {sidebarOpen ? "Ẩn DS" : "Bài học"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        {sidebarOpen && (
          <div className="w-64 xl:w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/40 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Danh sách bài học
              </p>
            </div>
            <div className="py-2">
              {baiHocList.map((bh, idx) => (
                <button
                  key={bh._id}
                  onClick={() => chonBaiHoc(bh)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all hover:bg-slate-800/50 ${baiHienTai?._id === bh._id ? "bg-blue-500/10 border-r-2 border-blue-500" : ""}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black mt-0.5 ${baiHienTai?._id === bh._id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"}`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${baiHienTai?._id === bh._id ? "text-blue-400" : "text-slate-300"}`}
                    >
                      {bh.tieuDe}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(bh.video?.duongDan || bh.youtubeUrl) && (
                        <span className="text-[9px] text-slate-600">
                          🎬 Video
                        </span>
                      )}
                      {bh.taiLieu?.length > 0 && (
                        <span className="text-[9px] text-slate-600">
                          📄 {bh.taiLieu.length} tài liệu
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {baiHienTai ? (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">
                  Đang học
                </p>
                <h2 className="text-lg font-black text-slate-100">
                  {baiHienTai.tieuDe}
                </h2>
              </div>

              {/* TABS */}
              <div className="flex gap-1 bg-slate-900 rounded-xl p-1 w-fit">
                {(baiHienTai.video?.duongDan || baiHienTai.youtubeUrl) && (
                  <button
                    onClick={() => setTabActive("video")}
                    className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${tabActive === "video" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    🎬 Video
                  </button>
                )}
                {baiHienTai.taiLieu?.length > 0 && (
                  <button
                    onClick={() => {
                      setTabActive("tailieu");
                      if (!taiLieuActive)
                        xemTaiLieu(baiHienTai._id, baiHienTai.taiLieu[0]);
                    }}
                    className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${tabActive === "tailieu" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    📄 Tài liệu
                  </button>
                )}
              </div>

              {/* KHU VỰC HIỂN THỊ VIDEO / YOUTUBE */}
              {tabActive === "video" && (
                <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl">
                  {baiHienTai.youtubeUrl ? (
                    <iframe
                      key={`yt-${baiHienTai._id}`}
                      className="w-full h-full"
                      src={getYoutubeEmbedUrl(baiHienTai.youtubeUrl)}
                      title="YouTube player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  ) : baiHienTai.video?.duongDan ? (
                    <video
                      key={`vid-${baiHienTai._id}`}
                      controls
                      className="w-full h-full"
                      src={baiHienTai.video.duongDan}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">
                      Không có dữ liệu video
                    </div>
                  )}
                </div>
              )}

              {/* TÀI LIỆU */}
              {tabActive === "tailieu" && (
                <div className="space-y-4">
                  {baiHienTai.taiLieu.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {baiHienTai.taiLieu.map((tl) => (
                        <button
                          key={tl._id}
                          onClick={() => xemTaiLieu(baiHienTai._id, tl)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
                            taiLieuActive?.id === tl._id
                              ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                              : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                          }`}
                        >
                          {tl.loai === "pdf" ? "📄" : "📝"} {tl.ten}
                        </button>
                      ))}
                    </div>
                  )}

                  {dangTaiUrl && (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <div className="w-5 h-5 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
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

              {/* Nút Điều hướng Bài trước/Bài sau */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    const idx = baiHocList.findIndex((b) => b._id === baiHienTai._id);
                    if (idx > 0) chonBaiHoc(baiHocList[idx - 1]);
                  }}
                  disabled={baiHocList.findIndex((b) => b._id === baiHienTai._id) === 0}
                  className="text-xs font-bold text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  ← Bài trước
                </button>
                <span className="text-[10px] text-slate-700 font-mono">
                  {baiHocList.findIndex((b) => b._id === baiHienTai._id) + 1} / {baiHocList.length}
                </span>
                <button
                  onClick={() => {
                    const idx = baiHocList.findIndex((b) => b._id === baiHienTai._id);
                    if (idx < baiHocList.length - 1) chonBaiHoc(baiHocList[idx + 1]);
                  }}
                  disabled={baiHocList.findIndex((b) => b._id === baiHienTai._id) === baiHocList.length - 1}
                  className="text-xs font-bold text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Bài sau →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              Chọn bài học để bắt đầu
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KhoaHocDetail;