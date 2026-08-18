"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function QualityPoller({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => router.refresh(), intervalMs);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [router, intervalMs]);

  return null;
}
