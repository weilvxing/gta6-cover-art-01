// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone. `photo` picks the sample (samples/<photo>.jpg),
// `title` and `tagline` the words, `layout`, `grade` and `size` the look.
// window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const settings = {
    title: query.get('title') ?? 'Vice City',
    tagline: query.get('tagline') ?? 'Welcome to Leonida',
    layout: query.get('layout') ?? 'poster',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'portrait',
  };
  await load(`samples/${photo}.jpg`, settings);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
