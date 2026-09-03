import { SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Card, Col, Input, Row } from 'antd';
import React, { useMemo, useState } from 'react';
import { DownloadFilterForm } from '../components/DownloadFilterForm';
import { PageHeader } from '../components/PageHeader';
import { ROUTES } from '../constants/routes';
import { FavoriteUser } from '../interfaces/FavoriteUser';
import { useAppStateStore } from '../stores/app-state';
import { useDownloadStore } from '../stores/download';
import { toTwitterUser, useFavoritesStore } from '../stores/favorites';
import { useHomepageStore } from '../stores/homepage';
import { useRouteStore } from '../stores/route';

export const Favorites: React.FC = () => {
  const { message, modal } = App.useApp();
  const { users, filter, setFilter, removeFavorite } = useFavoritesStore(
    (s) => ({
      users: s.users,
      filter: s.filter,
      setFilter: s.setFilter,
      removeFavorite: s.removeFavorite,
    }),
  );
  const createCreationTask = useDownloadStore((s) => s.createCreationTask);
  const cookieString = useAppStateStore((s) => s.cookieString);

  /** 按昵称或 @ID 模糊搜索收藏用户 */
  const [keyword, setKeyword] = useState('');
  const filteredUsers = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return users;
    return users.filter(
      (fav) =>
        (fav.name || '').toLowerCase().includes(kw) ||
        (fav.screenName || '').toLowerCase().includes(kw),
    );
  }, [keyword, users]);

  /** 点击收藏用户：跳到主页并自动加载该用户 */
  const handleOpenInHome = async (fav: FavoriteUser) => {
    const home = ROUTES.find((route) => route.id === 'home');
    if (!home) return;

    try {
      const { setKeyword, clearPostList, loadUser } =
        useHomepageStore.getState();
      setKeyword(fav.screenName);
      clearPostList();
      useRouteStore.getState().setRoute(home);
      await loadUser(fav.screenName);
    } catch (err: any) {
      log.error(err);
      message.error('加载失败，请检查用户 ID 是否正确');
    }
  };

  const validateFilter = () => {
    if (!filter.mediaTypes || filter.mediaTypes.length === 0) {
      message.error('请至少选择一个媒体类型');
      return false;
    }
    return true;
  };

  /** 单个收藏用户立即下载（用当前统一过滤条件） */
  const handleDownloadOne = (fav: FavoriteUser) => {
    if (!validateFilter()) return;
    createCreationTask(toTwitterUser(fav), filter);
    message.success('已创建下载任务，请到下载管理页查看');
  };

  /** 同步最新媒体：把所有收藏用户批量加入下载队列 */
  const handleSyncLatest = () => {
    if (users.length === 0) {
      message.warning('还没有收藏任何用户');
      return;
    }
    if (!validateFilter()) return;

    modal.confirm({
      title: '同步最新媒体',
      content: `将为全部 ${users.length} 位收藏用户创建下载任务，并按顺序逐个执行（可随时到下载管理页取消）。是否继续？`,
      okText: '开始同步',
      cancelText: '取消',
      onOk: () => {
        for (const fav of users) {
          createCreationTask(toTwitterUser(fav), filter);
        }
        message.success(
          `已为 ${users.length} 位用户创建下载任务，请到下载管理页查看`,
        );
      },
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="shrink-0">
        <PageHeader />
        <section
          aria-label="同步配置"
          className="bg-white p-4 rounded-md border-[1px] border-gray-300"
        >
          <h2 className="font-bold mb-4">同步配置</h2>
          <DownloadFilterForm value={filter} onChange={setFilter} />
          <hr className="my-4" />
          <section className="flex items-center space-x-3">
            <Button
              type="primary"
              icon={<SyncOutlined />}
              disabled={users.length === 0 || !cookieString}
              onClick={handleSyncLatest}
            >
              同步最新媒体
            </Button>
            <span className="text-sm text-gray-500">
              已收藏 {users.length}{' '}
              位用户；将对每位用户按以上条件下载，并跳过已存在的文件
            </span>
          </section>
        </section>
      </div>
      <section
        aria-label="收藏列表"
        className="grow min-h-0 overflow-y-auto mt-4 pb-4"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">
            {users.length > 0 &&
              (keyword.trim()
                ? `匹配 ${filteredUsers.length} / ${users.length} 位收藏用户`
                : `共 ${users.length} 位收藏用户`)}
          </span>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="按昵称或 @ID 模糊搜索"
            value={keyword}
            disabled={users.length === 0}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-64"
          />
        </div>
        {users.length === 0 ? (
          <section className="bg-white p-4 rounded-md border-[1px] border-gray-300">
            <p className="text-gray-400 text-center py-10">
              还没有收藏用户，去主页搜索后点「加入收藏」
            </p>
          </section>
        ) : filteredUsers.length === 0 ? (
          <section className="bg-white p-4 rounded-md border-[1px] border-gray-300">
            <p className="text-gray-400 text-center py-10">
              没有匹配的收藏用户
            </p>
          </section>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredUsers.map((fav) => (
              <Col key={fav.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                <Card hoverable size="small" className="h-full">
                  <button
                    type="button"
                    title={`在主页打开 ${fav.name || fav.screenName}`}
                    onClick={() => handleOpenInHome(fav)}
                    className="w-full flex flex-col items-center text-center py-1 rounded-md transition-colors hover:bg-gray-50 cursor-pointer focus:outline-none"
                  >
                    <Avatar
                      src={fav.avatar}
                      size={72}
                      alt="头像"
                      className="shrink-0 shadow-sm ring-2 ring-gray-100"
                    />
                    <span
                      title={fav.name || '未知用户'}
                      className="mt-2 text-[15px] leading-tight font-semibold text-gray-800 w-full truncate"
                    >
                      {fav.name || '未知用户'}
                    </span>
                    <span className="mt-0.5 text-[13px] text-gray-400 w-full truncate">
                      @{fav.screenName}
                    </span>
                    {fav.mediaCount != null && (
                      <span className="mt-1.5 text-xs text-gray-500 bg-gray-50 border-[1px] border-gray-200 rounded-full px-2 py-0.5">
                        {fav.mediaCount} 个媒体
                      </span>
                    )}
                  </button>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-2">
                    <Button
                      size="small"
                      type="primary"
                      disabled={!cookieString}
                      onClick={() => handleDownloadOne(fav)}
                    >
                      开始下载
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => removeFavorite(fav.id)}
                    >
                      取消收藏
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </section>
    </div>
  );
};
