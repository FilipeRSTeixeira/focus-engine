"use client";

import { Sidebar } from "@/components/sidebar";

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="sm:ml-0">{children}</div>
      </main>
    </div>
  );
}
