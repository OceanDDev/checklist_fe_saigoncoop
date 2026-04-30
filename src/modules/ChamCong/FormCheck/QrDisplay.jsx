/* eslint-disable react/prop-types */
// pages/chamcong/QrDisplay.jsx  —  TV kiosk layout (Tailwind)
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { io } from "socket.io-client";
import QRCode from "react-qr-code";
import { chamCongService } from "@/services/chamcong.service";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = import.meta.env.VITE_API || "http://localhost:5173";
const TOKEN_TTL = 5;

const STEPS = [
  {
    n: "01",
    icon: "📱",
    label: "Mở camera",
    sub: "Camera điện thoại hoặc app quét QR",
  },
  {
    n: "02",
    icon: "🎯",
    label: "Quét mã QR",
    sub: "Hướng camera vào mã QR trung tâm",
  },
  {
    n: "03",
    icon: "🪪",
    label: "Nhập mã NV",
    sub: "Điền mã nhân viên vào form",
  },
  {
    n: "04",
    icon: "✅",
    label: "Xác nhận",
    sub: "Chọn Check-In / Out rồi bấm xác nhận",
  },
];

function accentColor(progress) {
  if (progress > 60) return "#3d9e6e";
  if (progress > 25) return "#c8841a";
  return "#c04030";
}

// ═══════════════════════════════════════════════════════════
// HOOK: Giờ Hà Nội từ server — không phụ thuộc giờ thiết bị
// ═══════════════════════════════════════════════════════════
const TZ_API = "https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh";
const SYNC_INTERVAL = 5 * 60 * 1000; // re-sync mỗi 5 phút

function useHanoiTime() {
  const offsetRef = useRef(0); // ms lệch giữa server HN và Date.now()
  const [now, setNow] = useState(() => new Date());

  const sync = useCallback(async () => {
    try {
      const before = Date.now();
      const res = await fetch(TZ_API);
      const data = await res.json();
      const rtt = (Date.now() - before) / 2; // bù latency một chiều
      const serverMs = new Date(data.datetime).getTime();
      offsetRef.current = serverMs + rtt - Date.now();
    } catch {
      // Fallback: dùng Intl để ép về Asia/Ho_Chi_Minh
      // (vẫn chuẩn hơn dùng giờ thô của thiết bị nếu TZ sai)
      const localVN = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
      });
      offsetRef.current = new Date(localVN) - Date.now();
    }
  }, []);

  useEffect(() => {
    sync(); // fetch ngay khi mount
    const syncId = setInterval(sync, SYNC_INTERVAL);
    const tickId = setInterval(() => {
      setNow(new Date(Date.now() + offsetRef.current));
    }, 1000);
    return () => {
      clearInterval(syncId);
      clearInterval(tickId);
    };
  }, [sync]);

  return now; // Date object đã bù offset Hà Nội
}

// ═══════════════════════════════════════════════════════════
// HOOK: Kiểm tra giờ hoạt động (dùng giờ Hà Nội)
// ═══════════════════════════════════════════════════════════
function useIsOpen() {
  const now = useHanoiTime(); // ← nguồn giờ chuẩn Hà Nội
  const t = now.getHours() * 60 + now.getMinutes();
  return t >= 415 && t < 1320; // mở 06:55, đóng 22:00
}

// ═══════════════════════════════════════════════════════════
// LIVE CLOCK (dùng chung useHanoiTime, không tạo interval riêng)
// ═══════════════════════════════════════════════════════════
const LiveClock = memo(function LiveClock() {
  const now = useHanoiTime();

  return (
    <div className="select-none leading-none">
      <div className="font-mono text-[clamp(2.8rem,4.5vw,5.2rem)] font-bold tracking-tight text-neutral-100">
        {now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
      <div className="font-mono text-[clamp(0.65rem,0.9vw,0.85rem)] text-neutral-600 mt-2 tracking-widest uppercase">
        {now.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// CORNER BRACKETS
// ═══════════════════════════════════════════════════════════
const Corners = memo(function Corners({
  color,
  size = 36,
  thickness = 3,
  offset = 16,
}) {
  const base = {
    position: "absolute",
    width: size,
    height: size,
    transition: "border-color 0.6s ease",
  };
  return (
    <>
      <div
        style={{
          ...base,
          top: -offset,
          left: -offset,
          borderTop: `${thickness}px solid ${color}`,
          borderLeft: `${thickness}px solid ${color}`,
        }}
      />
      <div
        style={{
          ...base,
          top: -offset,
          right: -offset,
          borderTop: `${thickness}px solid ${color}`,
          borderRight: `${thickness}px solid ${color}`,
        }}
      />
      <div
        style={{
          ...base,
          bottom: -offset,
          left: -offset,
          borderBottom: `${thickness}px solid ${color}`,
          borderLeft: `${thickness}px solid ${color}`,
        }}
      />
      <div
        style={{
          ...base,
          bottom: -offset,
          right: -offset,
          borderBottom: `${thickness}px solid ${color}`,
          borderRight: `${thickness}px solid ${color}`,
        }}
      />
    </>
  );
});

// ═══════════════════════════════════════════════════════════
// MÀN HÌNH NGOÀI GIỜ
// ═══════════════════════════════════════════════════════════
const ClosedScreen = memo(function ClosedScreen() {
  return (
    <div className="h-screen w-screen bg-[#09090a] flex flex-col items-center justify-center gap-6 select-none">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="text-[clamp(3rem,6vw,5rem)]">🌙</div>
        <div className="font-semibold text-[clamp(1rem,2vw,1.5rem)] text-neutral-300 tracking-wide">
          Ngoài giờ làm việc
        </div>
        <div className="font-mono text-[clamp(0.6rem,0.9vw,0.8rem)] text-neutral-600 tracking-[0.25em] uppercase">
          Hệ thống hoạt động · 06:55 – 22:00
        </div>
        <LiveClock />
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function QrDisplay() {
  const isOpen = useIsOpen();

  const [token, setToken] = useState(null);
  const [expiry, setExpiry] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOKEN_TTL);
  const [flash, setFlash] = useState(false);
  const [connected, setConnected] = useState(false);

  const qrUrl = token ? `${BASE_URL}/chamcongform/${token}` : null;

  const applyToken = useCallback((t, e) => {
    setFlash(true);
    setTimeout(() => setFlash(false), 480);
    setToken(t);
    setExpiry(e);
  }, []);

  useEffect(() => {
    chamCongService
      .getCurrentQr()
      .then((res) => applyToken(res.token, res.expiry))
      .catch(console.error);
  }, [applyToken]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("qr:updated", ({ token: t, expiry: e }) => applyToken(t, e));
    return () => socket.disconnect();
  }, [applyToken]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, [expiry]);

  // ── Ngoài giờ → hiện màn hình đóng cửa
  if (!isOpen) return <ClosedScreen />;

  const progress = Math.min(100, (timeLeft / TOKEN_TTL) * 100);
  const accent = accentColor(progress);
  const qrSize = Math.min(
    480,
    Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.38),
  );

  return (
    <div className="h-screen w-screen bg-[#09090a] grid grid-rows-[1fr_auto] overflow-hidden relative font-sans">
      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Connection indicator */}
      <div className="fixed top-5 right-7 z-10 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full transition-all duration-300"
          style={{
            background: connected ? "#3d9e6e" : "#555",
            boxShadow: connected ? "0 0 10px #3d9e6e88" : "none",
          }}
        />
        <span
          className="font-mono text-[0.6rem] tracking-widest uppercase"
          style={{ color: connected ? "#3d9e6e" : "#404040" }}
        >
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      {/* ── MAIN 3-COLUMN GRID ── */}
      <div className="relative z-10 grid grid-cols-[1fr_2fr_1fr] items-center px-[3vw] py-[2.5vw] gap-[2vw] min-h-0">
        {/* ── LEFT: Clock + brand ── */}
        <div className="flex flex-col justify-center gap-[clamp(1.5rem,3vh,3.5rem)] pr-[1.5vw] border-r border-neutral-900">
          <div className="flex items-center gap-3">
            <img
              src="/img/logonew.png"
              alt="logo"
              className="h-[clamp(2rem,3.2vh,3.5rem)] w-auto object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div>
              <div className="font-semibold text-[clamp(0.75rem,1.1vw,1rem)] text-neutral-300 tracking-wide">
                Hệ Thống Chấm Công
              </div>
              <div className="font-mono text-[clamp(0.55rem,0.75vw,0.7rem)] text-neutral-700 tracking-[0.15em] uppercase mt-0.5">
                SAIGON COOP
              </div>
            </div>
          </div>
          <LiveClock />
          <div className="h-px bg-neutral-900" />
        </div>

        {/* ── CENTER: QR ── */}
        <div className="flex flex-col items-center justify-center gap-[clamp(1.2rem,2.5vh,2.5rem)]">
          <div className="font-mono text-[clamp(0.6rem,0.8vw,0.75rem)] tracking-[0.3em] uppercase text-neutral-700">
            QUÉT ĐỂ CHẤM CÔNG
          </div>

          <div className="relative">
            <Corners color={accent} size={40} thickness={3} offset={18} />
            <div
              className="absolute -inset-6 rounded-2xl pointer-events-none transition-all duration-500"
              style={{
                background: `radial-gradient(ellipse at center, ${accent}12 0%, transparent 70%)`,
              }}
            />
            <div
              className="bg-white rounded-xl transition-all duration-300"
              style={{
                padding: "clamp(14px,1.8vw,24px)",
                opacity: flash ? 0 : 1,
                transform: flash ? "scale(0.9)" : "scale(1)",
                boxShadow: flash
                  ? "none"
                  : `0 0 100px ${accent}28, 0 24px 80px rgba(0,0,0,0.7)`,
              }}
            >
              {qrUrl ? (
                <QRCode value={qrUrl} size={qrSize} level="M" />
              ) : (
                <div
                  className="flex items-center justify-center text-neutral-400"
                  style={{ width: qrSize, height: qrSize }}
                >
                  <span className="text-[clamp(2rem,4vw,4rem)] animate-spin">
                    ◌
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: How-to ── */}
        <div className="flex flex-col justify-center gap-[clamp(0.8rem,2vh,1.8rem)] pl-[1.5vw] border-l border-neutral-900">
          <div className="font-mono text-[clamp(0.55rem,0.72vw,0.65rem)] tracking-[0.25em] uppercase text-neutral-700 mb-1">
            HƯỚNG DẪN
          </div>

          {STEPS.map(({ n, icon, label, sub }) => (
            <div
              key={n}
              className="flex gap-[clamp(0.7rem,1.2vw,1.2rem)] items-start"
            >
              <div className="font-mono text-[clamp(0.65rem,0.9vw,0.85rem)] font-bold text-green-900 shrink-0 min-w-[1.8rem] leading-none pt-0.5">
                {n}
              </div>
              <div className="text-[clamp(0.9rem,1.4vw,1.3rem)] shrink-0 leading-none pt-0.5">
                {icon}
              </div>
              <div>
                <div className="text-[clamp(0.72rem,1vw,0.92rem)] font-bold text-neutral-300 mb-1 leading-tight">
                  {label}
                </div>
                <div className="text-[clamp(0.6rem,0.82vw,0.75rem)] text-neutral-500 leading-relaxed">
                  {sub}
                </div>
              </div>
            </div>
          ))}

          <div className="h-px bg-neutral-900 my-1" />

          <div className="flex gap-2 items-start bg-[#110f0a] border border-yellow-950 rounded-lg p-3">
            <span className="text-[clamp(0.7rem,1vw,0.9rem)] shrink-0">⚠️</span>
            <span className="text-[clamp(0.58rem,0.78vw,0.72rem)] text-yellow-800 leading-relaxed">
              Chấm công hộ sẽ bị xử lý kỷ luật theo nội quy công ty.
            </span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="relative z-10 border-t border-neutral-900 bg-[#070707] flex items-center justify-between px-[2.5vw] py-3">
        <div className="font-mono text-[clamp(0.5rem,0.65vw,0.6rem)] tracking-[0.2em] text-neutral-800 uppercase">
          HỆ THỐNG CHẤM CÔNG — SAIGON COOP
        </div>
        <div className="flex items-center gap-6">
          <div className="font-mono text-[clamp(0.5rem,0.65vw,0.6rem)] tracking-[0.15em] text-neutral-800 uppercase">
            QR · GPS · DEVICE ID
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <span
              className="font-mono text-[clamp(0.48rem,0.62vw,0.58rem)] tracking-[0.15em] uppercase transition-colors duration-300"
              style={{ color: accent }}
            >
              LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
