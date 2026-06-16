import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const { id } = await params;
  const session = await getStore().getSession(id);
  if (!session) return NextResponse.json({ error: "no existe" }, { status: 404 });

  const rows = await getStore().listAttendance(id);
  rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const header = ["timestamp", "nombre", "matricula", "estado", "motivo", "ip", "lat", "lon", "precision_m", "maps"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const maps = r.lat !== null && r.lon !== null ? `https://www.google.com/maps?q=${r.lat},${r.lon}` : "";
    lines.push(
      [
        r.timestamp,
        r.name,
        r.studentId,
        r.status,
        r.reason ?? "",
        r.clientIp,
        r.lat ?? "",
        r.lon ?? "",
        r.accuracy ?? "",
        maps,
      ]
        .map((v) => csvCell(String(v)))
        .join(",")
    );
  }
  const csv = lines.join("\n");
  const safeName = session.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="asistencia-${safeName}.csv"`,
    },
  });
}
