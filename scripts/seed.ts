try {
  process.loadEnvFile?.(".env");
} catch {}

const NOMBRES_LOTERIAS: [string, string][] = [
  ["Lotería de Cundinamarca", "Lunes"],
  ["Lotería del Tolima", "Lunes"],
  ["Lotería de la Cruz Roja", "Martes"],
  ["Lotería del Huila", "Martes"],
  ["Lotería del Meta", "Miércoles"],
  ["Lotería de Manizales", "Miércoles"],
  ["Lotería del Valle", "Miércoles"],
  ["Lotería de Bogotá", "Jueves"],
  ["Lotería del Quindío", "Jueves"],
  ["Lotería de Medellín", "Viernes"],
  ["Lotería de Santander", "Viernes"],
  ["Lotería de Risaralda", "Viernes"],
  ["Lotería de Boyacá", "Sábado"],
  ["Lotería del Cauca", "Sábado"],
  ["Extra de Colombia", "Sábado"],
];

async function main() {
  const { db } = await import("../src/db");
  const { ajustes, loterias, premios, rifas, usuarios } = await import("../src/db/schema");
  const { hashClave } = await import("../src/lib/auth");
  const { codigoAleatorio } = await import("../src/lib/codigos");
  const { eq } = await import("drizzle-orm");

  await db
    .insert(ajustes)
    .values({
      id: 1,
      marcaNombre: "Suertazo",
      inicioTitulo: "Un millón de pesos todos los días durante un año",
      inicioTexto:
        "Con una sola boleta juegas 365 sorteos diarios de $1.000.000, un lote en Guatapé y una moto Yamaha NMAX 0 km. Págala de contado o en cuotas de $15.000 al mes: cada cuota habilita tu boleta para los sorteos de ese mes.",
      anuncio: "Preventa abierta: cuando vendamos el 30% de la boletería se fija la fecha de inicio de los sorteos.",
      nombrePasarela: "Wompi",
      instruccionesPago:
        "Paga el valor total en el link de Wompi y escribe tu referencia de compra en la descripción del pago. Validamos cada pago en el banco antes de aprobar tus boletas.",
    })
    .onConflictDoNothing();

  await db
    .insert(loterias)
    .values(NOMBRES_LOTERIAS.map(([nombre, diaJuego]) => ({ nombre, diaJuego })))
    .onConflictDoNothing();

  const [existente] = await db.select().from(rifas).where(eq(rifas.slug, "gran-rifa-suertazo")).limit(1);
  if (!existente) {
    const [rifa] = await db
      .insert(rifas)
      .values({
        slug: "gran-rifa-suertazo",
        nombre: "Gran Rifa Suertazo",
        descripcion:
          "La rifa que paga todos los días: $1.000.000 diario durante 365 días, más un lote en Guatapé y una Yamaha NMAX de concesionario. Tu boleta de 4 cifras juega con el resultado de la lotería del día. Págala de contado ($180.000) o con cuotas mensuales de $15.000: la cuota de cada mes habilita tu boleta para los sorteos de ese mes, y al completar el valor de la boleta queda paga para todo el año.",
        precioBoleta: 180000,
        valorCuota: 15000,
        cifras: 4,
        porcentajePreventa: 30,
        mesesEspera: 1,
        diasSorteo: 365,
        premioDiario: 1000000,
        linkPago: process.env.WOMPI_LINK_PAGO || null,
        estado: "activa",
      })
      .returning();
    await db.insert(premios).values([
      {
        rifaId: rifa.id,
        titulo: "$1.000.000 diarios",
        descripcion: "Un millón de pesos cada día durante 365 días con el resultado de la lotería del día.",
        valor: 1000000,
        tipo: "diario",
        orden: 1,
      },
      {
        rifaId: rifa.id,
        titulo: "Lote en Guatapé",
        descripcion: "Lote con escrituras en Guatapé, Antioquia, cerca del embalse y la Piedra del Peñol.",
        valor: 0,
        tipo: "especial",
        diaSorteo: 365,
        orden: 2,
      },
      {
        rifaId: rifa.id,
        titulo: "Yamaha NMAX 0 km",
        descripcion: "Moto Yamaha NMAX nueva, entregada en concesionario con papeles al día.",
        valor: 0,
        tipo: "especial",
        diaSorteo: 180,
        orden: 3,
      },
    ]);
    console.log("Rifa inicial creada: Gran Rifa Suertazo");
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const clave = process.env.ADMIN_PASSWORD;
  if (email && clave) {
    const [admin] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
    if (!admin) {
      await db.insert(usuarios).values({
        nombre: process.env.ADMIN_NOMBRE || "Administrador Suertazo",
        email,
        telefono: process.env.ADMIN_TELEFONO || "0000000000",
        passwordHash: await hashClave(clave),
        rol: "admin",
        codigoReferido: codigoAleatorio(7),
      });
      console.log(`Administrador creado: ${email}`);
    } else if (admin.rol !== "admin") {
      await db.update(usuarios).set({ rol: "admin" }).where(eq(usuarios.id, admin.id));
      console.log(`Usuario ${email} promovido a administrador.`);
    }
  } else {
    console.warn("ADMIN_EMAIL y ADMIN_PASSWORD no están definidos: no se creó el administrador.");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Error en el seed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
