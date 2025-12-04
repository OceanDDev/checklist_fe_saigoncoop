/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  Input,
  DatePicker,
  Table,
  Statistic,
  Row,
  Col,
  Empty,
  Spin,
  message,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  ShopOutlined,
  CalendarOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { ttbService } from "@/services/ttb.service";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const TTBReportDetail = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [cuaHangList, setCuaHangList] = useState([]);
  const [thietBiList, setThietBiList] = useState([]);
  const [maCuaHang, setMaCuaHang] = useState("");
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchCuaHang();
    fetchThietBi();
  }, []);

  const fetchCuaHang = useCallback(async () => {
    try {
      const response = await cuaHangService.getAllCuaHang();
      if (response?.success) {
        setCuaHangList(response.data || []);
      }
    } catch (error) {
      console.error("Không thể tải danh sách cửa hàng");
    }
  }, []);

  const fetchThietBi = useCallback(async () => {
    try {
      const response = await ttbService.getAllThietBi();
      if (response?.success) {
        const sorted = [...(response.data || [])].sort(
          (a, b) => (a.thu_tu || 0) - (b.thu_tu || 0)
        );
        setThietBiList(sorted);
      }
    } catch (error) {
      console.error("Không thể tải danh sách thiết bị");
    }
  }, []);

  // Hàm tính đầu kỳ từ tháng trước
  const calculateDauKy = useCallback(
    async (maCH, previousMonth) => {
      const dauKy = {};

      try {
        const prevResponse = await ttbService.getAllTtb({
          ma_cua_hang: maCH,
          date_range: [
            previousMonth.startOf("month"),
            previousMonth.endOf("month"),
          ],
          page: 1,
          limit: 999999,
        });

        if (prevResponse?.success && prevResponse.data?.length > 0) {
          const prevData = prevResponse.data;

          thietBiList.forEach((thietBi) => {
            let diCh = 0;
            let chTraVe = 0;

            prevData.forEach((record) => {
              record.ttb?.forEach((ttb) => {
                if (ttb.ten_ttb === thietBi.ten_thiet_bi) {
                  diCh += ttb.di_ch || 0;
                  chTraVe += ttb.ch_tra_ve || 0;
                }
              });
            });

            dauKy[thietBi.ten_thiet_bi] = diCh - chTraVe;
          });
        } else {
          thietBiList.forEach((thietBi) => {
            dauKy[thietBi.ten_thiet_bi] = 0;
          });
        }
      } catch (error) {
        console.error("Không thể tải dữ liệu tháng trước");
        thietBiList.forEach((thietBi) => {
          dauKy[thietBi.ten_thiet_bi] = 0;
        });
      }

      return dauKy;
    },
    [thietBiList]
  );

  // Hàm tính phát sinh tháng hiện tại
  const calculatePhatSinh = useCallback(
    (data, dauKy) => {
      const deviceSummary = {};

      thietBiList.forEach((thietBi) => {
        const dk = dauKy[thietBi.ten_thiet_bi] || 0;
        deviceSummary[thietBi.ten_thiet_bi] = {
          ten_thiet_bi: thietBi.ten_thiet_bi,
          dau_ky: dk,
          di_ch: 0,
          ch_tra_ve: 0,
          phat_sinh: 0,
          con_no: 0,
        };
      });

      data.forEach((record) => {
        record.ttb?.forEach((ttb) => {
          if (deviceSummary[ttb.ten_ttb]) {
            deviceSummary[ttb.ten_ttb].di_ch += ttb.di_ch || 0;
            deviceSummary[ttb.ten_ttb].ch_tra_ve += ttb.ch_tra_ve || 0;
          }
        });
      });

      Object.keys(deviceSummary).forEach((key) => {
        const item = deviceSummary[key];
        item.phat_sinh = item.di_ch - item.ch_tra_ve;
        item.con_no = item.dau_ky + item.phat_sinh;
      });

      return deviceSummary;
    },
    [thietBiList]
  );

  const processReportData = useCallback(
    async (data) => {
      if (!data || data.length === 0) {
        setReportData(null);
        return;
      }

      const previousMonth = dateRange[0].subtract(1, "month");
      const maCH = maCuaHang.trim().toUpperCase();

      // Tính đầu kỳ
      const dauKy = await calculateDauKy(maCH, previousMonth);

      // Tính phát sinh
      const deviceSummary = calculatePhatSinh(data, dauKy);

      // Tính tổng số ngày
      const totalDays = new Set(
        data
          .filter((r) => r.day?.ngay_di)
          .map((r) => dayjs(r.day.ngay_di).format("YYYY-MM-DD"))
      );

      // Tính grand total
      const grandTotal = Object.values(deviceSummary).reduce(
        (acc, item) => ({
          dau_ky: acc.dau_ky + item.dau_ky,
          phat_sinh: acc.phat_sinh + item.phat_sinh,
          con_no: acc.con_no + item.con_no,
        }),
        { dau_ky: 0, phat_sinh: 0, con_no: 0 }
      );

      // Tìm thông tin cửa hàng
      const maCHData = data[0]?.ma_cua_hang;
      const cuaHangInfo = cuaHangList.find(
        (ch) => ch.ma_cua_hang === maCHData
      ) || {
        ma_cua_hang: maCHData,
        ten_cua_hang: data[0]?.cua_hang || "Chưa có tên",
      };

      setReportData({
        cuaHang: cuaHangInfo,
        dateRange: {
          start: dateRange[0].format("DD/MM/YYYY"),
          end: dateRange[1].format("DD/MM/YYYY"),
        },
        totalRecords: data.length,
        totalDays: totalDays.size,
        deviceSummary: Object.values(deviceSummary),
        grandTotal,
        rawData: data,
      });
    },
    [dateRange, maCuaHang, cuaHangList, calculateDauKy, calculatePhatSinh]
  );

  const handleSearch = async () => {
    if (!maCuaHang || maCuaHang.trim() === "") {
      message.warning("Vui lòng nhập mã cửa hàng");
      return;
    }

    setLoading(true);
    try {
      const response = await ttbService.getAllTtb({
        ma_cua_hang: maCuaHang.trim().toUpperCase(),
        date_range: dateRange,
        page: 1,
        limit: 999999,
      });

      if (response?.success) {
        const data = response.data || [];
        if (data.length === 0) {
          message.info(
            `Không tìm thấy dữ liệu cho cửa hàng ${maCuaHang
              .trim()
              .toUpperCase()}`
          );
          setReportData(null);
        } else {
          await processReportData(data);
          message.success(`Đã tải ${data.length} chuyến hàng`);
        }
      } else {
        message.error("Không thể tải dữ liệu");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Memoized columns cho bảng tổng hợp
  const summaryColumns = useMemo(
    () => [
      {
        title: <strong className="text-base">THIẾT BỊ</strong>,
        dataIndex: "label",
        key: "label",
        width: 150,
        align: "center",
        fixed: "left",
        render: (text) => (
          <strong className="text-sm text-blue-500">{text}</strong>
        ),
      },
      ...thietBiList.flatMap((thietBi) => [
        {
          title: (
            <div className="text-center">
              <strong className="text-sm block">{thietBi.ten_thiet_bi}</strong>
            </div>
          ),
          dataIndex: `${thietBi.ten_thiet_bi}_di`,
          key: `${thietBi.ten_thiet_bi}_di`,
          align: "center",
          width: 80,
          render: (val) => (
            <span className="text-base font-semibold text-green-500">
              {val || 0}
            </span>
          ),
        },
        {
          title: (
            <div className="text-center">
              <strong className="text-sm block">{thietBi.ten_thiet_bi}</strong>
            </div>
          ),
          dataIndex: `${thietBi.ten_thiet_bi}_tra`,
          key: `${thietBi.ten_thiet_bi}_tra`,
          align: "center",
          width: 80,
          render: (val) => (
            <span className="text-base font-semibold text-red-500">
              {val || 0}
            </span>
          ),
        },
      ]),
    ],
    [thietBiList]
  );

  // Memoized columns cho bảng chi tiết
  const detailColumns = useMemo(
    () => [
      {
        title: <strong>STT</strong>,
        key: "stt",
        width: 60,
        align: "center",
        fixed: "left",
        render: (_, __, index) => <strong>{index + 1}</strong>,
      },
      {
        title: <strong>NGÀY ĐI</strong>,
        key: "ngay_di",
        width: 120,
        align: "center",
        fixed: "left",
        render: (record) => {
          const ngayDi = dayjs(record.day?.ngay_di);
          return (
            <div className="text-center">
              <div className="text-sm font-semibold text-green-500">
                {ngayDi.format("DD/MM/YYYY")}
              </div>
            </div>
          );
        },
      },
      {
        title: <strong>NGÀY VỀ</strong>,
        key: "ngay_ve",
        width: 120,
        align: "center",
        fixed: "left",
        render: (record) => {
          if (!record.day?.ngay_ve) {
            return <span className="text-gray-300">-</span>;
          }
          const ngayVe = dayjs(record.day.ngay_ve);
          return (
            <div className="text-center">
              <div className="text-sm font-semibold text-red-500">
                {ngayVe.format("DD/MM/YYYY")}
              </div>
            </div>
          );
        },
      },
      {
        title: <strong>SỐ BB</strong>,
        dataIndex: "so_bb",
        key: "so_bb",
        width: 120,
        fixed: "left",
        align: "center",
        render: (text) => (
          <strong className="text-blue-500 text-sm">{text}</strong>
        ),
      },
      ...thietBiList.flatMap((thietBi) => [
        {
          title: (
            <div className="text-center">
              <div className="font-semibold">{thietBi.ten_thiet_bi}</div>
              <div className="text-xs text-green-500">ĐI</div>
            </div>
          ),
          key: `${thietBi.ten_thiet_bi}_di`,
          width: 80,
          align: "center",
          render: (record) => {
            const ttb = record.ttb?.find(
              (t) => t.ten_ttb === thietBi.ten_thiet_bi
            );
            const val = ttb?.di_ch || 0;
            return val > 0 ? (
              <span className="text-green-500 font-semibold text-base">
                {val}
              </span>
            ) : (
              <span className="text-gray-300">0</span>
            );
          },
        },
        {
          title: (
            <div className="text-center">
              <div className="font-semibold">{thietBi.ten_thiet_bi}</div>
              <div className="text-xs text-red-500">TRẢ VỀ</div>
            </div>
          ),
          key: `${thietBi.ten_thiet_bi}_tra`,
          width: 80,
          align: "center",
          render: (record) => {
            const ttb = record.ttb?.find(
              (t) => t.ten_ttb === thietBi.ten_thiet_bi
            );
            const val = ttb?.ch_tra_ve || 0;
            return val > 0 ? (
              <span className="text-red-500 font-semibold text-base">
                {val}
              </span>
            ) : (
              <span className="text-gray-300">0</span>
            );
          },
        },
      ]),
      {
        title: <strong>NOTE</strong>,
        dataIndex: "ghi_chu",
        key: "ghi_chu",
        width: 200,
        render: (text) => text || "-",
      },
    ],
    [thietBiList]
  );

  // Memoized summary data
  const summaryData = useMemo(() => {
    if (!reportData) return [];

    return [
      {
        key: "dau_ky",
        label: "ĐẦU KÌ",
        ...reportData.deviceSummary.reduce((acc, item) => {
          acc[`${item.ten_thiet_bi}_di`] = item.dau_ky;
          acc[`${item.ten_thiet_bi}_tra`] = 0;
          return acc;
        }, {}),
      },
      {
        key: "phat_sinh",
        label: "PHÁT SINH",
        ...reportData.deviceSummary.reduce((acc, item) => {
          acc[`${item.ten_thiet_bi}_di`] = item.di_ch;
          acc[`${item.ten_thiet_bi}_tra`] = item.ch_tra_ve;
          return acc;
        }, {}),
      },
      {
        key: "con_no",
        label: "CÒN NỢ",
        ...reportData.deviceSummary.reduce((acc, item) => {
          acc[`${item.ten_thiet_bi}_di`] = item.con_no;
          acc[`${item.ten_thiet_bi}_tra`] = 0;
          return acc;
        }, {}),
      },
    ];
  }, [reportData]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          size="large"
          className="mb-4"
        >
          Quay lại
        </Button>
      </div>

      {/* Form tìm kiếm */}
      <Card bordered={false} className="mb-6 rounded-lg shadow-sm">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <div className="mb-2 font-medium text-sm">
              <ShopOutlined className="mr-1" />
              Mã cửa hàng
            </div>
            <Input
              placeholder="Nhập mã cửa hàng"
              value={maCuaHang}
              onChange={(e) => setMaCuaHang(e.target.value.toUpperCase())}
              onPressEnter={handleSearch}
              className="uppercase"
              size="large"
              prefix={<SearchOutlined className="text-gray-400" />}
            />
          </Col>

          <Col span={12}>
            <div className="mb-2 font-medium text-sm">
              <CalendarOutlined className="mr-1" />
              Khoảng thời gian
            </div>
            <RangePicker
              className="w-full"
              value={dateRange}
              onChange={setDateRange}
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
              size="large"
            />
          </Col>

          <Col span={6}>
            <div className="mb-2">&nbsp;</div>
            <Button
              type="primary"
              onClick={handleSearch}
              loading={loading}
              block
              size="large"
              icon={<SearchOutlined />}
            >
              Xem báo cáo
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Kết quả báo cáo */}
      {loading ? (
        <div className="text-center py-24 bg-white rounded-lg">
          <Spin size="large" />
          <div className="mt-4 text-base">Đang tải dữ liệu...</div>
        </div>
      ) : reportData ? (
        <>
          {/* Tên cửa hàng */}
          <Card
            bordered={false}
            className="mb-6 text-center rounded-lg shadow-sm bg-gradient-to-br from-purple-500 to-purple-700"
          >
            <Title
              level={1}
              className="!m-0 !text-white !text-5xl !font-bold drop-shadow-lg"
            >
              {reportData.cuaHang?.ten_cua_hang || "N/A"}
            </Title>
            <Text className="text-white text-xl opacity-90 block mt-2">
              Mã: {reportData.cuaHang?.ma_cua_hang} |{" "}
              {reportData.dateRange.start} - {reportData.dateRange.end}
            </Text>
          </Card>
          {/* BÁO CÁO TỔNG HỢP */}
          <Card
            title={
              <span className="text-xl font-bold">📊 BÁO CÁO TỔNG HỢP</span>
            }
            bordered={false}
            className="mb-6 rounded-lg shadow-sm"
          >
            <Table
              dataSource={summaryData}
              columns={summaryColumns}
              rowKey="key"
              pagination={false}
              bordered
              size="middle"
              scroll={{ x: "max-content" }}
            />
          </Card>

          {/* CHI TIẾT THEO NGÀY */}
          <Card
            title={
              <span className="text-xl font-bold">📋 CHI TIẾT THEO NGÀY</span>
            }
            bordered={false}
            className="rounded-lg shadow-sm"
          >
            <Table
              dataSource={reportData.rawData}
              columns={detailColumns}
              rowKey="_id"
              scroll={{ x: 1800 }}
              pagination={false}
              bordered
              size="small"
            />
          </Card>
        </>
      ) : (
        <Card className="rounded-lg">
          <Empty
            description="Vui lòng nhập mã cửa hàng và chọn khoảng thời gian để xem báo cáo"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  );
};

export default TTBReportDetail;
