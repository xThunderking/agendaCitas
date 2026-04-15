const flash = document.getElementById("flash");
const form = document.getElementById("booking-form");
const dateInput = document.getElementById("class_date");
const dateStatus = document.getElementById("date-status");
const submitButton = form?.querySelector("button[type='submit']");

let blockedDateSelected = false;

function showFlash(message, type = "success") {
  flash.innerHTML = `<div class="alert alert--${type}">${message}</div>`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isWeekday(dateString) {
  const dt = new Date(`${dateString}T00:00:00`);
  const day = dt.getDay();
  return day >= 1 && day <= 5;
}

function setDateStatus(message = "", type = "neutral") {
  if (!dateStatus) {
    return;
  }

  dateStatus.textContent = message;
  dateStatus.className = `date-status date-status--${type}`;
}

async function checkBlockedDay(dateString) {
  if (!dateString) {
    blockedDateSelected = false;
    submitButton?.removeAttribute("disabled");
    setDateStatus("");
    return false;
  }

  try {
    const response = await fetch(`/api/blocked-days?date=${dateString}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No se pudo validar la fecha seleccionada.");
    }

    blockedDateSelected = Boolean(result.blocked);
    if (blockedDateSelected) {
      setDateStatus("Dia sin clases: esta fecha esta bloqueada.", "error");
      submitButton?.setAttribute("disabled", "disabled");
      return true;
    }

    setDateStatus("Fecha disponible para registro.", "ok");
    submitButton?.removeAttribute("disabled");
    return false;
  } catch (_error) {
    blockedDateSelected = false;
    submitButton?.removeAttribute("disabled");
    setDateStatus("No se pudo validar si el dia tiene clases.", "error");
    return false;
  }
}

if (dateInput) {
  const today = todayISO();
  dateInput.min = today;
  dateInput.value = today;
  checkBlockedDay(today);

  dateInput.addEventListener("change", function() {
    checkBlockedDay(dateInput.value);
  });
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  flash.innerHTML = "";

  const payload = {
    last_name_paterno: form.last_name_paterno.value.trim(),
    last_name_materno: form.last_name_materno.value.trim(),
    first_names: form.first_names.value.trim(),
    class_date: form.class_date.value,
    class_slot: form.class_slot.value
  };

  if (payload.last_name_paterno.length < 2 || payload.last_name_materno.length < 2 || payload.first_names.length < 2) {
    showFlash("Completa apellido paterno, apellido materno y nombres.", "error");
    return;
  }

  if (!isWeekday(payload.class_date)) {
    showFlash("Solo puedes seleccionar clases de lunes a viernes.", "error");
    return;
  }

  const isBlocked = blockedDateSelected || await checkBlockedDay(payload.class_date);
  if (isBlocked) {
    showFlash("Dia sin clases. Elige otra fecha para registrarte.", "error");
    return;
  }

  try {
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      showFlash(result.message || "No se pudo completar el registro.", "error");
      return;
    }

    showFlash(result.message || "Registro completado correctamente.", "success");
    form.reset();
    form.class_date.value = todayISO();
    setDateStatus("");
    submitButton?.removeAttribute("disabled");
  } catch (_error) {
    showFlash("No se pudo conectar con el servidor.", "error");
  }
});
