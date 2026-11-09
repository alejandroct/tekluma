import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { expo } from "@better-auth/expo";
import { db } from "./db/client";
import * as schema from "./db/schema";
import { enviarCorreo } from "./correo";

const { APPLE_CLIENT_ID, APPLE_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

export const auth = betterAuth({
  basePath: "/auth",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: { database: { generateId: "uuid" } },

  // Mapeo a nuestras tablas en español; los campos no listados usan el mismo nombre.
  user: {
    modelName: "usuarios",
    fields: { name: "nombre", emailVerified: "emailVerificado", image: "imagen", createdAt: "creadoEn", updatedAt: "actualizadoEn" },
  },
  session: { modelName: "sesiones", expiresIn: 60 * 60 * 24 * 60 /* 60 días */ },
  account: { modelName: "cuentas", accountLinking: { enabled: true, trustedProviders: ["apple", "google"] } },
  verification: { modelName: "verificaciones" },

  // Solo se activan si están configurados (ver .env.example).
  socialProviders: {
    ...(APPLE_CLIENT_ID && APPLE_CLIENT_SECRET
      ? { apple: { clientId: APPLE_CLIENT_ID, clientSecret: APPLE_CLIENT_SECRET, appBundleIdentifier: "app.tekluma" } }
      : {}),
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } } : {}),
  },

  trustedOrigins: ["tekluma://", ...(process.env.NODE_ENV === "production" ? [] : ["exp://"])],

  plugins: [
    expo(),
    // Sin contraseñas: el usuario entra con un código de 6 dígitos enviado al correo.
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      async sendVerificationOTP({ email, otp }) {
        await enviarCorreo(email, `Tu código de Tekluma: ${otp}`, `Tu código para entrar a Tekluma es ${otp}. Vence en 10 minutos.`);
      },
    }),
  ],
});
