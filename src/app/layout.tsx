import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Shipyard", template: "%s · Shipyard" },
  description: "Roadmap, release timelines and changelog for our products.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <header className="site-header">
          <div className="wrap header-inner">
            <Link href="/" className="brand">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                <rect width="24" height="24" rx="6" fill="var(--indigo)" />
                <path d="M5 15h14l-2.5 4h-9L5 15Zm6-9 5 7h-5V6Zm-1 2v5H6.5L10 8Z" fill="#fff" />
              </svg>
              Shipyard
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="wrap main">{children}</main>
        <footer className="site-footer">
          <div className="wrap">Every change to a release is recorded in an append-only, timestamped audit log.</div>
        </footer>
      </body>
    </html>
  );
}
