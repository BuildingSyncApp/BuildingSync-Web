export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">You're offline</h1>
        <p className="opacity-70 text-sm">
          BuildingSync needs an internet connection. Reconnect and reload to continue.
        </p>
      </div>
    </main>
  );
}
