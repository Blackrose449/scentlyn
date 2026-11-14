import { useId } from "react";
import { cn } from "@/lib/utils";

/** Native form checkbox styled as a switch, with its own linked label. */
export function LabeledSwitch({ label, checked, onCheckedChange, disabled, id: suppliedId, name, ...props }: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
}) {
  const generatedId = useId();
  const id = suppliedId ?? `switch-${generatedId}`;
  return <span className="relative inline-flex h-5 w-9 shrink-0">
    <label htmlFor={id} className="sr-only">{label}</label>
    <input {...props} id={id} name={name ?? id} type="checkbox" role="switch" checked={checked}
      disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)}
      className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    <span aria-hidden="true" className={cn("inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent shadow-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50", checked ? "bg-primary" : "bg-input")}>
      <span className={cn("block h-4 w-4 rounded-full bg-background shadow-lg transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </span>
  </span>;
}