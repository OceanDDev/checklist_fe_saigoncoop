import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center mt-10 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Card Nhà Kho */}
        <div
          onClick={() => navigate("/checklist")}
          className="cursor-pointer bg-white rounded-2xl shadow-lg p-8 text-center transition-transform hover:scale-105 hover:shadow-2xl"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/2490/2490363.png"
            alt="Nhà Kho"
            className="w-20 h-20 mx-auto mb-4"
          />
          <h2 className="text-2xl font-semibold text-gray-800">Nhà Kho</h2>
        </div>

        {/* Card Ban Điều Hành */}
        <div
          onClick={() => navigate("/checklistbdh")}
          className="cursor-pointer bg-white rounded-2xl shadow-lg p-8 text-center transition-transform hover:scale-105 hover:shadow-2xl"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/552/552848.png"
            alt="Ban Điều Hành"
            className="w-20 h-20 mx-auto mb-4"
          />
          <h2 className="text-2xl font-semibold text-gray-800">Ban Điều Hành</h2>
        </div>
      </div>
    </div>
  );
};

export default Home;
