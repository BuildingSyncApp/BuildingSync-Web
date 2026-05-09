"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { markDeliveryPickedUp } from "./actions";

export function PickedUpButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await markDeliveryPickedUp(formData);
      if (res.ok === false) {
        toast.error("Couldn't update", { description: res.error });
      } else {
        toast.success("Marked picked up");
      }
    });
  }

  return (
    <form action={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs px-4 py-2 sm:px-3 sm:py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-60 transition-colors whitespace-nowrap"
      >
        {pending ? "…" : "Picked up"}
      </button>
    </form>
  );
}
