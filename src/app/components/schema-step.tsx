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
  onConfirm,
  onBack,
}: {
  fileName: string;
  rowCount: number;
  schema: { fields: { name: string; type: string; required: boolean }[] };
  parseErrors: { row: number | string; message: string }[];
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
                <TableCell className="px-4 font-mono">{field.type}</TableCell>
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
