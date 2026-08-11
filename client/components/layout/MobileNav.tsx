"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User, MessageSquare, Bell } from "lucide-react";

// Mobile app-style bottom navigation (PWA). Shown on small screens only.
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tutors", label: "Search", icon: Search },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/dashboard", label: "Account", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur lg:hidden safe-area-pb">
      <ul className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                  active ? "text-brand-blue" : "text-ink-400"
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
