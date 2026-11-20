// Bank Collapse: wipes players, deed stickers and the ledger only after the confirm and typed word.
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'); const assert = require('assert');
const html = fs.readFileSync(process.argv[2], 'utf8').replace(/<link[^>]+fonts[^>]*>/g, '');
const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message));
let typed = 'nope';
const dom = new JSDOM(html, { runScripts:'dangerously', virtualConsole: vc, url:'https://example.test/', beforeParse(w){ w.scrollTo=()=>{}; w.confirm=()=>true; w.prompt=()=>typed; }});
const w = dom.window, d = w.document, ev = s => w.eval(s);
const tick = () => new Promise(r => setTimeout(r, 0));
const click = async sel => { d.querySelector(sel).click(); await tick(); };
(async () => {
  for (const n of ['Ann','Ben']) { await click('#enrollBtn'); await click('#enrollTarget'); d.querySelector('#nameInput').value = n; await click('#saveNameBtn'); }
  await click('#deedSetupBtn'); for (let i=0;i<3;i++) await click('#dsTarget');
  await click('#dsDone');
  await click('#collapseBtn');
  assert.equal(ev('state.players.length'), 2, 'wrong word must not wipe');
  typed = 'collapse';
  await click('#collapseBtn');
  assert.equal(ev('state.players.length'), 0);
  assert.equal(ev('Object.keys(state.deeds).length'), 0);
  assert.equal(ev('state.ledger.length'), 0);
  assert.equal(d.querySelector('#fx').dataset.kind, 'collapse', 'collapse overlay shows');
  assert.match(d.querySelector('#fxRows').textContent, /Ann[\s\S]*Ben/);
  await new Promise(r => setTimeout(r, ev('COLLAPSE_TOTAL_MS') + 400));
  assert.match(d.querySelector('#fxRows').textContent, /\$0\.00[\s\S]*\$0\.00/, 'totals drain to $0.00');
  assert.equal(ev('current'), 'start', 'then back to the Main Menu');
  assert.equal(JSON.parse(w.localStorage.getItem('monopoly-bank')).players.length, 0);
  assert.deepEqual(errs, []); console.log('COLLAPSE PASS');
})().catch(e => { console.error('FAIL', e.stack); process.exit(1); });
