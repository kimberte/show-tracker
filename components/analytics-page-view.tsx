"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function AnalyticsPageView({
  event,
  params = {},
}: {
  event: string;
  params?: Record<string, string | number | boolean | undefined>;
}) {
  useEffect(() => {
    trackEvent(event, params);
  }, [event, JSON.stringify(params)]);

  return null;
}
