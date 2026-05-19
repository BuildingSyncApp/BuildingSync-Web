import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";
import { SettingsShell, parseTab } from "@/components/SettingsShell";
import { ProfileForm, PasswordForm, RegionForm } from "@/app/dashboard/account/AccountForms";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { PrivacyTab } from "@/components/settings/PrivacyTab";
import { SystemTab } from "@/components/settings/SystemTab";

const BASE = "/dashboard/settings";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { authUser, appUser } = await requireUser();
  const params = (await searchParams) || {};
  const active = parseTab(params.tab);
  const locale = await getLocale();

  const building = appUser.buildingId
    ? await prisma.building
        .findUnique({ where: { id: appUser.buildingId }, select: { name: true } })
        .catch(() => null)
    : null;

  return (
    <SettingsShell
      basePath={BASE}
      backHref="/dashboard"
      backLabel="home"
      role={appUser.role}
      active={active}
    >
      {active === "profile" && (
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-md p-5">
            <h2 className="text-base font-semibold">Profile</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown on requests you submit and posts you publish.
            </p>
            <div className="mt-4">
              <ProfileForm defaultName={appUser.name} defaultPhone={appUser.phone} />
            </div>
          </section>
          <section className="bg-card border border-border rounded-md p-5">
            <h2 className="text-base font-semibold">Region &amp; address</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Drives which laws and notice formats apply for your account on the Legal &amp; compliance page.
            </p>
            <div className="mt-4">
              <RegionForm
                defaultRegion={appUser.region}
                defaultPostalCode={appUser.postalCode}
                defaultCity={appUser.city}
              />
            </div>
          </section>
          <section className="bg-card border border-border rounded-md p-5">
            <h2 className="text-base font-semibold">Password</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Change your sign-in password.
            </p>
            <div className="mt-4">
              <PasswordForm />
            </div>
          </section>
        </div>
      )}
      {active === "notifications" && (
        <NotificationsTab
          email={authUser.email!}
          initial={{
            email: appUser.notifyEmail,
            sms: appUser.notifySms,
            inApp: appUser.notifyInApp,
          }}
          vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
        />
      )}
      {active === "billing" && <BillingTab role={appUser.role} buildingName={building?.name ?? null} />}
      {active === "privacy" && (
        <PrivacyTab email={authUser.email!} locale={locale} archived={Boolean(appUser.archivedAt)} />
      )}
      {active === "system" && <SystemTab locale={locale} buildVersion="r1.beta" />}
    </SettingsShell>
  );
}
