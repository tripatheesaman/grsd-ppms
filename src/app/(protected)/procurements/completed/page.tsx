"use client";

import { ProcurementListView } from "@/components/procurement/procurement-list-view";

export default function CompletedProcurementsPage() {
  return <ProcurementListView queue="completed" />;
}
