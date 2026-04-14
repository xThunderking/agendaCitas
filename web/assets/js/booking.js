const flash = document.getElementById("flash");
const form = document.getElementById("booking-form");
const dateInput = document.getElementById("class_date");

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

if (dateInput) {
  const today = todayISO();
  dateInput.min = today;
  dateInput.value = today;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  flash.innerHTML = "";

  const payload = {
    full_name: form.full_name.value.trim(),
    class_date: form.class_date.value,
    class_slot: form.class_slot.value
  };

  if (!isWeekday(payload.class_date)) {
    showFlash("Solo puedes seleccionar clases de lunes a viernes.", "error");
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
  } catch (_error) {
    showFlash("No se pudo conectar con el servidor.", "error");
  }
});
