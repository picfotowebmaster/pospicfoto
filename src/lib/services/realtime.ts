import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export function useRealtime(
  channel: string,
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  callback: (payload: any) => void,
) {
  useEffect(() => {
    const subscription = supabase
      .channel(channel)
      .on(
        "postgres_changes" as never,
        { event, schema: "public", table },
        callback as never,
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channel, table, event, callback]);
}
