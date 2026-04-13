const { getPool } = require("./_lib/db");
const { json, parseBody } = require("./_lib/http");
const { isValidDate, isValidTime, isValidStatus } = require("./_lib/validation");

function normalizePath(path = "") {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const parts = clean.split("/");
  const apiIndex = parts.indexOf("api");
  return apiIndex >= 0 ? parts.slice(apiIndex + 1) : [];
}

function mapAppointment(row) {
  return {
    id: row.id,
    client_name: row.client_name,
    appointment_date: row.appointment_date,
    appointment_time: String(row.appointment_time).slice(0, 5),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function listAppointments(pool, query) {
  if (query.date) {
    if (!isValidDate(query.date)) {
      return json(422, { message: "La fecha del filtro no es valida." });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM appointments WHERE appointment_date = ? ORDER BY appointment_date, appointment_time",
      [query.date]
    );
    return json(200, { data: rows.map(mapAppointment) });
  }

  const [rows] = await pool.execute("SELECT * FROM appointments ORDER BY appointment_date, appointment_time");
  return json(200, { data: rows.map(mapAppointment) });
}

async function createAppointment(pool, payload) {
  const clientName = String(payload.client_name || "").trim();
  const appointmentDate = String(payload.appointment_date || "");
  const appointmentTime = String(payload.appointment_time || "");

  if (clientName.length < 3) {
    return json(422, { message: "Escribe un nombre valido de al menos 3 caracteres." });
  }
  if (!isValidDate(appointmentDate)) {
    return json(422, { message: "Selecciona una fecha valida." });
  }
  if (!isValidTime(appointmentTime)) {
    return json(422, { message: "Selecciona una hora valida." });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO appointments (client_name, appointment_date, appointment_time, status) VALUES (?, ?, ?, 'scheduled')",
      [clientName, appointmentDate, `${appointmentTime}:00`]
    );
    return json(201, { message: "Tu cita se registro correctamente.", id: result.insertId });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return json(409, { message: "Ese horario ya esta ocupado. Elige otro." });
    }
    console.error(error);
    return json(500, { message: "No se pudo registrar la cita." });
  }
}

async function getAppointment(pool, id) {
  const [rows] = await pool.execute("SELECT * FROM appointments WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) {
    return json(404, { message: "La cita no existe." });
  }
  return json(200, { data: mapAppointment(rows[0]) });
}

async function updateAppointment(pool, id, payload) {
  const clientName = String(payload.client_name || "").trim();
  const appointmentDate = String(payload.appointment_date || "");
  const appointmentTime = String(payload.appointment_time || "");
  const status = String(payload.status || "scheduled");

  if (id <= 0 || clientName.length < 3 || !isValidDate(appointmentDate) || !isValidTime(appointmentTime)) {
    return json(422, { message: "Datos invalidos para actualizar la cita." });
  }
  if (!isValidStatus(status)) {
    return json(422, { message: "Estado de cita no valido." });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE appointments SET client_name = ?, appointment_date = ?, appointment_time = ?, status = ? WHERE id = ?",
      [clientName, appointmentDate, `${appointmentTime}:00`, status, id]
    );
    if (!result.affectedRows) {
      return json(404, { message: "La cita no existe." });
    }
    return json(200, { message: "Cita actualizada correctamente." });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return json(409, { message: "Ese horario ya esta ocupado por otra cita activa." });
    }
    console.error(error);
    return json(500, { message: "No se pudo actualizar la cita." });
  }
}

async function cancelAppointment(pool, id) {
  if (id <= 0) {
    return json(422, { message: "Cita invalida." });
  }

  const [result] = await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [id]);
  if (!result.affectedRows) {
    return json(404, { message: "La cita no existe." });
  }
  return json(200, { message: "Cita cancelada exitosamente." });
}

exports.handler = async (event) => {
  const pool = getPool();
  const segments = normalizePath(event.path);
  const method = event.httpMethod || "GET";

  if (!segments.length) {
    return json(200, { ok: true, service: "agenda-citas-api" });
  }

  if (segments[0] !== "appointments") {
    return json(404, { message: "Ruta no encontrada." });
  }

  const id = Number(segments[1] || 0);
  const payload = parseBody(event);

  if (payload === null) {
    return json(400, { message: "El cuerpo JSON es invalido." });
  }

  try {
    if (method === "GET" && segments.length === 1) {
      return await listAppointments(pool, event.queryStringParameters || {});
    }
    if (method === "POST" && segments.length === 1) {
      return await createAppointment(pool, payload);
    }
    if (method === "GET" && segments.length === 2) {
      return await getAppointment(pool, id);
    }
    if (method === "PUT" && segments.length === 2) {
      return await updateAppointment(pool, id, payload);
    }
    if (method === "POST" && segments.length === 3 && segments[2] === "cancel") {
      return await cancelAppointment(pool, id);
    }
  } catch (error) {
    console.error(error);
    return json(500, { message: "Error interno del servidor." });
  }

  return json(405, { message: "Metodo no permitido." });
};

