"use client";

import { Sidebar } from "@/components/sidebar";
import { CommandPaletteProvider } from "@/components/command-palette";
import { PageTransition } from "@/components/page-transition";

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="sm:ml-0">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </CommandPaletteProvider>
  );
}
