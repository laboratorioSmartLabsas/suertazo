import type { Metadata } from "next";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { TituloAdmin } from "@/components/admin/titulo";
import { cambiarRol } from "@/app/acciones/admin";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { requerirAdmin } from "@/lib/auth";
import { formatoFechaCorta } from "@/lib/fechas";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requerirAdmin();
  const { q = "" } = await searchParams;
  const texto = q.trim();
  const padrino = alias(usuarios, "padrino");
  const lista = await db
    .select({
      usuario: {
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        telefono: usuarios.telefono,
        rol: usuarios.rol,
        codigoReferido: usuarios.codigoReferido,
        creadoEn: usuarios.creadoEn,
      },
      padrino: padrino.nombre,
      boletas: sql<number>`(select count(*) from boletas b where b.usuario_id = ${usuarios.id} and b.estado = 'vendida')::int`,
      referidos: sql<number>`(select count(*) from usuarios r where r.referido_por_id = ${usuarios.id})::int`,
    })
    .from(usuarios)
    .leftJoin(padrino, eq(padrino.id, usuarios.referidoPorId))
    .where(
      texto
        ? or(
            ilike(usuarios.nombre, `%${texto}%`),
            ilike(usuarios.email, `%${texto}%`),
            ilike(usuarios.telefono, `%${texto}%`),
          )
        : undefined,
    )
    .orderBy(desc(usuarios.creadoEn))
    .limit(200);

  return (
    <>
      <TituloAdmin titulo="Usuarios" descripcion="Personas registradas, su red y sus boletas." />
      <form className="flex gap-2" action="/admin/usuarios">
        <Input name="q" defaultValue={texto} placeholder="Nombre, correo o celular" className="max-w-sm" />
        <Button type="submit" variant="outline">Buscar</Button>
      </form>
      <Card>
        <CardContent>
          {lista.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay usuarios con esa búsqueda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Referido por</TableHead>
                  <TableHead className="text-right">Boletas</TableHead>
                  <TableHead className="text-right">Referidos</TableHead>
                  <TableHead className="text-right">Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map(({ usuario, padrino: nombrePadrino, boletas, referidos }) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <p className="font-medium">{usuario.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Código {usuario.codigoReferido} · desde {formatoFechaCorta(usuario.creadoEn.toISOString().slice(0, 10))}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>{usuario.email}</p>
                      <p className="text-xs text-muted-foreground">{usuario.telefono}</p>
                    </TableCell>
                    <TableCell>{nombrePadrino ?? "—"}</TableCell>
                    <TableCell className="text-right">{boletas}</TableCell>
                    <TableCell className="text-right">{referidos}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant={usuario.rol === "admin" ? "default" : "outline"}>{usuario.rol === "admin" ? "Máster" : "Usuario"}</Badge>
                        {usuario.id !== admin.id && (
                          <FormAccion
                            accion={cambiarRol.bind(null, usuario.id)}
                            confirmar={usuario.rol === "admin" ? "¿Quitar permisos de administrador?" : "¿Dar permisos de administrador?"}
                          >
                            <BotonEnviar size="xs" variant="ghost" pendienteTexto="...">
                              {usuario.rol === "admin" ? "Quitar máster" : "Hacer máster"}
                            </BotonEnviar>
                          </FormAccion>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
