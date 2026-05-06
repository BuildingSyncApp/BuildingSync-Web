import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">BuildingSync</h1>
        <p className="text-lg opacity-70">
          Property management for residents, tenants, and staff.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/signin"
            className="px-5 py-2.5 rounded-md bg-foreground text-background font-medium"
            style={{ background: "var(--foreground)", color: "var(--background)" }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-md border"
            style={{ borderColor: "currentColor" }}
          >
            Sign up
          </Link>
        </div>
        <p className="text-xs opacity-50">R1 · {process.env.NODE_ENV}</p>
      </div>
    </main>
  );
}
