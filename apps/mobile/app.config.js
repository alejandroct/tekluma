/**
 * Variante «de prueba» para instalar la app en un iPhone propio desde Xcode con un Apple ID gratuito,
 * mientras no exista la cuenta de Apple Developer de la empresa (ver `pnpm iphone` en package.json).
 * Usa otro identificador para no reservar `app.tekluma` en un equipo personal: ese queda para la tienda.
 * Sin TEKLUMA_PRUEBA=1 la configuración es la de app.json tal cual.
 */
module.exports = ({ config }) =>
  process.env.TEKLUMA_PRUEBA === "1"
    ? { ...config, name: "Tekluma β", ios: { ...config.ios, bundleIdentifier: "app.tekluma.prueba" } }
    : config;
