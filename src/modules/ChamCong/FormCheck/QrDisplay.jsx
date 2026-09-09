/* eslint-disable react/prop-types */
// pages/chamcong/QrDisplay.jsx  —  TV kiosk layout (Tailwind)
//
// ⚡ PERFORMANCE NOTES:
// `now` (tick 1s) và `timeLeft` (tick 200ms) được tách xuống đúng component
// lá cần nó (LiveClock, LiveQrBox) — component gốc không re-render theo
// đồng hồ. Giờ Hà Nội đồng bộ 1 lần, chia sẻ qua Context, mỗi nơi dùng tự
// chọn tần suất tick riêng (useHanoiNow(tickMs)).
//
// 🛠️ FIX (17/08/2026): ConnectionBadge trước đây dùng `fixed top-4 right-5`
// nên luôn dính vào góc phải-trên của TOÀN VIEWPORT, bất kể nó thuộc cột
// QR bên trái. Khi zoom trình duyệt 125–150%, cột phải (bảng vinh danh) bị
// đẩy sát lên trên và bị badge "Live" đè lên chữ ngày. Đã đổi sang
// `absolute` neo theo chính khối QR, đồng thời siết lại cận dưới của một
// số clamp() để layout co mượt hơn ở màn hình thấp / zoom cao.
//
// 🎨 REDESIGN (17/08/2026, v3): Bỏ hẳn kiểu podium (bục 1-2-3 + hạng dưới
// tách riêng). Giờ mỗi người 1 dòng, top 7, xếp thẳng từ trên xuống theo
// thứ hạng. Mỗi dòng luôn hiện rõ CẢ 2 số — DÒNG và KIỆN — bằng 2 chip
// màu cố định (vàng = dòng, xanh = kiện) bất kể bảng đang sort theo tiêu
// chí nào, để so sánh nhanh giữa các bảng. Top 3 vẫn có huy hiệu màu
// vàng/bạc/đồng ở số thứ tự để dễ nhận diện, nhưng không còn tách bậc
// cao-thấp — toàn bộ nằm chung 1 danh sách để tối đa số người hiển thị.
//
// 🔻 UPDATE (09/09/2026): Đổi bảng vinh danh từ "cao nhất" sang
// "thấp nhất" theo yêu cầu — giờ đây danh sách hiển thị những người có
// số DÒNG/KIỆN thấp nhất trong ngày (sort tăng dần), để dễ nhận diện và
// nhắc nhở năng suất thấp. Toàn bộ UI (chip, huy hiệu top 3, màu sắc)
// giữ nguyên, chỉ đổi tiêu đề bảng + logic sắp xếp.
import {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
  useRef,
  memo,
} from "react";
import { io } from "socket.io-client";
import QRCode from "react-qr-code";
import { chamCongService } from "@/services/chamcong.service";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = import.meta.env.VITE_API || "http://localhost:5173";
const TOKEN_TTL = 5;
const TOP_POLL_INTERVAL = 5 * 60 * 1000; // 5 phút — không cần realtime
const TOP_LIMIT = 5; // số người hiển thị mỗi bảng vinh danh

// 🔴 Hiệu ứng nhấp nháy cho biển cảnh báo — giống đèn/biển báo giao thông:
// nền + viền đỏ chớp tắt liên tục (không dùng opacity mờ dần kiểu pulse
// thông thường, mà nhảy cứng giữa 2 trạng thái sáng/tối cho giống đèn
// báo hiệu thật).
const WARNING_BLINK_STYLE = `
@keyframes warningBlink {
  0%, 49% {
    background-color: #7f1d1d;
    border-color: #ef4444;
    box-shadow: 0 0 18px 2px rgba(239,68,68,0.55);
  }
  50%, 100% {
    background-color: #2a0a0a;
    border-color: #7f1d1d;
    box-shadow: none;
  }
}
.warning-blink-box {
  animation: warningBlink 1s steps(1, end) infinite;
}
.warning-blink-icon {
  animation: warningBlink 1s steps(1, end) infinite;
  animation-name: warningBlinkIcon;
}
@keyframes warningBlinkIcon {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.35; }
}
.warning-blink-row {
  animation: warningBlinkRow 1s steps(1, end) infinite;
}
@keyframes warningBlinkRow {
  0%, 49% {
    background: rgba(239,68,68,0.22);
    border: 1px solid #ef4444;
    box-shadow: 0 0 12px 1px rgba(239,68,68,0.5);
  }
  50%, 100% {
    background: rgba(127,29,29,0.18);
    border: 1px solid rgba(239,68,68,0.35);
    box-shadow: none;
  }
}
.warning-blink-badge {
  animation: warningBlinkBadge 1s steps(1, end) infinite;
}
@keyframes warningBlinkBadge {
  0%, 49% {
    background-color: #ef4444;
    box-shadow: 0 0 8px 1px rgba(239,68,68,0.85);
  }
  50%, 100% {
    background-color: #7f1d1d;
    box-shadow: none;
  }
}
.warning-blink-banner {
  animation: warningBlinkBanner 1s steps(1, end) infinite;
}
@keyframes warningBlinkBanner {
  0%, 49% {
    background: rgba(239,68,68,0.22);
    border-color: #ef4444;
  }
  50%, 100% {
    background: rgba(127,29,29,0.12);
    border-color: rgba(239,68,68,0.35);
  }
}
`;

function accentColor(progress) {
  if (progress > 60) return "#3d9e6e";
  if (progress > 25) return "#c8841a";
  return "#c04030";
}

const pad2 = (n) => String(n).padStart(2, "0");
// ✅ Ngày ISO (YYYY-MM-DD) tính TỪ `now` đã bù giờ Hà Nội,
// KHÔNG dùng giờ thô của thiết bị -> đảm bảo reset đúng lúc 00:00 giờ VN.
const toIsoDate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// ═══════════════════════════════════════════════════════════
// GIỜ HÀ NỘI — đồng bộ 1 lần, chia sẻ qua Context.
// ═══════════════════════════════════════════════════════════
const TZ_API = "https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh";
const SYNC_INTERVAL = 5 * 60 * 1000; // re-sync mỗi 5 phút

const HanoiOffsetContext = createContext(0);

function HanoiTimeProvider({ children }) {
  const [offset, setOffset] = useState(0); // ms lệch giữa server HN và Date.now()

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const before = Date.now();
        const res = await fetch(TZ_API);
        const data = await res.json();
        const rtt = (Date.now() - before) / 2; // bù latency một chiều
        const serverMs = new Date(data.datetime).getTime();
        if (!cancelled) setOffset(serverMs + rtt - Date.now());
      } catch {
        // Fallback: dùng Intl để ép về Asia/Ho_Chi_Minh
        const localVN = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Ho_Chi_Minh",
        });
        if (!cancelled) setOffset(new Date(localVN) - Date.now());
      }
    };
    sync();
    const id = setInterval(sync, SYNC_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <HanoiOffsetContext.Provider value={offset}>
      {children}
    </HanoiOffsetContext.Provider>
  );
}

// tickMs: tần suất cập nhật `now`. Chỉ đồng hồ trên màn hình mới cần 1000ms,
// các nơi khác dùng chu kỳ dài hơn để giảm số lần re-render.
function useHanoiNow(tickMs = 1000) {
  const offset = useContext(HanoiOffsetContext);
  const [now, setNow] = useState(() => new Date(Date.now() + offset));

  useEffect(() => {
    setNow(new Date(Date.now() + offset));
    const id = setInterval(() => {
      setNow(new Date(Date.now() + offset));
    }, tickMs);
    return () => clearInterval(id);
  }, [offset, tickMs]);

  return now;
}

// ═══════════════════════════════════════════════════════════
// HOOK: Kiểm tra giờ hoạt động — tick mỗi 30s, không cần theo từng giây.
// ═══════════════════════════════════════════════════════════
function useIsOpenGate() {
  const now = useHanoiNow(30 * 1000);
  const t = now.getHours() * 60 + now.getMinutes();
  return t >= 415 && t < 1320; // mở 06:55, đóng 22:00
}

// ═══════════════════════════════════════════════════════════
// HOOK: Bảng Dòng/Kiện THẤP NHẤT — lấy từ endpoint public (không cần
// token), backend đã tổng hợp sẵn kien/dong + ten/chucVu theo từng NV
// soạn. Poll mỗi 5 phút, tick ngày mỗi 60s (đủ để phát hiện đổi ngày
// reset).
// ═══════════════════════════════════════════════════════════
function useTopNangSuat() {
  const now = useHanoiNow(60 * 1000);
  const todayStr = toIsoDate(now);
  const [topDong, setTopDong] = useState([]);
  const [topKien, setTopKien] = useState([]);
  const [profileMap, setProfileMap] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTop = async () => {
      try {
        const res = await nhanSuSoanService.getTopNangSuatCongKhai(todayStr);
        if (cancelled) return;
        const data = res.data || [];

        const map = {};
        data.forEach((row) => {
          map[row.code] = { ten: row.ten, chucVu: row.chucVu };
        });
        setProfileMap(map);

        // 🔻 Sắp xếp TĂNG DẦN (a - b) để lấy những người có số
        // dòng/kiện THẤP NHẤT trong ngày, thay vì cao nhất.
        setTopDong(
          [...data]
            .sort((a, b) => a.dong - b.dong || a.kien - b.kien)
            .slice(0, TOP_LIMIT),
        );
        setTopKien(
          [...data]
            .sort((a, b) => a.kien - b.kien || a.dong - b.dong)
            .slice(0, TOP_LIMIT),
        );
        setLoaded(true);
      } catch (err) {
        console.error("Lỗi tải top năng suất:", err);
      }
    };

    fetchTop(); // gọi ngay khi mount, sau đó cứ 5 phút gọi lại
    const id = setInterval(fetchTop, TOP_POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [todayStr]);

  return { now, topDong, topKien, profileMap, loaded };
}

// ═══════════════════════════════════════════════════════════
// LIVE CLOCK — tự tick riêng (1s), không nhận `now` từ cha.
// ═══════════════════════════════════════════════════════════
const LiveClock = memo(function LiveClock() {
  const now = useHanoiNow(1000);
  return (
    <div className="select-none leading-none text-center">
      <div className="font-mono text-[clamp(2rem,4.6vw,5.2rem)] font-bold tracking-tight text-neutral-100">
        {now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
      <div className="font-mono text-[clamp(0.56rem,0.9vw,0.85rem)] text-neutral-600 mt-1.5 tracking-widest uppercase">
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
    <div className="h-screen w-screen bg-[#09090a] flex flex-col items-center justify-center gap-6 select-none overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="text-[clamp(2.4rem,6vw,5rem)]">🌙</div>
        <div className="font-semibold text-[clamp(0.9rem,2vw,1.5rem)] text-neutral-300 tracking-wide">
          Ngoài giờ làm việc
        </div>
        <div className="font-mono text-[clamp(0.56rem,0.9vw,0.8rem)] text-neutral-600 tracking-[0.25em] uppercase">
          Hệ thống hoạt động · 06:55 – 22:00
        </div>
        <LiveClock />
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// QR ĐỘNG — gộp toàn bộ phần "hay đổi" (fetch token, socket, đếm ngược
// 200ms, hiệu ứng flash) vào 1 component lá duy nhất.
// ═══════════════════════════════════════════════════════════
function computeQrSize() {
  if (typeof window === "undefined") return 260;
  return Math.min(
    340,
    Math.max(
      140,
      Math.round(Math.min(window.innerWidth / 2, window.innerHeight) * 0.34),
    ),
  );
}

function useQrSize() {
  const [size, setSize] = useState(computeQrSize);
  useEffect(() => {
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setSize(computeQrSize()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return size;
}

// 🛠️ FIX: đổi `fixed top-4 right-5` -> `absolute -top-6 right-0`.
// Badge này giờ neo theo container cha (khối QR bên trái) thay vì
// dính cứng vào góc phải-trên của TOÀN viewport, nên không còn đè lên
// chữ ngày của bảng vinh danh bên phải khi zoom 125–150% nữa.
const ConnectionBadge = memo(function ConnectionBadge({ connected }) {
  return (
    <div className="absolute -top-6 right-0 z-10 flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full transition-all duration-300"
        style={{
          background: connected ? "#3d9e6e" : "#555",
          boxShadow: connected ? "0 0 10px #3d9e6e88" : "none",
        }}
      />
      <span
        className="font-mono text-[0.58rem] tracking-widest uppercase"
        style={{ color: connected ? "#3d9e6e" : "#404040" }}
      >
        {connected ? "Live" : "Offline"}
      </span>
    </div>
  );
});

const LiveQrBox = memo(function LiveQrBox() {
  const [token, setToken] = useState(null);
  const [expiry, setExpiry] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOKEN_TTL);
  const [flash, setFlash] = useState(false);
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false);
  const qrSize = useQrSize();

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
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // 🛠️ Cho phép fallback về polling khi WebSocket gặp sự cố
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setConnected(true);
      connectedRef.current = true;
    });
    socket.on("disconnect", () => {
      setConnected(false);
      connectedRef.current = false;
    });
    socket.on("qr:updated", ({ token: t, expiry: e }) => applyToken(t, e));

    return () => socket.disconnect();
  }, [applyToken]);

  // 🛠️ SỬA: chỉ tự gọi REST khi socket ĐANG THỰC SỰ mất kết nối
  // (connectedRef.current === false), không can thiệp khi socket vẫn
  // hoạt động bình thường — tránh gọi API tràn lan mỗi 2s như bản trước.
  useEffect(() => {
    let fetching = false;
    const id = setInterval(() => {
      if (fetching || connectedRef.current) return;
      const secondsPastExpiry = expiry ? (Date.now() - expiry) / 1000 : 0;
      if (expiry && secondsPastExpiry > 8) {
        fetching = true;
        chamCongService
          .getCurrentQr()
          .then((res) => applyToken(res.token, res.expiry))
          .catch(console.error)
          .finally(() => {
            fetching = false;
          });
      }
    }, 5000);
    return () => clearInterval(id);
  }, [expiry, applyToken]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, [expiry]);

  const progress = Math.min(100, (timeLeft / TOKEN_TTL) * 100);
  const accent = accentColor(progress);

  // 🛠️ FIX: bọc toàn bộ trong 1 div `relative` để ConnectionBadge
  // (giờ là `absolute`) neo đúng theo khối QR này, không còn bám theo
  // toàn viewport như trước (Fragment `<>` không tạo được vùng neo).
  return (
    <div className="relative flex flex-col items-center gap-[clamp(0.7rem,2vh,1.8rem)]">
      <ConnectionBadge connected={connected} />

      <div className="font-mono text-[clamp(0.5rem,0.78vw,0.72rem)] tracking-[0.3em] uppercase text-neutral-700">
        QUÉT ĐỂ CHẤM CÔNG
      </div>

      <div className="relative">
        <Corners color={accent} size={32} thickness={3} offset={15} />
        <div
          className="absolute -inset-5 rounded-2xl pointer-events-none transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse at center, ${accent}12 0%, transparent 70%)`,
          }}
        />
        <div
          className="bg-white rounded-xl transition-all duration-300"
          style={{
            padding: "clamp(8px,1.4vw,20px)",
            opacity: flash ? 0 : 1,
            transform: flash ? "scale(0.9)" : "scale(1)",
            boxShadow: flash
              ? "none"
              : `0 0 80px ${accent}28, 0 20px 60px rgba(0,0,0,0.7)`,
          }}
        >
          {qrUrl ? (
            <QRCode value={qrUrl} size={qrSize} level="M" />
          ) : (
            <div
              className="flex items-center justify-center text-neutral-400"
              style={{ width: qrSize, height: qrSize }}
            >
              <span className="text-[clamp(1.8rem,4vw,4rem)] animate-spin">
                ◌
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Biển cảnh báo — giữ nguyên như bản gốc, không thay đổi */}
      <div className="flex max-w-xs items-start gap-2 rounded-lg border border-yellow-950 bg-[#110f0a] px-3 py-2">
        <span className="shrink-0 text-[clamp(0.6rem,0.95vw,0.85rem)]">⚠️</span>
        <span className="text-[clamp(0.5rem,0.72vw,0.66rem)] leading-relaxed text-yellow-800">
          Chấm công hộ sẽ bị xử lý kỷ luật theo nội quy công ty.
        </span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// BẢNG VINH DANH — danh sách phẳng, mỗi người 1 dòng, hiển thị TOP_LIMIT
// người có số DÒNG/KIỆN THẤP NHẤT trong ngày.
// Mỗi dòng luôn hiện đủ 2 chip DÒNG + KIỆN (màu cố định, không đổi theo
// bảng) để so sánh nhanh, thứ hạng chỉ quyết định thứ tự sắp xếp.
// ═══════════════════════════════════════════════════════════
const DONG_ACCENT = "#facc15"; // vàng — luôn đại diện cho số DÒNG
const KIEN_ACCENT = "#38bdf8"; // xanh — luôn đại diện cho số KIỆN

function MetricChip({ value, label, accent, glow }) {
  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center rounded-md px-2 py-0.5 leading-none"
      style={{
        background: `${accent}22`,
        border: `1px solid ${accent}60`,
        boxShadow: glow ? `0 0 10px ${accent}55` : "none",
      }}
    >
      <span
        className="font-mono text-[clamp(0.6rem,0.9vw,0.85rem)] font-black"
        style={{
          color: accent,
          textShadow: glow ? `0 0 8px ${accent}80` : "none",
        }}
      >
        {value}
      </span>
      <span className="mt-0.5 text-[clamp(0.34rem,0.44vw,0.4rem)] font-bold tracking-widest text-neutral-400">
        {label}
      </span>
    </div>
  );
}

const ListRow = memo(function ListRow({ rank, row, profile }) {
  const name = profile?.ten || row.code;
  const chucVu = profile?.chucVu || row.code;
  const isTop3 = rank < 3;
  const isFirst = rank === 0;

  // 💡 Mỗi dòng giờ là 1 "thẻ sáng" thay vì chỉ có gạch phân cách mỏng:
  // nền hơi bừng sáng (rgba trắng nhạt). Top 3 (năng suất thấp nhất,
  // đáng báo động nhất) có viền đỏ NHẤP NHÁY kiểu biển báo giao thông
  // thay vì viền + glow tĩnh như bản "vinh danh" trước đây.
  return (
    <div
      className={`mb-1 flex min-w-0 shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-300 last:mb-0 ${
        isTop3 ? "warning-blink-row" : ""
      }`}
      style={{
        background: isTop3 ? undefined : "rgba(255,255,255,0.035)",
        border: isTop3 ? undefined : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded font-mono text-[clamp(0.5rem,0.66vw,0.6rem)] font-bold ${
          isTop3 ? "warning-blink-badge" : ""
        }`}
        style={{
          width: "clamp(1.1rem,1.6vw,1.4rem)",
          height: "clamp(1.1rem,1.6vw,1.4rem)",
          color: isTop3 ? "#fff" : "#a3a3a3",
          background: isTop3 ? undefined : "rgba(255,255,255,0.06)",
        }}
      >
        {isTop3 ? "⚠" : rank + 1}
      </span>

      <span className="shrink-0 whitespace-nowrap rounded border border-neutral-700 bg-neutral-900/60 px-1 py-0.5 font-mono text-[clamp(0.4rem,0.5vw,0.46rem)] text-neutral-400">
        {row.code}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate whitespace-nowrap text-[clamp(0.58rem,0.84vw,0.78rem)] font-semibold text-neutral-100">
          {name}
        </div>
        <div className="truncate whitespace-nowrap text-[clamp(0.42rem,0.54vw,0.48rem)] text-neutral-500">
          {chucVu}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <MetricChip
          value={row.dong}
          label="DÒNG"
          accent={DONG_ACCENT}
          glow={isFirst}
        />
        <MetricChip
          value={row.kien}
          label="KIỆN"
          accent={KIEN_ACCENT}
          glow={isFirst}
        />
      </div>
    </div>
  );
});

const RankBoard = memo(function RankBoard({
  title,
  icon,
  accentColor: color,
  list,
  profileMap,
  loaded,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 pb-1">
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-[0.56rem]"
          style={{ background: `${color}22`, border: `1px solid ${color}55` }}
        >
          {icon}
        </span>
        <span
          className="whitespace-nowrap font-mono text-[clamp(0.52rem,0.76vw,0.72rem)] font-bold tracking-[0.16em] uppercase"
          style={{ color }}
        >
          {title}
        </span>
        <div className="h-px flex-1 bg-neutral-900" />
      </div>

      {!loaded ? (
        <div className="text-[clamp(0.62rem,0.88vw,0.82rem)] text-neutral-600">
          Đang tải dữ liệu…
        </div>
      ) : list.length === 0 ? (
        <div className="text-[clamp(0.62rem,0.88vw,0.82rem)] text-neutral-600">
          Chưa có phiếu hoàn thành hôm nay.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-start overflow-hidden">
          {list.map((row, idx) => (
            <ListRow
              key={row.code}
              rank={idx}
              row={row}
              profile={profileMap[row.code]}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const TopNangSuatPanel = memo(function TopNangSuatPanel() {
  const { now, topDong, topKien, profileMap, loaded } = useTopNangSuat();

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr_1fr] gap-1.5 overflow-hidden pl-[1.5vw]">
      <style>{WARNING_BLINK_STYLE}</style>

      <div className="flex shrink-0 items-baseline justify-between">
        <div className="whitespace-nowrap font-mono text-[clamp(0.52rem,0.76vw,0.72rem)] tracking-[0.26em] uppercase text-neutral-700">
          📉 THẤP NHẤT NĂNG SUẤT HÔM NAY
        </div>
        <div className="whitespace-nowrap font-mono text-[clamp(0.44rem,0.62vw,0.58rem)] text-neutral-700">
          {now.toLocaleDateString("vi-VN")}
        </div>
      </div>

      {/* 🔴 Banner cảnh báo — nhấp nháy đỏ kiểu biển báo giao thông, vì
          những người trong danh sách dưới đây đang có năng suất thấp */}
      <div className="warning-blink-banner flex shrink-0 items-center gap-2 rounded-md border px-2 py-1">
        <span className="warning-blink-icon shrink-0 text-[clamp(0.62rem,0.9vw,0.8rem)]">
          ⚠️
        </span>
        <span className="text-[clamp(0.44rem,0.6vw,0.56rem)] font-bold uppercase tracking-wide text-red-100">
          Cảnh báo: năng suất thấp — cần nhắc nhở
        </span>
      </div>

      {/* ── Hàng 1: THẤP NHẤT DÒNG — sắp theo dòng, vẫn hiện đủ dòng + kiện ── */}
      <RankBoard
        title="THẤP NHẤT DÒNG"
        icon="📄"
        accentColor={DONG_ACCENT}
        list={topDong}
        profileMap={profileMap}
        loaded={loaded}
      />

      {/* ── Hàng 2: THẤP NHẤT KIỆN — sắp theo kiện, vẫn hiện đủ dòng + kiện ── */}
      <RankBoard
        title="THẤP NHẤT KIỆN"
        icon="📦"
        accentColor={KIEN_ACCENT}
        list={topKien}
        profileMap={profileMap}
        loaded={loaded}
      />
    </div>
  );
});
// ═══════════════════════════════════════════════════════════
// MAIN LAYOUT — chỉ re-render khi đóng/mở cửa (tick 30s), không còn
// phụ thuộc đồng hồ 1s hay countdown 200ms nữa.
// ═══════════════════════════════════════════════════════════
const QrDisplayInner = memo(function QrDisplayInner() {
  const isOpen = useIsOpenGate();

  if (!isOpen) return <ClosedScreen />;

  return (
    <div className="relative grid h-screen w-screen grid-rows-[1fr_auto] overflow-hidden bg-[#09090a] font-sans">
      {/* Dot grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── MAIN: chia đôi màn hình, luôn co giãn vừa khung TV ── */}
      <div className="relative z-10 grid min-h-0 grid-cols-2 items-stretch gap-[clamp(1rem,2.8vw,3rem)] px-[clamp(0.75rem,2.4vw,2.6rem)] py-[clamp(0.6rem,1.8vh,1.8rem)]">
        {/* ── TRÁI: Giờ trên đầu + QR bên dưới ── */}
        <div className="flex min-w-0 flex-col items-center justify-center gap-[clamp(0.7rem,2.4vh,2.2rem)] border-r border-neutral-900 pr-[clamp(0.75rem,1.6vw,2rem)]">
          <div className="flex items-center gap-2">
            <img
              src="/img/logonew.png"
              alt="logo"
              className="h-[clamp(1.3rem,2.8vh,2.8rem)] w-auto object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div>
              <div className="text-[clamp(0.6rem,0.98vw,0.9rem)] font-semibold tracking-wide text-neutral-300">
                Hệ Thống Chấm Công
              </div>
              <div className="mt-0.5 font-mono text-[clamp(0.44rem,0.68vw,0.62rem)] uppercase tracking-[0.15em] text-neutral-700">
                SAIGON COOP
              </div>
            </div>
          </div>

          <LiveClock />

          <div className="h-px w-2/3 bg-neutral-900" />

          <LiveQrBox />
        </div>

        {/* ── PHẢI: 2 bảng vinh danh — Thấp Nhất Dòng & Thấp Nhất Kiện ── */}
        <div className="min-h-0 min-w-0">
          <TopNangSuatPanel />
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-t border-neutral-900 bg-[#070707] px-[clamp(0.75rem,2.4vw,2.4rem)] py-2">
        <div className="font-mono text-[clamp(0.4rem,0.6vw,0.56rem)] uppercase tracking-[0.2em] text-neutral-800">
          HỆ THỐNG CHẤM CÔNG — SAIGON COOP
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono text-[clamp(0.4rem,0.6vw,0.56rem)] uppercase tracking-[0.15em] text-neutral-800">
            QR · GPS · DEVICE ID
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "#3d9e6e", boxShadow: "0 0 8px #3d9e6e" }}
            />
            <span className="font-mono text-[clamp(0.4rem,0.58vw,0.54rem)] uppercase tracking-[0.15em] text-[#3d9e6e]">
              LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function QrDisplay() {
  return (
    <HanoiTimeProvider>
      <QrDisplayInner />
    </HanoiTimeProvider>
  );
}
