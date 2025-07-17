import { Routes, Route, BrowserRouter } from "react-router-dom";
import UserTable from "./modules/AdminCheckList";
import LoginPage from "./modules/Login";
import PrivateRoute from "./middleware/PrivateRoute";
import ThankYouScreen from "./modules/CheckListSucces";
import MainLayout from "./page/home";
import HomeCheckList from "./modules/AdminCheckList/HomeCheckList";
import AdminChecklistForm from "./modules/AdminCheckList/HomeCheckList/Formchecklist";
import ForkliftChecklistMobile from "./modules/CheckList";
import ToolRotKien from "./modules/Homedieuvan/Toolrotkien";

function App() {
  return (
    <BrowserRouter>
      <Routes>



        {/* CHECKLIST */}
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
          path="/"
          element={
            <PrivateRoute allowRoles={[0]}>
              <MainLayout>
                <HomeCheckList />
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
          path="/checklist/fill/:id"
          element={<ForkliftChecklistMobile />}
        />

        <Route path="/thank-you" element={<ThankYouScreen />} />

        <Route path="/login" element={<LoginPage />} />




        {/* ĐIỀU VẬN */}

         <Route
          path="/dieuvan"
          element={
            <PrivateRoute allowRoles={[1]}>
              <MainLayout>
                <ToolRotKien/>
          </MainLayout>
            </PrivateRoute>
          }
        />




        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
