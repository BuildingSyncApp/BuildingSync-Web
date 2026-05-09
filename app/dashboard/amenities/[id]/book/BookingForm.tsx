"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAmenityBooking } from "../../actions";

// Local-state booking form. Calls the createAmenityBooking server
// action; on the {ok:false} branch we keep the user on the page and
// surface the message in a toast + inline error. Success bounces to
// /dashboard/amenities?booked=1 (handled by the action's redirect).

function todayLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addMinutesToHHMM(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const wrap = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(wrap / 60)).padStart(2, "0");
  const mm = String(wrap % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function BookingForm({
  amenityId,
  openTime,
  closeTime,
  slotDurationMinutes,
  approvalPolicy,
}: {
  amenityId: string;
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
  approvalPolicy: "auto_approve" | "manager_approval";
}) {
  const [date, setDate] = useState(todayLocal());
  const [start, setStart] = useState(openTime);
  const [end, setEnd] = useState(addMinutesToHHMM(openTime, slotDurationMinutes));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function syncEndIfBefore(nextStart: string) {
    setStart(nextStart);
    if (end <= nextStart) {
      setEnd(addMinutesToHHMM(nextStart, slotDurationMinutes));
    }
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createAmenityBooking(formData);
      // The action redirects on success, so we only land here on failure.
      if (res && res.ok === false) {
        setError(res.error);
        toast.error("Booking failed", { description: res.error });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="amenityId" value={amenityId} />

      <div>
        <label htmlFor="date" className="text-sm font-medium block mb-1">Date</label>
        <input
          id="date"
          name="date"
          type="date"
          required
          value={date}
          min={todayLocal()}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startTime" className="text-sm font-medium block mb-1">Start</label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            value={start}
            min={openTime}
            max={closeTime}
            step={300}
            onChange={(e) => syncEndIfBefore(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="text-sm font-medium block mb-1">End</label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            value={end}
            min={start}
            max={closeTime}
            step={300}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium block mb-1">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the building team should know"
          className="w-full px-3 py-2 rounded-md border border-border bg-background resize-y"
        />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {approvalPolicy === "auto_approve"
          ? "This amenity confirms instantly — your booking is locked in once you submit."
          : "Bookings are reviewed by your building manager before they're confirmed."}
      </p>

      {error && (
        <p className="text-sm text-rose-700 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {pending ? "Submitting…" : approvalPolicy === "auto_approve" ? "Confirm reservation" : "Request reservation"}
      </button>
    </form>
  );
}
