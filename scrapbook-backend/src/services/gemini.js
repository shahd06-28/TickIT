import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { HttpError } from '../validate.js';

let client = null;
function getClient() {
  if (!config.geminiApiKey) {
    throw new HttpError(503, 'Recaps need a Gemini API key. Set GEMINI_API_KEY on the server.');
  }
  client ??= new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

// The exact shape Gemini must return. Asking for structure (instead of free text)
// means the app can lay the recap out as scrapbook pages without guessing.
const RECAP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A short, warm title for this period, 2 to 6 words.' },
    summary: { type: 'string', description: '2 or 3 sentences about the period, written to the user as "you".' },
    mood: { type: 'string', description: 'One word for the overall feeling of the period.' },
    highlights: {
      type: 'array',
      items: { type: 'string' },
      description: '3 to 5 short highlights, each under 12 words.',
    },
    pages: {
      type: 'array',
      description: 'One scrapbook page per photo worth including, in date order.',
      items: {
        type: 'object',
        properties: {
          photoIndex: { type: 'integer', description: 'The number of the photo this page shows.' },
          caption: { type: 'string', description: 'A handwritten-style caption, under 15 words.' },
        },
        required: ['photoIndex', 'caption'],
      },
    },
    narration: {
      type: 'string',
      description: 'A spoken script of 70 to 110 words, read aloud by the companion character.',
    },
    characterLine: { type: 'string', description: 'One cheerful line from the companion character, under 14 words.' },
  },
  required: ['title', 'summary', 'mood', 'highlights', 'pages', 'narration', 'characterLine'],
};

const INSTRUCTIONS = `You are the storyteller inside a scrapbook calendar app. A small companion character
walks through each day with the user. Turn the user's photos, tasks, and notes into a warm, personal recap.

Rules:
- Only mention things supported by the photos, tasks, notes, or mood board. Never invent events, people, or places.
- Describe what you can see in photos in simple terms; don't guess who people are.
- Be encouraging, never judgmental. Don't comment on unfinished tasks or productivity.
- Keep the tone like a kind friend flipping through a scrapbook with the user: specific, light, and sincere.
- The narration is spoken aloud, so write it as natural speech with no lists, emoji, or symbols.
- If the mood board has words or an intention, gently connect the period back to them when it fits.`;

/**
 * Builds the recap story.
 * @param {object} input
 * @param {'month'|'year'} input.period
 * @param {string} input.label        e.g. "September 2026" or "2026"
 * @param {object} input.moodBoard    { words, intention }
 * @param {object} input.stats        { daysJournaled, tasksDone, tasksTotal, photoCount }
 * @param {string[]} input.doneTasks  titles of completed tasks
 * @param {{date:string,note:string}[]} input.notes
 * @param {{date:string,caption:string,mimeType:string,data:Buffer}[]} input.photos
 * @param {string[]} [input.monthTitles]  titles of earlier monthly recaps (year recaps only)
 */
export async function writeRecapStory(input) {
  const ai = getClient();
  const { period, label, moodBoard, stats, doneTasks, notes, photos, monthTitles = [] } = input;

  const context = [
    `This is a ${period === 'year' ? 'year-end reflection' : 'monthly recap'} for ${label}.`,
    `Mood board words: ${moodBoard.words?.length ? moodBoard.words.join(', ') : 'none'}.`,
    `Intention for the year: ${moodBoard.intention || 'none'}.`,
    `Days with journal entries: ${stats.daysJournaled}. Tasks completed: ${stats.tasksDone} of ${stats.tasksTotal}. Photos taken: ${stats.photoCount}.`,
    monthTitles.length ? `Earlier monthly recap titles: ${monthTitles.join(' | ')}.` : '',
    `Completed tasks: ${doneTasks.length ? doneTasks.slice(0, 60).join('; ') : 'none'}.`,
    `Journal notes:\n${notes.length ? notes.slice(0, 25).map((n) => `- ${n.date}: ${n.note}`).join('\n') : 'none'}`,
    `There are ${photos.length} photos, numbered from 0. Use these numbers for photoIndex.`,
  ]
    .filter(Boolean)
    .join('\n');

  // Text first, then each photo with a label so Gemini can match numbers to images.
  const parts = [{ text: context }];
  photos.forEach((photo, index) => {
    parts.push({ text: `Photo ${index} (${photo.date}${photo.caption ? `, user's caption: "${photo.caption}"` : ''}):` });
    parts.push({ inlineData: { mimeType: photo.mimeType, data: photo.data.toString('base64') } });
  });

  let response;
  try {
    response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: INSTRUCTIONS,
        responseMimeType: 'application/json',
        responseJsonSchema: RECAP_SCHEMA,
        temperature: 0.8,
      },
    });
  } catch (err) {
    console.error('Gemini request failed:', err);
    throw new HttpError(502, 'Gemini could not write this recap. Try again in a moment.');
  }

  return cleanStory(parseJson(response.text), photos.length);
}

function parseJson(text) {
  if (!text) throw new HttpError(502, 'Gemini returned an empty recap. Try again.');
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    console.error('Gemini returned text that is not JSON:', text.slice(0, 500));
    throw new HttpError(502, 'Gemini returned a recap in the wrong format. Try again.');
  }
}

/** Guards against missing fields and photo numbers that don't exist. */
function cleanStory(story, photoCount) {
  const seen = new Set();
  const pages = (Array.isArray(story.pages) ? story.pages : []).filter((p) => {
    const ok = Number.isInteger(p?.photoIndex) && p.photoIndex >= 0 && p.photoIndex < photoCount && !seen.has(p.photoIndex);
    if (ok) seen.add(p.photoIndex);
    return ok;
  });

  return {
    title: String(story.title || 'Your scrapbook').slice(0, 80),
    summary: String(story.summary || ''),
    mood: String(story.mood || ''),
    highlights: (Array.isArray(story.highlights) ? story.highlights : []).map(String).slice(0, 5),
    pages: pages.map((p) => ({ photoIndex: p.photoIndex, caption: String(p.caption || '') })),
    narration: String(story.narration || ''),
    characterLine: String(story.characterLine || ''),
  };
}