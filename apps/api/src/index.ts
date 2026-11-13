// Primero Sentry, para que capture errores desde el arranque.
import { conSentry } from "./sentry";
import { handle } from "hono/aws-lambda";
import { app } from "./app";

/** Entrada para AWS Lambda (desplegada con SST). */
export const handler = conSentry(handle(app));
