import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParseWarnings } from "./parse-warnings";
import type { InferredSchema, SchemaField } from "@/lib/types";

/**
 * Schema confirmation step.
 *
 * Shows inferred fields and requiredness so users can verify dataset shape
 * before evaluation (or self-hosted generation).
 */

export function SchemaStep({
  fileName,
  rowCount,
  schema,
  parseErrors,
  error,
  onConfirm,
  onBack,
}: {
  fileName: string;
  rowCount: number;
  schema: InferredSchema;
  parseErrors: { row: number | string; message: string }[];
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Confirm schema</h2>
        <p className="mt-1 text-muted-foreground">
          <span className="font-mono text-brand">{fileName}</span> ·{" "}
          {rowCount} row{rowCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              <TableHead className="px-4">Field</TableHead>
              <TableHead className="px-4">Type</TableHead>
              <TableHead className="px-4">Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schema.fields.map((field) => (
              <TableRow key={field.name}>
                <TableCell className="px-4 font-mono text-brand">
                  {field.name}
                </TableCell>
                <TableCell className="px-4 font-mono">
                  {formatFieldType(field)}
                  {field.mixedTypes && (
                    <Badge
                      className="ml-2 bg-warning/15 font-sans text-warning hover:bg-warning/20"
                      title="Your expected column uses more than one type for this field. Any of them is accepted."
                    >
                      mixed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="px-4">
                  {field.required ? (
                    <Badge className="bg-brand/15 text-brand hover:bg-brand/20">
                      required
                    </Badge>
                  ) : (
                    <Badge variant="secondary">optional</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {parseErrors.length > 0 && <ParseWarnings errors={parseErrors} />}

      {error && (
        <div className="rounded-lg border border-fail/30 bg-fail/10 px-4 py-3 text-sm text-fail">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-gradient-to-r from-brand to-brand-accent text-black hover:opacity-90"
        >
          Run Evaluation
        </Button>
      </div>
    </div>
  );
}

/** "string", "string | null", or "number | string" for mixed-type fields. */
function formatFieldType(field: SchemaField): string {
  const types: string[] = [...(field.mixedTypes ?? [field.type])];
  if (field.nullable && !types.includes("null")) types.push("null");
  return types.join(" | ");
}
