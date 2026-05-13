"use client";

import { Suspense } from "react";
import { SidebarWrapper } from "./sidebar-wrapper";

/**
 * The Sidebar uses `useSearchParams()` (to highlight the active project),
 * which Next.js 16 requires to be inside a Suspense boundary during static
 * prerendering. Wrapping the whole layout in Suspense here defers the
 * search-params read to the client and lets every page prerender cleanly.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SidebarWrapper>{children}</SidebarWrapper>
    </Suspense>
  );
}
