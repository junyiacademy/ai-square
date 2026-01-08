"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PBLPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the scenarios page to avoid duplicate content
    router.replace("/pbl/scenarios");
  }, [router]);

  return null; // Redirecting...
}
