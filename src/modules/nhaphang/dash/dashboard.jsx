/* eslint-disable react/prop-types */

import DashLet from "./DashLet";
import DashNhapPut from "./DashNhapPut";


// Giữ nguyên tên export "DashboardNhapHang" và prop "onNavigate" để
// pages/nhaphang/index.jsx không cần sửa gì khi dashboard được tách nhỏ.
const DashboardNhapHang = ({ onNavigate }) => (
  <div className="space-y-8 p-4">
    <DashNhapPut onNavigate={onNavigate} />
    <div className="border-t border-slate-200" />
    <DashLet onNavigate={onNavigate} />
  </div>
);

export default DashboardNhapHang;