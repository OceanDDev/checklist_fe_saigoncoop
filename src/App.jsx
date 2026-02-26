import { Routes, Route, BrowserRouter } from "react-router-dom";
import UserTable from "./modules/AdminCheckList";
import LoginPage from "./modules/Login";
import PrivateRoute from "./middleware/PrivateRoute";
import ThankYouScreen from "./modules/CheckListSucces";
import MainLayout from "./page/home";
import HomeCheckList from "./modules/AdminCheckList/HomeCheckList";
import AdminChecklistForm from "./modules/AdminCheckList/HomeCheckList/Formchecklist";
import ForkliftChecklistMobile from "./modules/CheckList";
import Home from "./modules/Home";
import HomeCheckListBDH from "./modules/BDH/AdminCheckListBDH/HomeCheckListBDH";
import AdminChecklistFormBDH from "./modules/BDH/AdminCheckListBDH/HomeCheckListBDH/FormCheckListBDH";
import ChecklistBDHMobile from "./modules/BDH/CheckListBDH";
import UserTableCheckListBDH from "./modules/BDH/AdminCheckListBDH";
import HomeKPI from "./modules/KPI/HomeKPI";
import HomeStaffKPI from "./modules/KPI/KPINV";
import ToolRotKien from "./modules/Dieuvan/Toolrotkien";
import HomeKeToan from "./modules/KPI/KPINV/KETOAN";
import TableKeToan from "./modules/KPI/KPINV/KETOAN/table";
import { ToastContainer } from "react-toastify";
import ToolXuatTra from "./modules/Dieuvan/ToolXuatTra";
import PhieuSoanHome from "./modules/PhieuSoan";
import HomePhuXe from "./modules/Dieuvan/ToolPhuXe";
import DashboardBDH from "./modules/BDH/DasboardBDH";
import HomeTTB from "./modules/TTB";
import HomeHoTro from "./modules/KPI/KPINV/HOTROKHO";
import TableHoTro from "./modules/KPI/KPINV/HOTROKHO/table";
import TableNhapHang from "./modules/KPI/KPINV/NHAPHANG/table";
import HomeNhapHang from "./modules/KPI/KPINV/NHAPHANG";
import HomeXuatHang from "./modules/KPI/KPINV/XUATHANG";
import TableXuatHang from "./modules/KPI/KPINV/XUATHANG/table";
import HomeBDH from "./modules/KPI/KPIBDH";
import TableBDH from "./modules/KPI/KPIBDH/table";
import HandleTonKho from "./modules/Tonkho";

function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        style={{ zIndex: 999999 }} // đảm bảo nổi trên mọi overlay
      />
      <Routes>
        {/* Trang chủ chỉ vào được nếu đã login */}
        <Route
          path="/checklistform/:formId"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <UserTable />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistbdhform/:formId"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <UserTableCheckListBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <Home />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistBDH"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <HomeCheckListBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklist"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <HomeCheckList />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistformBDH"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <AdminChecklistFormBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard-bdh"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <DashboardBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/checklistform"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <AdminChecklistForm />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistform/edit/:id"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <AdminChecklistForm />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistbdhform/edit/:id"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <AdminChecklistFormBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklist/fill/:id"
          element={<ForkliftChecklistMobile />}
        />
        <Route path="/checklistbdh/fill/:id" element={<ChecklistBDHMobile />} />
        {/* ĐIỀU VẬN */}

        <Route
          path="/dieuvan"
          element={
            <PrivateRoute allowRoles={[1]}>
              <MainLayout>
                {" "}
                <ToolRotKien />{" "}
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/phuxe"
          element={
            <PrivateRoute allowRoles={[21, 22, 24]}>
              <MainLayout>
                {" "}
                <HomePhuXe />{" "}
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/xuattra"
          element={
            <PrivateRoute allowRoles={[4]}>
              <MainLayout>
                {" "}
                <ToolXuatTra />{" "}
              </MainLayout>
            </PrivateRoute>
          }
        />

 {/* TỒN KHO  */}
    <Route
          path="/tonkho"
          element={
            <PrivateRoute allowRoles={[25]}>
              <MainLayout>
                {" "}
                <HandleTonKho/>{" "}
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* TTB */}
        <Route
          path="/ttb"
          element={
            <PrivateRoute allowRoles={[23]}>
              <MainLayout>
                {" "}
                <HomeTTB />{" "}
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/*    KPI KETOAN  */}

        <Route
          path="/kpi"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <HomeKPI />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/kpi/homestaff"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <HomeStaffKPI />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/kpi/homestaff/homeKeToan"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <HomeKeToan />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/kpi/homestaff/homeKeToan/table/:year"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <TableKeToan />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/kpi/homestaff/ho-tro-kho"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <HomeHoTro /> 
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/kpi/homestaff/ho-tro-kho/table/:year"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <TableHoTro />
              </MainLayout>
            </PrivateRoute>
          }
        />

         <Route
          path="/kpi/homestaff/ban-dieu-hanh"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <HomeBDH /> 
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/kpi/homestaff/ban-dieu-hanh/table/:year"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <TableBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />


         <Route
          path="/kpi/homestaff/xuat-hang"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <HomeXuatHang /> 
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/kpi/homestaff/xuat-hang/table/:year"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <TableXuatHang />
              </MainLayout>
            </PrivateRoute>
          }
        />

         <Route
          path="/kpi/homestaff/nhap-hang"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <HomeNhapHang /> 
              </MainLayout>
            </PrivateRoute>
          }

        />
           <Route
          path="/kpi/homestaff/nhap-hang/table/:year"
          element={
            <PrivateRoute allowRoles={[2, 10, 11, 12, 13, 14, 15, 16, 17]}>
              <MainLayout>
                <TableNhapHang /> 
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* PHIEU SOAN */}

        <Route
          path="/phieusoan"
          element={
            <PrivateRoute allowRoles={[20,26]}>
              <MainLayout>
                <PhieuSoanHome />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route path="/thank-you" element={<ThankYouScreen />} />

        {/* Trang login */}
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
