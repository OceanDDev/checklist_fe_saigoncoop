import { useState } from 'react';
import { loginService } from '@/services/login.service';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

 const handleLogin = async (e) => {
  e.preventDefault();
  setError('');

  try {
    const payload = { username, password };
    const res = await loginService.login(payload);

    // 👇 KIỂM TRA NẾU ĐĂNG NHẬP THẤT BẠI
    if (!res || !res.user) {
      toast.error('Tên đăng nhập hoặc mật khẩu không đúng!', {
        position: 'top-right',
      });
      return;
    }

    // 👇 THÀNH CÔNG MỚI VÀO ĐÂY
    toast.success('Đăng nhập thành công! 👋', { position: 'top-right' });
    localStorage.setItem('user', JSON.stringify(res.user));
    setTimeout(() => navigate('/'), 1000);
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    setError(err?.message || 'Đăng nhập thất bại');
    toast.error('Đăng nhập thất bại do lỗi hệ thống!', {
      position: 'top-right',
    });
  }
};


  return (
    <div className="min-h-screen flex flex-col lg:flex-row ">
      <ToastContainer />
      <div className="w-full lg:w-1/2 flex justify-center items-center px-6 py-12 bg-white ">
        <div className="w-full max-w-md mb-28">
          <img src="/img/logonew.png" alt="Logo" className="h-24 mx-auto mb-10" />

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tên đăng nhập
              </label>
              <input
                type="text"
                placeholder="abcd"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 mt-1 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 mt-1 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition duration-200"
            >
              Đăng nhập
            </button>
          </form>
        </div>
      </div>

      {/* Right: Image */}
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
