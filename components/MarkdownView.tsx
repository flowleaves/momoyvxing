/**
 * Markdown 渲染
 *
 * 安全策略：**不装 rehype-raw**。
 * react-markdown 默认不渲染原始 HTML，所以 <script> 之类会被当成纯文本转义，
 * 天然免疫 XSS。只有将来确实需要支持内嵌 HTML 时，才引入 rehype-sanitize 白名单。
 *
 * remark-breaks 是必需的：碎碎念是「敲了回车就该换行」的场景，
 * 标准 Markdown 要空一行才算新段落，对随手记太反直觉。
 */

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

export function MarkdownView({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={`prose-momo ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a({ href, children, ...rest }) {
            const safe = typeof href === "string" && /^https?:\/\//i.test(href);
            if (!safe) return <span>{children}</span>;
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            const safe = typeof src === "string" && /^https?:\/\//i.test(src);
            if (!safe) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ""} loading="lazy" />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
