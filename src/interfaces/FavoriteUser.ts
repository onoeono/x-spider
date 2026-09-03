export interface FavoriteUser {
  id: string;
  screenName: string;
  name: string;
  avatar: string;
  registerTime: string; // ISO 字符串（TwitterUser.registerTime 为 Dayjs，无法直接 JSON 序列化）
  mediaCount?: number;
  addedAt: number; // Date.now()
}
