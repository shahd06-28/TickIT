import { config } from '../config.js';

export function hasElevenLabs() {
  return Boolean(config.elevenLabsApiKey);
}

/**
 * Turns text into speech with ElevenLabs and returns the MP3 as a Buffer.
 * Uses the REST API directly, so there's no extra SDK to install.
 */
export async function textToSpeech(text, { voiceId = config.elevenLabsVoiceId, modelId = config.elevenLabsModel } = {}) {
  if (!hasElevenLabs()) throw new Error('ELEVENLABS_API_KEY is not set.');

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': config.elevenLabsApiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`ElevenLabs returned ${response.status}: ${detail.slice(0, 300)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}