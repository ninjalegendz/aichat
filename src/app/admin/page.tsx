
import { AdminDashboard } from "@/components/admin-dashboard";
import { Suspense } from "react";

export default function AdminPage() {
  return (
    <main>
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <AdminDashboard />
      </Suspense>
    </main>
  );
}
