import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ejecutarTareas } from "@/lib/rifas";

function autorizado(request: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  const recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secreto || !recibido) return false;
  const a = Buffer.from(secreto);
  const b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const resultado = await ejecutarTareas();
  return NextResponse.json(resultado);
}
