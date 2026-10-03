import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendWebPush, pushConfigured } from "@/lib/push";

export async function POST() {
  if (!pushConfigured()) return NextResponse.json({ error: "Push notifications are not configured yet." }, { status: 503 });

  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll(items) { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: subscriptions } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", user.id);
  if (!subscriptions?.length) return NextResponse.json({ error: "Enable browser notifications on this device first." }, { status: 400 });

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await sendWebPush(subscription, {
        title: "My TV Tracker",
        body: "Push notifications are working. You’re all set to stay on top of your shows.",
        url: "/my-shows",
        tag: "my-tv-tracker-test",
      });
      sent++;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      }
    }
  }

  if (!sent) return NextResponse.json({ error: "The notification could not be delivered. Try enabling notifications again." }, { status: 502 });
  return NextResponse.json({ success: true });
}
