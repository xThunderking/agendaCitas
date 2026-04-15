const flash = document.getElementById("flash");
const weekTitleEl = document.getElementById("week-title");
const weekDaysEl = document.getElementById("week-days");
const dailyCardsEl = document.getElementById("daily-cards");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const participantsModal = document.getElementById("participants-modal");
const modalCloseBtn = document.getElementById("modal-close");
const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");
const participantsList = document.getElementById("participants-list");

const classSlots = ["07:00-08:00", "09:00-10:00"];
let classCapacity = 30;
let currentData = {};
let activeDate = new Date();
let activeSlot = "07:00-08:00";
let autoRefreshId = null;
let lastAutoRefreshError = "";

const AUTO_REFRESH_MS = 15000;

const weekDayName = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

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

function startOfWeek(date) {
  const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = dt.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMonday);
  return dt;
}

function isSameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

function weekTitle(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric"
  });
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

function isModalOpen() {
  return participantsModal?.classList.contains("participants-modal--open");
}

function openParticipantsModal() {
  if (!participantsModal) {
    return;
  }
  participantsModal.classList.add("participants-modal--open");
  participantsModal.setAttribute("aria-hidden", "false");
}

function closeParticipantsModal() {
  if (!participantsModal) {
    return;
  }
  participantsModal.classList.remove("participants-modal--open");
  participantsModal.setAttribute("aria-hidden", "true");
}

async function loadDayData(dateString, options = {}) {
  const silent = Boolean(options.silent);

  try {
    const response = await fetch(`/api/registrations?date=${dateString}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No se pudo cargar los registros.");
    }

    if (silent) {
      flash.innerHTML = "";
      lastAutoRefreshError = "";
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
    if (!silent) {
      showFlash(error.message, "error");
      return;
    }

    if (lastAutoRefreshError !== error.message) {
      showFlash(error.message, "error");
      lastAutoRefreshError = error.message;
    }
  }
}

function renderCards(dateString) {
  const weekend = !isWeekday(dateString);
  const slotsData = currentData[dateString] || {};

  dailyCardsEl.innerHTML = classSlots
    .map(slot => {
      const participants = slotsData[slot] || [];
      const count = participants.length;
      const isFull = count >= classCapacity;
      const statusClass = weekend ? "daily-class-card--disabled" : classStatusClass(count);
      const isActive = slot === activeSlot ? "daily-class-card--active" : "";
      return `
        <button type="button" class="daily-class-card ${statusClass} ${isActive}" data-slot="${slot}" ${weekend ? "disabled" : ""}>
          <p class="daily-class-card__hour">Clase ${slot} ${isFull ? '<span class="daily-class-card__badge">CLASE LLENA</span>' : ''}</p>
          <p class="daily-class-card__count">${count}/${classCapacity} registrados</p>
        </button>
      `;
    })
    .join("");

  if (weekend) {
    closeParticipantsModal();
    return;
  }

  if (isModalOpen()) {
    showParticipants(dateString, activeSlot, { openModal: false });
  }
}

function showParticipants(date, slot, options = {}) {
  const openModalNow = options.openModal !== false;
  const participants = currentData[date]?.[slot] || [];

  modalTitle.textContent = `Clase ${slot}`;
  modalSubtitle.textContent = `${prettyDate(date)} • ${participants.length}/${classCapacity} registrados`;

  participantsList.innerHTML = participants.length
    ? participants.map(p => `<li><span>${escapeHtml(fullName(p))}</span></li>`).join("")
    : "<li class=\"participants-list__empty\">Sin participantes registrados.</li>";

  if (openModalNow) {
    openParticipantsModal();
  }
}

async function refreshDailyView() {
  const dateString = dateKey(activeDate);
  renderWeekDays();
  await loadDayData(dateString);
  renderCards(dateString);
}

async function refreshDailyViewSilently() {
  const dateString = dateKey(activeDate);
  await loadDayData(dateString, { silent: true });
  renderCards(dateString);
}

function startAutoRefresh() {
  if (autoRefreshId) {
    clearInterval(autoRefreshId);
  }

  autoRefreshId = setInterval(() => {
    if (document.hidden) {
      return;
    }
    refreshDailyViewSilently();
  }, AUTO_REFRESH_MS);
}

function renderWeekDays() {
  const weekStart = startOfWeek(activeDate);
  const today = new Date();
  const selected = new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate());
  const days = [];

  for (let i = 0; i < 7; i += 1) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const dayIso = dateKey(dayDate);
    const isToday = isSameDay(dayDate, today);
    const isSelected = isSameDay(dayDate, selected);
    const classes = ["week-day"];
    if (isToday) {
      classes.push("week-day--today");
    }
    if (isSelected) {
      classes.push("week-day--selected");
    }

    days.push(`
      <button type="button" class="${classes.join(" ")}" data-date="${dayIso}">
        <span class="week-day__name">${weekDayName[dayDate.getDay()]}</span>
        <span class="week-day__number">${String(dayDate.getDate()).padStart(2, "0")}</span>
      </button>
    `);
  }

  weekTitleEl.textContent = weekTitle(dateKey(activeDate));
  weekDaysEl.innerHTML = days.join("");
}

document.addEventListener("DOMContentLoaded", function() {
  prevWeekBtn?.addEventListener("click", async function() {
    activeDate.setDate(activeDate.getDate() - 7);
    await refreshDailyView();
  });

  nextWeekBtn?.addEventListener("click", async function() {
    activeDate.setDate(activeDate.getDate() + 7);
    await refreshDailyView();
  });

  weekDaysEl?.addEventListener("click", async function(event) {
    const dayButton = event.target.closest(".week-day");
    if (!dayButton) {
      return;
    }

    const date = dayButton.dataset.date;
    if (!date) {
      return;
    }

    activeDate = new Date(`${date}T00:00:00`);
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
    showParticipants(dateString, activeSlot, { openModal: true });
  });

  modalCloseBtn?.addEventListener("click", closeParticipantsModal);

  participantsModal?.addEventListener("click", function(event) {
    if (event.target === participantsModal) {
      closeParticipantsModal();
    }
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      closeParticipantsModal();
    }
  });

  refreshDailyView();
  startAutoRefresh();

  document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
      refreshDailyViewSilently();
    }
  });
});
