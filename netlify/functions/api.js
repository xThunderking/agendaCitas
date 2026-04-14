const { getPool } = require("./_lib/db");
const { json, parseBody } = require("./_lib/http");
const { isValidDate } = require("./_lib/validation");

const CLASS_SLOTS = ["07:00-08:00", "09:00-10:00"];
const CLASS_CAPACITY = 30;

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
    return { status: 500, message: "La tabla class_registrations no existe. Importa el SQL actualizado en AWS RDS." };
  }
  if (code === "ER_ACCESS_DENIED_ERROR") {
    return { status: 500, message: "Usuario o password de RDS incorrectos." };
  }
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return { status: 500, message: "No hay conexion a RDS. Revisa endpoint, puerto y reglas de seguridad." };
  }
  if (code === "ER_DUP_ENTRY") {
    return { status: 409, message: "Esa persona ya esta registrada en esa misma clase." };
  }

  return { status: 500, message: "Error interno del servidor." };
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

  const [rows] = await pool.execute(
    `SELECT id, last_name_paterno, last_name_materno, first_names, class_date, class_slot, created_at
     FROM class_registrations
     WHERE class_date >= CURDATE()
     ORDER BY class_date, class_slot, last_name_paterno, last_name_materno, first_names`
  );

  return json(200, { data: rows.map(mapRegistration), capacity: CLASS_CAPACITY, slots: CLASS_SLOTS });
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [duplicateRows] = await connection.execute(
      `SELECT id FROM class_registrations
       WHERE class_date = ?
         AND class_slot = ?
         AND last_name_paterno = ?
         AND last_name_materno = ?
         AND first_names = ?
       LIMIT 1`,
      [classDate, classSlot, lastNamePaterno, lastNameMaterno, firstNames]
    );
    if (duplicateRows.length) {
      await connection.rollback();
      return json(409, { message: "Esa persona ya esta registrada en esa misma clase." });
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

    await connection.commit();
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

  if (segments[0] !== "registrations") {
    return json(404, { message: "Ruta no encontrada." });
  }

  try {
    if (method === "GET" && segments.length === 1) {
      return await listRegistrations(pool, event.queryStringParameters || {});
    }
    if (method === "POST" && segments.length === 1) {
      return await createRegistration(pool, payload);
    }
  } catch (error) {
    console.error(error);
    const mapped = mapDbError(error);
    return json(mapped.status, { message: mapped.message });
  }

  return json(405, { message: "Metodo no permitido." });
};
