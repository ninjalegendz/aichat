
import { AdminSettings } from "@/components/admin-settings";
import { Suspense } from "react";

export default function AdminSettingsPage() {
  return (
    <main>
       <Suspense fallback={<div>Loading settings...</div>}>
        <AdminSettings />
      </Suspense>
    </main>
  );
}
