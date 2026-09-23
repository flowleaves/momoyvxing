/**
 * 手绘装饰 —— 全部内联 SVG
 *
 * 为什么不用位图/图标字体：
 *   1. 用 currentColor，换皮肤时颜色自动跟随，不会出现「粉色皮肤配绿色云朵」
 *   2. 零额外请求，不用为几个小图形加一套图标库
 */

export function Cloud({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden="true">
      <g fill="currentColor">
        <circle cx="20" cy="26" r="12" />
        <circle cx="36" cy="21" r="15" />
        <circle cx="48" cy="28" r="10" />
        <rect x="14" y="26" width="38" height="14" rx="7" />
      </g>
    </svg>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.4 14.7 9.3 22 12 14.7 14.7 12 21.6 9.3 14.7 2 12 9.3 9.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1.5c.7 4.2 1.6 5.1 5.8 5.8-4.2.7-5.1 1.6-5.8 5.8-.7-4.2-1.6-5.1-5.8-5.8 4.2-.7 5.1-1.6 5.8-5.8Z"
        fill="currentColor"
      />
      <path
        d="M6 14.5c.5 2.8 1 3.3 3.8 3.8-2.8.5-3.3 1-3.8 3.8-.5-2.8-1-3.3-3.8-3.8 2.8-.5 3.3-1 3.8-3.8Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

export function Sprout({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 21.5v-8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11.6 13.6C8 13.6 4.6 11 4.6 6.4c4.4-.4 7.4 1.9 7 7.2Z"
        fill="currentColor"
      />
      <path
        d="M12.4 15.2c0-4 2.6-6.6 6.6-6.6.4 4-1.9 6.6-6.6 6.6Z"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}

export function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8C20.5 15 12 20.5 12 20.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** 页脚/空状态用的一组飘浮小装饰 */
export function FloatingDecor({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Cloud className="absolute left-[6%] top-[12%] w-16 text-brand-soft" />
      <Cloud className="absolute right-[10%] top-[22%] w-11 text-brand-soft/70" />
      <Star className="absolute left-[18%] top-[46%] w-4 text-brand/70" />
      <Sparkle className="absolute right-[16%] top-[8%] w-5 text-brand/80" />
      <Heart className="absolute right-[24%] bottom-[16%] w-4 text-brand/60" />
    </div>
  );
}
