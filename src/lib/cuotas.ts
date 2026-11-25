import type { Abono, Boleta, Rifa } from "@/db/schema";
import { hoyColombia, sumarDias, sumarMeses } from "@/lib/fechas";

/** Mes de juego (1, 2, 3…) al que pertenece una fecha. Devuelve 0 si es anterior al inicio. */
export function periodoDe(inicio: string, fecha: string): number {
  if (fecha < inicio) return 0;
  let k = 1;
  while (sumarMeses(inicio, k) <= fecha) k++;
  return k;
}

export function rangoPeriodo(inicio: string, mes: number): { desde: string; hasta: string } {
  return { desde: sumarMeses(inicio, mes - 1), hasta: sumarDias(sumarMeses(inicio, mes), -1) };
}

export function totalPeriodos(rifa: Pick<Rifa, "fechaInicioSorteos" | "diasSorteo">): number {
  if (!rifa.fechaInicioSorteos) return Math.max(1, Math.ceil((rifa.diasSorteo * 12) / 365));
  return periodoDe(rifa.fechaInicioSorteos, sumarDias(rifa.fechaInicioSorteos, Math.max(rifa.diasSorteo, 1) - 1));
}

/** Mes que cubre una cuota pagada hoy: el mes en curso, o el primero si los sorteos no han iniciado. */
export function mesVigente(rifa: Pick<Rifa, "fechaInicioSorteos">, hoy = hoyColombia()): number {
  if (!rifa.fechaInicioSorteos || hoy < rifa.fechaInicioSorteos) return 1;
  return periodoDe(rifa.fechaInicioSorteos, hoy);
}

export function cuotasParaCompletar(precio: number, valorCuota: number): number {
  if (valorCuota <= 0) return 1;
  return Math.ceil(precio / valorCuota);
}

export type EstadoMes = "pagado" | "en_revision" | "sin_pagar" | "por_pagar" | "cubierto";

export type ResumenBoleta = {
  pagado: number;
  completa: boolean;
  cuotasPagadas: number;
  cuotasRequeridas: number;
  mesActual: number;
  alDia: boolean;
  meses: { mes: number; estado: EstadoMes }[];
};

export function resumenBoleta(
  boleta: Pick<Boleta, "precio" | "plan" | "estado">,
  abonosBoleta: Pick<Abono, "mes" | "monto">[],
  mesesEnRevision: number[],
  rifa: Pick<Rifa, "fechaInicioSorteos" | "diasSorteo" | "valorCuota">,
  hoy = hoyColombia(),
): ResumenBoleta {
  const pagado = abonosBoleta.reduce((s, a) => s + a.monto, 0);
  const completa = pagado >= boleta.precio;
  const total = totalPeriodos(rifa);
  const iniciada = Boolean(rifa.fechaInicioSorteos && hoy >= rifa.fechaInicioSorteos);
  const mesActual = iniciada ? periodoDe(rifa.fechaInicioSorteos!, hoy) : 0;
  const pagados = new Set(abonosBoleta.filter((a) => a.mes !== null).map((a) => a.mes as number));
  const meses = Array.from({ length: total }, (_, i) => {
    const mes = i + 1;
    let estado: EstadoMes;
    if (pagados.has(mes)) estado = "pagado";
    else if (mesesEnRevision.includes(mes)) estado = "en_revision";
    else if (completa) estado = "cubierto";
    else if (iniciada && mes < mesActual) estado = "sin_pagar";
    else estado = "por_pagar";
    return { mes, estado };
  });
  const alDia =
    completa ||
    (iniciada ? pagados.has(mesActual) : pagados.has(1)) ||
    boleta.plan === "contado";
  return {
    pagado,
    completa,
    cuotasPagadas: abonosBoleta.filter((a) => a.mes !== null).length,
    cuotasRequeridas: boleta.plan === "cuotas" ? cuotasParaCompletar(boleta.precio, rifa.valorCuota) : 1,
    mesActual,
    alDia,
    meses,
  };
}

/** Una boleta juega un sorteo si estaba pagada por completo o tenía la cuota de ese mes, solicitada a tiempo. */
export function habilitadaParaSorteo(
  boleta: Pick<Boleta, "precio">,
  abonosBoleta: Pick<Abono, "mes" | "monto" | "fechaSolicitud">[],
  fechaSorteo: string,
  mes: number,
): boolean {
  const validos = abonosBoleta.filter((a) => a.fechaSolicitud <= fechaSorteo);
  const pagado = validos.reduce((s, a) => s + a.monto, 0);
  return pagado >= boleta.precio || validos.some((a) => a.mes === mes);
}
