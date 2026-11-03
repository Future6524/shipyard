"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, LayoutGrid, Lock, ScrollText } from "lucide-react";

const LINKS = [
  { href: "/", label: "Roadmap", Icon: LayoutGrid },
  { href: "/changelog", label: "Changelog", Icon: ScrollText },
  { href: "/stats", label: "Stats", Icon: ChartColumn },
];

export function NavLinks() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/releases") : path.startsWith(href));
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={active(href) ? "on" : ""} aria-current={active(href) ? "page" : undefined}>
          <Icon aria-hidden size={16} strokeWidth={2.25} />
          <span>{label}</span>
        </Link>
      ))}
      <Link href="/admin" className={`nav-admin ${path.startsWith("/admin") ? "on" : ""}`}>
        <Lock aria-hidden size={14} strokeWidth={2.5} />
        <span>Admin</span>
      </Link>
    </nav>
  );
}
