const statusStyles: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Draft: "bg-amber-100 text-amber-700",
  Archived: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

const typeStyles: Record<string, string> = {
  Photo: "bg-blue-100 text-blue-700",
  Video: "bg-purple-100 text-purple-700",
  Audio: "bg-green-100 text-green-700",
  Graphic: "bg-orange-100 text-orange-700",
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeStyles[type] ?? "bg-primary/10 text-primary"}`}>
      {type}
    </span>
  );
}

const beatStyles: Record<string, string> = {
  Politics: "bg-blue-100 text-blue-700",
  Sports: "bg-green-100 text-green-700",
  Cinema: "bg-purple-100 text-purple-700",
  Business: "bg-amber-100 text-amber-700",
  Crime: "bg-red-100 text-red-700",
  Health: "bg-teal-100 text-teal-700",
  Education: "bg-indigo-100 text-indigo-700",
  Technology: "bg-cyan-100 text-cyan-700",
  Agriculture: "bg-lime-100 text-lime-700",
  Culture: "bg-pink-100 text-pink-700",
};

export function BeatBadge({ beat }: { beat: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${beatStyles[beat] ?? "bg-muted text-muted-foreground"}`}>
      {beat}
    </span>
  );
}