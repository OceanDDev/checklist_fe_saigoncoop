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
          path="/checklistbdhform/:formId"
          element={
            <PrivateRoute>
              <MainLayout>
                <UserTableCheckListBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />
         <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistBDH"
          element={
            <PrivateRoute>
              <MainLayout>
                <HomeCheckListBDH />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklist"
          element={
            <PrivateRoute>
              <MainLayout>
                <HomeCheckList />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistformBDH"
          element={
            <PrivateRoute>
              <MainLayout>
                <AdminChecklistFormBDH />
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
          path="/checklistform/edit/:id"
          element={
            <PrivateRoute>
              <MainLayout>
                <AdminChecklistForm />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/checklistbdhform/edit/:id"
          element={
            <PrivateRoute>
              <MainLayout>
                <AdminChecklistFormBDH/>
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
          <Route
          path="/checklistbdh/fill/:id"
          element={
                <ChecklistBDHMobile  />
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
