/* eslint-disable react/prop-types */
// pages/chamcong/FormCheckInQR.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { chamCongService } from "@/services/chamcong.service";
import { nhanVienService } from "@/services/nhanvien.service";

const SESSION_TTL_MS = 60_000; // khớp với TOKEN_TTL_MS backend

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return (
    <div className="text-center select-none">
      <div className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-foreground leading-none">
        {time}
      </div>
      <div className="mt-2 text-sm text-muted-foreground capitalize">
        {date}
      </div>
    </div>
  );
}

function ResultCard({ result, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  const isSuccess = result.type === "success";
  const isCheckIn = result.action === "checkin";
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
}

function EmployeePreview({ employee, todayStatus }) {
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
        {employee.active ? (
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Hoạt động
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            Bị khóa
          </span>
        )}
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
}

function ModeBtn({ active, onClick, icon, label, activeClass }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
        active
          ? `${activeClass} shadow-md`
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      <span className="text-xs">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function GPSBadge({ gpsState, distance, onRetry }) {
  const config = {
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
      label: `Trong khu vực (${distance}m)`,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    out_range: {
      icon: "🚫",
      label: `Ngoài khu vực (${distance}m)`,
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
  const { icon, label, color } = config[gpsState] ?? config.idle;
  const showRetry = ["idle", "denied", "error", "out_range"].includes(gpsState);
  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${color}`}
    >
      <span className="shrink-0 text-sm">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {showRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity text-[11px]"
        >
          Thử lại
        </button>
      )}
      {gpsState === "loading" && (
        <span className="shrink-0 animate-spin text-sm">◌</span>
      )}
    </div>
  );
}

const COMPANY_LOCATION = {
  latitude: 10.890972,
  longitude: 106.748611,
  RADIUS_METERS: 200,
};

function tinhKhoangCach(lat1, lon1, lat2, lon2) {
  const R = 6371e3,
    rad = Math.PI / 180;
  const φ1 = lat1 * rad,
    φ2 = lat2 * rad;
  const Δφ = (lat2 - lat1) * rad,
    Δλ = (lon2 - lon1) * rad;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FormCheckInQR() {
  const { token } = useParams();
  const [ma, setMa] = useState("");
  const [mode, setMode] = useState("checkin");
  const [loading, setLoading] = useState(false);
  const [lookupEmployee, setLookupEmployee] = useState(null);
  const [result, setResult] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const [tokenValid, setTokenValid] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const tokenExpiryRef = useRef(0);

  const [gpsTimestamp, setGpsTimestamp] = useState(null);

  const [gpsState, setGpsState] = useState("idle");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsDistance, setGpsDistance] = useState(null);

  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Kiểm tra QR token ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    const check = async () => {
      try {
        const res = await chamCongService.getCurrentQr();
        const isValid = res.token === token;
        setTokenValid(isValid);
        if (isValid) {
          tokenExpiryRef.current = res.sessionExpiry; // ✅ lưu sessionExpiry từ server
        }
      } catch {
        setTokenValid(false);
      }
    };
    check();
  }, [token]);

  // ── Tự động hết hạn phiên — dùng sessionExpiry từ server ─────────────────
  useEffect(() => {
    if (tokenValid !== true) return;

    const sessionExpiry = tokenExpiryRef.current;
    const now = Date.now();
    const timeLeft = sessionExpiry - now; // thời gian thực còn lại từ server

    if (timeLeft <= 0) {
      setSessionExpired(true);
      return;
    }

    const currentMode = mode;
    const warnAt = Math.max(0, timeLeft - 5_000);

    const warnTimer = setTimeout(() => {
      setResult({
        type: "error",
        action: currentMode,
        message: "⚠️ Phiên sắp hết hạn! Trang sẽ đóng sau 5 giây.",
      });
    }, warnAt);

    const expireTimer = setTimeout(() => setSessionExpired(true), timeLeft);

    return () => {
      clearTimeout(warnTimer);
      clearTimeout(expireTimer);
    };
  }, [tokenValid]);

  // ── Tự động hết hạn phiên ─────────────────────────────────────────────────
  useEffect(() => {
    if (tokenValid !== true) return;
    const currentMode = mode; // snapshot
    const warnTimer = setTimeout(() => {
      setResult({
        type: "error",
        action: currentMode,
        message: "⚠️ Phiên sắp hết hạn! Trang sẽ đóng sau 5 giây.",
      });
    }, SESSION_TTL_MS - 5_000);
    const expireTimer = setTimeout(
      () => setSessionExpired(true),
      SESSION_TTL_MS,
    );
    return () => {
      clearTimeout(warnTimer);
      clearTimeout(expireTimer);
    };
  }, [tokenValid]);

  // ── Lookup employee ───────────────────────────────────────────────────────
  useEffect(() => {
    setLookupEmployee(null);
    setTodayStatus(null);
    if (ma.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        const res = await nhanVienService.traCuu(ma.trim());
        if (res?.data) setLookupEmployee(res.data);
      } catch {
        setLookupEmployee(null);
      }
      try {
        const statusRes = await chamCongService.trangThaiHomNay(
          ma.trim().toUpperCase(),
        );
        const d = statusRes?.data || statusRes;
        if (d?.da_checkin && d?.da_checkout) setTodayStatus("completed");
        else if (d?.da_checkin) setTodayStatus("checked_in");
        else setTodayStatus("none");
      } catch {
        setTodayStatus(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [ma]);

  // ── GPS ───────────────────────────────────────────────────────────────────
  const getGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    setGpsCoords(null);
    setGpsDistance(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = tinhKhoangCach(
          latitude,
          longitude,
          COMPANY_LOCATION.latitude,
          COMPANY_LOCATION.longitude,
        );
        setGpsTimestamp(Date.now());
        setGpsCoords({ latitude, longitude });
        setGpsDistance(Math.round(dist));
        setGpsState(
          dist <= COMPANY_LOCATION.RADIUS_METERS ? "success" : "out_range",
        );
      },
      (err) =>
        setGpsState(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    getGPS();
  }, [getGPS]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const checkoutWithoutCheckin = mode === "checkout" && todayStatus === "none";

  const alreadyDone =
    (mode === "checkin" &&
      (todayStatus === "checked_in" || todayStatus === "completed")) ||
    (mode === "checkout" && todayStatus === "completed");

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const maTrim = ma.trim().toUpperCase();
    if (!maTrim) {
      inputRef.current?.focus();
      return;
    }
    if (!tokenValid) {
      setResult({
        type: "error",
        action: mode,
        message: "Mã QR đã hết hạn. Vui lòng quét lại mã mới.",
      });
      return;
    }
    if (gpsState !== "success") {
      setResult({
        type: "error",
        action: mode,
        message:
          gpsState === "out_range"
            ? `Bạn đang ở ngoài khu vực công ty (${gpsDistance}m).`
            : gpsState === "denied"
              ? "Vui lòng cấp quyền GPS để chấm công."
              : gpsState === "loading"
                ? "Đang lấy vị trí GPS, vui lòng đợi..."
                : "Không lấy được vị trí GPS. Hãy thử lại.",
      });
      return;
    }
    if (checkoutWithoutCheckin) {
      setResult({
        type: "error",
        action: mode,
        message:
          "Nhân viên chưa check-in hôm nay. Không thể thực hiện check-out.",
      });
      return;
    }
    if (mode === "checkin" && todayStatus === "checked_in") {
      setResult({
        type: "error",
        action: mode,
        message: "Nhân viên đã check-in hôm nay rồi. Vui lòng chọn Check-Out.",
      });
      return;
    }
    if (mode === "checkin" && todayStatus === "completed") {
      setResult({
        type: "error",
        action: mode,
        message: "Nhân viên đã chấm công đủ vào/ra hôm nay rồi.",
      });
      return;
    }
    if (mode === "checkout" && todayStatus === "completed") {
      setResult({
        type: "error",
        action: mode,
        message:
          "Nhân viên đã check-out hôm nay rồi. Không thể chấm công thêm.",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await chamCongService.checkChamCongQR({
        ma_nhan_vien: maTrim,
        action: mode,
        qr_token: token,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        gps_timestamp: gpsTimestamp,
      });
      const data = res?.data || res;
      setSuccessData({
        action: mode,
        ten: data.ten_nhan_vien || lookupEmployee?.ten_nhan_vien,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.";
      if (e?.response?.status === 403 && msg.includes("QR"))
        setTokenValid(false);
      setResult({ type: "error", action: mode, message: msg });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading &&
    !!ma.trim() &&
    tokenValid === true &&
    gpsState === "success" &&
    !checkoutWithoutCheckin &&
    !alreadyDone;

  // ─── Màn hình thành công ──────────────────────────────────────────────────
  if (successData) {
    const isCheckIn = successData.action === "checkin";
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div
          className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl shadow-2xl ${
            isCheckIn
              ? "bg-emerald-500/20 border-2 border-emerald-500/40"
              : "bg-orange-500/20 border-2 border-orange-500/40"
          }`}
        >
          {isCheckIn ? "✅" : "👋"}
        </div>
        <div className="space-y-2">
          <h2
            className={`text-2xl font-bold ${
              isCheckIn ? "text-emerald-400" : "text-orange-400"
            }`}
          >
            {isCheckIn ? "Check-In Thành Công!" : "Check-Out Thành Công!"}
          </h2>
          {successData.ten && (
            <p className="text-lg font-semibold text-foreground">
              {successData.ten}
            </p>
          )}
          <p className="font-mono text-sm text-muted-foreground">
            {successData.time}
          </p>
        </div>
        <button
          onClick={() => window.close()}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Đóng trang này
        </button>
      </div>
    );
  }

  // ─── Phiên hết hạn (token invalid hoặc ở quá lâu) ────────────────────────
  if (sessionExpired || tokenValid === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="text-6xl animate-bounce">⏰</div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {sessionExpired ? "Phiên đã hết hạn" : "Mã QR đã hết hạn"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            {sessionExpired
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
  }

  // ─── Form chính ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-8 sm:py-12">
      {result && (
        <ResultCard result={result} onDismiss={() => setResult(null)} />
      )}

      <div className="w-full max-w-sm space-y-5">
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

        <div className="bg-card border border-border rounded-2xl px-6 py-6 shadow-sm">
          <LiveClock />
        </div>

        <GPSBadge gpsState={gpsState} distance={gpsDistance} onRetry={getGPS} />

        <div className="bg-card border border-border rounded-2xl p-1.5 flex gap-1 shadow-sm">
          <ModeBtn
            active={mode === "checkin"}
            onClick={() => setMode("checkin")}
            icon="▶"
            label="Check-In"
            activeClass="bg-emerald-500 text-black"
          />
          <ModeBtn
            active={mode === "checkout"}
            onClick={() => setMode("checkout")}
            icon="◼"
            label="Check-Out"
            activeClass="bg-orange-500 text-black"
          />
        </div>

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
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="VD: NV001"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3.5 text-lg font-mono font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal outline-none focus:ring-2 focus:ring-ring transition-all tracking-widest text-center"
            />
          </div>

          <EmployeePreview
            employee={lookupEmployee}
            todayStatus={todayStatus}
          />

          {alreadyDone && ma.trim().length >= 2 && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/8 border border-purple-500/20 text-purple-400 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="shrink-0 mt-0.5">🔒</span>
              <span>
                {todayStatus === "completed"
                  ? "Nhân viên đã chấm công đủ vào/ra hôm nay."
                  : "Nhân viên đã check-in hôm nay. Vui lòng chọn Check-Out."}
              </span>
            </div>
          )}

          {checkoutWithoutCheckin && ma.trim().length >= 2 && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>
                Nhân viên <strong>chưa check-in</strong> hôm nay. Vui lòng
                check-in trước khi check-out.
              </span>
            </div>
          )}

          {gpsState === "out_range" && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-xs">
              <span className="shrink-0 mt-0.5">🚫</span>
              <span>
                Bạn đang ở ngoài khu vực cho phép ({gpsDistance}m). Vui lòng di
                chuyển vào gần công ty trong bán kính{" "}
                {COMPANY_LOCATION.RADIUS_METERS}m.
              </span>
            </div>
          )}

          {gpsState === "denied" && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-yellow-400 text-xs">
              <span className="shrink-0 mt-0.5">🔒</span>
              <span>
                Vui lòng cấp quyền truy cập vị trí trong cài đặt trình duyệt để
                sử dụng tính năng chấm công.
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${
              mode === "checkin"
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                : "bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20"
            }`}
          >
            {loading ? (
              <>
                <span className="animate-spin text-lg">◌</span>
                <span>Đang xử lý...</span>
              </>
            ) : gpsState === "loading" || tokenValid === null ? (
              <>
                <span className="animate-spin text-lg">◌</span>
                <span>Đang kiểm tra...</span>
              </>
            ) : mode === "checkin" ? (
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
