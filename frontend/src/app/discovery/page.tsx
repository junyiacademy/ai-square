"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiscoveryPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the overview page which is the new entry point
    router.replace("/discovery/overview");
  }, [router]);

  return null;
}
