import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { Card, Field } from "@/components/ui";
import { createBuilding } from "./actions";

export default async function NewBuildingPage() {
  await requirePlatformAdmin();

  return (
    <main className="px-6 py-10 max-w-xl mx-auto">
      <Link href="/platform" className="text-sm text-muted-foreground hover:text-foreground">← Back to platform</Link>

      <div className="mt-4 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Onboard a building</h1>
        <p className="text-sm text-muted-foreground">
          Adds the building to the platform. Assign a Building Manager from the Users page once it exists.
        </p>
      </div>

      <Card className="mt-8 p-6">
        <form action={createBuilding} className="space-y-4">
          <Field name="name" label="Building name" placeholder="123 Main Tower" required />
          <Field name="address" label="Address" placeholder="123 Main St" required />
          <div className="grid grid-cols-3 gap-3">
            <Field name="city" label="City" placeholder="Toronto" required />
            <Field name="state" label="State / Prov." placeholder="ON" required />
            <Field name="zipCode" label="Postal code" placeholder="M5V 1A1" required />
          </div>
          <Field name="timezone" label="Timezone" placeholder="America/Toronto" defaultValue="America/Toronto" />

          <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Data residency
                </p>
                <p className="mt-1 text-sm font-medium">Canada · ca-central (Toronto)</p>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                Default
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              All new buildings store data in Canada. For other regions or a dedicated tenancy,{" "}
              <Link href="/enterprise" className="text-accent hover:underline">contact Enterprise sales</Link>.
            </p>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create building
          </button>
        </form>
      </Card>
    </main>
  );
}
