import { LoginBrandPanel } from "@/components/auth/LoginBrandPanel";
import { LoginForm } from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = Array.isArray(params.redirect)
    ? params.redirect[0]
    : params.redirect;

  return (
    <main className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
      <LoginBrandPanel />

      <section className="relative flex flex-1 items-center justify-center p-6 sm:p-10 lg:w-1/2 lg:p-12">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>
        <LoginForm redirectTo={redirectTo} />
      </section>
    </main>
  );
}
