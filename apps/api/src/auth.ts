import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { expo } from "@better-auth/expo";
import { PROFESSIONS } from "@tekluma/shared";
import { db } from "./db/client";
import * as schema from "./db/schema";
import { enviarCorreo } from "./correo";

const { APPLE_CLIENT_ID, APPLE_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_URL, WEB_URL, COOKIE_DOMAIN } = process.env;

/** Origins allowed to use cookie-based sessions (the editorial panel). */
export const origenesPanel = ADMIN_URL ? [ADMIN_URL] : ["http://localhost:5173"];

/** Browser origins allowed by CORS: the panel plus the public site (daily question, duels). */
export const origenesWeb = [...origenesPanel, ...(WEB_URL ? [WEB_URL] : ["http://localhost:5180"])];

export const auth = betterAuth({
  basePath: "/auth",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: {
    database: { generateId: "uuid" },
    // The panel (admin.<domain>) and the API (api.<domain>) share the session cookie.
    ...(COOKIE_DOMAIN ? { crossSubDomainCookies: { enabled: true, domain: COOKIE_DOMAIN } } : {}),
  },

  user: {
    modelName: "users",
    additionalFields: {
      profession: { type: "string", required: false, input: true },
    },
  },
  session: { modelName: "sessions", expiresIn: 60 * 60 * 24 * 60 /* 60 days */ },
  account: { modelName: "accounts", accountLinking: { enabled: true, trustedProviders: ["apple", "google"] } },
  verification: { modelName: "verifications" },

  databaseHooks: {
    user: {
      update: {
        // Only professions from the onboarding list are accepted.
        before: async (datos) => {
          const profession = (datos as { profession?: unknown }).profession;
          if (profession != null && !(PROFESSIONS as readonly unknown[]).includes(profession)) return false;
          return { data: datos };
        },
      },
    },
  },

  // Only enabled when configured (see .env.example).
  socialProviders: {
    ...(APPLE_CLIENT_ID && APPLE_CLIENT_SECRET
      ? { apple: { clientId: APPLE_CLIENT_ID, clientSecret: APPLE_CLIENT_SECRET, appBundleIdentifier: "app.tekluma" } }
      : {}),
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } } : {}),
  },

  trustedOrigins: ["tekluma://", ...origenesPanel, ...(process.env.NODE_ENV === "production" ? [] : ["exp://"])],

  plugins: [
    expo(),
    // Passwordless: users sign in with a 6-digit code sent by email.
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      async sendVerificationOTP({ email, otp }) {
        await enviarCorreo(email, `Tu código de Tekluma: ${otp}`, `Tu código para entrar a Tekluma es ${otp}. Vence en 10 minutos.`);
      },
    }),
  ],
});
