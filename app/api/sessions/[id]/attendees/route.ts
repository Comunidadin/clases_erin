import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";

// Lista de asistentes para el polling del dashboard.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const { id } = await params;
  const all = await getStore().listAttendance(id);
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return NextResponse.json({
    attendees: all,
    acceptedCount: all.filter((a) => a.status === "accepted").length,
    rejectedCount: all.filter((a) => a.status === "rejected").length,
  });
}
