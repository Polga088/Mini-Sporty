export function getNextFriday(from = new Date()) {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const delta = (5 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date;
}
