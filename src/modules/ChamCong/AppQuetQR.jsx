/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
// pages/QrScanner.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Danh sách độ phân giải thử từ cao → thấp (ưu tiên camera sắc nét)
const RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720  },
  { width: 640,  height: 480  },
];

export default function QrScanner() {
  const scannerRef   = useRef(null);
  const [status, setStatus]   = useState("idle");     // idle | scanning | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [zoom, setZoom]       = useState(1);
  const [zoomRange, setZoomRange] = useState(null);   // { min, max, step } nếu device hỗ trợ
  const [torch, setTorch]     = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // ── Khởi động scanner ───────────────────────────────────
  const startScanner = useCallback(async () => {
    setStatus("idle");
    setErrorMsg("");
    setZoom(1);
    setZoomRange(null);
    setTorchSupported(false);

    // Dừng instance cũ nếu có
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }

    const el = document.getElementById("qr-reader");
    if (!el) return;

    const scanner = new Html5Qrcode("qr-reader", { verbose: false });
    scannerRef.current = scanner;

    // Thử từng resolution cao → thấp
    let started = false;
    for (const res of RESOLUTIONS) {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            // Vùng quét = 85% khung hình — càng lớn càng dễ quét từ xa
            qrbox: (w, h) => {
              const side = Math.round(Math.min(w, h) * 0.85);
              return { width: side, height: side };
            },
            aspectRatio: res.width / res.height,
            // Cho phép quét QR bị nghiêng, mờ → tốt khi xa
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          },
          (text) => {
            setStatus("success");
            scanner.stop().catch(() => {});
            setTimeout(() => { window.location.href = text; }, 600);
          },
          () => {}, // onError im lặng (gọi liên tục khi chưa thấy QR)
        );
        started = true;

        // Sau khi start thành công → thử lấy track để zoom/torch
        try {
          const track = scanner?.getRunningTrackCameraCapabilities?.();
          if (track) {
            const zoomCap = track.zoomFeature?.();
            if (zoomCap?.isSupported?.()) {
              setZoomRange({ min: zoomCap.min(), max: zoomCap.max(), step: zoomCap.step() });
            }
            const torchCap = track.torchFeature?.();
            if (torchCap?.isSupported?.()) setTorchSupported(true);
          }
        } catch (_) {}

        break; // Dừng vòng lặp nếu đã start OK
      } catch (_) {
        continue;
      }
    }

    if (!started) {
      setStatus("error");
      setErrorMsg("Không thể truy cập camera. Vui lòng cấp quyền và thử lại.");
      return;
    }

    setStatus("scanning");
  }, []);

  useEffect(() => {
    const id = setTimeout(startScanner, 120);
    return () => {
      clearTimeout(id);
      scannerRef.current?.stop().catch(() => {});
    };
  }, [startScanner]);

  // ── Zoom ────────────────────────────────────────────────
  const applyZoom = useCallback(async (val) => {
    setZoom(val);
    try {
      const track = scannerRef.current?.getRunningTrackCameraCapabilities?.();
      await track?.zoomFeature?.()?.apply?.(val);
    } catch (_) {}
  }, []);

  // ── Torch ───────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    const next = !torch;
    setTorch(next);
    try {
      const track = scannerRef.current?.getRunningTrackCameraCapabilities?.();
      await track?.torchFeature?.()?.apply?.(next);
    } catch (_) {}
  }, [torch]);

  const isScanning = status === "scanning";
  const isSuccess  = status === "success";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-4 select-none">

      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-[10px] tracking-[0.25em] text-muted-foreground/30 uppercase">
          Hệ thống chấm công
        </p>
        <h1 className="text-sm font-bold tracking-wide text-muted-foreground">
          {isSuccess  ? "Đã quét — đang chuyển hướng..." :
           status === "error" ? "Lỗi camera" :
           "Hướng camera vào mã QR"}
        </h1>
      </div>

      {/* Camera frame */}
      <div className="relative">
        {/* Góc viền */}
        {["top-0 left-0 border-t-2 border-l-2 rounded-tl-sm",
          "top-0 right-0 border-t-2 border-r-2 rounded-tr-sm",
          "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm",
          "bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm",
        ].map((cls, i) => (
          <span key={i} className={`absolute w-7 h-7 border-emerald-500 z-10 ${cls}`}
            style={{ margin: "-3px" }} />
        ))}

        {/* Scan line khi đang quét */}
        {isScanning && (
          <div className="absolute inset-x-0 z-10 pointer-events-none overflow-hidden"
            style={{ top: "3px", bottom: "3px", borderRadius: "inherit" }}>
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80"
              style={{ animation: "scanline 2s ease-in-out infinite" }} />
          </div>
        )}

        {/* html5-qrcode mount — kích thước lớn nhất có thể */}
        <div
          id="qr-reader"
          className="overflow-hidden rounded-lg bg-black"
          style={{
            // Chiếm 88vw nhưng không quá 480px và không quá 70vh
            width:  "min(88vw, 480px, 70vh)",
            height: "min(88vw, 480px, 70vh)",
          }}
        />

        {/* Success overlay */}
        {isSuccess && (
          <div className="absolute inset-0 rounded-lg bg-emerald-500/15 flex items-center justify-center z-20
            animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50
              flex items-center justify-center text-4xl text-emerald-400">
              ✓
            </div>
          </div>
        )}
      </div>

      {/* ── ZOOM SLIDER (chỉ hiện khi device hỗ trợ) ── */}
      {zoomRange && isScanning && (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground/40">
              Zoom
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400">
              {zoom.toFixed(1)}×
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground/30">1×</span>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step || 0.1}
              value={zoom}
              onChange={e => applyZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none bg-muted
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-xs text-muted-foreground/30">{zoomRange.max}×</span>
          </div>
        </div>
      )}

      {/* ── Fallback zoom (pinch simulation via CSS scale) khi không có native zoom ── */}
      {!zoomRange && isScanning && (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground/40">
              Zoom (digital)
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400">
              {zoom.toFixed(1)}×
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground/30">1×</span>
            <input
              type="range" min={1} max={4} step={0.1} value={zoom}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setZoom(v);
                // Scale CSS của video bên trong
                const video = document.querySelector("#qr-reader video");
                if (video) {
                  video.style.transform = `scale(${v})`;
                  video.style.transformOrigin = "center center";
                }
              }}
              className="flex-1 h-1.5 rounded-full appearance-none bg-muted
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-xs text-muted-foreground/30">4×</span>
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      <div className="flex items-center gap-3">
        {/* Torch */}
        {torchSupported && isScanning && (
          <button
            onClick={toggleTorch}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              torch
                ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                : "bg-muted/40 text-muted-foreground border-border hover:border-ring"
            }`}
          >
            <span>{torch ? "🔦" : "🔦"}</span>
            <span>{torch ? "Tắt đèn" : "Bật đèn"}</span>
          </button>
        )}

        {/* Retry */}
        {(status === "error" || isScanning) && (
          <button
            onClick={startScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
          >
            <span>↺</span>
            <span>Thử lại</span>
          </button>
        )}
      </div>

      {/* Error */}
      {status === "error" && (
        <p className="text-xs text-red-400 text-center max-w-xs leading-relaxed
          bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
          {errorMsg}
        </p>
      )}

      {/* Status dot */}
      <div className="flex items-center gap-2">
        {isScanning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        {isSuccess  && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/25">
          {isScanning ? "Đang quét..." :
           isSuccess  ? "Đã quét · đang chuyển hướng" :
           status === "error" ? "Không thể khởi động camera" :
           "Đang khởi động..."}
        </span>
      </div>

      <style>{`
        /* Hide html5-qrcode UI thừa */
        #qr-reader > img,
        #qr-reader > div[style*="display: flex"] > select,
        #qr-reader__header_message,
        #qr-reader__status_span,
        #qr-reader__dashboard_section_swaplink,
        #qr-reader__filescan_input { display: none !important; }

        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          transition: transform 0.2s ease;
        }
        #qr-reader { border: none !important; }

        @keyframes scanline {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(calc(min(88vw, 480px, 70vh) - 2px)); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}