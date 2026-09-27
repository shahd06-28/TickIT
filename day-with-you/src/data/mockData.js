export const TYPES = { WORK: "work", STUDY: "study", GYM: "gym", SOCIAL: "social", MEAL: "meal", REST: "rest" };

// event.type -> which FRAME_SETS row to loop while the character is locked onto that event.
// The provided sheet has no dedicated "work" or "rest" pose, so those borrow the closest
// visual fit (desk-sitting for work, the calm blink loop for rest) — swap these the moment
// real frames exist for them.
export const TYPE_TO_FRAMESET = { work: "study", study: "study", gym: "gym", social: "social", meal: "meal", rest: "blink" };
export const TYPE_LABEL = { work: "typing at a desk", study: "studying", gym: "lifting", social: "chatting", meal: "eating", rest: "relaxing" };
export const TYPE_COLOR = { work: "#8FB3C7", gym: "#D9A441", study: "#C97D8B", social: "#EFD3D6", meal: "#4B6B4F", rest: "#E9E2CE" };

export const TODAYS_EVENTS = [
  { id: "e1", title: "Deep work: hackathon deck", start: "08:30", end: "10:00", type: TYPES.WORK, people: [] },
  { id: "e2", title: "Gym — leg day", start: "10:30", end: "11:30", type: TYPES.GYM, people: [] },
  { id: "e3", title: "Lunch with Emily", start: "12:00", end: "13:00", type: TYPES.MEAL, people: ["Emily"] },
  { id: "e4", title: "Study — data structures midterm", start: "14:00", end: "16:00", type: TYPES.STUDY, people: [] },
  { id: "e5", title: "Coffee w/ study group", start: "16:30", end: "17:15", type: TYPES.SOCIAL, people: ["Marcus", "Priya"] },
  { id: "e6", title: "Wind down / journal", start: "21:30", end: "22:00", type: TYPES.REST, people: [] }
];

export const MISSED_YESTERDAY = [{ id: "t-missed-1", title: "Reply to Priya's email" }];

function isoDaysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

export const SEED_MEMORIES = [
  { id: "m-seed-1", date: isoDaysAgo(6), eventId: "e3", note: "Emily and I split a bowl of pho, first time in 3 weeks.", person: "Emily" },
  { id: "m-seed-2", date: isoDaysAgo(8), eventId: "e2", note: "PR'd on squats!!", person: null }
];

export const SEED_GOALS = [
  { id: "g1", text: "See friends at least twice a month", done: false },
  { id: "g2", text: "Finish the semester without an all-nighter", done: false },
  { id: "g3", text: "Actually use this app past January", done: true }
];

export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const DAY_START = 7 * 60;
export const DAY_END = 23 * 60;
