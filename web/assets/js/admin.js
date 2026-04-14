const root = document.getElementById("registrations-root");
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

function fullName(person) {
  return `${person.last_name_paterno} ${person.last_name_materno} ${person.first_names}`.trim();
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

function render(date, items) {
  const header = dayHeader(date);
  const bySlot = groupBySlot(items);

  const cards = classSlots.map((slot, idx) => {
    const people = bySlot[slot] || [];
    const occupied = people.length;
    const remaining = Math.max(classCapacity - occupied, 0);
    const isOpen = idx === 0 ? "open" : "";
    const listHtml = people.length
      ? `<ul class="roster-list">${people.map((person) => `<li>${escapeHtml(fullName(person))}</li>`).join("")}</ul>`
      : `<p class="agenda-item__id">Sin personas registradas en este horario.</p>`;

    return `
      <details class="class-card" ${isOpen}>
        <summary class="class-card__summary">
          <div class="class-card__left">
            <span class="class-card__slot">${slot}</span>
            <h3>Clase ${slot}</h3>
          </div>
          <div class="class-card__stats">
            <span class="status status--scheduled">${occupied}/${classCapacity}</span>
            <small>Disponibles: ${remaining}</small>
          </div>
        </summary>
        <div class="class-card__body">
          ${listHtml}
        </div>
      </details>
    `;
  }).join("");

  root.innerHTML = `
    <section class="daily-calendar">
      <header class="daily-calendar__header">
        <div class="agenda-day__date-block">
          <span class="agenda-day__day">${header.day}</span>
          <span class="agenda-day__month">${header.month}</span>
        </div>
        <div class="agenda-day__meta">
          <h2>${header.weekday}</h2>
          <p>${date} · 2 clases del dia</p>
        </div>
      </header>
      <div class="daily-calendar__classes">
        ${cards}
      </div>
    </section>
  `;
}

async function loadRegistrations(date) {
  const query = `?date=${encodeURIComponent(date)}`;
  const response = await fetch(`/api/registrations${query}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "No se pudo cargar los registros.");
  }
  classCapacity = Number(result.capacity || 30);
  render(date, result.data || []);
}

filterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  flash.innerHTML = "";
  try {
    await loadRegistrations(dateInput.value);
  } catch (error) {
    showFlash(error.message, "error");
  }
});

clearBtn?.addEventListener("click", async () => {
  flash.innerHTML = "";
  dateInput.value = todayISO();
  try {
    await loadRegistrations(dateInput.value);
  } catch (error) {
    showFlash(error.message, "error");
  }
});

if (dateInput) {
  dateInput.min = todayISO();
  dateInput.value = todayISO();
}

loadRegistrations(dateInput.value).catch((error) => showFlash(error.message, "error"));
