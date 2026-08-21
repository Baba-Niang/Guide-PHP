(function(){
"use strict";

/* ---------- state ---------- */
const done = JSON.parse(localStorage.getItem('phpGuideDone') || '{}');
let filter = 'all';
let query = '';
let activeChapter = CHAPTERS[0].id;
let activeFiche = FICHES[0].id;

/* ---------- theme ---------- */
const root = document.documentElement;
function applyTheme(t){
  root.setAttribute('data-theme', t);
  localStorage.setItem('phpGuideTheme', t);
}
(function initTheme(){
  const saved = localStorage.getItem('phpGuideTheme');
  if(saved){ applyTheme(saved); return; }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(prefersLight ? 'light' : 'dark');
})();
document.getElementById('themeToggle').addEventListener('click', () => {
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ---------- helpers ---------- */
function esc(s){
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
function imgsFor(id){
  return IMAGES.filter(x => {
    const m = x.match(/^PHP #(\d+)([ABC])(?:\d+)?\.png$/i);
    return m && Number(m[1]) === Number(id);
  }).sort((a,b) => {
    const order = {A:0,B:1,C:2};
    const ra = a.match(/^PHP #(\d+)([ABC])/i), rb = b.match(/^PHP #(\d+)([ABC])/i);
    return order[ra[2]] - order[rb[2]] || a.localeCompare(b, undefined, {numeric:true});
  });
}
function codeExampleCount(code){
  const groups = code.split(/\n\s*\n/).filter(g => g.trim().length);
  return Math.max(1, groups.length);
}

/* ---------- auto-built "Éléments clés" glossary ----------
   Scans a fiche's code sample against a curated PHP glossary and keeps
   only the entries that actually appear, in a stable, sensible order —
   so every fiche gets an accurate, readable reference table even
   without looking at the original image. */
const GLOSSARY = [
  {test:/<\?php/, kw:'<?php', desc:"Balise d'ouverture : démarre une zone de code interprétée côté serveur."},
  {test:/\$\w+\s*=(?!=)/, kw:'$variable', desc:'Nom précédé de $ : stocke une valeur réutilisable dans le script.'},
  {test:/\bconst\s+\w+/, kw:'const', desc:'Déclare une constante : une valeur nommée qui ne doit plus changer.'},
  {test:/\bfunction\s+\w+/, kw:'function', desc:'Déclare un bloc de code réutilisable, appelable par son nom.'},
  {test:/\breturn\b/, kw:'return', desc:"Termine la fonction et renvoie une valeur à l'endroit où elle a été appelée."},
  {test:/\bforeach\s*\(/, kw:'foreach', desc:'Parcourt chaque élément d\u2019un tableau sans gérer l\u2019indice manuellement.'},
  {test:/\bdo\s*\{[\s\S]*\}\s*while/, kw:'do...while', desc:"Exécute le bloc une première fois, puis teste la condition."},
  {test:/\bwhile\s*\(/, kw:'while', desc:'Répète le bloc tant que la condition reste vraie (testée avant chaque tour).'},
  {test:/\bfor\s*\(/, kw:'for', desc:'Boucle avec initialisation, condition et incrémentation réunies sur une ligne.'},
  {test:/\belseif\b|\belse if\b/, kw:'elseif', desc:'Teste une nouvelle condition si la précédente était fausse.'},
  {test:/\belse\b/, kw:'else', desc:"Bloc exécuté quand aucune condition précédente n'est vraie."},
  {test:/\bif\s*\(/, kw:'if', desc:'Exécute un bloc uniquement si la condition entre parenthèses est vraie.'},
  {test:/\bswitch\s*\(/, kw:'switch', desc:'Compare une expression à plusieurs valeurs possibles (case).'},
  {test:/\bcase\s+/, kw:'case', desc:'Représente une valeur possible à l\u2019intérieur d\u2019un switch ou match.'},
  {test:/\bbreak\b/, kw:'break', desc:'Arrête immédiatement la boucle ou le switch en cours.'},
  {test:/\bcontinue\b/, kw:'continue', desc:"Passe directement à l'itération suivante de la boucle."},
  {test:/\bmatch\s*\(/, kw:'match', desc:'Alternative moderne à switch : une expression qui retourne une valeur.'},
  {test:/===/, kw:'===', desc:'Comparaison stricte : compare la valeur ET le type.'},
  {test:/(?<!=)==(?!=)/, kw:'==', desc:'Comparaison souple : compare la valeur avec conversion possible du type.'},
  {test:/&&/, kw:'&&', desc:'ET logique : vrai seulement si les deux conditions sont vraies.'},
  {test:/\|\|/, kw:'||', desc:'OU logique : vrai si au moins une des conditions est vraie.'},
  {test:/\?[^:?]*:/, kw:'? :', desc:"Opérateur ternaire : forme compacte d'un if...else."},
  {test:/=>/, kw:'=>', desc:'Associe une clé à une valeur (tableau associatif ou match).'},
  {test:/%/, kw:'%', desc:'Modulo : renvoie le reste d\u2019une division entière.'},
  {test:/\+\+/, kw:'++', desc:'Incrémente une variable numérique de 1.'},
  {test:/echo\s/, kw:'echo', desc:'Affiche du texte, une variable ou une expression dans la réponse générée.'},
  {test:/^\s*\/\//m, kw:'//', desc:'Commentaire sur une ligne : ignoré par PHP, sert à expliquer le code.'},
];
function keyElements(code){
  const out = [];
  for(const g of GLOSSARY){
    if(g.test.test(code)) out.push(g);
    if(out.length >= 6) break;
  }
  return out;
}

/* ---------- flow steps: split the "flow" sentence on → into a
   numbered, colour-badged sequence ---------- */
function flowSteps(flow){
  const parts = flow.split('→').map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : [flow];
}

/* ---------- stat computation ---------- */
document.getElementById('statFiches').textContent = FICHES.length;
document.getElementById('statChapters').textContent = CHAPTERS.length;
document.getElementById('statImages').textContent = IMAGES.length;
document.getElementById('sidebarSub').textContent = FICHES.length + ' · ' + CHAPTERS.length + ' ch.';

/* ---------- sidebar (à la Java Torréfié): full chapter list, active
   chapter highlighted, showing exactly where the user is. ---------- */
const sidebarNav = document.getElementById('sidebarNav');
function renderSidebar(){
  sidebarNav.innerHTML = CHAPTERS.map(c => {
    const doneCount = c.ids.filter(id => done[id]).length;
    const active = c.ids.includes(activeFiche);
    const ficheButtons = c.ids.map(id => {
      const f = FICHES.find(x => x.id === id);
      if(!f) return '';
      const isActive = id === activeFiche;
      const isDone = !!done[id];
      return `<button class="navfiche ${isActive?'active':''} ${isDone?'done':''}" data-fiche="${id}">
        <span class="navfiche-num">${String(id).padStart(2,'0')}</span>
        <span class="navfiche-title">${esc(f.title)}</span>
        <span class="navfiche-check">${isDone?'✓':''}</span>
      </button>`;
    }).join('');
    return `<section class="navchapter ${active?'active':''}">
      <button class="navchap" data-ch="${c.id}">
        <span class="navchap-ic">${c.id}</span>
        <span class="navchap-body">
          <span class="navchap-title">${esc(c.title)}</span>
          <span class="navchap-meta">${c.ids.length} fiches · ${doneCount}/${c.ids.length}</span>
        </span>
      </button>
      <div class="navfiches">${ficheButtons}</div>
    </section>`;
  }).join('');
  sidebarNav.querySelectorAll('.navfiche').forEach(b => {
    b.addEventListener('click', () => { goToFiche(Number(b.dataset.fiche)); closeDrawer(); });
  });
  sidebarNav.querySelectorAll('.navchap').forEach(b => {
    b.addEventListener('click', () => {
      const c = CHAPTERS.find(x => x.id === b.dataset.ch);
      if(c && c.ids.length) goToFiche(c.ids[0]);
      closeDrawer();
    });
  });
}
function goToChapter(id){
  const c = CHAPTERS.find(x => x.id === id);
  if(c && c.ids.length) goToFiche(c.ids[0]);
}

/* ---------- sidebar collapse (desktop) / drawer (mobile) ---------- */
const shell = document.querySelector('.shell');
const sidebarCollapse = document.getElementById('sidebarCollapse');
const menuToggle = document.getElementById('menuToggle');
const scrim = document.getElementById('scrim');

(function initSidebarState(){
  if(localStorage.getItem('phpGuideSidebarCollapsed') === '1'){
    shell.classList.add('collapsed');
  }
})();
function syncSidebarCollapseButton(){
  const collapsed = shell.classList.contains('collapsed');
  sidebarCollapse.setAttribute('aria-label', collapsed ? 'Afficher le sommaire' : 'Réduire le sommaire');
  sidebarCollapse.setAttribute('title', collapsed ? 'Afficher le sommaire' : 'Réduire le sommaire');
}
syncSidebarCollapseButton();
sidebarCollapse.addEventListener('click', () => {
  const collapsed = shell.classList.toggle('collapsed');
  localStorage.setItem('phpGuideSidebarCollapsed', collapsed ? '1' : '0');
  syncSidebarCollapseButton();
});
function openDrawer(){ shell.classList.add('drawer-open'); }
function closeDrawer(){ shell.classList.remove('drawer-open'); }
menuToggle.addEventListener('click', () => {
  shell.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
});
scrim.addEventListener('click', closeDrawer);

/* ---------- footer nav ---------- */
(function renderFooter(){
  const half = Math.ceil(CHAPTERS.length / 2);
  const cols = [CHAPTERS.slice(0, half), CHAPTERS.slice(half)];
  document.getElementById('footerNav').innerHTML = cols.map((col, i) => `
    <div>
      <h5>${i === 0 ? 'Chapitres' : 'Suite'}</h5>
      <ul>${col.map(c => `<li><a href="#fiche-${c.ids[0]}"><span>${c.id}</span>${esc(c.title)}</a></li>`).join('')}</ul>
    </div>`).join('');
})();

/* ---------- card markup ----------
   Every fiche always shows: its original image(s) stacked vertically,
   then a fully written-out explanation — an auto-built "Éléments clés"
   table, the guided example, numbered flow steps and a checklist —
   so a reader gets everything the fiche contains even without ever
   opening the image. */
function card(f){
  const images = imgsFor(f.id);
  const exCount = codeExampleCount(f.code);
  const isDone = !!done[f.id];
  const keys = keyElements(f.code);
  const steps = flowSteps(f.flow);
  const retainItems = f.retain.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).filter(Boolean);

  return `<article class="card ${isDone ? 'done' : ''}" data-id="${f.id}">
    <div class="card-top">
      <div class="card-id">
        <span class="num">FICHE ${String(f.id).padStart(2,'0')}</span>
        <h3>${esc(f.title)}</h3>
        <p class="sub">${esc(f.subtitle)}</p>
        <div class="badges">
          <span class="badge">📖 5 sections</span>
          <span class="badge">⌨ ${exCount} exemple${exCount>1?'s':''}</span>
          <span class="badge">🖼 ${images.length} image${images.length>1?'s':''}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="mark ${isDone?'on':''}" type="button" data-id="${f.id}">${isDone ? '✓ Révisée' : '○ À réviser'}</button>
      </div>
    </div>
    <div class="gallery">
      <div class="imgs">
        ${images.map(x => `<figure><img loading="lazy" src="images/${encodeURIComponent(x)}" alt="${esc(f.title)} — ${esc(x)}" data-full="images/${encodeURIComponent(x)}"><figcaption>${esc(x.replace('.png',''))}</figcaption></figure>`).join('')}
      </div>
    </div>
    <div class="explain">
      <div class="explain-inner">
        <div class="grid2">
          <div class="box"><h4>Idée clé</h4><p>${esc(f.explanation)}</p></div>
          <div class="box"><h4>En une phrase</h4><p>${esc(f.retain)}</p></div>
        </div>

        ${keys.length ? `<div class="keytable">
          <div class="keytable-head">Éléments clés</div>
          ${keys.map((k,i) => `<div class="keyrow"><span class="keynum">${i+1}</span><span class="keyword">${esc(k.kw)}</span><span class="keydesc">${esc(k.desc)}</span></div>`).join('')}
        </div>` : ''}

        <div class="codebox">
          <div class="codebox-head">
            <div class="codebox-head-left"><span class="lang-badge">PHP</span><h4>Exemple guidé</h4></div>
            <button class="copy-btn" type="button">⧉ Copier</button>
          </div>
          <pre><code>${esc(f.code)}</code></pre>
        </div>

        <div class="stepslist">
          <h4>Comment ça s'enchaîne</h4>
          ${steps.map((s,i) => `${i>0?'<div class="step-arrow">↓</div>':''}<div class="step"><span class="stepnum">${i+1}</span><p>${esc(s)}</p></div>`).join('')}
        </div>

        <div class="practice"><b>🧪 Pratique —</b> Reproduis l'exemple sans copier-coller, puis modifie une valeur ou une condition et observe le résultat.</div>

        <div class="retain">
          <h4>À retenir</h4>
          <ul>${retainItems.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  </article>`;
}

/* ---------- render ---------- */
const content = document.getElementById('content');
const emptyEl = document.getElementById('empty');
const hero = document.getElementById('hero');

function matchesFilter(id){
  if(filter === 'todo') return !done[id];
  if(filter === 'done') return !!done[id];
  return true;
}
function matchesQuery(f){
  if(!query) return true;
  const hay = (f.title + ' ' + f.subtitle + ' ' + f.explanation + ' ' + f.retain).toLowerCase();
  return hay.includes(query);
}

function getVisibleFiches(){
  return CHAPTERS.flatMap(ch => ch.ids
    .map(id => FICHES.find(f => f.id === id))
    .filter(Boolean)
    .filter(f => matchesFilter(f.id) && matchesQuery(f)));
}

function render(){
  const visible = getVisibleFiches();
  // The landing introduction is shown only on the guide home (no fiche hash).
  // Once a fiche is opened, keep the page focused on that fiche instead of
  // repeating the large introduction on every navigation step.
  if(hero){
    hero.classList.toggle('hidden', !!ficheFromHash());
  }
  if(!visible.length){
    content.innerHTML = '';
    emptyEl.style.display = 'block';
    updateProgress();
    renderSidebar();
    updatePager();
    return;
  }

  // Real pagination: only ONE fiche is mounted in the page at a time.
  let current = visible.find(f => f.id === activeFiche);
  if(!current){
    current = visible[0];
    activeFiche = current.id;
  }
  const ch = CHAPTERS.find(c => c.ids.includes(current.id));
  activeChapter = ch ? ch.id : activeChapter;

  content.innerHTML = `<div class="chapter" id="ch-${ch ? ch.id : '1'}">
    <div class="chapter-head">
      <span class="chapter-num">‹${ch ? ch.id : '1'}›</span>
      <h2>${esc(ch ? ch.title : 'PHP')}</h2>
    </div>
    <p class="chapter-desc">${esc(ch ? ch.desc : '')}</p>
    <div class="fiche-page" data-page="${current.id}">
      ${card(current)}
    </div>
  </div>`;

  emptyEl.style.display = 'none';
  bindCards();
  updateProgress();
  renderSidebar();
  updatePager();
  updateHash(false);
}

function bindCards(){
  content.querySelectorAll('.mark').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    done[id] = !done[id];
    localStorage.setItem('phpGuideDone', JSON.stringify(done));
    render();
  }));
  content.querySelectorAll('.copy-btn').forEach(b => b.addEventListener('click', () => {
    const code = b.closest('.codebox').querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const old = b.textContent;
      b.textContent = '✓ Copié';
      setTimeout(() => b.textContent = old, 1400);
    }).catch(() => {});
  }));
  content.querySelectorAll('.imgs img').forEach(img => img.addEventListener('click', () => openLightbox(img.dataset.full, img.alt)));
}

function updateProgress(){
  const n = Object.values(done).filter(Boolean).length;
  document.getElementById('pt').textContent = n + ' / ' + FICHES.length + ' révisées';
  document.getElementById('pf').style.width = (n / FICHES.length * 100) + '%';
}

/* ---------- search panel (opens on demand, doesn't stay pinned) ---------- */
const searchPanel = document.getElementById('searchPanel');
const searchToggle = document.getElementById('searchToggle');
const searchInput = document.getElementById('search');
function openSearch(){
  searchPanel.classList.add('open');
  searchToggle.classList.add('active');
  searchInput.focus();
}
function closeSearch(){
  searchPanel.classList.remove('open');
  searchToggle.classList.remove('active');
}
function toggleSearch(){
  searchPanel.classList.contains('open') ? closeSearch() : openSearch();
}
searchToggle.addEventListener('click', toggleSearch);
searchInput.addEventListener('input', e => {
  query = e.target.value.toLowerCase().trim();
  render();
});
document.querySelectorAll('.filter').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  filter = b.dataset.f;
  render();
}));
document.getElementById('reset').addEventListener('click', () => {
  if(confirm('Réinitialiser toute la progression ?')){
    localStorage.removeItem('phpGuideDone');
    location.reload();
  }
});

/* ---------- lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
function openLightbox(src, alt){
  lightboxImg.src = src;
  lightboxImg.alt = alt || '';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}
function closeLightbox(){
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
}
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if(e.target === lightbox) closeLightbox(); });

/* ---------- floating fiche pager: direct prev/next navigation ---------- */
const pager = document.getElementById('pager');
const pagerPrev = document.getElementById('pagerPrev');
const pagerNext = document.getElementById('pagerNext');
const pagerCount = document.getElementById('pagerCount');

function updateHash(push=true){
  const hash = '#fiche-' + activeFiche;
  if(location.hash !== hash){
    if(push) history.pushState({fiche:activeFiche}, '', hash);
    else history.replaceState({fiche:activeFiche}, '', hash);
  }
}
function goToFiche(id, options={}){
  const target = FICHES.find(f => f.id === Number(id));
  if(!target) return;
  activeFiche = target.id;
  const ch = CHAPTERS.find(c => c.ids.includes(activeFiche));
  if(ch) activeChapter = ch.id;
  updateHash(options.push !== false);
  render();
  window.scrollTo({top:0, behavior: options.smooth === false ? 'auto' : 'smooth'});
}
function updatePager(){
  const all = getVisibleFiches();
  const idx = all.findIndex(f => f.id === activeFiche);
  const fallbackIdx = FICHES.findIndex(f => f.id === activeFiche);
  const position = idx >= 0 ? idx : fallbackIdx;
  pagerCount.textContent = (position + 1) + ' / ' + FICHES.length;
  pagerPrev.disabled = position <= 0;
  pagerNext.disabled = position >= FICHES.length - 1;
  pager.classList.add('show');
}
pagerPrev.addEventListener('click', () => {
  const idx = FICHES.findIndex(f => f.id === activeFiche);
  if(idx > 0) goToFiche(FICHES[idx-1].id);
});
pagerNext.addEventListener('click', () => {
  const idx = FICHES.findIndex(f => f.id === activeFiche);
  if(idx < FICHES.length-1) goToFiche(FICHES[idx+1].id);
});

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ closeLightbox(); closeSearch(); closeDrawer(); return; }
  const tag = document.activeElement.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA') return;
  if(e.key === '/'){
    e.preventDefault();
    openSearch();
    return;
  }
  if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
    const idx = FICHES.findIndex(f => f.id === activeFiche);
    const next = e.key === 'ArrowRight' ? Math.min(idx+1, FICHES.length-1) : Math.max(idx-1, 0);
    goToFiche(FICHES[next].id);
  }
});

/* ---------- URL / pagination state ---------- */
function ficheFromHash(){
  const m = location.hash.match(/^#fiche-(\d+)$/i);
  return m ? Number(m[1]) : null;
}
window.addEventListener('popstate', () => {
  const id = ficheFromHash();
  if(id && FICHES.some(f => f.id === id)) goToFiche(id, {push:false, smooth:false});
});
window.addEventListener('hashchange', () => {
  const id = ficheFromHash();
  if(id && id !== activeFiche && FICHES.some(f => f.id === id)){
    goToFiche(id, {push:false, smooth:false});
  }
});

/* ---------- back to top + pager visibility ---------- */
const totop = document.getElementById('totop');
window.addEventListener('scroll', () => {
  totop.classList.toggle('show', window.scrollY > 500);
  pager.classList.add('show');
});
totop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
totop.innerHTML = '↑';

/* ---------- boot ---------- */
const initialHashFiche = ficheFromHash();
if(initialHashFiche && FICHES.some(f => f.id === initialHashFiche)){
  activeFiche = initialHashFiche;
}
render();
pager.classList.add('show');

})();
