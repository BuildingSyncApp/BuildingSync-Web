import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";

// Inbound leads from the public /contact form. These are persisted to the
// database before the notification email is attempted, so this page is the
// source of truth even if email delivery failed (emailedAt = null, or an
// emailError is set). Lets a platform admin recover any inquiry that didn't
// reach the inbox.

export const dynamic = "force-dynamic";

const TOPIC_LABEL: Record<string, string> = {
  pilot: "Pilot interest",
  enterprise: "Enterprise / Gov",
  support: "Support",
  press: "Press",
  other: "General",
};

export default async function PlatformLeadsPage() {
  await requirePlatformAdmin();

  const leads = await prisma.contactSubmission
    .findMany({ orderBy: { createdAt: "desc" }, take: 300 })
    .catch((err) => {
      console.error("[platform/leads] contactSubmission.findMany failed", err);
      return [];
    });

  const undelivered = leads.filter((l) => l.emailedAt == null).length;

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-6xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Platform admin
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Inbound inquiries from the public contact form. Saved to the database before the
          notification email is sent, so nothing is lost if email delivery fails.
        </p>
      </div>

      {undelivered > 0 && (
        <div
          role="alert"
          className="mt-6 border border-amber-500/40 bg-amber-500/5 rounded-md p-4 text-sm"
        >
          <strong>{undelivered}</strong> lead{undelivered === 1 ? "" : "s"} {undelivered === 1 ? "has" : "have"} no
          recorded email delivery (<code>emailedAt</code> is empty). Check <code>RESEND_API_KEY</code> /
          deliverability — these inquiries reached the database but may not have reached your inbox.
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        {leads.length === 0 ? (
          <div className="border border-border rounded-md p-6 text-sm text-muted-foreground">
            No contact submissions yet.
          </div>
        ) : (
          <table className="w-full text-sm border border-border rounded-md overflow-hidden">
            <thead className="bg-card text-left">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">From</th>
                <th className="px-3 py-2 font-medium">Topic</th>
                <th className="px-3 py-2 font-medium">Message</th>
                <th className="px-3 py-2 font-medium">Emailed</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border/50 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {lead.createdAt.toLocaleString()}
                    {lead.country ? <div className="text-[10px] uppercase">{lead.country}</div> : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{lead.name}</div>
                    <a href={`mailto:${lead.email}`} className="text-accent hover:underline text-xs">
                      {lead.email}
                    </a>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{TOPIC_LABEL[lead.topic] ?? lead.topic}</td>
                  <td className="px-3 py-2 max-w-md">
                    <p className="whitespace-pre-wrap break-words">{lead.message}</p>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {lead.emailedAt ? (
                      <span className="text-green-600">✓ sent</span>
                    ) : (
                      <span className="text-amber-600" title={lead.emailError ?? "not sent"}>
                        ⚠ not sent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
