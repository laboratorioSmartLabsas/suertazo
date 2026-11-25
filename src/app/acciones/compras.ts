"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { abonos, boletas, ordenes, rifas, usuarios } from "@/db/schema";
import { agregarTokenCompra, COOKIE_REFERIDO, obtenerUsuario, requerirUsuario } from "@/lib/auth";
import { cuotasParaCompletar, mesVigente, totalPeriodos } from "@/lib/cuotas";
import { codigoAleatorio, tokenSeguro } from "@/lib/codigos";
import { formatoBoleta, formatoPesos } from "@/lib/formato";
import { enviarPush, notificarAdmins } from "@/lib/notificaciones";
import { MAX_BOLETAS_POR_ORDEN, obtenerAjustes, totalBoletas, vencerOrdenes, ventaAbierta } from "@/lib/rifas";
import type { EstadoAccion } from "./tipos";

async function rifaAbierta(rifaId: number) {
  const [rifa] = await db.select().from(rifas).where(eq(rifas.id, rifaId)).limit(1);
  if (!rifa || !ventaAbierta(rifa)) return null;
  return rifa;
}

export async function consultarNumeros(
  rifaId: number,
  numeros: number[],
): Promise<{ disponibles: number[]; ocupados: number[] } | { error: string }> {
  const rifa = await rifaAbierta(rifaId);
  if (!rifa) return { error: "Esta rifa no tiene la venta abierta." };
  const validos = [...new Set(numeros)].filter((n) => Number.isInteger(n) && n >= 0 && n < totalBoletas(rifa)).slice(0, MAX_BOLETAS_POR_ORDEN);
  if (!validos.length) return { disponibles: [], ocupados: [] };
  await vencerOrdenes();
  const ocupadas = await db
    .select({ numero: boletas.numero })
    .from(boletas)
    .where(and(eq(boletas.rifaId, rifa.id), inArray(boletas.numero, validos)));
  const setOcupados = new Set(ocupadas.map((o) => o.numero));
  return { disponibles: validos.filter((n) => !setOcupados.has(n)), ocupados: [...setOcupados] };
}

export async function numerosAlAzar(
  rifaId: number,
  cantidad: number,
  excluir: number[],
): Promise<{ numeros: number[] } | { error: string }> {
  const rifa = await rifaAbierta(rifaId);
  if (!rifa) return { error: "Esta rifa no tiene la venta abierta." };
  const pedir = Math.min(Math.max(Math.floor(cantidad), 1), MAX_BOLETAS_POR_ORDEN);
  await vencerOrdenes();
  const ocupadas = await db.select({ numero: boletas.numero }).from(boletas).where(eq(boletas.rifaId, rifa.id));
  const bloqueados = new Set([...ocupadas.map((o) => o.numero), ...excluir.slice(0, MAX_BOLETAS_POR_ORDEN)]);
  const libres: number[] = [];
  for (let n = 0; n < totalBoletas(rifa); n++) if (!bloqueados.has(n)) libres.push(n);
  const elegidos: number[] = [];
  while (elegidos.length < pedir && libres.length) {
    const i = randomInt(libres.length);
    elegidos.push(libres[i]);
    libres[i] = libres[libres.length - 1];
    libres.pop();
  }
  if (!elegidos.length) return { error: "No quedan números disponibles." };
  return { numeros: elegidos };
}

const esquemaContacto = z.object({
  nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(80),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  telefono: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,20}$/, "Escribe un celular válido."),
});

export async function crearOrden(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const rifaId = Number(formData.get("rifaId"));
  const rifa = await rifaAbierta(rifaId);
  if (!rifa) return { error: "Esta rifa no tiene la venta abierta." };

  let numeros: number[];
  try {
    numeros = JSON.parse(String(formData.get("numeros") ?? "[]"));
  } catch {
    return { error: "Selecciona tus números." };
  }
  numeros = [...new Set(numeros)].filter((n) => Number.isInteger(n) && n >= 0 && n < totalBoletas(rifa));
  if (!numeros.length) return { error: "Selecciona al menos un número." };
  if (numeros.length > MAX_BOLETAS_POR_ORDEN) {
    return { error: `Puedes comprar hasta ${MAX_BOLETAS_POR_ORDEN} boletas por solicitud.` };
  }
  if (formData.get("terminos") !== "on") return { error: "Debes aceptar los términos y condiciones." };
  const plan: "contado" | "cuotas" = formData.get("plan") === "cuotas" && rifa.valorCuota > 0 ? "cuotas" : "contado";

  const usuario = await obtenerUsuario();
  let contacto: { nombre: string; email: string; telefono: string };
  if (usuario) {
    contacto = { nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono };
  } else {
    const datos = esquemaContacto.safeParse({
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      telefono: formData.get("telefono"),
    });
    if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa tus datos." };
    contacto = datos.data;
  }

  await vencerOrdenes();
  const [{ pendientes }] = await db
    .select({ pendientes: sql<number>`count(*)::int` })
    .from(ordenes)
    .where(and(eq(ordenes.emailContacto, contacto.email), eq(ordenes.estado, "pendiente")));
  if (pendientes >= 5) {
    return { error: "Tienes 5 solicitudes pendientes de aprobación. Espera a que las revisemos antes de crear otra." };
  }

  const almacen = await cookies();
  let referidorId: number | null = usuario?.referidoPorId ?? null;
  const codigoRef = almacen.get(COOKIE_REFERIDO)?.value;
  if (!referidorId && codigoRef) {
    const [ref] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.codigoReferido, codigoRef)).limit(1);
    if (ref && ref.id !== usuario?.id) referidorId = ref.id;
  }

  const config = await obtenerAjustes();
  const tokenReclamo = tokenSeguro();
  const total = numeros.length * (plan === "cuotas" ? rifa.valorCuota : rifa.precioBoleta);
  let referencia = "";

  try {
    await db.transaction(async (tx) => {
      for (let intento = 0; intento < 5 && !referencia; intento++) {
        const candidata = `SZ-${codigoAleatorio(6)}`;
        const [existe] = await tx.select({ id: ordenes.id }).from(ordenes).where(eq(ordenes.referencia, candidata)).limit(1);
        if (!existe) referencia = candidata;
      }
      const [orden] = await tx
        .insert(ordenes)
        .values({
          referencia,
          rifaId: rifa.id,
          usuarioId: usuario?.id ?? null,
          nombreContacto: contacto.nombre,
          emailContacto: contacto.email,
          telefonoContacto: contacto.telefono,
          tokenReclamo,
          tipo: "compra",
          plan,
          mes: plan === "cuotas" ? mesVigente(rifa) : null,
          referidorId,
          numeros,
          cantidad: numeros.length,
          total,
          venceEn: new Date(Date.now() + config.horasReserva * 3_600_000),
        })
        .returning();
      await tx.insert(boletas).values(
        numeros.map((numero) => ({
          rifaId: rifa.id,
          numero,
          ordenId: orden.id,
          usuarioId: usuario?.id ?? null,
          plan,
          precio: rifa.precioBoleta,
        })),
      );
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const tomadas = await db
        .select({ numero: boletas.numero })
        .from(boletas)
        .where(and(eq(boletas.rifaId, rifa.id), inArray(boletas.numero, numeros)));
      const lista = tomadas.map((t) => formatoBoleta(t.numero, rifa.cifras)).join(", ");
      return { error: `Los números ${lista} acaban de ser tomados. Quítalos y elige otros.` };
    }
    throw error;
  }

  await agregarTokenCompra(tokenReclamo);
  const avisos = await notificarAdmins(db, {
    titulo: `Nueva solicitud ${referencia}`,
    mensaje: `${contacto.nombre} solicitó ${numeros.length} ${numeros.length === 1 ? "boleta" : "boletas"} de ${rifa.nombre} por ${formatoPesos(total)}. Verifica el pago en el banco.`,
    enlace: `/admin/ventas?q=${referencia}`,
  });
  await enviarPush(avisos);
  redirect(`/compra/${referencia}`);
}

async function referenciaUnica(): Promise<string> {
  for (let intento = 0; intento < 8; intento++) {
    const candidata = `SZ-${codigoAleatorio(6)}`;
    const [existe] = await db.select({ id: ordenes.id }).from(ordenes).where(eq(ordenes.referencia, candidata)).limit(1);
    if (!existe) return candidata;
  }
  throw new Error("No se pudo generar la referencia de pago.");
}

/** Crea la solicitud de pago de cuotas mensuales para boletas que ya son del usuario. */
export async function crearOrdenCuota(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const usuario = await requerirUsuario("/cuenta");
  const rifaId = Number(formData.get("rifaId"));
  const [rifa] = await db.select().from(rifas).where(eq(rifas.id, rifaId)).limit(1);
  if (!rifa || rifa.estado !== "activa" || rifa.valorCuota <= 0) return { error: "Esta rifa no recibe pagos de cuotas." };

  const seleccion = formData
    .getAll("cuota")
    .map((v) => String(v).split(":").map(Number))
    .filter(([b, m]) => Number.isInteger(b) && Number.isInteger(m))
    .slice(0, MAX_BOLETAS_POR_ORDEN * 3);
  if (!seleccion.length) return { error: "Selecciona al menos una cuota para pagar." };

  await vencerOrdenes();
  const ids = [...new Set(seleccion.map(([b]) => b))];
  const propias = await db
    .select()
    .from(boletas)
    .where(
      and(
        inArray(boletas.id, ids),
        eq(boletas.rifaId, rifa.id),
        eq(boletas.usuarioId, usuario.id),
        eq(boletas.estado, "vendida"),
        eq(boletas.plan, "cuotas"),
      ),
    );
  if (propias.length !== ids.length) return { error: "Alguna de las boletas seleccionadas no es tuya o no está en plan de cuotas." };

  const pagos = await db.select().from(abonos).where(inArray(abonos.boletaId, ids));
  const pendientes = await db
    .select({ detalle: ordenes.detalle })
    .from(ordenes)
    .where(and(eq(ordenes.usuarioId, usuario.id), eq(ordenes.estado, "pendiente"), eq(ordenes.tipo, "cuota")));
  const enRevision = pendientes.flatMap((o) => o.detalle ?? []);
  const desde = mesVigente(rifa);
  const hasta = totalPeriodos(rifa);

  const detalle: { boletaId: number; numero: number; mes: number }[] = [];
  for (const boleta of propias) {
    const meses = seleccion.filter(([b]) => b === boleta.id).map(([, m]) => m);
    const propiosPagos = pagos.filter((p) => p.boletaId === boleta.id);
    const pagado = propiosPagos.reduce((acc, p) => acc + p.monto, 0);
    const numeroTexto = formatoBoleta(boleta.numero, rifa.cifras);
    if (pagado >= boleta.precio) return { error: `La boleta ${numeroTexto} ya está pagada por completo.` };
    const enCurso = enRevision.filter((d) => d.boletaId === boleta.id).length;
    const restantes = cuotasParaCompletar(boleta.precio, rifa.valorCuota) - propiosPagos.length - enCurso;
    if (meses.length > restantes) {
      return { error: `A la boleta ${numeroTexto} solo le faltan ${Math.max(restantes, 0)} cuotas para quedar paga.` };
    }
    for (const mes of [...new Set(meses)]) {
      if (mes < desde || mes > hasta) return { error: `El mes ${mes} no está disponible para pago.` };
      if (propiosPagos.some((p) => p.mes === mes)) return { error: `La boleta ${numeroTexto} ya tiene pago el mes ${mes}.` };
      if (enRevision.some((d) => d.boletaId === boleta.id && d.mes === mes)) {
        return { error: `La cuota del mes ${mes} de la boleta ${numeroTexto} ya está en revisión.` };
      }
      detalle.push({ boletaId: boleta.id, numero: boleta.numero, mes });
    }
  }

  const config = await obtenerAjustes();
  const referencia = await referenciaUnica();
  const tokenReclamo = tokenSeguro();
  const total = detalle.length * rifa.valorCuota;
  await db.insert(ordenes).values({
    referencia,
    rifaId: rifa.id,
    usuarioId: usuario.id,
    nombreContacto: usuario.nombre,
    emailContacto: usuario.email,
    telefonoContacto: usuario.telefono,
    tokenReclamo,
    tipo: "cuota",
    plan: "cuotas",
    detalle,
    referidorId: usuario.referidoPorId,
    numeros: [...new Set(detalle.map((d) => d.numero))],
    cantidad: detalle.length,
    total,
    venceEn: new Date(Date.now() + config.horasReserva * 3_600_000),
  });
  await agregarTokenCompra(tokenReclamo);
  const avisos = await notificarAdmins(db, {
    titulo: `Pago de cuotas ${referencia}`,
    mensaje: `${usuario.nombre} reportó ${detalle.length} ${detalle.length === 1 ? "cuota" : "cuotas"} de ${rifa.nombre} por ${formatoPesos(total)}. Verifica el pago en el banco.`,
    enlace: `/admin/ventas?q=${referencia}`,
  });
  await enviarPush(avisos);
  redirect(`/compra/${referencia}`);
}
