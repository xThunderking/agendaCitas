const flash = document.getElementById("flash");
const selectedDateEl = document.getElementById("selected-date");
const dailyCardsEl = document.getElementById("daily-cards");
const prevDayBtn = document.getElementById("prev-day");
const nextDayBtn = document.getElementById("next-day");
const rosterTitle = document.getElementById("roster-title");
const rosterSubtitle = document.getElementById("roster-subtitle");
const participantsList = document.getElementById("participants-list");

const classSlots = ["07:00-08:00", "09:00-10:00"];
let classCapacity = 30;
let currentData = {};
let activeDate = new Date();
let activeSlot = "07:00-08:00";

function showFlash(message, type = "success") {
  flash.innerHTML = `<div class="alert alert--${type}">${message}</div>`;
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

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prettyDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function isWeekday(dateString) {
  const dt = new Date(`${dateString}T00:00:00`);
  const day = dt.getDay();
  return day >= 1 && day <= 5;
}

function normalizeDateQuery(value) {
  return String(value || "").slice(0, 10);
}

function classStatusClass(count) {
  if (count >= classCapacity) {
    return "daily-class-card--full";
  }
  if (count >= Math.ceil(classCapacity * 0.8)) {
    return "daily-class-card--high";
  }
  return "daily-class-card--normal";
}

async function loadDayData(dateString) {
  try {
    const response = await fetch(`/api/registrations?date=${dateString}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No se pudo cargar los registros.");
    }

    classCapacity = Number(result.capacity || 30);
    const data = result.data || [];

    currentData[dateString] = {};
    classSlots.forEach(slot => {
      currentData[dateString][slot] = [];
    });

    data.forEach(item => {
      if (!currentData[item.class_date]) {
        currentData[item.class_date] = {};
      }
      if (!currentData[item.class_date][item.class_slot]) {
        currentData[item.class_date][item.class_slot] = [];
      }
      currentData[item.class_date][item.class_slot].push(item);
    });
  } catch (error) {
    showFlash(error.message, "error");
  }
}

function renderCards(dateString) {
  const weekend = !isWeekday(dateString);
  const slotsData = currentData[dateString] || {};

  dailyCardsEl.innerHTML = classSlots
    .map(slot => {
      const participants = slotsData[slot] || [];
      const count = participants.length;
      const statusClass = weekend ? "daily-class-card--disabled" : classStatusClass(count);
      const isActive = slot === activeSlot ? "daily-class-card--active" : "";
      return `
        <button type="button" class="daily-class-card ${statusClass} ${isActive}" data-slot="${slot}" ${weekend ? "disabled" : ""}>
          <p class="daily-class-card__hour">Clase ${slot}</p>
          <p class="daily-class-card__count">${count}/${classCapacity} registrados</p>
        </button>
      `;
    })
    .join("");

  if (weekend) {
    rosterTitle.textContent = "Sin clases este dia";
    rosterSubtitle.textContent = `${prettyDate(dateString)} • Solo se imparten clases de lunes a viernes`;
    participantsList.innerHTML = "<li class=\"participants-list__empty\">No hay registros porque no hay clase en fin de semana.</li>";
    return;
  }

  showParticipants(dateString, activeSlot);
}

function showParticipants(date, slot) {
  const participants = currentData[date]?.[slot] || [];
  rosterTitle.textContent = `Clase ${slot}`;
  rosterSubtitle.textContent = `${prettyDate(date)} • ${participants.length}/${classCapacity} registrados`;

  participantsList.innerHTML = participants.length
    ? participants.map(p => `<li><span>${escapeHtml(fullName(p))}</span></li>`).join("")
    : "<li class=\"participants-list__empty\">Sin participantes registrados.</li>";
}

async function refreshDailyView() {
  const dateString = dateKey(activeDate);
  selectedDateEl.textContent = prettyDate(dateString);
  await loadDayData(dateString);
  renderCards(dateString);
}

document.addEventListener("DOMContentLoaded", function() {
  prevDayBtn?.addEventListener("click", async function() {
    activeDate.setDate(activeDate.getDate() - 1);
    await refreshDailyView();
  });

  nextDayBtn?.addEventListener("click", async function() {
    activeDate.setDate(activeDate.getDate() + 1);
    await refreshDailyView();
  });

  dailyCardsEl?.addEventListener("click", function(event) {
    const card = event.target.closest(".daily-class-card");
    if (!card) {
      return;
    }

    const slot = card.dataset.slot;
    if (!slot) {
      return;
    }

    activeSlot = slot;
    const dateString = normalizeDateQuery(dateKey(activeDate));
    renderCards(dateString);
  });

  refreshDailyView();
});
