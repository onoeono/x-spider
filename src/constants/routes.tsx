import { Route } from '../interfaces/Route';
import {
  HomeFilled,
  SettingFilled,
  DownloadOutlined,
  StarOutlined,
  InfoCircleFilled,
} from '@ant-design/icons';
import { Homepage } from '../pages/Homepage';
import { Favorites } from '../pages/Favorites';
import { DownloadManagement } from '../pages/DownloadManagement';
import { Settings } from '../pages/Settings';
import { About } from '../pages/About';

export const ROUTES: Route[] = [
  {
    id: 'home',
    name: '主页',
    icon: <HomeFilled />,
    element: <Homepage />,
  },
  {
    id: 'favorites',
    name: '收藏',
    icon: <StarOutlined />,
    element: <Favorites />,
  },
  {
    id: 'download-management',
    name: '下载管理',
    icon: <DownloadOutlined />,
    element: <DownloadManagement />,
  },
  {
    id: 'settings',
    name: '设置',
    icon: <SettingFilled />,
    element: <Settings />,
  },
  {
    id: 'about',
    name: '关于',
    icon: <InfoCircleFilled />,
    element: <About />,
  },
];
