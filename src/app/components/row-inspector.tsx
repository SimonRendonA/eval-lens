import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type RowData = {
  id: string;
  status: "pass" | "fail";
  failures: {
    reason: string;
    field: string;
    expected: unknown;
    actual: unknown;
  }[];
};

export function RowInspector({
  row,
  position,
  total,
  onClose,
  onNavigate,
}: {
  row: RowData | null;
  position: number;
  total: number;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {row && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="font-mono">Row {row.id}</SheetTitle>
                {row.status === "pass" ? (
                  <Badge className="bg-pass/15 text-pass hover:bg-pass/20">
                    pass
                  </Badge>
                ) : (
                  <Badge className="bg-fail/15 text-fail hover:bg-fail/20">
                    fail
                  </Badge>
                )}
              </div>
              <SheetDescription className="sr-only">
                Detailed inspection of row {row.id}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4">
              <div className="space-y-6 pb-6">
                {/* Expected vs Actual */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Expected
                  </h4>
                  <pre className="overflow-x-auto rounded-lg bg-elevated p-3 font-mono text-xs text-foreground">
                    {(() => {
                      const firstFailure = row.failures[0];
                      if (firstFailure?.reason === "UNPARSEABLE") {
                        return String(firstFailure.expected);
                      }
                      const obj: Record<string, unknown> = {};
                      row.failures.forEach((f) => {
                        if (f.expected !== undefined) obj[f.field] = f.expected;
                      });
                      if (Object.keys(obj).length === 0)
                        return "All fields match";
                      return JSON.stringify(obj, null, 2);
                    })()}
                  </pre>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Actual
                  </h4>
                  <pre className="overflow-x-auto rounded-lg bg-elevated p-3 font-mono text-xs text-foreground">
                    {(() => {
                      const firstFailure = row.failures[0];
                      if (firstFailure?.reason === "UNPARSEABLE") {
                        return String(firstFailure.actual);
                      }
                      const obj: Record<string, unknown> = {};
                      row.failures.forEach((f) => {
                        if (f.actual !== undefined) obj[f.field] = f.actual;
                      });
                      if (Object.keys(obj).length === 0)
                        return "All fields match";
                      return JSON.stringify(obj, null, 2);
                    })()}
                  </pre>
                </div>

                {/* Failures list */}
                {row.failures.length > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Failures ({row.failures.length})
                    </h4>
                    <div className="space-y-2">
                      {row.failures.map((f, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border bg-surface p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                f.reason === "WRONG_VALUE" ||
                                f.reason === "WRONG_TYPE"
                                  ? "bg-warning/15 text-warning hover:bg-warning/20"
                                  : "bg-fail/15 text-fail hover:bg-fail/20"
                              }
                            >
                              {f.reason}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                              {f.field}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Expected:
                              </span>
                              <pre className="mt-1 rounded bg-elevated p-1.5 font-mono text-pass">
                                {JSON.stringify(f.expected)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Actual:
                              </span>
                              <pre className="mt-1 rounded bg-elevated p-1.5 font-mono text-fail">
                                {JSON.stringify(f.actual)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Navigation footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("prev")}
                disabled={position <= 0}
              >
                ← Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {position + 1} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("next")}
                disabled={position >= total - 1}
              >
                Next →
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
