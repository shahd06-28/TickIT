export function generateNudges({ events, memories }) {
  const out = [];
  const peopleToday = new Set(events.flatMap((e) => e.people || []));
  const lastSeen = {};
  memories.forEach((m) => {
    if (m.person) {
      if (!lastSeen[m.person] || new Date(m.date) > new Date(lastSeen[m.person])) lastSeen[m.person] = m.date;
    }
  });
  Object.entries(lastSeen).forEach(([person, date]) => {
    if (peopleToday.has(person)) return;
    const daysSince = Math.round((new Date() - new Date(date)) / 86400000);
    if (daysSince >= 5) out.push(`It's been ${daysSince} days since you saw ${person} — maybe say hi?`);
  });
  events.forEach((e) => {
    if (e.type === "study") out.push(`"${e.title}" is on today — a quick review before it starts could help.`);
  });
  return out.slice(0, 3);
}
