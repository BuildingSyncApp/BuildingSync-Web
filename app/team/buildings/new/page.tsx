import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { can } from "@/lib/permissions";
import { Card } from "@/components/ui";
import { NewBuildingForm } from "./NewBuildingForm";

// BM-only first-building setup. If they're not a BM, or already linked
// to a building, send them back to /team — there's no "create another"
// flow on purpose.
export default async function NewTeamBuildingPage() {
  const { appUser } = await requireTeam();
  if (!can(appUser, "building.create")) redirect("/team");
  if (appUser.buildingId) redirect("/team");

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-xl mx-auto">
      <Link href="/team" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>

      <div className="mt-4 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Set up your building</h1>
        <p className="text-sm text-muted-foreground">
          One-time setup. You can add staff and residents once this is done.
        </p>
      </div>

      <Card className="mt-8 p-6">
        <NewBuildingForm />
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Need to manage multiple properties under one account? Email{" "}
        <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">
          info@buildingsync.app
        </a>{" "}
        — we&apos;ll set up an Enterprise account.
      </p>
    </main>
  );
}
