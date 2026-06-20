"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TallerRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/produccion/kanban");
  }, [router]);
  return null;
}
