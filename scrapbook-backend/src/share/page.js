import { config } from '../config.js';

// Everything that came from a user or from Gemini goes through this before
// being placed in the page, so nobody can inject scripts through a caption.
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** "2026-09-14" -> "Sep 14" */
function shortDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Tape colors and tilts repeat in a pattern so each photo looks hand-placed.
const TAPE_COLORS = ['#BFE3D0', '#F4C6D2', '#D4CCF0', '#F6E27A'];
const TILTS = [-2.2, 1.6, -1.1, 2.4, -1.8, 0.9];

const STYLES = `
  :root {
    --paper: #EEF3F8;
    --grid: #D9E4EF;
    --ink: #22304A;
    --ink-soft: #52607A;
    --highlight: #F6E27A;
    --print: #FFFFFF;
  }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body {
    margin: 0;
    background-color: var(--paper);
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 24px 24px;
    color: var(--ink);
    font-family: 'Nunito', 'Segoe UI', system-ui, sans-serif;
    font-size: 17px;
    line-height: 1.6;
  }
  main { max-width: 620px; margin: 0 auto; padding: 48px 20px 64px; }
  .hand { font-family: 'Caveat', 'Segoe Print', 'Bradley Hand', cursive; }

  header { margin-bottom: 36px; }
  .period { margin: 0; font-size: 1.05rem; color: var(--ink-soft); }
  h1 {
    margin: 4px 0 16px;
    font-size: clamp(2.6rem, 11vw, 3.6rem);
    font-weight: 700;
    line-height: 1.05;
  }
  .summary { margin: 0 0 20px; max-width: 34em; }

  .bubble {
    position: relative;
    display: inline-block;
    margin: 0 0 8px;
    padding: 10px 16px;
    background: var(--print);
    border: 2px solid var(--ink);
    border-radius: 18px;
    font-size: 1.4rem;
    line-height: 1.25;
  }
  .bubble::after {
    content: '';
    position: absolute;
    left: 22px;
    bottom: -10px;
    width: 16px;
    height: 16px;
    background: var(--print);
    border-right: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
    transform: rotate(45deg);
  }

  .listen { margin: 28px 0 0; }
  .listen p { margin: 0 0 6px; font-size: 1.35rem; }
  audio { width: 100%; }

  .pages { list-style: none; margin: 48px 0; padding: 0; display: grid; gap: 44px; }
  .print {
    position: relative;
    margin: 0 auto;
    max-width: 440px;
    padding: 14px 14px 18px;
    background: var(--print);
    box-shadow: 0 1px 2px rgba(34, 48, 74, 0.18), 0 6px 14px rgba(34, 48, 74, 0.08);
    transform: rotate(var(--tilt));
  }
  .tape {
    position: absolute;
    top: -12px;
    left: 50%;
    width: 96px;
    height: 26px;
    margin-left: -48px;
    background: var(--tape);
    opacity: 0.85;
    transform: rotate(calc(var(--tilt) * -1.5));
  }
  .print img { display: block; width: 100%; height: auto; background: var(--grid); }
  .print figcaption { margin-top: 10px; font-size: 1.45rem; line-height: 1.2; }
  .print time { display: block; margin-top: 2px; font-size: 0.85rem; color: var(--ink-soft); font-family: 'Nunito', sans-serif; }

  .note {
    margin: 0 auto 40px;
    max-width: 440px;
    padding: 20px 24px 22px;
    background: var(--highlight);
    transform: rotate(-0.8deg);
    box-shadow: 0 4px 10px rgba(34, 48, 74, 0.1);
  }
  .note h2 { margin: 0 0 6px; font-size: 1.8rem; font-weight: 700; }
  .note ul { margin: 0; padding-left: 1.2em; }
  .note li { margin: 4px 0; }

  footer { text-align: center; color: var(--ink-soft); font-size: 0.95rem; }
  footer p { margin: 4px 0; }
  .stats { font-size: 1.3rem; color: var(--ink); }

  a { color: var(--ink); }
  :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .print, .tape, .note { transform: none; } }
`;

function layout({ title, description, imageUrl, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
  <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Nunito:wght@400;600&display=swap" rel="stylesheet">
  <style>${STYLES}</style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

/**
 * Builds the public page for a shared recap.
 * @param {object} recap  the recap document from MongoDB
 */
export function renderRecapPage(recap) {
  const story = recap.story ?? {};
  const base = `/r/${encodeURIComponent(recap.shareId)}`;
  const pages = story.pages ?? [];
  const isYear = recap.period === 'year';

  const photos = pages
    .map((page, i) => {
      const tilt = TILTS[i % TILTS.length];
      const tape = TAPE_COLORS[i % TAPE_COLORS.length];
      return `
      <li>
        <figure class="print" style="--tilt: ${tilt}deg; --tape: ${tape};">
          <span class="tape" aria-hidden="true"></span>
          <img src="${base}/photos/${encodeURIComponent(page.photoId)}" alt="${escapeHtml(page.caption)}" loading="${i < 2 ? 'eager' : 'lazy'}">
          <figcaption class="hand">${escapeHtml(page.caption)}
            <time datetime="${escapeHtml(page.date)}">${escapeHtml(shortDate(page.date))}</time>
          </figcaption>
        </figure>
      </li>`;
    })
    .join('');

  const highlights = (story.highlights ?? []).length
    ? `
    <section class="note" aria-labelledby="highlights-title">
      <h2 id="highlights-title" class="hand">${isYear ? 'This year' : 'This month'}</h2>
      <ul>${story.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>
    </section>`
    : '';

  const audio = recap.audioFileId
    ? `
    <div class="listen">
      <p class="hand">Hear the story</p>
      <audio controls preload="none" src="${base}/audio"></audio>
    </div>`
    : '';

  const stats = recap.stats;
  const statsLine = stats
    ? `<p class="stats hand">${stats.daysJournaled} days in the journal, ${stats.tasksDone} tasks done, ${stats.photoCount} photos taken.</p>`
    : '';

  const body = `
    <header>
      <p class="period">${escapeHtml(recap.label)}</p>
      <h1 class="hand">${escapeHtml(story.title || 'A scrapbook')}</h1>
      <p class="summary">${escapeHtml(story.summary)}</p>
      ${story.characterLine ? `<p class="bubble hand">${escapeHtml(story.characterLine)}</p>` : ''}
      ${audio}
    </header>
    ${photos ? `<ol class="pages">${photos}</ol>` : ''}
    ${highlights}
    <footer>
      ${statsLine}
      <p>Made with TickIT</p>
    </footer>`;

  const firstPhoto = pages[0];
  return layout({
    title: `${story.title || 'A scrapbook'} (${recap.label})`,
    description: story.summary || `A scrapbook of ${recap.label}.`,
    imageUrl: firstPhoto ? `${config.publicUrl}${base}/photos/${encodeURIComponent(firstPhoto.photoId)}` : null,
    body,
  });
}

/** Shown when a link is wrong or its owner turned sharing off. */
export function renderNotFoundPage() {
  return layout({
    title: 'This scrapbook is private',
    description: 'This share link is turned off or does not exist.',
    imageUrl: null,
    body: `
    <header>
      <p class="period">TickIT</p>
      <h1 class="hand">This scrapbook is private</h1>
      <p class="summary">The link may be mistyped, or its owner turned sharing off. Ask them to send it again.</p>
    </header>`,
  });
}