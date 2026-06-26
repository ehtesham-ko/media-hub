import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

function dismissKey() {
  return `alerts-dismissed-${new Date().toISOString().slice(0, 10)}`;
}

export function AlertsBanner({ count }: { count: number }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey()) === "1");
  }, []);

  if (count <= 0 || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey(), "1");
    setDismissed(true);
  };

  return (
    <div className="animate-fade-in-up flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">
        ⚠️ {count} draft asset{count === 1 ? "" : "s"} {count === 1 ? "has" : "have"} been sitting for over 7 days — review and publish or archive {count === 1 ? "it" : "them"}.
      </p>
      <Link
        to="/assets"
        search={{ status: "Draft" }}
        className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
      >
        Review Now
      </Link>
      <button onClick={dismiss} className="shrink-0 rounded-full p-1 hover:bg-amber-100 dark:hover:bg-amber-500/20" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}