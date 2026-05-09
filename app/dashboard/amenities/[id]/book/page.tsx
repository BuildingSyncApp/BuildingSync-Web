import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "./BookingForm";

// Booking form page. Server reads the amenity (validating it belongs
// to the user's building), then renders a client form bound to the
// createAmenityBooking server action.

export default async function AmenityBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { appUser } = await requireUser();
  if (!appUser.buildingId) redirect("/dashboard");

  const amenity = await prisma.amenity.findUnique({
    where: { id },
    include: { rules: { orderBy: { order: "asc" } } },
  });
  if (!amenity || amenity.buildingId !== appUser.buildingId) notFound();
  if (!amenity.isActive) {
    return (
      <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight">{amenity.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This amenity isn&apos;t accepting reservations right now.
        </p>
      </main>
    );
  }

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto pb-12">
      <Link
        href="/dashboard/amenities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to amenities
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{amenity.name}</h1>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
        {amenity.category} · open {amenity.openTime}–{amenity.closeTime}
        {amenity.capacity ? ` · capacity ${amenity.capacity}` : ""}
      </p>
      {amenity.description && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{amenity.description}</p>
      )}

      {amenity.rules.length > 0 && (
        <section className="mt-6">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
            Rules
          </p>
          <ul className="mt-2 bg-card border border-border rounded-xl p-4 space-y-1 text-sm text-muted-foreground list-disc list-inside">
            {amenity.rules.map((r) => (
              <li key={r.id}>{r.text}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
          New reservation
        </p>
        <div className="mt-2 bg-card border border-border rounded-xl p-5">
          <BookingForm
            amenityId={amenity.id}
            openTime={amenity.openTime}
            closeTime={amenity.closeTime}
            slotDurationMinutes={amenity.slotDurationMinutes}
            approvalPolicy={amenity.approvalPolicy}
          />
        </div>
      </section>
    </main>
  );
}
