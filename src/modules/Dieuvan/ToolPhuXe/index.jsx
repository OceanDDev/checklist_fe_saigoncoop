import { useEffect, useState, useRef } from "react";
import { Card, Typography, message, Button } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";
import ImportPhuXe from "./importPhuXe";
import CaptureTable from "./CaptureTable";
import SearchFilter from "./SearchPhuXe";
import PhuXeTableView from "./PhuXeTableView";
import ExportExcelPhuXe from "./ExportExcelPhuXe";
import ChbxModal from "./ChbxModal";
import AddPhuXeModal from "./Addphuxemodal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const getTodayVN = () => {
  return dayjs().tz(VN_TIMEZONE).startOf("day").toDate();
};

const HomePhuXe = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [isSearching, setIsSearching] = useState(true);
  const [dateRange, setDateRange] = useState([
    {
      startDate: getTodayVN(),
      endDate: getTodayVN(),
      key: "selection",
    },
  ]);
  const [sortOrder, setSortOrder] = useState("asc");
  const [phuXeNames, setPhuXeNames] = useState([]);
  const [chbxList, setChbxList] = useState([]); // ⬅️ thêm state chbxList
  const [canEditPhuXeName, setCanEditPhuXeName] = useState(false);
  const [canEditDieuVan, setCanEditDieuVan] = useState(false);
  const [isRole24, setIsRole24] = useState(false);
  const [isRole21, setIsRole21] = useState(false);

  const [showChbxModal, setShowChbxModal] = useState(false);

  const tableRef = useRef(null);

  const isSearchingOneDay =
    dateRange[0].startDate &&
    dateRange[0].endDate &&
    dayjs(dateRange[0].startDate).isSame(dayjs(dateRange[0].endDate), "day");

  const parseKhungGio = (khungGio) => {
    if (!khungGio) return 0;
    const match = khungGio.match(/(\d+):(\d+)/);
    return match ? parseInt(match[1]) + parseInt(match[2]) / 60 : 0;
  };

  useEffect(() => {
    fetchPhuXe();
    fetchPhuXeNames();
    fetchChbxList(); // ⬅️ thêm fetch chbxList
    checkUserRole();
  }, []);

  const checkUserRole = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userRole = user.role || user.roleId;

        setCanEditPhuXeName(userRole === 22);
        setCanEditDieuVan(userRole === 21 || userRole === 22);
        setIsRole24(userRole === 24);
        setIsRole21(userRole === 21);
      } else {
        setCanEditPhuXeName(false);
        setCanEditDieuVan(false);
        setIsRole24(false);
        setIsRole21(false);
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra role:", error);
      setCanEditPhuXeName(false);
      setCanEditDieuVan(false);
      setIsRole24(false);
      setIsRole21(false);
    }
  };

  const fetchPhuXe = async () => {
    try {
      const list = await phuXeService.getAllPhuXe();
      if (list) {
        const sortedList = list.sort((a, b) => {
          const timeA = parseKhungGio(a.khung_gio);
          const timeB = parseKhungGio(b.khung_gio);
          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        });
        setData(sortedList);
      }
    } catch (error) {
      console.error("Lỗi khi gọi getAllPhuXe:", error);
      message.error("Không thể tải danh sách phụ xe");
    }
  };

  const fetchPhuXeNames = async () => {
    try {
      const names = await phuXeService.getAllPhuXeNames();
      if (names) setPhuXeNames(names);
    } catch (error) {
      console.error("Lỗi khi gọi getAllPhuXeNames:", error);
      message.error("Không thể lấy danh sách tên phụ xe");
    }
  };

  // ⬅️ fetch danh sách cửa hàng cho AddPhuXeModal
  const fetchChbxList = async () => {
    try {
      const list = await phuXeService.getAllChbx();
      if (list) setChbxList(list);
    } catch (error) {
      console.error("Lỗi khi gọi getAllChbx:", error);
    }
  };

  const handleFilterChange = (filtered, hasFilter, newDateRange) => {
    const sortedFiltered = [...filtered].sort((a, b) => {
      const timeA = parseKhungGio(a.khung_gio);
      const timeB = parseKhungGio(b.khung_gio);
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
    setFilteredData(sortedFiltered);
    setIsSearching(hasFilter);
    setDateRange(newDateRange);
  };

  const handleToggleSort = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);
    const sortFn = (a, b) => {
      const timeA = parseKhungGio(a.khung_gio);
      const timeB = parseKhungGio(b.khung_gio);
      return newOrder === "asc" ? timeA - timeB : timeB - timeA;
    };
    setData((prev) => [...prev].sort(sortFn));
    setFilteredData((prev) => [...prev].sort(sortFn));
    message.success(
      newOrder === "asc"
        ? "Sắp xếp giờ nhỏ đến lớn"
        : "Sắp xếp giờ lớn đến nhỏ",
    );
  };

  const handleDelete = async (id) => {
    if (!id) {
      message.error("ID phụ xe không hợp lệ!");
      return;
    }
    try {
      const result = await phuXeService.deletePhuXe(id);
      if (result) {
        message.success("Đã xóa phụ xe thành công!");
        fetchPhuXe();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa phụ xe:", error);
      message.error("Không thể xóa phụ xe!");
    }
  };

  return (
    <div className="p-4 md:p-6" ref={tableRef}>
      <Card className="shadow-lg rounded-xl border-0">
        <div className="space-y-4">
          <Title level={4} className="text-center mb-0">
            Danh Sách Phụ Xe
          </Title>

          <SearchFilter
            data={data}
            onFilterChange={handleFilterChange}
            phuXeList={phuXeNames}
            isRole24={isRole24}
          />

          <div className="flex flex-wrap gap-2 justify-end">
            {!isRole24 && (
              <Button
                type="default"
                icon={<ShopOutlined />}
                onClick={() => setShowChbxModal(true)}
              >
                CH PX-BX
              </Button>
            )}

            {/* ⬅️ Nút Thêm Phụ Xe - chỉ hiện với role không phải 24 */}
            {!isRole24 && (
              <AddPhuXeModal onAdded={fetchPhuXe} chbxList={chbxList} />
            )}

            <ImportPhuXe onImported={fetchPhuXe} isRole24={isRole24} />

            <ExportExcelPhuXe
              filteredData={filteredData}
              fileName={`phuxe_${dayjs(dateRange[0].startDate)
                .tz(VN_TIMEZONE)
                .format("YYYY-MM-DD")}`}
              isRole24={isRole24}
            />

            {isSearchingOneDay && (
              <CaptureTable
                isRole24={isRole24}
                tableRef={tableRef}
                fileName={`phuxe_${dayjs(dateRange[0].startDate)
                  .tz(VN_TIMEZONE)
                  .format("YYYY-MM-DD")}`}
              />
            )}
          </div>

          <PhuXeTableView
            filteredData={filteredData}
            sortOrder={sortOrder}
            phuXeNames={phuXeNames}
            canEditPhuXeName={canEditPhuXeName}
            canEditDieuVan={canEditDieuVan}
            isRole24={isRole24}
            isRole21={isRole21}
            onToggleSort={handleToggleSort}
            onDelete={handleDelete}
            onRefresh={fetchPhuXe}
            onRefreshNames={fetchPhuXeNames}
          />
        </div>
      </Card>

      <ChbxModal
        visible={showChbxModal}
        onClose={() => setShowChbxModal(false)}
      />
    </div>
  );
};

export default HomePhuXe;
