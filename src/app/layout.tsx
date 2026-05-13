import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focus Engine",
  description: "A gamified focus and productivity tracker.",
};

const AppLayout = dynamic(() => import("./layout-client"));

/**
 * Pre-hydration theme script.
 *
 * Reads the persisted preference (light/dark/system) from localStorage and
 * applies the resolved class to <html> BEFORE React hydrates, so there is no
 * flash of the wrong theme on first paint.
 */
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('focus-engine-theme');
    var pref = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var resolved = pref === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : pref;
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" suppressHydrationWarning>
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} min-h-full bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
