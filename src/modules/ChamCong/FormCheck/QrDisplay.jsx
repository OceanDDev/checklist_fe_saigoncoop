/* eslint-disable react/prop-types */
// pages/chamcong/QrDisplay.jsx
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import QRCode from "react-qr-code";
import { chamCongService } from "@/services/chamcong.service";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = import.meta.env.VITE_API || "http://localhost:5173";
const TOKEN_TTL = 60;
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-center select-none">
      <div className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-foreground leading-none">
        {now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
      <div className="mt-2 text-sm text-muted-foreground capitalize">
        {now.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </div>
    </div>
  );
}

export default function QrDisplay() {
  const [token, setToken] = useState(null);
  const [expiry, setExpiry] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOKEN_TTL);
  const [flash, setFlash] = useState(false);
  const [connected, setConnected] = useState(false);

  const qrUrl = token ? `${BASE_URL}/chamcongform/${token}` : null;

  const applyToken = (newToken, newExpiry) => {
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    setToken(newToken);
    setExpiry(newExpiry);
  };

  useEffect(() => {
    chamCongService
      .getCurrentQr()
      .then((res) => applyToken(res.token, res.expiry))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("qr:updated", ({ token: t, expiry: e }) => applyToken(t, e));
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(t);
  }, [expiry]);

  const progress = (timeLeft / TOKEN_TTL) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2">
        <img
          src="/img/logonew.png"
          alt="Logo"
          className="h-12 w-auto object-contain drop-shadow-md"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        /> 
      </div>

      <div className="bg-card border border-border rounded-2xl px-8 py-5 shadow-sm w-full max-w-xs">
        <LiveClock />
      </div>

      {/* QR Code — bỏ overlay đỏ */}
      <div
        className={`bg-white rounded-3xl p-7 shadow-2xl transition-all duration-300 ${flash ? "scale-90 opacity-30" : "scale-100 opacity-100"}`}
      >
        {qrUrl ? (
          <QRCode value={qrUrl} size={240} />
        ) : (
          <div className="w-[240px] h-[240px] flex items-center justify-center">
            <span className="animate-spin text-4xl text-gray-300">◌</span>
          </div>
        )}
      </div>

      {/* Progress bar — không đổi màu đỏ */}
      <div className="w-72 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mã mới sau</span>
          <span className="font-mono font-bold tabular-nums text-foreground">
            {timeLeft}s
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${connected ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-yellow-400"}`}
        />
        {connected ? "Kết nối realtime" : "Đang kết nối lại..."}
      </div>
    </div>
  );
}
