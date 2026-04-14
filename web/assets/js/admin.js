const flash = document.getElementById("flash");
const calendarEl = document.getElementById("calendar");
const rosterTitle = document.getElementById("roster-title");
const rosterSubtitle = document.getElementById("roster-subtitle");
const participantsList = document.getElementById("participants-list");

const classSlots = ["07:00-08:00", "09:00-10:00"];
const slotTimeMap = {
  "07:00-08:00": { start: "07:00:00", end: "08:00:00" },
  "09:00-10:00": { start: "09:00:00", end: "10:00:00" }
};
let classCapacity = 30;
let currentData = {};

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

function classStatusClass(count) {
  if (count >= classCapacity) {
    return "fc-class-event--full";
  }
  if (count >= Math.ceil(classCapacity * 0.8)) {
    return "fc-class-event--high";
  }
  return "fc-class-event--normal";
}

async function loadEvents(fetchInfo, successCallback, failureCallback) {
  try {
    const start = fetchInfo.startStr;
    const end = fetchInfo.endStr;
    const response = await fetch(`/api/registrations?start_date=${start}&end_date=${end}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "No se pudo cargar los registros.");
    }
    classCapacity = Number(result.capacity || 30);
    const data = result.data || [];

    currentData = {};
    data.forEach(item => {
      if (!currentData[item.class_date]) {
        currentData[item.class_date] = {};
      }
      if (!currentData[item.class_date][item.class_slot]) {
        currentData[item.class_date][item.class_slot] = [];
      }
      currentData[item.class_date][item.class_slot].push(item);
    });

    const events = [];
    const startDate = new Date(fetchInfo.start);
    const endDate = new Date(fetchInfo.end);

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = dateKey(d);
      const day = d.getDay();
      if (day >= 1 && day <= 5) {
        classSlots.forEach(slot => {
          const participants = currentData[dateStr]?.[slot] || [];
          const count = participants.length;
          const times = slotTimeMap[slot];

          events.push({
            title: `Clase ${slot}`,
            start: `${dateStr}T${times.start}`,
            end: `${dateStr}T${times.end}`,
            classNames: ["fc-class-event", classStatusClass(count)],
            extendedProps: {
              date: dateStr,
              slot: slot,
              count: count,
              capacity: classCapacity,
              participants: participants
            }
          });
        });
      }
    }

    successCallback(events);
  } catch (error) {
    showFlash(error.message, "error");
    failureCallback(error);
  }
}

function showParticipants(date, slot) {
  const participants = currentData[date]?.[slot] || [];
  rosterTitle.textContent = `Clase ${slot}`;
  rosterSubtitle.textContent = `${prettyDate(date)} • ${participants.length}/${classCapacity} registrados`;

  participantsList.innerHTML = participants.length
    ? participants.map(p => `<li><span>${escapeHtml(fullName(p))}</span></li>`).join("")
    : "<li class=\"participants-list__empty\">Sin participantes registrados.</li>";
}

document.addEventListener('DOMContentLoaded', function() {
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    locale: 'es',
    firstDay: 1,
    weekends: false,
    allDaySlot: false,
    expandRows: true,
    nowIndicator: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,timeGridDay'
    },
    buttonText: {
      today: 'Hoy',
      week: 'Semana',
      day: 'Día'
    },
    events: loadEvents,
    eventContent: function(arg) {
      const count = arg.event.extendedProps.count;
      const capacity = arg.event.extendedProps.capacity;
      return {
        html: `
          <div class="fc-class-event__content">
            <p class="fc-class-event__title">${escapeHtml(arg.event.title)}</p>
            <p class="fc-class-event__meta">${count}/${capacity} registrados</p>
          </div>
        `
      };
    },
    eventClick: function(info) {
      const props = info.event.extendedProps;
      showParticipants(props.date, props.slot);
    },
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '07:00',
      endTime: '10:00'
    },
    slotMinTime: '06:00:00',
    slotMaxTime: '12:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00',
    height: 'auto'
  });

  calendar.render();
});
