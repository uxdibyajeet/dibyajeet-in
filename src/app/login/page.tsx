import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginButton from "@/components/LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="main">
      <div className="login-box">
        <h1 className="text-headline-2">admin login</h1>
        <p className="login-box__text">Sign in with GitHub to manage your case studies.</p>
        <LoginButton />
      </div>
    </main>
  );
}