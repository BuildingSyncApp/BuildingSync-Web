// Small uppercase mono tag for displaying a user role. Used in headers and
// page eyebrows so the role label looks consistent across portals.

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  building_manager: "Building manager",
  facility_manager: "Facility manager",
  building_owner: "Building owner",
  property_manager: "Property manager",
  resident: "Resident",
  tenant: "Tenant",
  concierge: "Concierge",
  staff: "Staff",
  security: "Security",
  vendor: "Vendor",
  guest: "Guest",
};

export function roleLabel(role: string) {
  return ROLE_LABEL[role] ?? role.replace(/_/g, " ");
}

export function RoleBadge({ role, className = "" }: { role: string; className?: string }) {
  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-border/70 text-muted-foreground ${className}`}
    >
      {roleLabel(role)}
    </span>
  );
}
