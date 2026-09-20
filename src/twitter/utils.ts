import MediaType from '../enums/MediaType';
import { TwitterMedia } from '../interfaces/TwitterMedia';

// 图片默认走 png 无损通道；下载失败时会置为 false 退回 jpg 通道兜底，
// 保证仍然能下载成功。见 stores/download.ts 中的重试逻辑。
let useLosslessImage = true;

export function disableLosslessImage() {
  useLosslessImage = false;
}

export function getDownloadUrl(media: TwitterMedia): string {
  if (media.type === MediaType.Photo) {
    if (!media.url) throw new Error('媒体没有下载链接');
    const url = new URL(media.url);
    if (!useLosslessImage) {
      url.searchParams.set('name', 'orig');
      return url.href;
    }
    // 走 .jpg 通道时推特只会返回有损压缩图，换成 png 通道才拿得到无损原图；
    // png 通道不存在 orig，只能用 4096x4096。扩展名要一并改掉，%EXT% 依赖它。
    url.pathname = `${url.pathname.replace(/\.\w+$/, '')}.png`;
    url.searchParams.set('format', 'png');
    url.searchParams.set('name', '4096x4096');
    return url.href;
  }

  if (media.type === MediaType.Video) {
    const variant = media.videoInfo?.variants
      ?.filter((i) => i.bitrate)
      ?.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))
      ?.pop();
    if (!variant?.url) {
      throw new Error('视频没有下载链接');
    }
    return variant.url;
  }

  if (media.type === MediaType.Gif) {
    if (!media.videoInfo?.url) throw new Error('Gif 没有下载链接');
    return media.videoInfo?.url;
  }

  throw new Error(`无法获取该媒体类型的下载链接 ${media}`);
}
