import { conSentry } from "../sentry";
import { avisarRachasEnRiesgo } from "../avisos";

/** Every day at 21:00 Lima: push to whoever is about to lose their daily-question streak. */
export const handler = conSentry(async () => {
  const r = await avisarRachasEnRiesgo();
  console.log(`Rachas en riesgo: ${r.usuarios} usuarios, ${r.enviados} avisos aceptados`);
  return r;
});
