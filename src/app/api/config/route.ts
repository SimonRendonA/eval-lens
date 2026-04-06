import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/providers";

/**
 * Runtime config endpoint for the client app.
 *
 * Returns deployment mode and the provider list that is safe to expose to
 * the browser (ids + model metadata, never API keys).
 */

export async function GET() {
  const mode =
    process.env.EVALLENS_MODE === "self-hosted" ? "self-hosted" : "hosted";

  if (mode === "hosted") {
    return NextResponse.json({ mode, providers: [] });
  }

  const providers = getAvailableProviders(process.env);

  return NextResponse.json({ mode, providers });
}
