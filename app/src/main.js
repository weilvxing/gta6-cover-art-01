// Wires the page: pick a photo (upload or sample), type a title, choose a layout,
// grade and size, and export the cover as a PNG. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
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

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[sizeSelect.value] ?? SIZES.portrait;
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
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
