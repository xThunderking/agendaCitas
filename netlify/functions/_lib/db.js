const mysql = require("mysql2/promise");

let pool;

function getEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function getPool() {
  if (pool) {
    return pool;
  }

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
    timezone: "Z"
  });

  return pool;
}

module.exports = { getPool };

