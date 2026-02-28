import {
  AlertCircle,
  FileCheck2,
  FilePlus2,
  LayoutDashboard,
  Scale,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface AppNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavItem {
  name: string;
  href: string;
}

export const appNavigation: AppNavItem[] = [
  { name: 'Directory', href: '/directory', icon: Search },
  { name: 'Receipts', href: '/receipts', icon: FileCheck2 },
  { name: 'Verify', href: '/receipts/verify', icon: ShieldCheck },
  { name: 'Disputes', href: '/disputes', icon: AlertCircle },
  { name: 'Dashboard', href: '/seller', icon: LayoutDashboard },
  { name: 'Audit', href: '/audit', icon: Scale },
  { name: 'Register', href: '/register', icon: FilePlus2 },
];

export const appNavbarLinks: NavItem[] = appNavigation.map(({ name, href }) => ({
  name,
  href,
}));

export const marketingNavbarLinks: NavItem[] = [
  { name: 'Docs', href: '/docs' },
  { name: 'Security', href: '/security' },
  { name: 'Directory', href: '/directory' },
  { name: 'Disputes', href: '/disputes' },
];

export const footerResourceLinks: NavItem[] = [
  { name: 'Documentation', href: '/docs' },
  { name: 'Security', href: '/security' },
];

export const footerLegalLinks: NavItem[] = [
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
];

export const docsQuickLinks: NavItem[] = [
  { name: 'Service Directory', href: '/directory' },
  { name: 'Receipt Verification', href: '/receipts/verify' },
  { name: 'Dispute Workflow', href: '/disputes/new' },
  { name: 'Audit Exports', href: '/audit' },
  { name: 'Register Service', href: '/register' },
  { name: 'Seller Dashboard', href: '/seller' },
];

export const legalBackLinks: NavItem[] = [
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
  { name: 'Security', href: '/security' },
];
