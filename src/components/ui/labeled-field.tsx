import { cloneElement, useId, type ReactElement } from "react";
import { Label } from "@/components/ui/label";

type ControlProps = { id?: string; name?: string };

/** Preserve supplied identifiers; repeated fields get hydration-safe unique IDs. */
export function LabeledField({ label, children, hidden = false }: {
  label: string;
  children: ReactElement<ControlProps>;
  hidden?: boolean;
}) {
  const generatedId = useId();
  const id = children.props.id ?? `field-${generatedId}`;
  return <>
    <Label htmlFor={id} className={hidden ? "sr-only" : undefined}>{label}</Label>
    {cloneElement(children, { id, name: children.props.name ?? id })}
  </>;
}