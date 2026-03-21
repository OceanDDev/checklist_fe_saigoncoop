/* eslint-disable react/prop-types */
// pages/chamcong/FormCheckInQR.jsx
import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useParams } from "react-router-dom";
import { chamCongService } from "@/services/chamcong.service";
import { nhanVienService } from "@/services/nhanvien.service";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const SESSION_TTL_MS = 60_000;

const COMPANY_LOCATION = {
  latitude: 10.890972,
  longitude: 106.748611,
  RADIUS_METERS: 200,
};

const GPS_CONFIG = {
  idle: {
    icon: "📍",
    label: "Chưa xác định vị trí",
    color: "text-muted-foreground bg-muted/40 border-border",
  },
  loading: {
    icon: "⌛",
    label: "Đang lấy vị trí...",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  success: {
    icon: "✅",
    label: null,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  out_range: {
    icon: "🚫",
    label: null,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  denied: {
    icon: "🔒",
    label: "Bị từ chối quyền GPS",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  },
  error: {
    icon: "⚠️",
    label: "Lỗi lấy vị trí GPS",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  },
};

// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════

/** Haversine distance (metres) */
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6_371_000,
    r = Math.PI / 180;
  const φ1 = lat1 * r,
    φ2 = lat2 * r;
  const Δφ = (lat2 - lat1) * r,
    Δλ = (lon2 - lon1) * r;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** FingerprintJS — module-level singleton, never re-initialised */
let _fpPromise = null;
async function getDeviceId() {
  if (!_fpPromise)
    _fpPromise = FingerprintJS.load()
      .then((fp) => fp.get())
      .then((r) => r.visitorId);
  return _fpPromise;
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════════

/** Ticking clock — re-renders only this component, not the parent */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** GPS — returns { state, coords, distance, timestamp, retry } */
function useGPS() {
  const [state, setState] = useState("idle");
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [distance, setDistance] = useState(null); // metres, rounded
  const [timestamp, setTs] = useState(null);

  const acquire = useCallback(() => {
    if (!navigator.geolocation) {
      setState("error");
      return;
    }
    setState("loading");
    setCoords(null);
    setDistance(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        const dist = calcDistance(
          latitude,
          longitude,
          COMPANY_LOCATION.latitude,
          COMPANY_LOCATION.longitude,
        );
        setCoords({ latitude, longitude });
        setDistance(Math.round(dist));
        setTs(Date.now());
        setState(
          dist <= COMPANY_LOCATION.RADIUS_METERS ? "success" : "out_range",
        );
      },
      (err) =>
        setState(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }, []);

  // Auto-acquire once on mount
  useEffect(() => {
    acquire();
  }, [acquire]);

  return { state, coords, distance, timestamp, retry: acquire };
}

/** QR-token validation + session expiry */
function useQrSession(token) {
  const [valid, setValid] = useState(null);
  const [expired, setExpired] = useState(false);
  const expiryRef = useRef(0);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    let cancelled = false;

    // ✅ Dùng validate endpoint thay vì getCurrentQr
    chamCongService.validateQrToken(token)
      .then((res) => {
        if (cancelled) return;
        setValid(res.valid);
        if (res.valid) expiryRef.current = res.sessionExpiry;
      })
      .catch(() => { if (!cancelled) setValid(false); });

    return () => { cancelled = true; };
  }, [token]);

  // Session countdown — giữ nguyên
  useEffect(() => {
    if (valid !== true) return;
    const left = expiryRef.current - Date.now();
    if (left <= 0) { setExpired(true); return; }
    const id = setTimeout(() => setExpired(true), left);
    return () => clearTimeout(id);
  }, [valid]);

  return { valid, expired, expiryMs: expiryRef.current };
}

/** Employee lookup + today status — debounced 400 ms */
function useEmployeeLookup(ma) {
  const [employee, setEmployee] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null); // null | "none" | "checked_in" | "completed"

  useEffect(() => {
    setEmployee(null);
    setTodayStatus(null);
    const trimmed = ma.trim();
    if (trimmed.length < 2) return;

    const id = setTimeout(async () => {
      const upper = trimmed.toUpperCase();
      await Promise.allSettled([
        nhanVienService
          .traCuu(trimmed)
          .then((res) => {
            if (res?.data) setEmployee(res.data);
          })
          .catch(() => {}),

        chamCongService
          .trangThaiHomNay(upper)
          .then((res) => {
            const d = res?.data ?? res;
            if (d?.da_checkin && d?.da_checkout) setTodayStatus("completed");
            else if (d?.da_checkin) setTodayStatus("checked_in");
            else setTodayStatus("none");
          })
          .catch(() => {}),
      ]);
    }, 400);

    return () => clearTimeout(id);
  }, [ma]);

  return { employee, todayStatus };
}

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS  (all memo'd — only re-render when props change)
// ═══════════════════════════════════════════════════════════════════

const LiveClock = memo(function LiveClock() {
  const now = useClock();
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
});

const SessionCountdown = memo(function SessionCountdown({ expiryMs }) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(
      () => setTimeLeft(Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))),
      200,
    );
    return () => clearInterval(id);
  }, [expiryMs]);

  const pct = (timeLeft / (SESSION_TTL_MS / 1000)) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Form hết hạn sau</span>
        <span
          className={`font-mono font-bold tabular-nums ${isUrgent ? "text-red-400" : "text-foreground"}`}
        >
          {timeLeft}s
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${isUrgent ? "bg-red-500" : pct > 50 ? "bg-emerald-500" : "bg-yellow-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

const GPSBadge = memo(function GPSBadge({ state, distance, onRetry }) {
  const cfg = GPS_CONFIG[state] ?? GPS_CONFIG.idle;
  const label =
    state === "success"
      ? `Trong khu vực (${distance}m)`
      : state === "out_range"
        ? `Ngoài khu vực (${distance}m)`
        : cfg.label;
  const showRetry = ["idle", "denied", "error", "out_range"].includes(state);

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${cfg.color}`}
    >
      <span className="shrink-0 text-sm">{cfg.icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {showRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity text-[11px]"
        >
          Thử lại
        </button>
      )}
      {state === "loading" && (
        <span className="shrink-0 animate-spin text-sm">◌</span>
      )}
    </div>
  );
});

const ModeToggle = memo(function ModeToggle({ mode, onChange }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-1.5 flex gap-1 shadow-sm">
      {[
        {
          id: "checkin",
          icon: "▶",
          label: "Check-In",
          active: "bg-emerald-500 text-black",
        },
        {
          id: "checkout",
          icon: "◼",
          label: "Check-Out",
          active: "bg-orange-500 text-black",
        },
      ].map(({ id, icon, label, active }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
            mode === id
              ? `${active} shadow-md`
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <span className="text-xs">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
});

const EmployeePreview = memo(function EmployeePreview({
  employee,
  todayStatus,
}) {
  if (!employee) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
        {employee.ten_nhan_vien?.charAt(0)?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-foreground truncate">
          {employee.ten_nhan_vien}
        </div>
        <div className="text-xs text-muted-foreground">
          {employee.bo_phan}
          {employee.chuc_vu ? ` · ${employee.chuc_vu}` : ""}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${employee.active ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}
        >
          {employee.active ? "Hoạt động" : "Bị khóa"}
        </span>
        {todayStatus === "checked_in" && (
          <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            Đã check-in
          </span>
        )}
        {todayStatus === "completed" && (
          <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            Đã check-out
          </span>
        )}
      </div>
    </div>
  );
});

/** Inline warning banner */
const WarnBanner = memo(function WarnBanner({ icon, children, color = "red" }) {
  const c =
    color === "yellow"
      ? "bg-yellow-500/8 border-yellow-500/20 text-yellow-400"
      : color === "purple"
        ? "bg-purple-500/8 border-purple-500/20 text-purple-400"
        : "bg-red-500/8 border-red-500/20 text-red-400";
  return (
    <div
      className={`flex items-start gap-2 px-3.5 py-2.5 rounded-xl border text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${c}`}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
});

/** Toast — normal errors + fraud warning */
const ResultToast = memo(function ResultToast({ result, onDismiss }) {
  const isFraud = result.blocked_by === "device_id";
  const isSuccess = result.type === "success";
  const isCheckIn = result.action === "checkin";
  const ttl = isFraud ? 8_000 : 4_000;

  useEffect(() => {
    const id = setTimeout(onDismiss, ttl);
    return () => clearTimeout(id);
  }, [onDismiss, ttl]);

  if (isFraud)
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border-2 border-red-500/60 shadow-2xl shadow-red-500/20 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-red-600 px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <div className="font-black text-white text-sm tracking-wide uppercase">
              Phát Hiện Chấm Công Hộ
            </div>
            <div className="text-red-200 text-[11px] font-medium mt-0.5">
              Vi phạm nội quy lao động
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/60 hover:text-white transition-colors text-lg leading-none shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="bg-red-950/95 backdrop-blur-xl px-5 py-4 space-y-3">
          <p className="text-red-100 text-sm leading-relaxed">
            Thiết bị này{" "}
            <span className="font-bold text-white">
              đã được dùng để chấm công cho nhân viên khác
            </span>{" "}
            hôm nay.
          </p>
          <div className="bg-red-900/50 border border-red-500/30 rounded-xl px-4 py-3 space-y-1.5">
            {[
              [
                "⚠️",
                <>
                  Hành vi chấm công hộ sẽ bị{" "}
                  <span className="font-bold text-red-100">
                    lập biên bản kỷ luật
                  </span>{" "}
                  theo quy định công ty.
                </>,
              ],
              [
                "📋",
                <>
                  Sự việc này đã được{" "}
                  <span className="font-bold text-red-100">
                    ghi nhận và lưu lại
                  </span>{" "}
                  trong hệ thống.
                </>,
              ],
              ["📞", "Liên hệ bộ phận HR nếu đây là nhầm lẫn."],
            ].map(([icon, text], i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs text-red-200"
              >
                <span className="shrink-0 mt-0.5">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border shadow-2xl px-5 py-4 flex items-start gap-4 animate-in slide-in-from-bottom-4 fade-in duration-300 backdrop-blur-xl ${
        isSuccess
          ? isCheckIn
            ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
            : "bg-orange-950/90 border-orange-500/40 text-orange-100"
          : "bg-red-950/90 border-red-500/40 text-red-100"
      }`}
    >
      <div className="text-2xl mt-0.5 shrink-0">
        {isSuccess ? (isCheckIn ? "✅" : "👋") : "❌"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">
          {isSuccess
            ? isCheckIn
              ? "Check-in thành công!"
              : "Check-out thành công!"
            : "Thất bại"}
        </div>
        {result.ten && (
          <div className="text-sm opacity-90 mt-0.5 truncate">{result.ten}</div>
        )}
        {result.time && (
          <div className="text-xs opacity-70 mt-1 font-mono">{result.time}</div>
        )}
        {result.message && !result.ten && (
          <div className="text-sm opacity-90 mt-0.5">{result.message}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-current opacity-40 hover:opacity-80 transition-opacity shrink-0 text-lg leading-none mt-0.5"
      >
        ✕
      </button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN — Success
// ═══════════════════════════════════════════════════════════════════
const SuccessScreen = memo(function SuccessScreen({ data }) {
  const isCheckIn = data.action === "checkin";
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl shadow-2xl ${isCheckIn ? "bg-emerald-500/20 border-2 border-emerald-500/40" : "bg-orange-500/20 border-2 border-orange-500/40"}`}
      >
        {isCheckIn ? "✅" : "👋"}
      </div>
      <div className="space-y-2">
        <h2
          className={`text-2xl font-bold ${isCheckIn ? "text-emerald-400" : "text-orange-400"}`}
        >
          {isCheckIn ? "Check-In Thành Công!" : "Check-Out Thành Công!"}
        </h2>
        {data.ten && (
          <p className="text-lg font-semibold text-foreground">{data.ten}</p>
        )}
        <p className="font-mono text-sm text-muted-foreground">{data.time}</p>
      </div>
      <button
        onClick={() => window.close()}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
      >
        Đóng trang này
      </button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN — Expired / Invalid QR
// ═══════════════════════════════════════════════════════════════════
const ExpiredScreen = memo(function ExpiredScreen({ isExpired }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="text-6xl animate-bounce">⏰</div>
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {isExpired ? "Phiên đã hết hạn" : "Mã QR đã hết hạn"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          {isExpired
            ? "Bạn đã ở trang này quá lâu. Vui lòng quét lại mã QR mới tại văn phòng."
            : "Mã QR này không còn hợp lệ. Vui lòng quét lại mã mới trên màn hình tại văn phòng."}
        </p>
      </div>
      <button
        onClick={() => window.close()}
        className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors"
      >
        Đóng trang này
      </button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function FormCheckInQR() {
  const { token } = useParams();

  // ── State ──────────────────────────────────────────────────────
  const [ma, setMa] = useState("");
  const [mode, setMode] = useState("checkin");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // toast
  const [successData, setSuccess] = useState(null); // success screen

  // ── Hooks ──────────────────────────────────────────────────────
  const {
    valid: tokenValid,
    expired: sessionExpired,
    expiryMs,
  } = useQrSession(token);
  const gps = useGPS();
  const { employee, todayStatus } = useEmployeeLookup(ma);

  const inputRef = useRef(null);

  // Pre-warm FingerprintJS on mount
  useEffect(() => {
    inputRef.current?.focus();
    getDeviceId().catch(() => {});
  }, []);

  // ── Derived flags ──────────────────────────────────────────────
  const checkoutWithoutCheckin = mode === "checkout" && todayStatus === "none";
  const alreadyDone = useMemo(
    () =>
      (mode === "checkin" &&
        (todayStatus === "checked_in" || todayStatus === "completed")) ||
      (mode === "checkout" && todayStatus === "completed"),
    [mode, todayStatus],
  );

  const canSubmit =
    !loading &&
    !!ma.trim() &&
    tokenValid === true &&
    gps.state === "success" &&
    !checkoutWithoutCheckin &&
    !alreadyDone;

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const maTrim = ma.trim().toUpperCase();
    if (!maTrim) {
      inputRef.current?.focus();
      return;
    }

    // ── Client-side guards (fast path — no network) ──────────────
    if (!tokenValid) {
      return setResult({
        type: "error",
        action: mode,
        message: "Mã QR đã hết hạn. Vui lòng quét lại mã mới.",
      });
    }
    if (gps.state !== "success") {
      const msg =
        gps.state === "out_range"
          ? `Bạn đang ở ngoài khu vực công ty (${gps.distance}m).`
          : gps.state === "denied"
            ? "Vui lòng cấp quyền GPS để chấm công."
            : gps.state === "loading"
              ? "Đang lấy vị trí GPS, vui lòng đợi..."
              : "Không lấy được vị trí GPS. Hãy thử lại.";
      return setResult({ type: "error", action: mode, message: msg });
    }
    if (checkoutWithoutCheckin) {
      return setResult({
        type: "error",
        action: mode,
        message:
          "Nhân viên chưa check-in hôm nay. Không thể thực hiện check-out.",
      });
    }
    if (mode === "checkin" && todayStatus === "checked_in") {
      return setResult({
        type: "error",
        action: mode,
        message: "Nhân viên đã check-in hôm nay rồi. Vui lòng chọn Check-Out.",
      });
    }
    if (mode === "checkin" && todayStatus === "completed") {
      return setResult({
        type: "error",
        action: mode,
        message: "Nhân viên đã chấm công đủ vào/ra hôm nay rồi.",
      });
    }
    if (mode === "checkout" && todayStatus === "completed") {
      return setResult({
        type: "error",
        action: mode,
        message:
          "Nhân viên đã check-out hôm nay rồi. Không thể chấm công thêm.",
      });
    }

    // ── API call ─────────────────────────────────────────────────
    setLoading(true);
    try {
      const device_id = await getDeviceId();

      const res = await chamCongService.checkChamCongQR({
        ma_nhan_vien: maTrim,
        action: mode,
        qr_token: token,
        latitude: gps.coords.latitude,
        longitude: gps.coords.longitude,
        gps_timestamp: gps.timestamp,
        device_id,
      });

      const data = res?.data ?? res;
      setSuccess({
        action: mode,
        ten: data.ten_nhan_vien ?? employee?.ten_nhan_vien,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    } catch (e) {
      // requestService throws err.response?.data (plain object) or the raw Error
      const msg = e?.message ?? "Có lỗi xảy ra, vui lòng thử lại.";
      const blockedBy = e?.blocked_by ?? null;

      // QR expired mid-session
      if (msg.includes("QR") || msg.includes("hết hạn")) {
        // setTokenValid is managed by useQrSession — just show error
      }

      setResult({
        type: "error",
        action: mode,
        message: msg,
        blocked_by: blockedBy,
      });
    } finally {
      setLoading(false);
    }
  }, [
    ma,
    mode,
    tokenValid,
    gps,
    checkoutWithoutCheckin,
    todayStatus,
    employee,
    token,
  ]);

  // ══════════════════════════════════════════════════════════════
  // RENDER BRANCHES
  // ══════════════════════════════════════════════════════════════
  if (successData) return <SuccessScreen data={successData} />;
  if (sessionExpired || tokenValid === false)
    return <ExpiredScreen isExpired={sessionExpired} />;

  const isCheckIn = mode === "checkin";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-8 sm:py-12">
      {result && (
        <ResultToast result={result} onDismiss={() => setResult(null)} />
      )}

      <div className="w-full max-w-sm space-y-5">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/img/logonew.png"
            alt="Logo công ty"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-md"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Hệ Thống Chấm Công
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quét mã QR · check-in / check-out
            </p>
          </div>
        </div>

        {/* Clock */}
        <div className="bg-card border border-border rounded-2xl px-6 py-6 shadow-sm">
          <LiveClock />
        </div>

        {/* Session countdown */}
        {tokenValid === true && expiryMs > 0 && (
          <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
            <SessionCountdown expiryMs={expiryMs} />
          </div>
        )}

        {/* GPS */}
        <GPSBadge
          state={gps.state}
          distance={gps.distance}
          onRetry={gps.retry}
        />

        {/* Mode toggle */}
        <ModeToggle mode={mode} onChange={setMode} />

        {/* Form card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Mã Nhân Viên
            </label>
            <input
              ref={inputRef}
              type="text"
              value={ma}
              onChange={(e) => setMa(e.target.value.toUpperCase())}
              onKeyDown={(e) =>
                e.key === "Enter" && canSubmit && handleSubmit()
              }
              placeholder="VD: NV001"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3.5 text-lg font-mono font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal outline-none focus:ring-2 focus:ring-ring transition-all tracking-widest text-center"
            />
          </div>

          <EmployeePreview employee={employee} todayStatus={todayStatus} />

          {/* Inline warnings — only one shows at a time, priority order */}
          {alreadyDone && ma.trim().length >= 2 && (
            <WarnBanner icon="🔒" color="purple">
              {todayStatus === "completed"
                ? "Nhân viên đã chấm công đủ vào/ra hôm nay."
                : "Nhân viên đã check-in hôm nay. Vui lòng chọn Check-Out."}
            </WarnBanner>
          )}
          {checkoutWithoutCheckin && ma.trim().length >= 2 && (
            <WarnBanner icon="⚠️">
              Nhân viên <strong>chưa check-in</strong> hôm nay. Vui lòng
              check-in trước khi check-out.
            </WarnBanner>
          )}
          {gps.state === "out_range" && (
            <WarnBanner icon="🚫">
              Bạn đang ở ngoài khu vực cho phép ({gps.distance}m). Vui lòng di
              chuyển vào gần công ty trong bán kính{" "}
              {COMPANY_LOCATION.RADIUS_METERS}m.
            </WarnBanner>
          )}
          {gps.state === "denied" && (
            <WarnBanner icon="🔒" color="yellow">
              Vui lòng cấp quyền truy cập vị trí trong cài đặt trình duyệt để sử
              dụng tính năng chấm công.
            </WarnBanner>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${
              isCheckIn
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                : "bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20"
            }`}
          >
            {loading || gps.state === "loading" || tokenValid === null ? (
              <>
                <span className="animate-spin text-lg">◌</span>
                <span>{loading ? "Đang xử lý..." : "Đang kiểm tra..."}</span>
              </>
            ) : isCheckIn ? (
              <>
                <span>▶</span>
                <span>Xác Nhận Check-In</span>
              </>
            ) : (
              <>
                <span>◼</span>
                <span>Xác Nhận Check-Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
