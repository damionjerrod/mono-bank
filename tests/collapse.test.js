// Bank Collapse: a confirm modal, then press and hold Collapse. Wipes players, deed stickers and the ledger.
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'); const assert = require('assert');
const html = fs.readFileSync(process.argv[2], 'utf8').replace(/<link[^>]+fonts[^>]*>/g, '');
const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message));
const dom = new JSDOM(html, { runScripts:'dangerously', virtualConsole: vc, url:'https://example.test/', beforeParse(w){
  w.scrollTo=()=>{}; w.confirm=()=>{ throw new Error('no browser confirm'); }; w.prompt=()=>{ throw new Error('no browser prompt'); };
  w.__vib = []; w.navigator.vibrate = p => { w.__vib.push(p); return true; };
}});
const w = dom.window, d = w.document, ev = s => w.eval(s);
const tick = () => new Promise(r => setTimeout(r, 0));
const wait = ms => new Promise(r => setTimeout(r, ms));
const click = async sel => { d.querySelector(sel).click(); await tick(); };
const fire = async (sel, type) => { d.querySelector(sel).dispatchEvent(new w.Event(type, { bubbles: true })); await tick(); };
const open = () => d.querySelector('#collapseModal').dataset.open;
(async () => {
  for (const n of ['Ann','Ben']) { await click('#enrollBtn'); await click('#enrollTarget'); d.querySelector('#nameInput').value = n; await click('#saveNameBtn'); }
  await click('#deedSetupBtn'); for (let i=0;i<3;i++) await click('#dsTarget');
  await click('#dsDone');
  const HOLD = ev('COLLAPSE_HOLD_MS_PRESS');

  await click('#collapseBtn'); assert.equal(open(), 'true', 'tapping Bank Collapse opens the modal');
  assert.match(d.querySelector('#collapseModal').textContent, /cannot be undone/);
  // a short press does nothing
  await fire('#collapseHold', 'pointerdown');
  assert.equal(d.querySelector('#collapseHold').dataset.holding, 'true', 'fill starts');
  assert.equal(w.__vib.at(-1), HOLD, 'long vibration while holding');
  await wait(HOLD / 3); await fire('#collapseHold', 'pointerup');
  assert.equal(d.querySelector('#collapseHold').dataset.holding, 'false', 'fill drains when let go');
  assert.equal(w.__vib.at(-1), 0, 'vibration stops when let go');
  await wait(HOLD); assert.equal(ev('state.players.length'), 2, 'letting go early must not wipe');
  assert.match(d.querySelector('#collapseHint').textContent, /too soon/);
  // cancel closes it, nothing wiped
  await click('#collapseCancel'); assert.equal(open(), 'false'); assert.equal(ev('state.players.length'), 2);

  // the full hold collapses the bank
  await click('#collapseBtn');
  await fire('#collapseHold', 'pointerdown'); await wait(HOLD + 100);
  assert.equal(open(), 'false', 'modal closes on collapse');
  assert.equal(ev('state.players.length'), 0);
  assert.equal(ev('Object.keys(state.deeds).length'), 0);
  assert.equal(ev('state.ledger.length'), 0);
  assert.equal(JSON.parse(w.localStorage.getItem('monopoly-bank')).players.length, 0);
  assert.equal(d.querySelector('#fx').dataset.kind, 'collapse', 'collapse overlay shows');
  assert.match(d.querySelector('#fxRows').textContent, /Ann[\s\S]*Ben/);
  await wait(ev('COLLAPSE_TOTAL_MS') + 400);
  assert.match(d.querySelector('#fxRows').textContent, /\$0\.00[\s\S]*\$0\.00/, 'totals drain to $0.00');
  assert.equal(ev('current'), 'start', 'then back to the Main Menu');
  assert.deepEqual(errs, []); console.log('COLLAPSE PASS');
})().catch(e => { console.error('FAIL', e.stack); process.exit(1); });
