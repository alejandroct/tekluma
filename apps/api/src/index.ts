import { handle } from "hono/aws-lambda";
import { app } from "./app";

/** Entrada para AWS Lambda (desplegada con SST). */
export const handler = handle(app);
