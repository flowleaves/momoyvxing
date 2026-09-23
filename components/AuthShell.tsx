import type { ReactNode } from "react";

import { Cloud, Heart, Sparkle, Star } from "./decor";
import { Card } from "./ui";

/** 登录 / 注册页的共用外壳 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Cloud className="absolute left-[5%] top-[10%] w-20 text-brand-soft" />
        <Cloud className="absolute right-[8%] top-[24%] w-12 text-brand-soft/70" />
        <Cloud className="absolute left-[14%] bottom-[12%] w-14 text-brand-soft/60" />
        <Star className="absolute right-[18%] top-[12%] w-4 text-brand/70" />
        <Sparkle className="absolute left-[26%] top-[26%] w-5 text-brand/80" />
        <Star className="absolute right-[10%] bottom-[26%] w-3.5 text-brand/60" />
        <Heart className="absolute left-[8%] top-[52%] w-4 text-brand/50" />
      </div>

      <div className="relative w-full max-w-sm">
        <header className="mb-6 text-center">
          <h1 className="font-round text-2xl text-ink">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          )}
        </header>

        <Card tape className="px-6 py-7">
          {children}
        </Card>

        {footer && (
          <p className="mt-5 text-center text-sm text-ink-soft">{footer}</p>
        )}
      </div>
    </main>
  );
}
