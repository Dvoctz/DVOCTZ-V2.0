import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

export function usePageTracking({
  pageType,
  pageId = null,
}: {
  pageType: string;
  pageId?: string | number | null;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per mount/page
    if (tracked.current) return;
    
    // Quick guard to not track if missing ID for dynamic pages
    if ((pageType !== 'homepage' && pageType !== 'live') && !pageId) return;

    tracked.current = true;

    const trackVisit = async () => {
      try {
        await supabase.from("page_visits").insert([
          {
            page_type: pageType,
            page_id: pageId ? String(pageId) : null,
          }
        ]);
      } catch (err) {
        console.error("Failed to track page visit", err);
      }
    };

    trackVisit();
  }, [pageType, pageId]);
}
