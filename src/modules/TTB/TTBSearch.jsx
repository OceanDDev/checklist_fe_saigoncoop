import { Form, Input, DatePicker, Button, Space, Card } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Cấu hình timezone Việt Nam
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

const { RangePicker } = DatePicker;

const TTBSearch = ({ onSearch, onReset }) => {
  const [form] = Form.useForm();

  // Lấy ngày đầu và cuối tháng hiện tại theo giờ Việt Nam
  const getDefaultDateRange = () => {
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');
    return [startOfMonth, endOfMonth];
  };

  // Xử lý thay đổi giá trị - tìm kiếm ngay lập tức
  const handleValuesChange = (changedValues, allValues) => {
    onSearch(allValues);
  };

  // Xử lý reset
  const handleReset = () => {
    form.resetFields();
    // Reset về mặc định tháng hiện tại (Việt Nam)
    const defaultRange = getDefaultDateRange();
    form.setFieldsValue({
      date_range: defaultRange
    });
    onReset();
  };

  return (
    <Card 
      bordered={false}
      style={{ 
        marginBottom: 16,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
      }}
    >
      <Form
        form={form}
        layout="inline"
        style={{ width: '100%' }}
        initialValues={{
          date_range: getDefaultDateRange()
        }}
        onValuesChange={handleValuesChange}
      >
        <Space wrap style={{ width: '100%' }}>
          <Form.Item
            name="so_bb"
            style={{ marginBottom: 8 }}
          >
            <Input 
              placeholder="Tìm theo số BB" 
              style={{ width: 200 }}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="ma_cua_hang"
            style={{ marginBottom: 8 }}
          >
            <Input 
              placeholder="Tìm theo mã cửa hàng" 
              style={{ width: 200 }}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="tai_xe"
            style={{ marginBottom: 8 }}
          >
            <Input 
              placeholder="Tìm theo tài xế" 
              style={{ width: 180 }}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="bien_so_xe"
            style={{ marginBottom: 8 }}
          >
            <Input 
              placeholder="Tìm theo biển số xe" 
              style={{ width: 180 }}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="date_range"
            style={{ marginBottom: 8 }}
          >
            <RangePicker
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              style={{ width: 280 }}
              allowClear={false}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
};

TTBSearch.propTypes = {
  onSearch: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  dataLoaded: PropTypes.bool,
};

TTBSearch.defaultProps = {
  dataLoaded: false,
};

export default TTBSearch;