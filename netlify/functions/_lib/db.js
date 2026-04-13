const mysql = require("mysql2/promise");

let pool;

function getEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function missingRequiredEnv() {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  return required.filter((key) => !getEnv(key));
}

function getPool() {
  if (pool) {
    return pool;
  }

  const missing = missingRequiredEnv();
  if (missing.length) {
    const error = new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
    error.code = "DB_ENV_MISSING";
    throw error;
  }

  const useSsl = String(getEnv("DB_SSL", "false")).toLowerCase() === "true";

  pool = mysql.createPool({
    host: getEnv("DB_HOST"),
    port: Number(getEnv("DB_PORT", "3306")),
    user: getEnv("DB_USER"),
    password: getEnv("DB_PASSWORD"),
    database: getEnv("DB_NAME", "agenda_citas"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  });

  return pool;
}

module.exports = { getPool };
