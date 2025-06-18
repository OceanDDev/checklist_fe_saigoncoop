import { Routes, Route, BrowserRouter } from "react-router-dom";
import Template from "./page/template";

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Template />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
