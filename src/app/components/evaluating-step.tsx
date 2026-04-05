export function EvaluatingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
      <p className="mt-4 text-muted-foreground">Evaluating rows…</p>
    </div>
  );
}
