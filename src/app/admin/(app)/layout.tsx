import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/server";
import AdminNav from "./AdminNav";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <aside className="admin-side">
        <div className="admin-brand">
          <div className="logo">B</div>
          <span>BACKSPIN</span>
        </div>
        <Suspense>
          <AdminNav />
        </Suspense>
      </aside>
      <main className="admin-main">{children}</main>
    </>
  );
}
