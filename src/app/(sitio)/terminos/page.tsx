import type { Metadata } from "next";
import { obtenerAjustes } from "@/lib/rifas";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default async function Terminos() {
  const config = await obtenerAjustes();
  const niveles = config.nivelesComision.map((n, i) => `línea ${i + 1}: ${n}%`).join(", ");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-bold tracking-wide">
        <span className="texto-oro">Términos y condiciones</span>
      </h1>
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <section>
          <h2>1. Participación</h2>
          <p>Solo pueden participar personas mayores de 18 años. Cada boleta tiene un número único dentro de su rifa.</p>
        </section>
        <section>
          <h2>2. Compra y aprobación</h2>
          <p>
            Al solicitar una compra, tus números quedan reservados por {config.horasReserva} horas. El pago se hace en el link de{" "}
            {config.nombrePasarela} indicando la referencia de la solicitud. La boleta solo es tuya cuando el administrador verifica el pago en el
            banco y aprueba la solicitud. Si la reserva vence sin aprobación, los números se liberan.
          </p>
        </section>
        <section>
          <h2>3. Pago en cuotas</h2>
          <p>
            Cuando la rifa lo permite, puedes pagar la boleta en cuotas mensuales. Cada cuota habilita la boleta para los sorteos del mes que cubre.
            Si la cuota de un mes no se paga, la boleta no participa en los sorteos de ese mes, aunque su número resulte ganador, y ese premio queda sin
            ganador. Al completar el valor total de la boleta, esta queda paga y participa en todos los sorteos restantes.
          </p>
        </section>
        <section>
          <h2>4. Fecha de inicio y sorteos</h2>
          <p>
            Cada rifa tiene una preventa. Al alcanzar el porcentaje de preventa indicado, el sistema fija la fecha de inicio de los sorteos para el
            plazo indicado en la rifa. Cada sorteo se juega con el resultado oficial de la lotería asignada ese día. Gana la boleta cuyo número coincide
            con las cifras del premio mayor de esa lotería. Si el número no fue vendido o no estaba al día, el premio queda sin ganador.
          </p>
        </section>
        <section>
          <h2>5. Referidos y comisiones</h2>
          <p>
            Por cada pago aprobado de tu red de referidos, el {config.comisionPorcentaje}% del valor pagado se reparte como comisión entre las líneas de
            referidos ({niveles}). Las comisiones se acumulan en tu billetera y puedes solicitar su retiro desde{" "}
            {config.retiroMinimo.toLocaleString("es-CO")} pesos.
          </p>
        </section>
        <section>
          <h2>6. Premios</h2>
          <p>
            Para entregar un premio verificaremos la identidad del titular de la boleta. Los premios en especie se entregan según las condiciones
            publicadas en cada rifa.
          </p>
        </section>
      </div>
    </main>
  );
}
