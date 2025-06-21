import { Routes, Route, BrowserRouter } from "react-router-dom";
import UserTable from "./modules/AdminCheckList";
import ForkliftChecklist from "./modules/CheckList";
import LoginPage from "./modules/Login";
import PrivateRoute from "./middleware/PrivateRoute";
import ThankYouScreen from "./modules/CheckListSucces";
import MainLayout from "./page/home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang checklist không cần đăng nhập */}
        <Route path="/saigoncoop/checklist" element={<ForkliftChecklist />} />

        {/* Trang chủ chỉ vào được nếu đã login */}
        <Route
          path="/saigoncoop"
          element={
            <PrivateRoute>
              <MainLayout>
                <UserTable />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route path="/saigoncoop/thank-you" element={<ThankYouScreen />} />

        {/* Trang login */}
        <Route path="/saigoncoop/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
