import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/RegisterForm";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/config";

export const metadata = { title: `注册 · ${SITE_NAME}` };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthShell
      title="初次见面"
      subtitle="留个名字，就可以开始啦"
      footer={
        <>
          已经有账号？
          <Link href="/login" className="ml-1 text-brand-deep underline">
            去登录
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
