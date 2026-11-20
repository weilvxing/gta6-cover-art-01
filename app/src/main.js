// Wires the page: pick a photo (upload or sample), type a title, choose a layout,
// grade and size, and export the cover as a PNG. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js). "Surprise me" rolls a
// random layout, grade, sample photo and title, and the export file is named
// after the title, e.g. vice-city-1080x1350.png.
import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const taglineInput = document.getElementById('tagline');
const status = document.getElementById('status');
const sizeSelect = document.getElementById('size');
let photo = null;

const SIZES = {
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
};

const SAMPLES = ['samples/pier.jpg', 'samples/boulevard.jpg'];
const LAYOUTS = ['poster', 'split', 'strip'];
const GRADES = ['sunset', 'neon', 'noir'];
// Titles and taglines "Surprise me" draws from, picked independently so the
// same pairing does not keep coming back.
const TITLES = ['Vice City', 'Neon Nights', 'Sunset Heist', 'Midnight Run', 'Palm Shadows', 'Chrome Dreams'];
const TAGLINES = ['Welcome to Leonida', 'Boulevard Queen', 'Ocean Drive', 'Leonida Nights', 'Vice City', 'Sunset Strip'];

// What the last surprise picked, so two in a row never repeat a choice.
const lastRandom = { title: null, layout: null, grade: null, sample: null };

/** Picks one item of `list` at random. */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Picks one item of `list` at random, other than `last`: it keeps drawing
 * until the pick changes, so a surprise always changes that setting.
 */
function pickDifferent(list, last) {
  if (list.length < 2) return pick(list);
  let next = pick(list);
  while (next === last) next = pick(list);
  return next;
}

/** The current settings, read from the controls. */
function readSettings() {
  const layout = document.querySelector('input[name="layout"]:checked')?.value ?? 'poster';
  const grade = document.querySelector('input[name="grade"]:checked')?.value ?? 'sunset';
  return { photo, title: titleInput.value, tagline: taglineInput.value, layout, grade };
}

/** Sizes the canvas to the chosen export size, then redraws the cover. */
function redraw() {
  const size = SIZES[sizeSelect.value] ?? SIZES.portrait;
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, readSettings());
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Turns a title into a safe file-name slug, e.g. "Vice City" -> "vice-city". */
function slugify(text) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'vice-cover';
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  photo = await loadImage(URL.createObjectURL(file));
  document.querySelectorAll('.sample').forEach((b) => b.classList.remove('active'));
  redraw();
  status.textContent = `Loaded ${file.name}.`;
});

document.querySelectorAll('.sample').forEach((button) => {
  button.addEventListener('click', async () => {
    photo = await loadImage(button.dataset.src);
    document.querySelectorAll('.sample').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    redraw();
    status.textContent = `Sample photo: ${button.dataset.src.split('/').pop()}.`;
  });
});

for (const input of document.querySelectorAll('input[name="layout"], input[name="grade"]')) {
  input.addEventListener('change', redraw);
}
titleInput.addEventListener('input', redraw);
taglineInput.addEventListener('input', redraw);
sizeSelect.addEventListener('change', () => {
  redraw();
  status.textContent = `Export size: ${SIZES[sizeSelect.value].label}.`;
});

document.getElementById('randomize').addEventListener('click', async () => {
  const title = pickDifferent(TITLES, lastRandom.title);
  const tagline = pick(TAGLINES);
  const layout = pickDifferent(LAYOUTS, lastRandom.layout);
  const grade = pickDifferent(GRADES, lastRandom.grade);
  const sample = pickDifferent(SAMPLES, lastRandom.sample);
  lastRandom.title = title;
  lastRandom.layout = layout;
  lastRandom.grade = grade;
  lastRandom.sample = sample;
  titleInput.value = title;
  taglineInput.value = tagline;
  document.querySelector(`input[name="layout"][value="${layout}"]`).checked = true;
  document.querySelector(`input[name="grade"][value="${grade}"]`).checked = true;
  photo = await loadImage(sample);
  document.querySelectorAll('.sample').forEach((b) => b.classList.toggle('active', b.dataset.src === sample));
  redraw();
  status.textContent = `Surprise: ${title} · ${layout} · ${grade}.`;
});

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[sizeSelect.value] ?? SIZES.portrait;
  const name = `${slugify(titleInput.value)}-${size.w}x${size.h}.png`;
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    status.textContent = `Saved ${name}`;
  }, 'image/png');
});

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (sample, settings) => {
    photo = await loadImage(sample);
    titleInput.value = settings.title;
    taglineInput.value = settings.tagline;
    sizeSelect.value = settings.size;
    document.querySelector(`input[name="layout"][value="${settings.layout}"]`).checked = true;
    document.querySelector(`input[name="grade"][value="${settings.grade}"]`).checked = true;
    redraw();
  });
} else {
  // First paint: the pier sample, so the editor is never empty.
  loadImage('samples/pier.jpg').then((img) => {
    photo = img;
    document.querySelector('.sample[data-src="samples/pier.jpg"]')?.classList.add('active');
    redraw();
  });
}
