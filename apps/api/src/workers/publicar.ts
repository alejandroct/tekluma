import { conSentry } from "../sentry";
import type { SQSHandler } from "aws-lambda";

/**
 * Consume la cola de publicaciones.
 * TODO: leer tarjetas aprobadas del mazo, armar el PaqueteMazo, validarlo con
 * paqueteMazoSchema, subirlo a S3 y registrar la fila en publicaciones_mazo.
 */
export const handler: SQSHandler = conSentry(async (evento) => {
  for (const mensaje of evento.Records) {
    console.log("Publicación pendiente", mensaje.body);
  }
});
