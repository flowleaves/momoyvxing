import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/config";

export const metadata = { title: `登录 · ${SITE_NAME}` };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthShell
      title="欢迎回来"
      subtitle="今天也写点什么吧"
      footer={
        <>
          还没有账号？
          <Link href="/register" className="ml-1 text-brand-deep underline">
            注册一个
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
