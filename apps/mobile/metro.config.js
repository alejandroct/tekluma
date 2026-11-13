// Sentry agrega a cada build los identificadores que unen los errores con el código original.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
