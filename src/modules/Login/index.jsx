import { useState } from "react";
import { loginService } from "@/services/login.service";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true); // ✅ Bắt đầu loading
      const payload = { username, password };
      const res = await loginService.login(payload);

      if (!res || !res.user) {
        toast.error("Tên đăng nhập hoặc mật khẩu không đúng!", {
          position: "top-right",
        });
        return;
      }

      toast.success("Đăng nhập thành công", { position: "top-right" });

      console.log("✅ [LOGIN] Response:", res);
      console.log("✅ [LOGIN] User:", res.user);
      console.log("✅ [LOGIN] Token:", res.token);

      localStorage.setItem("user", JSON.stringify(res.user));
      localStorage.setItem("name", res.user.name);
      localStorage.setItem("token", res.token);

      console.log("✅ [LOGIN] localStorage đã lưu:");
      console.log("   user →", localStorage.getItem("user"));
      console.log("   name →", localStorage.getItem("name"));
      console.log("   token →", localStorage.getItem("token"));

      const role = res.user.role;
      console.log("✅ [LOGIN] Role:", role, "| Type:", typeof role);

      const target =
        role === 20 || role === 26 || role === 19 ? "/phieusoan" : "/";
      console.log("✅ [LOGIN] Redirect đến:", target);

      window.location.href = target;
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      setError(err?.message || "Đăng nhập thất bại");
      toast.error("Đăng nhập thất bại do lỗi hệ thống!", {
        position: "top-right",
      });
    } finally {
      setLoading(false); // ✅ Kết thúc loading dù thành công hay lỗi
    }
  };

  const handleTogglePassword = () => setShowPassword((prev) => !prev);

  const handleTogglePasswordKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleTogglePassword();
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <ToastContainer />
      <div className="w-full lg:w-1/2 flex justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-md mb-28">
          <img
            src="/img/logonew.png"
            alt="Logo"
            className="h-24 mx-auto mb-10"
          />

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-700"
              >
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                placeholder="abcd"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading} // ✅ Disable input khi đang load
                className="w-full px-4 py-2 mt-1 rounded-lg border border-zinc-300 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading} // ✅ Disable input khi đang load
                  className="w-full px-4 py-2 mt-1 rounded-lg border border-zinc-300 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10 disabled:opacity-60"
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3 top-[38%] cursor-pointer text-zinc-500"
                  onClick={handleTogglePassword}
                  onKeyDown={handleTogglePasswordKeyDown}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            {/* ✅ Nút disabled + spinner khi đang loading */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="w-full lg:w-1/2 relative hidden lg:block">
        <img
          src="/img/loading-containers.webp"
          alt="Agriculture"
          className="w-full h-full object-cover rounded-l-[80px]"
        />
      </div>
    </div>
  );
};

export default LoginPage;
