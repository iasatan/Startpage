import './style.css';

const USER = 'iasatan';
const CACHE_KEY = 'startpage-repos-v1';
const CACHE_TTL = 30 * 60 * 1000;

const i18n = {
  en: {
    title: 'My pages',
    search: 'Search pages…',
    loading: 'Loading…',
    error: 'Could not load repositories. Please try again later.',
    empty: 'No pages found.',
    count: (n) => `${n} page${n === 1 ? '' : 's'}`,
    noDesc: 'No description',
    updated: 'Updated',
    source: 'Source',
  },
  hu: {
    title: 'Oldalaim',
    search: 'Oldalak keresése…',
    loading: 'Betöltés…',
    error: 'A tárolók betöltése sikertelen. Próbáld újra később.',
    empty: 'Nincs találat.',
    count: (n) => `${n} oldal`,
    noDesc: 'Nincs leírás',
    updated: 'Frissítve',
    source: 'Forráskód',
  },
};

let lang = localStorage.getItem('lang') || ((navigator.language || '').toLowerCase().startsWith('hu') ? 'hu' : 'en');
let repos = [];
let failed = false;
let loading = true;

const $ = (id) => document.getElementById(id);

function pageUrl(r) {
  if (r.homepage) return r.homepage;
  const host = `${USER}.github.io`;
  return r.name.toLowerCase() === host ? `https://${host}/` : `https://${host}/${r.name}/`;
}

async function load() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.t < CACHE_TTL) return cached.data;
  } catch {}
  const all = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&page=${page}`);
    if (!res.ok) throw new Error(res.status);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
  }
  const data = all
    .filter((r) => r.has_pages)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: pageUrl(r),
      repo: r.html_url,
      language: r.language,
      updated: r.pushed_at,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
  return data;
}

function render() {
  const t = i18n[lang];
  document.documentElement.lang = lang;
  $('title').textContent = t.title;
  $('search').placeholder = t.search;
  document.querySelectorAll('[data-lang]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang)),
  );
  const q = $('search').value.trim().toLowerCase();
  const list = repos.filter((r) => `${r.name} ${r.description || ''}`.toLowerCase().includes(q));
  $('status').textContent = loading ? t.loading : failed ? t.error : list.length ? t.count(list.length) : t.empty;
  const fmt = new Intl.DateTimeFormat(lang === 'hu' ? 'hu-HU' : 'en-GB', { dateStyle: 'medium' });
  const grid = $('grid');
  grid.replaceChildren(
    ...list.map((r) => {
      const card = document.createElement('article');
      card.className = 'card';
      const a = document.createElement('a');
      a.href = r.url;
      a.className = 'name';
      a.textContent = r.name;
      const p = document.createElement('p');
      p.textContent = r.description || t.noDesc;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const src = document.createElement('a');
      src.href = r.repo;
      src.textContent = t.source;
      const info = document.createElement('span');
      info.textContent = `${r.language ? r.language + ' · ' : ''}${t.updated} ${fmt.format(new Date(r.updated))}`;
      meta.append(info, src);
      card.append(a, p, meta);
      return card;
    }),
  );
}

document.querySelectorAll('[data-lang]').forEach((b) =>
  b.addEventListener('click', () => {
    lang = b.dataset.lang;
    localStorage.setItem('lang', lang);
    render();
  }),
);
$('search').addEventListener('input', render);

render();
load()
  .then((d) => (repos = d))
  .catch(() => (failed = true))
  .finally(() => {
    loading = false;
    render();
  });
