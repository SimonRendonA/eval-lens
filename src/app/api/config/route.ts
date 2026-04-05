import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/providers";

export async function GET() {
  const mode =
    process.env.EVALLENS_MODE === "self-hosted" ? "self-hosted" : "hosted";

  if (mode === "hosted") {
    return NextResponse.json({ mode, providers: [] });
  }

  const providers = getAvailableProviders(process.env);

  return NextResponse.json({ mode, providers });
}
