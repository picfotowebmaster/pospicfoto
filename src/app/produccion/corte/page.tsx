"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CorteRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/produccion/kanban");
  }, [router]);
  return null;
}
