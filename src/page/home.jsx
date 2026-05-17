/* eslint-disable react/prop-types */
import HeaderCheckList from "./header";

const MainLayout = ({ children }) => {
  return (
    <div>
      <HeaderCheckList />
      <main style={{ paddingTop: "var(--header-h)" }}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
