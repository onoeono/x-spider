/* eslint-disable react/prop-types */
import { Checkbox, DatePicker, Form, Radio } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import MediaType from '../enums/MediaType';
import { DownloadFilter } from '../interfaces/DownloadFilter';

interface Props {
  value: DownloadFilter;
  onChange: (filter: DownloadFilter) => void;
}

/**
 * 下载过滤条（日期范围 / 媒体类型 / 来源）。
 * 主页与收藏页共用，保证过滤条件与主页一致。
 */
export const DownloadFilterForm: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Form<DownloadFilter>
      layout="inline"
      initialValues={value}
      onValuesChange={(_, values) => {
        onChange(values);
      }}
    >
      <Form.Item name="dateRange" label="日期范围">
        <DatePicker.RangePicker
          presets={[
            {
              label: '至今',
              value: [dayjs.unix(0), dayjs()],
            },
            {
              label: '最近 7 天',
              value: [dayjs().subtract(7, 'day'), dayjs()],
            },
            {
              label: '最近 15 天',
              value: [dayjs().subtract(15, 'day'), dayjs()],
            },
            {
              label: '最近 1 个月',
              value: [dayjs().subtract(1, 'month'), dayjs()],
            },
            {
              label: '最近 6 个月',
              value: [dayjs().subtract(6, 'month'), dayjs()],
            },
            {
              label: '最近 1 年',
              value: [dayjs().subtract(1, 'year'), dayjs()],
            },
          ]}
          disabledDate={(cur) => cur && cur > dayjs().endOf('day')}
        />
      </Form.Item>
      <Form.Item name="mediaTypes" label="媒体类型">
        <Checkbox.Group
          options={[
            {
              label: '视频',
              value: MediaType.Video,
            },
            {
              label: '照片',
              value: MediaType.Photo,
            },
            {
              label: 'GIF',
              value: MediaType.Gif,
            },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="source"
        label="下载源"
        tooltip="帖子能下载到更早的推文，但爬取速度较慢；媒体可能下载不到更早的推文，但爬取速度更快。"
      >
        <Radio.Group
          options={[
            {
              label: '帖子',
              value: 'tweets',
            },
            {
              label: '媒体',
              value: 'medias',
            },
          ]}
        />
      </Form.Item>
    </Form>
  );
};
