import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 3000,

  // Public address of this server, used to build share links.
  // Locally: http://localhost:3000. In production: https://yourdomain.com
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),

  mongoUri: required('MONGODB_URI'),
  mongoDbName: process.env.MONGODB_DB || 'scrapbook',

  // AI keys are optional at startup so the rest of the app works without them.
  // Recap generation will return a clear error if Gemini is missing.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',

  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',

  // Limits that keep AI calls fast and cheap.
  maxPhotoBytes: 8 * 1024 * 1024,
  maxPhotosPerMonthRecap: 10,
  maxPhotosPerYearRecap: 12,
};