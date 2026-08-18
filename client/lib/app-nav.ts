import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarDays,
  MessageSquare,
  Bell,
  Settings,
  Wallet,
  Users,
  ShieldCheck,
  BadgeCheck,
  Newspaper,
  Building2,
  Gift,
  Star,
  LifeBuoy,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Only shown to SUPER_ADMIN (not ACADEMIC_ADMIN / INSTITUTION_ADMIN). */
  superAdminOnly?: boolean;
};

export type AppShellVariant = "parent" | "student" | "tutor" | "admin";

export const APP_NAV: Record<AppShellVariant, { title: string; home: string; items: AppNavItem[] }> = {
  parent: {
    title: "Parent portal",
    home: "/dashboard",
    items: [
      { href: "/dashboard", label: "Family dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "Learning", icon: GraduationCap },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  student: {
    title: "Student portal",
    home: "/student-dashboard",
    items: [
      { href: "/student-dashboard", label: "My dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "My learning", icon: BookOpen },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  tutor: {
    title: "Tutor workspace",
    home: "/tutor-dashboard",
    items: [
      { href: "/tutor-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms/tutor", label: "Teaching", icon: ClipboardCheck },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  admin: {
    title: "Admin console",
    home: "/admin",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/super", label: "Super admin", icon: ShieldCheck, superAdminOnly: true },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/vetting", label: "Tutor vetting", icon: BadgeCheck },
      { href: "/admin/cohorts", label: "Cohorts", icon: CalendarDays },
      { href: "/admin/lessons", label: "Today's classes", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/blog", label: "Blog CMS", icon: Newspaper },
      { href: "/admin/institutions", label: "Institutions", icon: Building2 },
      { href: "/admin/referrals", label: "Referrals", icon: Gift },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
    ],
  },
};

export function variantForRoles(roles: string[]): AppShellVariant {
  if (roles.some((r) => r === "SUPER_ADMIN" || r === "ACADEMIC_ADMIN")) return "admin";
  if (roles.includes("TUTOR")) return "tutor";
  if (roles.includes("STUDENT")) return "student";
  return "parent";
}
