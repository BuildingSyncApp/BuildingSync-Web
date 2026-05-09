"use client";

import { useConfirm } from "@/components/ConfirmDialog";

// Form-submitting sign-out button with a confirm dialog. The form is
// built imperatively at submit time rather than rendered as JSX, because
// SignOutButton may live inside an AnimatePresence (e.g. MobileMenu)
// that unmounts the surrounding tree before the confirm dialog's
// onConfirm fires — which would null out a JSX form ref.
function submitSignOut() {
  const form = document.createElement("form");
  form.method = "post";
  form.action = "/auth/signout";
  document.body.appendChild(form);
  form.submit();
}

export function SignOutButton({
  className = "",
  fullWidth = false,
}: {
  className?: string;
  fullWidth?: boolean;
}) {
  const { confirm, dialog } = useConfirm();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          confirm({
            title: "Sign out?",
            description: "You'll be returned to the sign-in page.",
            confirmLabel: "Sign out",
            destructive: false,
            onConfirm: submitSignOut,
          })
        }
        className={`${fullWidth ? "w-full" : ""} px-3 py-1.5 rounded-md border border-border hover:bg-muted text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 ${className}`}
      >
        Sign out
      </button>
      {dialog}
    </>
  );
}
