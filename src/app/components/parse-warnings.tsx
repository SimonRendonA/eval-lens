import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function ParseWarnings({
  errors,
}: {
  errors: { row: number | string; message: string }[];
}) {
  return (
    <Collapsible>
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-warning">
          <span>
            {errors.length} parse warning{errors.length > 1 ? "s" : ""}
          </span>
          <span className="text-xs">▼</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="font-mono text-xs text-warning/80">
                Row {err.row}: {err.message}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
