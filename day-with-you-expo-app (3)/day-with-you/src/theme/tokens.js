// Design tokens for "Day With You"
// Direction: a lived-in paper scrapbook, not a slick SaaS calendar.
// Palette pulled from the moodboard references: washi-tape sage, dusty rose,
// mustard, and a warm cream paper ground (not the generic cream-+-terracotta AI default —
// this leans sage/moss + rose instead of terracotta, and paper texture over cards+shadows).

export const colors = {
  paper: "#F4F0E4",       // page background, warm uncoated paper
  paperDark: "#E9E2CE",   // recessed panels / today column
  ink: "#3A3229",         // primary text, warm near-black (not #111)
  inkSoft: "#6B6153",     // secondary text
  moss: "#4B6B4F",        // primary accent - washi tape green
  mossDeep: "#31462F",
  rose: "#C97D8B",        // secondary accent - stamped ink rose
  roseSoft: "#EFD3D6",
  mustard: "#D9A441",     // highlight / streaks / stickers
  sky: "#8FB3C7",         // water / calm task blocks
  cream: "#FFFBF2",
  line: "#D8CDB4",        // hairline / grid rules on paper
  shadowNote: "#00000022"
};

export const type = {
  display: { fontFamily: "System", fontWeight: "700" }, // swap for a hand-lettered font (e.g. "Caveat") once loaded via expo-font
  hand: { fontFamily: "System", fontStyle: "italic" },
  body: { fontFamily: "System", fontWeight: "400" }
};

export const spacing = (n) => n * 4;

export const radii = {
  sticker: 10,
  chip: 14,
  torn: 4 // used for the "torn paper edge" corner style on event blocks
};
