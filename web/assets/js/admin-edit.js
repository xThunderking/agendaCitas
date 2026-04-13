const flash = document.getElementById("flash");
const form = document.getElementById("edit-form");
const title = document.getElementById("title");

function showFlash(message, type = "success") {
  flash.innerHTML = `<div class="alert alert--${type}">${message}</div>`;
}

function getId() {
  const url = new URL(window.location.href);
  return Number(url.searchParams.get("id") || 0);
}

async function loadAppointment(id) {
  const response = await fetch(`/api/appointments/${id}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "No se pudo cargar la cita.");
  }
  return result.data;
}

function fillForm(item) {
  title.textContent = `Editar cita #${item.id}`;
  form.client_name.value = item.client_name;
  form.appointment_date.value = item.appointment_date;
  form.appointment_time.value = item.appointment_time;
  form.status.value = item.status;
}

async function bootstrap() {
  const id = getId();
  if (!id) {
    showFlash("ID de cita invalido.", "error");
    form.style.display = "none";
    return;
  }

  try {
    const item = await loadAppointment(id);
    fillForm(item);
  } catch (error) {
    showFlash(error.message, "error");
    form.style.display = "none";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    flash.innerHTML = "";

    const payload = {
      client_name: form.client_name.value.trim(),
      appointment_date: form.appointment_date.value,
      appointment_time: form.appointment_time.value,
      status: form.status.value
    };

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        showFlash(result.message || "No se pudo actualizar la cita.", "error");
        return;
      }
      showFlash(result.message || "Cita actualizada correctamente.", "success");
      setTimeout(() => {
        window.location.href = "/admin.html";
      }, 900);
    } catch (_error) {
      showFlash("No se pudo conectar con el servidor.", "error");
    }
  });
}

bootstrap();

