const flash = document.getElementById("flash");
const form = document.getElementById("booking-form");
const dateInput = document.getElementById("appointment_date");

function showFlash(message, type = "success") {
  flash.innerHTML = `<div class="alert alert--${type}">${message}</div>`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
    client_name: form.client_name.value.trim(),
    appointment_date: form.appointment_date.value,
    appointment_time: form.appointment_time.value
  };

  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      showFlash(result.message || "No se pudo registrar la cita.", "error");
      return;
    }

    showFlash(result.message || "Tu cita se registro correctamente.", "success");
    form.reset();
    form.appointment_date.value = todayISO();
  } catch (_error) {
    showFlash("No se pudo conectar con el servidor.", "error");
  }
});

