const root = document.getElementById("appointments-root");
const flash = document.getElementById("flash");
const filterForm = document.getElementById("filter-form");
const dateInput = document.getElementById("date");
const clearBtn = document.getElementById("clear-btn");

const weekday = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const month = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const classSlots = ["07:00-08:00", "09:00-10:00"];
let classCapacity = 30;

function showFlash(message, type = "success") {
  flash.innerHTML = `<div class="alert alert--${type}">${message}</div>`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function groupByDate(items) {
  return items.reduce((acc, item) => {
    const dateKey = String(item.class_date || "").slice(0, 10);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});
}

function groupBySlot(items) {
  const grouped = {};
  classSlots.forEach((slot) => {
    grouped[slot] = [];
  });
  items.forEach((item) => {
    if (!grouped[item.class_slot]) {
      grouped[item.class_slot] = [];
    }
    grouped[item.class_slot].push(item);
  });
  return grouped;
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
    root.innerHTML = `<article class="appointment-card appointment-card--empty"><p>No hay registros para esta vista.</p></article>`;
    return;
  }

  const grouped = groupByDate(items);
  const days = Object.keys(grouped).sort();

  const html = days.map((date) => {
    const h = dayHeader(date);
    const slots = groupBySlot(grouped[date]);
    const blocks = classSlots.map((slot) => {
      const people = slots[slot] || [];
      const occupied = people.length;
      const remaining = Math.max(classCapacity - occupied, 0);
      const list = people.length
        ? `<ul class="roster-list">${people.map((person) => `<li>${escapeHtml(person.full_name)}</li>`).join("")}</ul>`
        : `<p class="agenda-item__id">Sin registros en este horario.</p>`;

      return `
        <article class="agenda-item status-accent--scheduled">
          <div class="agenda-item__time">${slot}</div>
          <div class="agenda-item__content">
            <div class="agenda-item__top">
              <h3>Clase ${slot}</h3>
              <span class="status status--scheduled">${occupied}/${classCapacity}</span>
            </div>
            <p class="agenda-item__id">Ocupados: ${occupied} · Disponibles: ${remaining}</p>
            ${list}
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
            <p>${date} - ${grouped[date].length} registro(s)</p>
          </div>
        </header>
        <div class="agenda-day__timeline">${blocks}</div>
      </section>
    `;
  }).join("");

  root.innerHTML = html;
}

async function loadRegistrations(date = "") {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`/api/registrations${query}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "No se pudo cargar los registros.");
  }
  classCapacity = Number(result.capacity || 30);
  render(result.data || []);
}

filterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  flash.innerHTML = "";
  if (dateInput.value && dateInput.value < todayISO()) {
    showFlash("Solo se pueden consultar registros de hoy en adelante.", "error");
    return;
  }
  try {
    await loadRegistrations(dateInput.value);
  } catch (error) {
    showFlash(error.message, "error");
  }
});

clearBtn?.addEventListener("click", async () => {
  dateInput.value = "";
  flash.innerHTML = "";
  try {
    await loadRegistrations();
  } catch (error) {
    showFlash(error.message, "error");
  }
});

loadRegistrations().catch((error) => showFlash(error.message, "error"));

if (dateInput) {
  dateInput.min = todayISO();
}
