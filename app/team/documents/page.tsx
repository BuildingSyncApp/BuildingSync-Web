import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { EmptyState } from "@/components/EmptyState";
import { UploadDocumentForm } from "./UploadDocumentForm";
import { DocumentsList } from "./DocumentsList";

export default async function TeamDocumentsPage() {
  const { appUser } = await requireTeam();

  if (!appUser.buildingId) {
    return (
      <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-3 text-sm text-muted-foreground">No building assigned to your account.</p>
      </main>
    );
  }

  const canManage = can(appUser, "document.manage");

  const documents = await prisma.document.findMany({
    where: { buildingId: appUser.buildingId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true, email: true } } },
  });

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Documents</h1>
        {!canManage && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border bg-muted/30 text-muted-foreground">
            View only
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Building bylaws, fire-safety plans, leases, vendor contracts. Public documents are visible to residents at /dashboard/documents; staff-only stays here.
      </p>

      {canManage && (
        <section className="mt-8 bg-card border border-border rounded-md p-5">
          <h2 className="text-base font-semibold">Upload a document</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, PNG, JPEG, or WebP up to 10 MB.
          </p>
          <UploadDocumentForm />
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          All documents · {documents.length}
        </h2>
        {documents.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No documents yet"
            description={canManage
              ? "Upload bylaws, fire plans, or vendor contracts above. Tag any of them as 'Public' to share with residents."
              : "Once a Building Manager uploads documents you'll see them here."}
          />
        ) : (
          <DocumentsList documents={documents.map((d) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            category: d.category,
            visibility: d.visibility,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            uploadedByLabel: d.uploadedBy.name || d.uploadedBy.email,
            createdAt: d.createdAt.toISOString(),
          }))} canManage={canManage} />
        )}
      </section>
    </main>
  );
}
