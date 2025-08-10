/* eslint-disable react/prop-types */
import HeaderCheckList from "./header";

const MainLayout = ({ children }) => {
  return (
    <div> 
      <HeaderCheckList />
      <main className="pt-[80px]">{children}</main>
    </div>
  );
};

export default MainLayout;
