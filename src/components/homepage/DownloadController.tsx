/* eslint-disable react/prop-types */
import { App, Button, Checkbox, Space, Tooltip } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import { DownloadFilterForm } from '../DownloadFilterForm';
import { useDownloadStore } from '../../stores/download';
import { useFavoritesStore } from '../../stores/favorites';
import { useHomepageStore } from '../../stores/homepage';

export const DownloadController: React.FC = () => {
  const { message } = App.useApp();
  const { filter, setFilter, user } = useHomepageStore((s) => ({
    filter: s.filter,
    setFilter: s.setFilter,
    user: s.userInfo.data,
  }));
  const { createCreationTask } = useDownloadStore((s) => ({
    createCreationTask: s.createCreationTask,
  }));
  const { users, addFavorite, removeFavorite } = useFavoritesStore((s) => ({
    users: s.users,
    addFavorite: s.addFavorite,
    removeFavorite: s.removeFavorite,
  }));
  const favorited = user ? users.some((fav) => fav.id === user.id) : false;
  // 本地状态：搜索新用户时（userInfo.data 清空 → 本组件卸载重挂）自动重置为默认勾选
  const [autoFavoriteOnDownload, setAutoFavoriteOnDownload] = useState(true);

  const onToggleFavorite = () => {
    if (!user) {
      message.error('请先加载用户');
      return;
    }

    if (favorited) {
      removeFavorite(user.id);
      message.success('已取消收藏');
    } else {
      addFavorite(user);
      message.success('已加入收藏，可到左侧「收藏」页批量同步');
    }
  };

  const onStartDownload = async () => {
    if (!user) {
      message.error('请先加载用户');
      return;
    }

    if (!filter.mediaTypes || filter.mediaTypes.length === 0) {
      message.error('请至少选择一个媒体类型');
      return;
    }

    try {
      createCreationTask(user, filter);
      if (autoFavoriteOnDownload) {
        addFavorite(user);
      }
      message.success('已成功创建下载任务，请到下载管理页查看');
    } catch (err: any) {
      log.error(err);
      message.error('创建下载任务失败');
    }
  };

  return (
    <section className="p-4 bg-white rounded-md mt-3 border-[1px]">
      <h2 className="font-bold mb-4">下载配置</h2>
      <DownloadFilterForm value={filter} onChange={setFilter} />
      <hr className="my-4" />
      <section className="flex items-center space-x-2">
        <Button type="primary" onClick={onStartDownload}>
          <Space>
            <span>开始下载</span>
          </Space>
        </Button>
        {favorited ? (
          <Button icon={<StarFilled />} danger onClick={onToggleFavorite}>
            <Space>
              <span>取消收藏</span>
            </Space>
          </Button>
        ) : (
          <Button icon={<StarOutlined />} onClick={onToggleFavorite}>
            <Space>
              <span>加入收藏</span>
            </Space>
          </Button>
        )}
        <Checkbox
          checked={autoFavoriteOnDownload}
          onChange={(e) => setAutoFavoriteOnDownload(e.target.checked)}
        >
          <Tooltip title="勾选后，点击「开始下载」会自动将该用户加入收藏">
            <span>收藏</span>
          </Tooltip>
        </Checkbox>
      </section>
    </section>
  );
};
