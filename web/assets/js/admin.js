const flash = document.getElementById("flash");
const calendarEl = document.getElementById("calendar");
const modal = document.getElementById("participants-modal");
const modalTitle = document.getElementById("modal-title");
const participantsList = document.getElementById("participants-list");
const closeModal = document.querySelector(".close");

const classSlots = ["07:00-08:00", "09:00-10:00"];
let classCapacity = 30;
let currentData = {}; // Para almacenar datos por fecha y slot

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

    // Agrupar por fecha y slot
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

    // Crear eventos para todos los slots en días de semana
    const events = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const day = d.getDay();
      if (day >= 1 && day <= 5) { // Lunes a Viernes
        classSlots.forEach(slot => {
          const participants = currentData[dateStr]?.[slot] || [];
          const count = participants.length;
          let startTime, endTime;
          if (slot === "07:00-08:00") {
            startTime = 'T07:00:00';
            endTime = 'T08:00:00';
          } else if (slot === "09:00-10:00") {
            startTime = 'T09:00:00';
            endTime = 'T10:00:00';
          }
          events.push({
            title: `Clase ${slot} (${count}/${classCapacity})`,
            start: dateStr + startTime,
            end: dateStr + endTime,
            extendedProps: {
              date: dateStr,
              slot: slot,
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
  modalTitle.textContent = `Participantes de la Clase ${slot} - ${date}`;
  participantsList.innerHTML = participants.length
    ? participants.map(p => `<li>${escapeHtml(fullName(p))}</li>`).join("")
    : "<li>Sin participantes registrados.</li>";
  modal.style.display = "block";
}

closeModal.onclick = function() {
  modal.style.display = "none";
};

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

document.addEventListener('DOMContentLoaded', function() {
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridDay',
    locale: 'es',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: loadEvents,
    eventClick: function(info) {
      const props = info.event.extendedProps;
      showParticipants(props.date, props.slot);
    },
    slotMinTime: '06:00:00',
    slotMaxTime: '12:00:00',
    height: 'auto'
  });

  calendar.render();
});
