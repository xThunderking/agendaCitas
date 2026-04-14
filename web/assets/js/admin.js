const root = document.getElementById("appointments-root");
const flash = document.getElementById("flash");
const filterForm = document.getElementById("filter-form");
const dateInput = document.getElementById("date");

const statusLabel = {
  scheduled: "Programada",
  cancelled: "Cancelada",
  completed: "Completada"
};

const weekday = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const month = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function showFlash(message, type = "success") {
  flash.innerHTML = `<div class="alert alert--${type}">${message}</div>`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function groupByDate(items) {
  return items.reduce((acc, item) => {
    const dateKey = String(item.appointment_date || "").slice(0, 10);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});
}

function dayHeader(date) {
  const normalized = String(date || "").slice(0, 10);
  const dt = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(dt.getTime())) {
    return { weekday: "Dia", day: "--", month: "---" };
  }
  return {
    weekday: weekday[dt.getDay()],
    day: String(dt.getDate()).padStart(2, "0"),
    month: month[dt.getMonth()]
  };
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render(items) {
  if (!items.length) {
    root.innerHTML = `<article class="appointment-card appointment-card--empty"><p>No hay citas registradas para esta vista.</p></article>`;
    return;
  }

  const grouped = groupByDate(items);
  const days = Object.keys(grouped).sort();

  const html = days.map((date) => {
    const h = dayHeader(date);
    const blocks = grouped[date].map((item) => {
      const canCancel = item.status === "scheduled";
      return `
        <article class="agenda-item status-accent--${item.status}">
          <div class="agenda-item__time">${item.appointment_time}</div>
          <div class="agenda-item__content">
            <div class="agenda-item__top">
              <h3>${escapeHtml(item.client_name)}</h3>
              <span class="status status--${item.status}">${statusLabel[item.status] || "Sin estado"}</span>
            </div>
            <p class="agenda-item__id">Cita #${item.id}</p>
            <div class="agenda-item__actions">
              <a class="btn btn--secondary" href="/admin-edit.html?id=${item.id}">Editar</a>
              ${canCancel ? `<button class="btn btn--danger js-cancel" data-id="${item.id}" type="button">Cancelar</button>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="agenda-day">
        <header class="agenda-day__header">
          <div class="agenda-day__date-block">
            <span class="agenda-day__day">${h.day}</span>
            <span class="agenda-day__month">${h.month}</span>
          </div>
          <div class="agenda-day__meta">
            <h2>${h.weekday}</h2>
            <p>${date} - ${grouped[date].length} cita(s)</p>
          </div>
        </header>
        <div class="agenda-day__timeline">${blocks}</div>
      </section>
    `;
  }).join("");

  root.innerHTML = html;
}

async function loadAppointments(date = "") {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`/api/appointments${query}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "No se pudo cargar la agenda.");
  }
  render(result.data || []);
}

async function cancelAppointment(id) {
  const response = await fetch(`/api/appointments/${id}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "No se pudo cancelar la cita.");
  }
  showFlash(result.message || "Cita cancelada exitosamente.", "success");
  await loadAppointments(dateInput.value);
}

filterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  flash.innerHTML = "";
  if (dateInput.value && dateInput.value < todayISO()) {
    showFlash("Solo se pueden consultar citas de hoy en adelante.", "error");
    return;
  }
  try {
    await loadAppointments(dateInput.value);
  } catch (error) {
    showFlash(error.message, "error");
  }
});

root?.addEventListener("click", async (event) => {
  const btn = event.target.closest(".js-cancel");
  if (!btn) {
    return;
  }
  const id = Number(btn.dataset.id);
  if (!id || !confirm("Deseas cancelar esta cita?")) {
    return;
  }
  try {
    await cancelAppointment(id);
  } catch (error) {
    showFlash(error.message, "error");
  }
});

loadAppointments().catch((error) => showFlash(error.message, "error"));

if (dateInput) {
  dateInput.min = todayISO();
}
