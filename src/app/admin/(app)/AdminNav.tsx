"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/waiting", label: "Waiting List" },
  { href: "/admin/history", label: "Player History" },
  { href: "/admin/export", label: "Export" },
];

export default function AdminNav() {
  const path = usePathname();
  const router = useRouter();
  const t = useSearchParams().get("t");
  const withT = (href: string) => (t && href !== "/admin/tournaments" ? `${href}?t=${t}` : href);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <nav className="admin-nav">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={withT(l.href)} className={active ? "active" : ""}>
            {l.label}
          </Link>
        );
      })}
      <button onClick={signOut} style={{ marginTop: 14 }}>
        Sign out
      </button>
    </nav>
  );
}
