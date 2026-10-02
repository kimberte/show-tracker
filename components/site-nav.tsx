"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/today", label: "Today" },
  { href: "/upcoming", label: "Upcoming" },
  { href: "/my-shows", label: "My Shows" },
  { href: "/discover", label: "Discover" },
  { href: "/new-and-upcoming", label: "New & Upcoming" },
  { href: "/settings/notifications", label: "Notifications" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/settings/notifications"
      ? pathname.startsWith("/settings")
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="site-nav">
      <Link href="/" className="site-brand" onClick={() => setOpen(false)}>
        <span className="accent">MY TV</span> TRACKER
      </Link>

      <div className="site-nav-links">
        {links.map((link) => (
          <Link
            key={link.href}
            className={`nav-pill${isActive(link.href) ? " active" : ""}`}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        className={`mobile-menu-button${open ? " open" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div className="mobile-nav-backdrop" onClick={() => setOpen(false)}>
          <div
            className="mobile-nav-drawer"
            role="dialog"
            aria-label="Navigation menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-nav-header">
              <span className="eyebrow">MENU</span>
              <button
                type="button"
                className="mobile-nav-close"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="mobile-nav-list">
              {links.map((link) => (
                <Link
                  key={link.href}
                  className={`mobile-nav-link${isActive(link.href) ? " active" : ""}`}
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  <span>{link.label}</span>
                  <span className="mobile-nav-arrow">›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
