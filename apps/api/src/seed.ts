/** CLI: `pnpm --filter @tekluma/api db:seed` (local, or with DATABASE_URL pointing to a dev branch). */
import { sembrar } from "./semilla";

for (const linea of await sembrar()) console.log(linea);
process.exit(0);
