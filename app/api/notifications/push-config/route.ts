import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push";

export async function GET() {
  const key = vapidPublicKey();
  if (!key) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}
