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
  UserPlus,
  Play,
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

export type AppNavSpec = {
  title: string;
  home: string;
  subtitle: string;
  chip: string;
  main: AppNavItem[];
  more: AppNavItem[];
};

export const APP_NAV: Record<AppShellVariant, AppNavSpec> = {
  parent: {
    title: "Parent",
    home: "/dashboard",
    subtitle: "Bookings, payments and your family's progress",
    chip: "Family",
    main: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "My courses", icon: BookOpen },
      { href: "/lms/recorded", label: "LMS", icon: Play },
      { href: "/messages", label: "Community", icon: MessageSquare },
    ],
    more: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Settings", icon: Settings },
      { href: "/help", label: "Help Center", icon: LifeBuoy },
    ],
  },
  student: {
    title: "Student",
    home: "/student-dashboard",
    subtitle: "Your lessons, assignments and progress",
    chip: "Learner",
    main: [
      { href: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "My courses", icon: BookOpen },
      { href: "/lms/recorded", label: "LMS", icon: Play },
      { href: "/messages", label: "Community", icon: MessageSquare },
    ],
    more: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Settings", icon: Settings },
      { href: "/help", label: "Help Center", icon: LifeBuoy },
    ],
  },
  tutor: {
    title: "Tutor",
    home: "/tutor-dashboard",
    subtitle: "Teaching, roster and earnings",
    chip: "Tutor",
    main: [
      { href: "/tutor-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms/tutor", label: "Teaching", icon: ClipboardCheck },
      { href: "/messages", label: "Community", icon: MessageSquare },
    ],
    more: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Settings", icon: Settings },
      { href: "/help", label: "Help Center", icon: LifeBuoy },
    ],
  },
  admin: {
    title: "Admin",
    home: "/admin",
    subtitle: "Platform operations",
    chip: "Console",
    main: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/super", label: "Super admin", icon: ShieldCheck, superAdminOnly: true },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/vetting", label: "Tutor vetting", icon: BadgeCheck },
      { href: "/admin/cohorts", label: "Cohorts", icon: CalendarDays },
      { href: "/admin/admissions", label: "Admissions", icon: GraduationCap },
    ],
    more: [
      { href: "/admin/private-tuition", label: "Private tuition", icon: UserPlus },
      { href: "/admin/lessons", label: "Today's classes", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/blog", label: "Blog CMS", icon: Newspaper },
      { href: "/admin/institutions", label: "Institutions", icon: Building2 },
      { href: "/admin/referrals", label: "Referrals", icon: Gift },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/account", label: "Settings", icon: Settings },
    ],
  },
};

export function variantForRoles(roles: string[]): AppShellVariant {
  if (roles.some((r) => r === "SUPER_ADMIN" || r === "ACADEMIC_ADMIN")) return "admin";
  if (roles.includes("TUTOR")) return "tutor";
  if (roles.includes("STUDENT")) return "student";
  return "parent";
}

