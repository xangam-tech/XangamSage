import { FABRICS, GROUPS, RATINGS, RATING_WORDS, PRICE_WORDS, WEAVES } from './data/fabrics.js';
import { FabricViewer, LIGHTS } from './viewer.js';

// Small helper to build DOM nodes from data without innerHTML.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c != null) node.append(c);
  }
  return node;
}

function pips(value, max, label) {
  const row = el('span', { class: 'pips', role: 'img', ariaLabel: label });
  for (let i = 1; i <= max; i++) row.append(el('i', { class: i <= value ? 'on' : '' }));
  return row;
}

function fact(term, ...body) {
  return el('div', { class: 'fact' }, el('dt', {}, term), el('dd', {}, ...body));
}

function renderPanel(fabric) {
  const weave = WEAVES[fabric.weave];
  const groups = fabric.groups.map((id) => GROUPS.find((g) => g.id === id).label);

  const ratings = RATINGS.map((r) => {
    const [value, why] = fabric.ratings[r.id];
    return el('li', { class: 'rating' },
      el('div', { class: 'rating-head' },
        el('span', { class: 'rating-name' }, r.label, r.lowIsBetter ? el('em', {}, 'less is better') : null),
        pips(value, 5, `${value} out of 5`),
        el('span', { class: 'rating-word' }, RATING_WORDS[value]),
      ),
      el('p', {}, why),
    );
  });

  return el('article', {},
    el('header', { class: 'intro' },
      el('p', { class: 'eyebrow' }, groups.join(' · ')),
      el('h1', {}, fabric.name),
      el('p', { class: 'aka' }, fabric.aka),
      el('p', { class: 'summary' }, fabric.summary),
    ),

    el('section', {},
      el('h2', {}, 'How to recognise it by touch'),
      el('p', { class: 'lead' }, fabric.touch),
    ),

    el('section', {},
      el('h2', {}, 'The basics'),
      el('dl', { class: 'facts' },
        fact('Fibre source', fabric.fibre),
        fact('Weave', `${weave.label}. ${fabric.weaveNote}`),
        fact('Typical weight', fabric.gsm, el('small', {}, 'GSM is the weight in grams of one square metre of cloth.')),
        fact('Best season', fabric.season),
        fact('Price level',
          el('span', { class: 'price' }, pips(fabric.price.level, 4, `${fabric.price.level} out of 4`), PRICE_WORDS[fabric.price.level]),
          el('small', {}, fabric.price.note)),
      ),
    ),

    el('section', {},
      el('h2', {}, 'How it behaves'),
      el('p', { class: 'note' },
        'Ratings run from 1 to 5. More dots mean more of that quality. They are relative guides for comparing fabrics, not lab results.'),
      el('ul', { class: 'ratings' }, ratings),
    ),

    el('section', {},
      el('h2', {}, 'Common uses in Indian homes'),
      el('ul', { class: 'uses' }, fabric.uses.map((u) => el('li', {}, u))),
    ),

    el('section', {},
      el('h2', {}, 'Care'),
      el('dl', { class: 'facts' },
        fact('How to wash', fabric.wash),
        fact('How to store', fabric.store),
      ),
    ),
  );
}

const fabric = FABRICS[0];
const stage = document.getElementById('swatch');
const panel = document.getElementById('panel');
panel.replaceChildren(renderPanel(fabric));

let viewer = null;
try {
  viewer = new FabricViewer(stage, fabric);
} catch (err) {
  console.error(err);
  stage.append(el('p', { class: 'stage-error' }, 'The 3D view could not start on this device. The fabric information below still works.'));
}

if (viewer) {
  // Lights
  const lightBar = document.getElementById('lights');
  for (const [id, light] of Object.entries(LIGHTS)) {
    lightBar.append(el('button', { type: 'button', id: `light-${id}`, ariaPressed: String(id === 'daylight'), onclick: (e) => {
      viewer.setLight(id);
      for (const b of lightBar.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
    } }, light.label));
  }

  // Close-up
  const closeBtn = document.getElementById('closeup');
  const caption = document.getElementById('caption');
  const hint = document.getElementById('hint');
  const weave = WEAVES[fabric.weave];
  caption.replaceChildren(el('strong', {}, weave.label + '. '), weave.explain + ' The threads are drawn larger than life so you can see them.');
  closeBtn.addEventListener('click', () => {
    const on = closeBtn.getAttribute('aria-pressed') !== 'true';
    closeBtn.setAttribute('aria-pressed', String(on));
    closeBtn.textContent = on ? 'Full view' : 'Close-up';
    caption.hidden = !on;
    hint.textContent = on
      ? 'Drag to move across the cloth. Pinch to zoom.'
      : 'Drag the cloth to pull it. Drag beside it to turn. Pinch to zoom.';
    viewer.setCloseUp(on);
  });

  document.getElementById('reset').addEventListener('click', () => viewer.resetView());
}
