import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Bebas_Neue, Geist_Mono, Poppins } from "next/font/google";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const display = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-display" });
const condensed = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-condensed" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Shipyard", template: "%s · Shipyard" },
  description: "Roadmap, release timelines and changelog for our products.",
};

export const viewport: Viewport = { themeColor: "#0b0b0b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${condensed.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <header className="site-header">
          <div className="wrap header-inner">
            <Link href="/" className="brand" aria-label="Shipyard home">
              <span className="brand-box">shipyard</span>
              <span className="brand-dot" aria-hidden />
            </Link>
            <NavLinks />
          </div>
        </header>
        <main id="main" className="main">
          {children}
        </main>
        <footer className="site-footer">
          <div className="wrap footer-inner">
            <span className="footer-word" aria-hidden>
              shipyard
            </span>
            <p>Every change to a release is written to an append-only, timestamped audit log. Nothing is ever edited after the fact.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
