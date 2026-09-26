// Pre-records the character's short voice lines with ElevenLabs, so the app can
// play them instantly and offline instead of calling the API every time.
//
//   npm run voice-lines                              record into ./voice-lines
//   npm run voice-lines -- --out ../app/assets/voice record straight into the Expo app
//   npm run voice-lines -- --dry-run                 list the lines and credit cost only
//   npm run voice-lines -- --force                   re-record lines that already exist
//
// Lines already recorded are skipped, so rerunning after adding a line only pays for the new one.
// It also writes index.js, which the app imports to get every clip by name.

import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Each moment has a few variations so the character doesn't repeat itself.
// Edit these to match your character's personality, then rerun.
const LINES = {
  welcome: [
    "Hi! I'm so glad you're here. Let's make this year one to remember.",
  ],
  good_morning: [
    'Good morning! What are we up to today?',
    "Rise and shine! Let's see what today holds.",
    'Morning! I saved you a spot on the path.',
  ],
  task_done: [
    'Nice! One step closer.',
    'Done and done!',
    'Look at you go!',
    'Checked off. On to the next!',
  ],
  halfway: [
    "We're halfway there!",
    'Halfway through the day. Keep it up!',
  ],
  all_done: [
    "You did everything today! I'm so proud of you.",
    "That's the whole list! Time to relax.",
  ],
  photo_added: [
    'Ooh, that one goes in the scrapbook!',
    "What a great moment. I'll keep it safe.",
    'Snap! Saved for later.',
  ],
  mood_board_done: [
    "Your mood board looks amazing. Let's make it happen this year.",
  ],
  recap_making: [
    "Hold on, I'm flipping through the scrapbook!",
  ],
  recap_ready: [
    "Your recap is ready! Let's look back together.",
  ],
  empty_day: [
    "Nothing planned yet. That's okay, we can take it slow.",
  ],
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const outIndex = args.indexOf('--out');
const OUT_DIR = resolve(outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : 'voice-lines');

const clips = Object.entries(LINES).flatMap(([moment, texts]) =>
  texts.map((text, i) => ({ moment, text, file: `${moment}_${i + 1}.mp3` })),
);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Expo can't load files by a name built at runtime, so every clip gets an explicit
 * require(). Only clips that actually exist are listed, or the app would fail to build.
 */
async function buildIndexFile() {
  const groups = [];
  for (const [moment, texts] of Object.entries(LINES)) {
    const files = [];
    for (let i = 0; i < texts.length; i++) {
      const file = `${moment}_${i + 1}.mp3`;
      if (await exists(join(OUT_DIR, file))) files.push(`require('./${file}')`);
    }
    groups.push(`  ${moment}: [${files.join(', ')}],`);
  }
  return `// Made by scripts/generate-voice-lines.js. Rerun the script instead of editing this file.
// Usage in the app:
//   import { voiceLines, randomLine } from './assets/voice';
//   const clip = randomLine('task_done');  // then play it with expo-audio

export const voiceLines = {
${groups.join('\n')}
};

export function randomLine(moment) {
  const options = voiceLines[moment] ?? [];
  return options.length ? options[Math.floor(Math.random() * options.length)] : null;
}
`;
}

async function main() {
  const todo = [];
  for (const clip of clips) {
    if (FORCE || !(await exists(join(OUT_DIR, clip.file)))) todo.push(clip);
  }
  const characters = todo.reduce((n, c) => n + c.text.length, 0);

  console.log(`${clips.length} lines total, ${todo.length} to record (about ${characters} ElevenLabs characters).`);
  console.log(`Saving to ${OUT_DIR}`);

  if (DRY_RUN) {
    for (const clip of todo) console.log(`  ${clip.file}: "${clip.text}"`);
    console.log('Dry run only. Nothing was recorded.');
    return;
  }

  // Loaded here so --dry-run works without any keys set up.
  const { hasElevenLabs, textToSpeech } = await import('../src/services/elevenlabs.js');
  if (!hasElevenLabs()) {
    console.error('Set ELEVENLABS_API_KEY in .env first.');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  let failed = 0;
  for (const clip of todo) {
    process.stdout.write(`Recording ${clip.file}... `);
    try {
      await writeFile(join(OUT_DIR, clip.file), await textToSpeech(clip.text));
      console.log('done');
    } catch (err) {
      failed++;
      console.log(`failed: ${err.message}`);
    }
  }

  await writeFile(join(OUT_DIR, 'index.js'), await buildIndexFile());
  console.log(`\nWrote index.js.${failed ? ` ${failed} lines failed; rerun to retry just those.` : ' All lines recorded.'}`);
}

main().catch((err) => {
  console.error('Voice line generation failed:', err.message);
  process.exit(1);
});