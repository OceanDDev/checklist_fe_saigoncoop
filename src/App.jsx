import { Routes, Route, BrowserRouter } from "react-router-dom";
import UserTable from "./modules/AdminCheckList";
import LoginPage from "./modules/Login";
import PrivateRoute from "./middleware/PrivateRoute";
import ThankYouScreen from "./modules/CheckListSucces";
import MainLayout from "./page/home";
import HomeCheckList from "./modules/AdminCheckList/HomeCheckList";
import AdminChecklistForm from "./modules/AdminCheckList/HomeCheckList/Formchecklist";
import ForkliftChecklistMobile from "./modules/CheckList";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Trang chủ chỉ vào được nếu đã login */}
        <Route
          path="/checklistform/:formId"
          element={
            <PrivateRoute>
              <MainLayout>
                <UserTable />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout>
                <HomeCheckList />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistform"
          element={
            <PrivateRoute>
              <MainLayout>
                <AdminChecklistForm />
              </MainLayout>
            </PrivateRoute>
          }
        />
         <Route
          path="/checklist/fill/:id"
          element={
                <ForkliftChecklistMobile  />
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
