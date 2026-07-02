import { redirect } from "next/navigation";

// Owners share the account settings surface with residents — same forms,
// same tabs. Only the dashboard *home* is owner-specific (/owner).
export default function OwnerSettingsPage() {
  redirect("/dashboard/settings");
}
