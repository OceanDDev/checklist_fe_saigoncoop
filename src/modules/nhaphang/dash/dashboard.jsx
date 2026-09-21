/* eslint-disable react/prop-types */

import DashASN from "./dashAsn";
import DashHangTrungChuyen from "./DashHangTrungChuyen";
import DashLet from "./DashLet";
import DashNhapPut from "./DashNhapPut";

// Giữ nguyên tên export "DashboardNhapHang" và prop "onNavigate" để
// pages/nhaphang/index.jsx không cần sửa gì khi dashboard được tách nhỏ.
const DashboardNhapHang = ({ onNavigate }) => (
  <div className="space-y-8 p-4">
    <DashNhapPut onNavigate={onNavigate} />
    <div className="border-t border-slate-200" />
    <DashHangTrungChuyen onNavigate={onNavigate} />
    <div className="border-t border-slate-200" />
    <DashLet onNavigate={onNavigate} />
    <div className="border-t border-slate-200" />
    <DashASN onNavigate={onNavigate} />
  </div>
);

export default DashboardNhapHang;
