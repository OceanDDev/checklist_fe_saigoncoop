/* eslint-disable react/prop-types */
import { useState } from "react";
import { learningService } from "@/services/leaning.service";
import { toast } from "react-toastify";

const ModalTaoBaiHoc = ({ isOpen, onClose, khoaHocId, onSuccess }) => {
  const [buoc, setBuoc] = useState(1);
  const [baiHocId, setBaiHocId] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);

  const [form, setForm] = useState({
    tieuDe: "",
    thuTu: 1,
    cheDoBaiKiemTra: "sau_video",
  });

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [taiLieuFiles, setTaiLieuFiles] = useState([]);
  const [uploadingTaiLieu, setUploadingTaiLieu] = useState(false);

  const reset = () => {
    setBuoc(1);
    setBaiHocId(null);
    setForm({ tieuDe: "", thuTu: 1, cheDoBaiKiemTra: "sau_video" });
    setYoutubeUrl("");
    setTaiLieuFiles([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── BƯỚC 1: Tạo bài học ───────────────────
  const handleTaoBaiHoc = async () => {
    if (!form.tieuDe.trim()) return toast.error("Vui lòng nhập tiêu đề");
    setDangLuu(true);
    try {
      const res = await learningService.taoBaiHoc(khoaHocId, form);
      const id = res?._id || res?.data?._id;
      setBaiHocId(id);
      toast.success("Tạo bài học thành công");
      setBuoc(2);
    } catch (err) {
      toast.error("Lỗi khi tạo bài học");
      console.error(err);
    } finally {
      setDangLuu(false);
    }
  };

  // ── BƯỚC 2: Lưu link YouTube ──────────────
  const handleLuuYoutube = async () => {
    if (!youtubeUrl.trim()) {
      // Bỏ qua nếu không nhập
      setBuoc(3);
      return;
    }

    // Kiểm tra định dạng link YouTube cơ bản
    const isYoutube =
      youtubeUrl.includes("youtube.com/watch") ||
      youtubeUrl.includes("youtu.be/");
    if (!isYoutube) {
      toast.error("Link không hợp lệ, vui lòng nhập link YouTube");
      return;
    }

    setDangLuu(true);
    try {
      await learningService.capNhatBaiHoc(baiHocId, { youtubeUrl });
      toast.success("Lưu link YouTube thành công");
      setBuoc(3);
    } catch (err) {
      toast.error("Lỗi khi lưu link YouTube");
      console.error(err);
    } finally {
      setDangLuu(false);
    }
  };

  // ── BƯỚC 3: Upload tài liệu ───────────────
  const handleUploadTaiLieu = async () => {
    if (taiLieuFiles.length === 0) {
      onSuccess();
      handleClose();
      return;
    }
    setUploadingTaiLieu(true);
    try {
      for (const file of taiLieuFiles) {
        const formData = new FormData();
        formData.append("doc", file);
        await learningService.uploadTaiLieu(baiHocId, formData);
      }
      toast.success("Upload tài liệu thành công");
      onSuccess();
      handleClose();
    } catch (err) {
      toast.error("Lỗi khi upload tài liệu");
      console.error(err);
    } finally {
      setUploadingTaiLieu(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl">
          {/* HEADER */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">
                Thêm bài học mới
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-colors
                      ${buoc === s ? "bg-blue-600 text-white" : buoc > s ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-500"}`}
                    >
                      {buoc > s ? "✓" : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`w-6 h-px ${buoc > s ? "bg-emerald-600" : "bg-slate-800"}`}
                      />
                    )}
                  </div>
                ))}
                <span className="text-[10px] text-slate-500 ml-1">
                  {buoc === 1
                    ? "Thông tin"
                    : buoc === 2
                      ? "YouTube"
                      : "Tài liệu"}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* BODY */}
          <div className="p-5">
            {/* BƯỚC 1 — Thông tin */}
            {buoc === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Tiêu đề bài học *
                  </label>
                  <input
                    type="text"
                    value={form.tieuDe}
                    onChange={(e) =>
                      setForm({ ...form, tieuDe: e.target.value })
                    }
                    placeholder="VD: Giới thiệu quy trình xuất hàng"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Thứ tự
                  </label>
                  <input
                    type="number"
                    value={form.thuTu}
                    onChange={(e) =>
                      setForm({ ...form, thuTu: Number(e.target.value) })
                    }
                    min={1}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
               
              </div>
            )}

            {/* BƯỚC 2 — Link YouTube */}
            {buoc === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Link YouTube
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                      ▶️
                    </span>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Preview thumbnail nếu có link hợp lệ */}
                {youtubeUrl.includes("v=") && (
                  <div className="rounded-xl overflow-hidden border border-slate-700/50">
                    <img
                      src={`https://img.youtube.com/vi/${youtubeUrl.split("v=")[1]?.split("&")[0]}/hqdefault.jpg`}
                      alt="YouTube thumbnail"
                      className="w-full object-cover"
                    />
                    <p className="text-[10px] text-emerald-400 font-bold text-center py-2 bg-slate-800/50">
                      ✓ Link hợp lệ — xem trước thumbnail
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-slate-600 text-center">
                  Bỏ qua nếu chưa có video — có thể thêm sau
                </p>
              </div>
            )}

            {/* BƯỚC 3 — Upload tài liệu */}
            {buoc === 3 && (
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
                    ${taiLieuFiles.length > 0 ? "border-blue-500/50 bg-blue-500/5" : "border-slate-700 hover:border-slate-600"}`}
                  onClick={() =>
                    document.getElementById("input-tailieu").click()
                  }
                >
                  <input
                    id="input-tailieu"
                    type="file"
                    accept=".pdf,.docx,.doc"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      setTaiLieuFiles(Array.from(e.target.files))
                    }
                  />
                  <div className="text-3xl mb-2 opacity-30">📎</div>
                  <p className="text-xs text-slate-500 font-bold">
                    Click để chọn tài liệu
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    PDF, DOCX — nhiều file
                  </p>
                </div>

                {taiLieuFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {taiLieuFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 rounded-lg"
                      >
                        <span className="text-sm">
                          {f.name.endsWith(".pdf") ? "📄" : "📝"}
                        </span>
                        <span className="text-[10px] text-slate-300 flex-1 truncate">
                          {f.name}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-600 text-center">
                  Bỏ qua nếu chưa có tài liệu — có thể upload sau
                </p>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={buoc === 1 ? handleClose : () => setBuoc(buoc - 1)}
              className="text-xs text-slate-500 hover:text-slate-300 font-bold transition-colors"
            >
              {buoc === 1 ? "Hủy" : "← Quay lại"}
            </button>

            <button
              onClick={
                buoc === 1
                  ? handleTaoBaiHoc
                  : buoc === 2
                    ? handleLuuYoutube
                    : handleUploadTaiLieu
              }
              disabled={dangLuu || uploadingTaiLieu}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
            >
              {(dangLuu || uploadingTaiLieu) && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {buoc === 1
                ? "Tạo bài học →"
                : buoc === 2
                  ? youtubeUrl.trim()
                    ? "Lưu & tiếp →"
                    : "Bỏ qua →"
                  : taiLieuFiles.length > 0
                    ? "Upload & hoàn tất ✓"
                    : "Hoàn tất ✓"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalTaoBaiHoc;
