/* eslint-disable react/prop-types */
import HeaderCheckList from "./header";

const MainLayout = ({ children }) => {
  return (
    <div>
      <HeaderCheckList />
      {/* fallback 88px cho lần render đầu tiên trước khi --header-h được đo xong */}
      <main style={{ paddingTop: "var(--header-h, 88px)" }}>{children}</main>
    </div>
  );
};

export default MainLayout;