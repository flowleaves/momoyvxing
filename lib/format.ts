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

/**
 * 统计正文字数（按 Unicode 码点计，emoji 算 1 个字）
 *
 * ⚠️ 不能直接用 `.length`：JS 字符串按 UTF-16 码元计数，一个 emoji（代理对）
 *    会被算成 2，中文标点也各有差异。这里用 `Array.from` 按码点切分，
 *    再把换行等空白剥掉后计数，得到的是「实际读到的字符数」。
 */
export function countChars(text: string): number {
  const stripped = text.replace(/[\s]+/g, "");
  return Array.from(stripped).length;
}

/** 把字数格式化成小字标签，如「共 128 字」；0 字返回空串 */
export function formatCharCount(n: number): string {
  return n > 0 ? `共 ${n} 字` : "";
}

/** 完整时间，用于 title 属性（鼠标悬停时看准确时刻） */
export function formatFullTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * 精简时间，**可安全用于客户端渲染**。
 *
 * ⚠️ 与 formatTime 的区别：这里不做「N 分钟前」这类依赖当前时刻的换算，
 *    只判断「是不是今天 / 今年」。但即使如此，「今天」仍然依赖**当前日期** ——
 *    所以第三个参数允许调用方显式传入参照时刻：
 *      - Server Component：不传，用服务端时间（渲染一次，无 hydration 问题）。
 *      - Client Component：**必须传**一个稳定值（见 ReplySection 里 useRef）。
 *        客户端组件会先 SSR 再 hydration，两次 `new Date()` 若跨过午夜就会
 *        算出不同结果，触发 hydration 不一致警告。传固定值即彻底消除这种可能。
 */
export function formatShortTime(iso: string, ref?: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = ref ?? new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `今天 ${hm}`;

  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${hm}`;
  }
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/**
 * 给回复补上服务端算好的时间标签，供客户端直接渲染。
 *
 * ⚠️ 只能在 Server Component / Route Handler 里调用 —— 它读当前时间。
 *    算好后随数据下发，客户端组件就完全不需要碰 Date。
 */
export function decorateReplyTimes<
  T extends { created_at: string },
>(reply: T): T & { time_label: string; full_time_label: string } {
  return {
    ...reply,
    time_label: formatShortTime(reply.created_at),
    full_time_label: formatFullTime(reply.created_at),
  };
}

/**
 * 截断长文（碎碎念一般很短，超过才截）
 *
 * ⚠️ 不能在任意下标处一刀切。这是 Markdown **源码**，粗暴 slice 会踩三种坑：
 *   1. 切在 ``` 围栏代码块中间 —— 预览里剩半段代码块，甚至把后面的
 *      「继续看」链接也吞进代码块，渲染出来就不是原文的样子了。
 *   2. 切在行内 `code` 或 **加粗** / 链接语法中间 —— 未闭合的标记会被
 *      Markdown 解析器当成纯文本，页面上直接露出 `**` 之类的符号。
 *   3. 切在多字节字符中间（JS 字符串按 UTF-16 码元下标，emoji 是代理对）——
 *      会留下半个代理对，渲染成 "�"。
 *
 * 所以这里按 [max, 0] 从后往前找第一个「安全切点」：先试 max 附近，
 * 每次回退一行，同时满足「不在围栏代码块内」「不在行内标记内」就收工。
 * 极端情况（整篇都在代码块里）会一路退到 0 —— 此时不如不截断，
 * 让调用方的「继续看」链接承担导航职责。
 */
export function truncate(
  text: string,
  max = 500,
): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };

  // 从 max 往前找第一个「安全切点」。优先空行（段落边界），其次单个换行，
  // 最坏情况退到硬位置；若一路退到 0 都不安全（整篇都是代码块/未闭合标记），
  // 就放弃截断，返回原文。
  //
  // 复杂度：scanInline 是 O(cut)，但只在候选点上调用，候选点最多约
  // `max / 平均行宽` 个。为了控制开销，用「行边界 + 段落边界」作为候选，
  // 并限制最多考察 120 个候选点。
  const floor = Math.max(0, Math.floor(max * 0.25));
  const candidates: number[] = [];
  const seen = new Set<number>();

  const push = (n: number) => {
    if (n > floor && n < text.length && !seen.has(n)) {
      seen.add(n);
      candidates.push(n);
    }
  };

  // 段落边界优先（语义最完整）
  const paraBreak = text.lastIndexOf("\n\n", max);
  if (paraBreak > floor) push(paraBreak);

  // 从 max 往前逐行回退
  let cursor = max;
  while (candidates.length < 120) {
    const nl = text.lastIndexOf("\n", cursor - 1);
    if (nl <= floor) break;
    push(nl);
    cursor = nl;
  }
  push(max);

  // 按「优先段落边界、否则越接近 max 越好」排序：先试所有段落边界（从近到远），
  // 再试所有行边界（从近到远）。
  const paraCands = candidates.filter((c) => text.startsWith("\n\n", c)).sort((a, b) => b - a);
  const lineCands = candidates.filter((c) => !text.startsWith("\n\n", c)).sort((a, b) => b - a);
  const ordered = [...paraCands, ...lineCands];

  for (const cand of ordered) {
    if (isSafeCut(text, cand)) {
      return { text: `${finalizeCut(text, cand)}…`, truncated: true };
    }
  }

  // 没有「天然安全」的切点（整段都裹在未闭合标记里）。退一步：直接在 max
  // 处下刀，并把跨过切点的悬空标记开头剥掉 —— 宁可少几个字，也不要露出裸的
  // `**`，更不要把整篇原文原样吐出去（那样卡片会长到没法看）。
  //
  // 但围栏代码块例外：半截代码块比长卡片难看得多，宁可整篇不截断。
  if (!inOpenFence(text, max)) {
    const hard = stripDanglingAt(text, max);
    if (hard !== null) return { text: `${hard}…`, truncated: true };
  }

  return { text, truncated: true };
}

/**
 * 在 `cut` 处硬切，并向前剥掉「起始点在 cut 之前、但被切断了」的行内标记。
 *
 * 返回切好的片段；若连剥干净都做不到（例如 marker 起点在很靠前的位置，
 * 剥掉会把内容削掉太多），返回 null，由调用方决定回退策略。
 */
function stripDanglingAt(text: string, cut: number): string | null {
  let end = cut;
  while (end > 0 && /\s/.test(text[end - 1])) end -= 1;
  if (end <= 0) return null;

  const openMark = danglingInlineStart(text, end);
  if (openMark === null) return text.slice(0, end);

  // 剥到 marker 起点前。若剥掉的部分超过原文 30%，说明这个 marker 开得太早，
  // 剥了会砍掉大量内容 —— 两害相权，保留内容、接受这个不完整标记。
  if (openMark < end * 0.7) return null;

  let refined = openMark;
  while (refined > 0 && /\s/.test(text[refined - 1])) refined -= 1;
  return refined > 0 ? text.slice(0, refined) : null;
}

/** 切点是否安全：不在未闭合的围栏代码块内，也不在未闭合的行内标记内 */
function isSafeCut(text: string, cut: number): boolean {
  if (cut <= 0 || cut >= text.length) return false;
  // 半代理对
  if (isLowSurrogate(text.charCodeAt(cut))) return false;
  // 在代码块内（`findOpenFence` 在 cut 之前开了但没闭）
  if (inOpenFence(text, cut)) return false;
  // 在未闭合的行内标记内
  if (danglingInlineStart(text, cut) !== null) return false;
  return true;
}

/** 实际落刀：去掉尾部空白，再安全地剥掉悬空的行内标记开头 */
function finalizeCut(text: string, cut: number): string {
  let end = cut;
  // 先把尾部的空白/换行去掉
  while (end > 0 && /\s/.test(text[end - 1])) end -= 1;

  // 检查切点前是否有个悬空标记没闭上；若闭不上（标记开头在切点前的正文里），
  // 就把这个标记也一起剥掉，保证输出片段自身是合法 Markdown。
  const openMark = danglingInlineStart(text, end);
  if (openMark !== null) {
    let refined = openMark;
    while (refined > 0 && /\s/.test(text[refined - 1])) refined -= 1;
    return text.slice(0, refined);
  }
  return text.slice(0, end);
}

/**
 * 逐字符扫描 [0, cut)，维护「围栏代码块」与「行内标记」状态。
 *
 * 维护的状态全是布尔量，因此只需要 O(cut) 时间、O(1) 额外空间：
 *   - fence：是否在 ``` / ~~~ 围栏块内（围栏标记必须独占一行开头）
 *   - tickLen：已遇到的连续反引号数量（0 表示不在行内 code 内）
 *   - bold：是否有一对 ** 悬空着
 *   - italic：是否有一个单 * 悬空着（排除属于 ** 的）
 */
interface ScanState {
  fence: boolean;
  tickLen: number;
  bold: boolean;
  italic: boolean;
}

function scanInline(text: string, upTo: number): ScanState {
  const st: ScanState = { fence: false, tickLen: 0, bold: false, italic: false };

  let i = 0;
  while (i < upTo) {
    const atLineStart = i === 0 || text[i - 1] === "\n";

    // 围栏：行首 0-3 个空格 + 连续 3 个以上 ` 或 ~
    if (atLineStart) {
      const m = /^( {0,3})(`{3,}|~{3,})/.exec(text.slice(i, upTo + 1));
      if (m) {
        const closing = new RegExp(
          `^ {0,3}${m[2][0] === "`" ? "`{3,}" : "~{3,}"}`,
        );
        // 开/闭都切换状态（简化处理：不校验闭合围栏长度，够用）
        void closing;
        st.fence = !st.fence;
        i += m[0].length;
        continue;
      }
    }

    if (st.fence) {
      i += 1;
      continue;
    }

    const ch = text[i];

    if (ch === "`") {
      let n = 0;
      while (i + n < upTo && text[i + n] === "`") n += 1;
      const isBoldDelim = false;
      if (!isBoldDelim) {
        // 行内 code：连续 n 个反引号配对，开时置 n，闭时归零
        if (st.tickLen === 0) st.tickLen = n;
        else st.tickLen = 0;
      }
      i += n;
      continue;
    }

    if (ch === "*") {
      let n = 0;
      while (i + n < upTo && text[i + n] === "*") n += 1;
      if (n >= 2) st.bold = !st.bold;
      else st.italic = !st.italic;
      i += n;
      continue;
    }

    i += 1;
  }

  return st;
}

/** 截断点是否落在未闭合的围栏代码块里 */
function inOpenFence(text: string, cut: number): boolean {
  return scanInline(text, cut).fence;
}

/** 返回截断点前最后一个未闭合的行内标记起始下标（没有则 null） */
function danglingInlineStart(text: string, cut: number): number | null {
  const st = scanInline(text, cut);
  if (st.tickLen === 0 && !st.bold && !st.italic) return null;

  // 反查起始位置：从 cut 往前找，跳过空白后定位标记字符
  let i = cut;
  while (i > 0 && /\s/.test(text[i - 1])) i -= 1;
  if (i <= 0) return null;

  if (st.tickLen > 0) {
    // 往前找到那串反引号的起点
    let j = i;
    while (j > 0 && text[j - 1] === "`") j -= 1;
    return j;
  }

  const marker = st.bold ? "**" : "*";
  const idx = text.lastIndexOf(marker, i);
  return idx >= 0 ? idx : null;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}
