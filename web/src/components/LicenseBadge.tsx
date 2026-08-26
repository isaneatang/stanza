import { LICENSE_LABELS } from "../lib/format";

export default function LicenseBadge({ license }: { license: number }) {
  const label = LICENSE_LABELS[license] ?? LICENSE_LABELS[0];
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-surfaceHover px-2 py-0.5 text-[11px] text-textSecondary whitespace-nowrap">
      {label}
    </span>
  );
}
