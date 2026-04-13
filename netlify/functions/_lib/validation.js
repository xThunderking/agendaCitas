function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidTime(time) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function isValidStatus(status) {
  return ["scheduled", "cancelled", "completed"].includes(status);
}

module.exports = { isValidDate, isValidTime, isValidStatus };

