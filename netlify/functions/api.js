const { getPool } = require("./_lib/db");
const { json, parseBody } = require("./_lib/http");
const { isValidDate } = require("./_lib/validation");
const nodemailer = require("nodemailer");

const CLASS_SLOTS = ["07:00-08:00", "09:00-10:00"];
const CLASS_CAPACITY = 30;
const FULL_CLASS_EMAIL_TO = process.env.FULL_CLASS_EMAIL_TO || "21307007@utcgg.edu.mx";
const SMTP_FROM = process.env.SMTP_FROM || "ignacioreynarayo25@gmail.com";

let mailTransporter;

function normalizePath(path = "") {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const parts = clean.split("/");
  const apiIndex = parts.indexOf("api");
  return apiIndex >= 0 ? parts.slice(apiIndex + 1) : [];
}

function normalizeDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value || "").slice(0, 10);
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function isWeekday(dateString) {
  const dt = new Date(`${dateString}T00:00:00`);
  const day = dt.getDay();
  return day >= 1 && day <= 5;
}

function toLocalDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
}

function enabledWeekRange(referenceDate = new Date()) {
  const today = toLocalDate(referenceDate);
  const day = today.getDay();

  if (day === 6 || day === 0) {
    const daysToMonday = day === 6 ? 2 : 1;
    const monday = addDays(today, daysToMonday);
    const friday = addDays(monday, 4);
    return { start: localDateKey(monday), end: localDateKey(friday) };
  }

  const daysFromMonday = day - 1;
  const monday = addDays(today, -daysFromMonday);
  const friday = addDays(monday, 4);
  return { start: localDateKey(monday), end: localDateKey(friday) };
}

function mapBlockedDay(row) {
  return {
    id: row.id,
    class_date: normalizeDate(row.class_date),
    reason: row.reason,
    created_at: row.created_at
  };
}

function mapRegistration(row) {
  const fullName = `${row.last_name_paterno} ${row.last_name_materno} ${row.first_names}`.trim();
  return {
    id: row.id,
    last_name_paterno: row.last_name_paterno,
    last_name_materno: row.last_name_materno,
    first_names: row.first_names,
    full_name: fullName,
    class_date: normalizeDate(row.class_date),
    class_slot: row.class_slot,
    created_at: row.created_at
  };
}

function mapDbError(error) {
  const code = error?.code || "";

  if (code === "DB_ENV_MISSING") {
    return { status: 500, message: "Falta configurar variables de base de datos en Netlify." };
  }
  if (code === "ER_NO_SUCH_TABLE") {
    return { status: 500, message: "Faltan tablas requeridas (class_registrations o blocked_class_days). Importa el SQL actualizado en AWS RDS." };
  }
  if (code === "ER_ACCESS_DENIED_ERROR") {
    return { status: 500, message: "Usuario o password de RDS incorrectos." };
  }
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return { status: 500, message: "No hay conexion a RDS. Revisa endpoint, puerto y reglas de seguridad." };
  }
  if (code === "ER_DUP_ENTRY") {
    return { status: 409, message: "Ese nombre completo ya esta registrado y no puede repetirse." };
  }

  return { status: 500, message: "Error interno del servidor." };
}

function createMailer() {
  if (mailTransporter) {
    return mailTransporter;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const secure = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!user || !pass) {
    throw new Error("Faltan variables SMTP_USER o SMTP_PASS para enviar notificaciones de clase llena.");
  }

  mailTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return mailTransporter;
}

function participantName(row) {
  return `${row.last_name_paterno} ${row.last_name_materno} ${row.first_names}`.trim();
}

async function sendClassFullEmail(pool, classDate, classSlot) {
  const [rows] = await pool.execute(
    `SELECT last_name_paterno, last_name_materno, first_names
     FROM class_registrations
     WHERE class_date = ? AND class_slot = ?
     ORDER BY last_name_paterno, last_name_materno, first_names`,
    [classDate, classSlot]
  );

  const participants = rows.map(participantName);
  const classDatePretty = new Date(`${classDate}T00:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const textLines = [
    "Se completo una clase (30/30).",
    "",
    `Fecha: ${classDatePretty} (${classDate})`,
    `Horario: ${classSlot}`,
    `Total de participantes: ${participants.length}`,
    "",
    "Lista de participantes:",
    ...participants.map((name, index) => `${index + 1}. ${name}`)
  ];

  const htmlList = participants
    .map((name) => `<li>${name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</li>`)
    .join("");

  const transporter = createMailer();
  await transporter.sendMail({
    from: SMTP_FROM,
    to: FULL_CLASS_EMAIL_TO,
    subject: `CLASE LLENA ${classDate} ${classSlot}`,
    text: textLines.join("\n"),
    html: `
      <h2>Clase llena (30/30)</h2>
      <p><strong>Fecha:</strong> ${classDatePretty} (${classDate})</p>
      <p><strong>Horario:</strong> ${classSlot}</p>
      <p><strong>Total:</strong> ${participants.length}</p>
      <h3>Participantes</h3>
      <ol>${htmlList}</ol>
    `
  });
}

async function listRegistrations(pool, query) {
  if (query.date) {
    if (!isValidDate(query.date)) {
      return json(422, { message: "La fecha del filtro no es valida." });
    }

    const [rows] = await pool.execute(
      `SELECT id, last_name_paterno, last_name_materno, first_names, class_date, class_slot, created_at
       FROM class_registrations
       WHERE class_date = ?
       ORDER BY class_date, class_slot, last_name_paterno, last_name_materno, first_names`,
      [query.date]
    );
    return json(200, { data: rows.map(mapRegistration), capacity: CLASS_CAPACITY, slots: CLASS_SLOTS });
  }

  if (query.start_date && query.end_date) {
    if (!isValidDate(query.start_date) || !isValidDate(query.end_date)) {
      return json(422, { message: "Las fechas del rango no son validas." });
    }

    const [rows] = await pool.execute(
      `SELECT id, last_name_paterno, last_name_materno, first_names, class_date, class_slot, created_at
       FROM class_registrations
       WHERE class_date BETWEEN ? AND ?
       ORDER BY class_date, class_slot, last_name_paterno, last_name_materno, first_names`,
      [query.start_date, query.end_date]
    );
    return json(200, { data: rows.map(mapRegistration), capacity: CLASS_CAPACITY, slots: CLASS_SLOTS });
  }

  const [rows] = await pool.execute(
    `SELECT id, last_name_paterno, last_name_materno, first_names, class_date, class_slot, created_at
     FROM class_registrations
     WHERE class_date >= CURDATE()
     ORDER BY class_date, class_slot, last_name_paterno, last_name_materno, first_names`
  );

  return json(200, { data: rows.map(mapRegistration), capacity: CLASS_CAPACITY, slots: CLASS_SLOTS });
}

async function isBlockedDay(pool, dateString) {
  const [rows] = await pool.execute(
    "SELECT id FROM blocked_class_days WHERE class_date = ? LIMIT 1",
    [dateString]
  );
  return rows.length > 0;
}

async function listBlockedDays(pool, query) {
  if (query.date) {
    if (!isValidDate(query.date)) {
      return json(422, { message: "La fecha del filtro no es valida." });
    }

    const [rows] = await pool.execute(
      `SELECT id, class_date, reason, created_at
       FROM blocked_class_days
       WHERE class_date = ?
       LIMIT 1`,
      [query.date]
    );

    return json(200, {
      data: rows.map(mapBlockedDay),
      blocked: rows.length > 0
    });
  }

  if (query.start_date && query.end_date) {
    if (!isValidDate(query.start_date) || !isValidDate(query.end_date)) {
      return json(422, { message: "Las fechas del rango no son validas." });
    }

    const [rows] = await pool.execute(
      `SELECT id, class_date, reason, created_at
       FROM blocked_class_days
       WHERE class_date BETWEEN ? AND ?
       ORDER BY class_date`,
      [query.start_date, query.end_date]
    );

    return json(200, { data: rows.map(mapBlockedDay) });
  }

  const [rows] = await pool.execute(
    `SELECT id, class_date, reason, created_at
     FROM blocked_class_days
     WHERE class_date >= CURDATE()
     ORDER BY class_date`
  );

  return json(200, { data: rows.map(mapBlockedDay) });
}

async function createBlockedDay(pool, payload) {
  const classDate = String(payload.class_date || "");
  const reason = normalizeName(payload.reason || "Dia sin clases").slice(0, 180) || "Dia sin clases";

  if (!isValidDate(classDate)) {
    return json(422, { message: "Selecciona una fecha valida para bloquear." });
  }

  if (!isWeekday(classDate)) {
    return json(422, { message: "Solo puedes bloquear dias de lunes a viernes." });
  }

  try {
    await pool.execute(
      "INSERT INTO blocked_class_days (class_date, reason) VALUES (?, ?)",
      [classDate, reason]
    );
    return json(201, { message: "Dia bloqueado correctamente.", class_date: classDate });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return json(409, { message: "Ese dia ya esta bloqueado como dia sin clases." });
    }
    throw error;
  }
}

async function deleteBlockedDay(pool, dateParam) {
  const classDate = String(dateParam || "");
  if (!isValidDate(classDate)) {
    return json(422, { message: "La fecha para desbloquear no es valida." });
  }

  const [result] = await pool.execute(
    "DELETE FROM blocked_class_days WHERE class_date = ?",
    [classDate]
  );

  if (Number(result.affectedRows || 0) === 0) {
    return json(404, { message: "Ese dia no estaba bloqueado." });
  }

  return json(200, { message: "Dia desbloqueado correctamente.", class_date: classDate });
}

async function createRegistration(pool, payload) {
  const lastNamePaterno = normalizeName(payload.last_name_paterno);
  const lastNameMaterno = normalizeName(payload.last_name_materno);
  const firstNames = normalizeName(payload.first_names);
  const classDate = String(payload.class_date || "");
  const classSlot = String(payload.class_slot || "");

  if (lastNamePaterno.length < 2 || lastNameMaterno.length < 2 || firstNames.length < 2) {
    return json(422, { message: "Completa apellido paterno, apellido materno y nombres." });
  }
  if (!isValidDate(classDate)) {
    return json(422, { message: "Selecciona una fecha valida." });
  }
  if (!isWeekday(classDate)) {
    return json(422, { message: "Solo se permiten clases de lunes a viernes." });
  }
  if (!CLASS_SLOTS.includes(classSlot)) {
    return json(422, { message: "El horario seleccionado no es valido." });
  }
  const { start: enabledStart, end: enabledEnd } = enabledWeekRange(new Date());
  const today = localDateKey(toLocalDate(new Date()));

  if (classDate < today) {
    return json(422, { message: "No se permite registrar clases en fechas pasadas." });
  }

  if (classDate < enabledStart || classDate > enabledEnd) {
    return json(422, {
      message: `Solo puedes registrarte en la semana habilitada (${enabledStart} a ${enabledEnd}).`
    });
  }

  if (await isBlockedDay(pool, classDate)) {
    return json(409, { message: "Dia sin clases. No se permiten registros para esa fecha." });
  }

  const connection = await pool.getConnection();
  let notifyClassFilled = false;

  try {
    await connection.beginTransaction();

    const [duplicateRows] = await connection.execute(
      `SELECT id FROM class_registrations
       WHERE last_name_paterno = ?
         AND last_name_materno = ?
         AND first_names = ?
       LIMIT 1`,
      [lastNamePaterno, lastNameMaterno, firstNames]
    );
    if (duplicateRows.length) {
      await connection.rollback();
      return json(409, { message: "Ese nombre completo ya esta registrado y no puede repetirse." });
    }

    const [countRows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM class_registrations WHERE class_date = ? AND class_slot = ? FOR UPDATE",
      [classDate, classSlot]
    );
    const total = Number(countRows[0]?.total || 0);
    if (total >= CLASS_CAPACITY) {
      await connection.rollback();
      return json(409, { message: "Ese grupo ya llego al cupo maximo de 30 participantes." });
    }

    const [result] = await connection.execute(
      `INSERT INTO class_registrations (
        last_name_paterno,
        last_name_materno,
        first_names,
        class_date,
        class_slot
      ) VALUES (?, ?, ?, ?, ?)`,
      [lastNamePaterno, lastNameMaterno, firstNames, classDate, classSlot]
    );

    notifyClassFilled = total + 1 === CLASS_CAPACITY;

    await connection.commit();

    if (notifyClassFilled) {
      try {
        await sendClassFullEmail(pool, classDate, classSlot);
      } catch (mailError) {
        console.error("No se pudo enviar correo de clase llena:", mailError);
      }
    }

    return json(201, { message: "Registro completado correctamente.", id: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    const mapped = mapDbError(error);
    return json(mapped.status, { message: mapped.message });
  } finally {
    connection.release();
  }
}

exports.handler = async (event) => {
  let pool;
  try {
    pool = getPool();
  } catch (error) {
    console.error(error);
    const mapped = mapDbError(error);
    return json(mapped.status, { message: mapped.message });
  }

  const segments = normalizePath(event.path);
  const method = event.httpMethod || "GET";
  const payload = parseBody(event);

  if (payload === null) {
    return json(400, { message: "El cuerpo JSON es invalido." });
  }

  if (!segments.length) {
    return json(200, { ok: true, service: "class-registration-api" });
  }

  try {
    if (segments[0] === "registrations") {
      if (method === "GET" && segments.length === 1) {
        return await listRegistrations(pool, event.queryStringParameters || {});
      }
      if (method === "POST" && segments.length === 1) {
        return await createRegistration(pool, payload);
      }
      return json(405, { message: "Metodo no permitido." });
    }

    if (segments[0] === "blocked-days") {
      if (method === "GET" && segments.length === 1) {
        return await listBlockedDays(pool, event.queryStringParameters || {});
      }
      if (method === "POST" && segments.length === 1) {
        return await createBlockedDay(pool, payload || {});
      }
      if (method === "DELETE" && segments.length === 2) {
        return await deleteBlockedDay(pool, decodeURIComponent(segments[1]));
      }
      return json(405, { message: "Metodo no permitido." });
    }

    return json(404, { message: "Ruta no encontrada." });
  } catch (error) {
    console.error(error);
    const mapped = mapDbError(error);
    return json(mapped.status, { message: mapped.message });
  }
};
