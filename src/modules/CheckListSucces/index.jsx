
const ThankYouScreen = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-blue-50 px-4 py-10">
      <img
        src="https://cdn-icons-png.flaticon.com/512/3159/3159066.png"
        alt="Thank you"
        className="w-24 h-24 sm:w-32 sm:h-32 mb-6"
      />
      <h1 className="text-xl sm:text-2xl font-bold text-blue-700 text-center mb-3">
        Cảm ơn bạn đã hoàn thành Checklist!
      </h1>
      <p className="text-sm sm:text-base text-gray-600 text-center mb-6 max-w-sm">
        Dữ liệu của bạn đã được ghi nhận thành công. Chúc bạn một ngày làm việc an toàn và hiệu quả!
      </p>
    </div>
  );
};

export default ThankYouScreen;
