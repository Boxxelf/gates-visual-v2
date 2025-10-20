
import { groupBy, debounce, uniq, byId } from './utils.js';

const DATA_PATH = '../data/'; // relative to /web/

const state = {
  cs: [], calcs: [], conns: [], prereq: [],
  concentration: 'All',
  search: '',
  selectedCS: new Set(),
  showWeak: false
};

const els = {
  filter: null, search: null, list: null, chips: null,
  calcWrap: null, details: null, showWeak: null
};

window.addEventListener('DOMContentLoaded', init);

async function init(){
  bindEls();
  await loadData();
  initFilters();
  renderCSList();
  renderCalc();
  wireEvents();
}

function bindEls(){
  els.filter = byId('concentration-filter');
  els.search = byId('cs-search');
  els.list = byId('cs-list');
  els.chips = byId('chips');
  els.calcWrap = byId('calc-container');
  els.details = byId('details');
  els.showWeak = byId('show-weak');
  byId('select-all').addEventListener('click', onSelectAll);
  byId('clear-all').addEventListener('click', onClearAll);
  ensureTooltip();
}

async function loadData(){
  const cb = `?v=${Date.now()}`; // cache-busting query to always fetch latest CSV
  const [calcs, cs, conns, prereq] = await Promise.all([
    d3.csv(DATA_PATH+'calculus_topics.csv'+cb, d3.autoType),
    d3.csv(DATA_PATH+'cs_topics.csv'+cb, d3.autoType),
    d3.csv(DATA_PATH+'connections.csv'+cb, d3.autoType),
    d3.csv(DATA_PATH+'prerequisites.csv'+cb, d3.autoType),
  ]);
  state.calcs = calcs.sort((a,b)=>(a.display_order ?? 9999) - (b.display_order ?? 9999));
  // normalize concentration strings to avoid invisible whitespace issues
  state.cs = cs.map(d=> ({ ...d, concentration: (d.concentration||'').trim() }));
  state.conns = conns.map(d=>({...d, strength:+d.strength}));
  state.prereq = prereq;
  // debug concentrations once for verification
  const concs = uniq(state.cs.map(d=>d.concentration)).filter(Boolean);
  // eslint-disable-next-line no-console
  console.log('Concentrations loaded:', concs);
}

function initFilters(){
  // clear existing options (avoid duplicate 'All' from static HTML)
  els.filter.innerHTML = '';
  const concentrations = ['All', ...uniq(state.cs.map(d=> (d.concentration||'').trim())).filter(Boolean)];
  concentrations.forEach(c=>{
    const o = document.createElement('option'); o.value=o.textContent=c; els.filter.appendChild(o);
  });
}

function wireEvents(){
  els.filter.addEventListener('change', ()=>{ state.concentration = els.filter.value; renderCSList(); });
  els.search.addEventListener('input', debounce(()=>{ state.search = els.search.value.trim().toLowerCase(); renderCSList(); }, 150));
  els.showWeak.addEventListener('change', ()=>{ state.showWeak = els.showWeak.checked; renderCalc(); });
}

function renderCSList(){
  const list = state.cs
    .filter(d=> state.concentration==='All' || (d.concentration||'').trim()===state.concentration)
    .filter(d=> !state.search || (d.cs_name||'').toLowerCase().includes(state.search));

  els.list.innerHTML='';
  list.forEach(d=>{
    const li = document.createElement('li');
    li.className = 'cs-item' + (state.selectedCS.has(d.cs_id) ? ' active' : '');
    li.innerHTML = `<div class="name">${d.cs_name}</div><div class="muted">${d.concentration||''}</div>`;
    // tooltip for CS item: show its connections and rationales
    li.addEventListener('mouseenter', (ev)=> showTooltip(renderCSTooltipHTML(d.cs_id), ev));
    li.addEventListener('mousemove', positionTooltip);
    li.addEventListener('mouseleave', hideTooltip);
    li.addEventListener('click', (ev)=>{
      if(ev.metaKey || ev.ctrlKey){
        toggleSelect(d.cs_id);
      }else{
        // single selection if not holding modifier
        state.selectedCS.clear(); state.selectedCS.add(d.cs_id);
      }
      renderCSList(); renderChips(); renderCalc();
    });
    els.list.appendChild(li);
  });
}

function renderChips(){
  els.chips.innerHTML='';
  [...state.selectedCS].forEach(id=>{
    const cs = state.cs.find(x=>x.cs_id===id);
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span>${cs?.cs_name||id}</span><button title="remove">✕</button>`;
    chip.querySelector('button').addEventListener('click', ()=>{
      state.selectedCS.delete(id); renderCSList(); renderChips(); renderCalc();
    });
    els.chips.appendChild(chip);
  });
}

function onSelectAll(){
  const visible = [...els.list.querySelectorAll('.cs-item')];
  // map visible labels back to cs_ids
  const names = visible.map(li=> li.querySelector('.name').textContent);
  const ids = state.cs.filter(x=> names.includes(x.cs_name)).map(x=>x.cs_id);
  ids.forEach(id=> state.selectedCS.add(id));
  renderCSList(); renderChips(); renderCalc();
}

function onClearAll(){
  state.selectedCS.clear();
  renderCSList(); renderChips(); renderCalc();
}

function toggleSelect(id){
  if(state.selectedCS.has(id)) state.selectedCS.delete(id); else state.selectedCS.add(id);
}

function renderCalc(){
  const active = getCombinedConnections([...state.selectedCS]);
  els.calcWrap.innerHTML='';

  state.calcs.forEach(calc=>{
    const cell = document.createElement('div');
    cell.className='calc-node';
    const maxStrength = active.strengthByCalc[calc.calculus_id] ?? -1;
    const badges = (active.byCalc[calc.calculus_id] || [])
      .filter(d=> state.showWeak || d.strength>0)
      .sort((a,b)=> b.strength - a.strength)
      .map(d=> `<span class="badge s${d.strength}" data-cs-id="${d.cs_id}" data-rationale="${(d.rationale||'').replace(/"/g,'&quot;')}">${getCSName(d.cs_id)} · ${d.strength}</span>`)
      .join('');

    cell.innerHTML = `
      <div class="title">${calc.calculus_name}</div>
      <div class="muted">${calc.short_desc||''}</div>
      <div class="badges">${badges}</div>
    `;

    // details on click
    cell.addEventListener('click', ()=>{
      showDetails(calc, active.byCalc[calc.calculus_id]||[]);
    });

    els.calcWrap.appendChild(cell);
    // attach tooltip listeners for badges within this cell
    cell.querySelectorAll('.badge').forEach(b=>{
      b.addEventListener('mouseenter', (ev)=>{
        const csId = b.getAttribute('data-cs-id');
        const rationale = b.getAttribute('data-rationale')||'';
        showTooltip(renderBadgeTooltipHTML(calc.calculus_name, csId, rationale), ev);
      });
      b.addEventListener('mousemove', positionTooltip);
      b.addEventListener('mouseleave', hideTooltip);
    });
  });
}

function showDetails(calc, items){
  if(!items.length){ els.details.classList.add('hidden'); els.details.innerHTML=''; return; }
  els.details.classList.remove('hidden');
  const rows = items
    .sort((a,b)=> b.strength - a.strength)
    .map(d=> `<tr>
        <td>${getCSName(d.cs_id)}</td>
        <td class="c">${d.strength}</td>
        <td>${d.rationale||''}</td>
      </tr>`).join('');
  els.details.innerHTML = `
    <h3>${calc.calculus_name}</h3>
    <p class="muted">${calc.short_desc||''}</p>
    <h4>Connected CS Topics</h4>
    <table class="table">
      <thead><tr><th>CS Topic</th><th class="c">Strength</th><th>Rationale</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function getCombinedConnections(cs_ids){
  const byCalc = {};      // calculus_id -> [{cs_id, strength, rationale}]
  const strengthByCalc = {}; // calculus_id -> max strength among selected
  state.conns.forEach(d=>{
    if(!cs_ids.length || cs_ids.includes(d.cs_id)){
      (byCalc[d.calculus_id] ||= []).push({ cs_id:d.cs_id, strength:d.strength, rationale:d.rationale });
      strengthByCalc[d.calculus_id] = Math.max(strengthByCalc[d.calculus_id] ?? -1, d.strength);
    }
  });
  return { byCalc, strengthByCalc };
}

function getCSName(id){
  return state.cs.find(x=>x.cs_id===id)?.cs_name || id;
}

// ---------- Tooltip helpers ----------
let tooltipEl;
function ensureTooltip(){
  if(tooltipEl) return; tooltipEl = document.createElement('div');
  tooltipEl.id = 'tooltip'; tooltipEl.className = 'tooltip'; tooltipEl.style.display='none';
  document.body.appendChild(tooltipEl);
}
function showTooltip(html, evt){
  tooltipEl.innerHTML = html; tooltipEl.style.display='block'; positionTooltip(evt);
}
function positionTooltip(evt){
  if(!tooltipEl || tooltipEl.style.display==='none') return;
  const pad = 10; let x = evt.clientX + pad, y = evt.clientY + pad;
  const rect = tooltipEl.getBoundingClientRect();
  // adjust horizontally if overflowing right
  if(x + rect.width > window.innerWidth - 4) x = Math.max(4, evt.clientX - rect.width - pad);
  // adjust vertically if overflowing bottom
  if(y + rect.height > window.innerHeight - 4) y = Math.max(4, evt.clientY - rect.height - pad);
  tooltipEl.style.left = x + 'px'; tooltipEl.style.top = y + 'px';
}
function hideTooltip(){ if(tooltipEl){ tooltipEl.style.display='none'; tooltipEl.innerHTML=''; } }

function renderCSTooltipHTML(cs_id){
  const items = state.conns
    .filter(d=> d.cs_id===cs_id)
    .filter(d=> state.showWeak || d.strength>0)
    .sort((a,b)=> b.strength - a.strength)
    .slice(0, 6);
  if(!items.length) return '<div class="muted">No connections</div>';
  const rows = items.map(d=>{
    const calc = state.calcs.find(c=>c.calculus_id===d.calculus_id);
    const color = d.strength===2?'var(--s2)':(d.strength===1?'var(--s1)':'var(--s0)');
    const text = insertSoftWraps((d.rationale||'').replace(/</g,'&lt;'), 24);
    return `<div class=\"tip-row\"><span class=\"strength\" style=\"background:${color}\"></span><div><div><strong>${calc?.calculus_name||d.calculus_id}</strong> · ${d.strength}</div><div>${text}</div></div></div>`;
  }).join('');
  const title = getCSName(cs_id);
  return `<h5>${title}</h5>${rows}<div class=\"muted\" style=\"margin-top:6px\">Hover badges or open details to read full text</div>`;
}

function renderBadgeTooltipHTML(calcName, csId, rationale){
  const text = insertSoftWraps((rationale||'').replace(/</g,'&lt;'), 24);
  return `<h5>${calcName}</h5><div>${getCSName(csId)}</div><div style=\"margin-top:6px\">${text}</div>`;
}

function insertSoftWraps(str, every){
  if(!str) return '';
  let out = '';
  for(let i=0;i<str.length;i+=every){ out += str.slice(i, i+every) + (i+every<str.length ? '<wbr>' : ''); }
  return out;
}
