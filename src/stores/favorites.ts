import dayjs from 'dayjs';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import MediaType from '../enums/MediaType';
import { DownloadFilter } from '../interfaces/DownloadFilter';
import { FavoriteUser } from '../interfaces/FavoriteUser';
import { TwitterUser } from '../interfaces/TwitterUser';
import { createTauriFileStorage } from './persist/tauri-file-storage';

/** 收藏页「同步最新媒体」的默认过滤条件：最近 1 个月 + 全部媒体 + 媒体来源 */
export const DEFAULT_FAVORITES_FILTER: DownloadFilter = {
  dateRange: [dayjs().subtract(1, 'month').startOf('day'), dayjs()],
  mediaTypes: [MediaType.Photo, MediaType.Video, MediaType.Gif],
  source: 'medias',
};

export interface FavoritesStore {
  users: FavoriteUser[];
  addFavorite: (user: TwitterUser) => void;
  removeFavorite: (id: string) => void;

  filter: DownloadFilter;
  setFilter: (filter: DownloadFilter) => void;
}

export const useFavoritesStore = create(
  persist<FavoritesStore, [], [], Pick<FavoritesStore, 'users'>>(
    (set) => ({
      users: [],
      addFavorite: (user) => {
        const { users } = useFavoritesStore.getState();
        // 按 id 去重，已收藏则忽略
        if (users.some((fav) => fav.id === user.id)) {
          return;
        }

        const registerTime = user.registerTime;
        const fav: FavoriteUser = {
          id: user.id,
          screenName: user.screenName,
          name: user.name,
          avatar: user.avatar,
          registerTime:
            registerTime && registerTime.isValid()
              ? registerTime.toISOString()
              : '',
          mediaCount: user.mediaCount,
          addedAt: Date.now(),
        };
        set({
          users: [fav, ...users],
        });
      },
      removeFavorite: (id) => {
        const { users } = useFavoritesStore.getState();
        set({
          users: users.filter((fav) => fav.id !== id),
        });
      },

      filter: DEFAULT_FAVORITES_FILTER,
      setFilter: (filter) => set({ filter }),
    }),
    {
      name: 'favorites',
      version: 1,
      storage: createTauriFileStorage(),
      // 只持久化收藏列表；过滤条件每次启动回落到默认「最近 7 天」
      partialize: (state) => ({ users: state.users }),
    },
  ),
);

/** 把持久化的 FavoriteUser 还原为可传给 createCreationTask 的 TwitterUser */
export function toTwitterUser(fav: FavoriteUser): TwitterUser {
  const registerTime = dayjs(fav.registerTime);
  return {
    id: fav.id,
    screenName: fav.screenName,
    name: fav.name,
    avatar: fav.avatar,
    registerTime: registerTime.isValid() ? registerTime : dayjs(),
    mediaCount: fav.mediaCount,
  };
}
