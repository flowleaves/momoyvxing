/**
 * 时间格式化
 *
 * ⚠️ 只在 Server Component 里调用。
 *    如果用 "刚刚 / N 分钟前" 这类相对时间在客户端渲染，
 *    服务端与客户端的计算结果必然不同，会触发 hydration 不一致警告。
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  if (diff < MIN) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} 分钟前`;

  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `今天 ${hm}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return `昨天 ${hm}`;

  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 完整时间，用于 title 属性（鼠标悬停时看准确时刻） */
export function formatFullTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** 截断长文（碎碎念一般很短，超过才截） */
export function truncate(text: string, max = 500): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max), truncated: true };
}
