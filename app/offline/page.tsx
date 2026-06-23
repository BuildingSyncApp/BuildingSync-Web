import { Wordmark } from "@/components/ui";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <Wordmark className="text-2xl" />
        <h1 className="text-3xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          BuildingSync needs an internet connection. Reconnect and reload to continue.
        </p>
      </div>
    </main>
  );
}
