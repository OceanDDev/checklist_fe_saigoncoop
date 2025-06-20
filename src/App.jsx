import { Routes, Route, BrowserRouter } from "react-router-dom";
import UserTable from "./modules/AdminCheckList";
import ForkliftChecklist from "./modules/CheckList";
import LoginPage from "./modules/Login";
import PrivateRoute from "./middleware/PrivateRoute";
import ThankYouScreen from "./modules/CheckListSucces";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang checklist không cần đăng nhập */}
        <Route path="/checklist" element={<ForkliftChecklist />} />

        {/* Trang chủ chỉ vào được nếu đã login */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <UserTable />
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
