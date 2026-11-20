// Token records: a card written once in NFC Tools with "token:top-hat" shows its token.
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'); const assert = require('assert');
const html = fs.readFileSync(process.argv[2], 'utf8').replace(/<link[^>]+fonts[^>]*>/g, '');
const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message));
let store = {};
const dom = new JSDOM(html, { runScripts:'dangerously', virtualConsole: vc, url:'https://example.test/', beforeParse(w){
  let t = 1e12; w.Date.now = () => (t += 2000);
  w.NDEFReader = class { scan(){ w.__r = this; return Promise.resolve(); } };
  w.TextDecoder = TextDecoder;   // jsdom lacks it; Chrome has it
  w.scrollTo = () => {}; w.confirm = () => true;
  Object.defineProperty(w, 'localStorage', { value: { getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v} } });
}});
const w = dom.window, d = w.document, ev = s => w.eval(s);
const tick = () => new Promise(r => setTimeout(r, 0));
const rec = txt => ({ recordType:'text', encoding:'utf-8', data: new DataView(new TextEncoder().encode(txt).buffer) });
const tap = async (s, txt) => { w.__r.onreading({ serialNumber: s, message: { records: txt == null ? [] : [rec(txt)] } }); await tick(); };
const click = async sel => { d.querySelector(sel).click(); await tick(); };
(async () => {
  await click('#enrollBtn');
  await tap('A1', 'token:top-hat');
  assert.match(d.querySelector('#newCardId').textContent, /Top Hat/);
  d.querySelector('#nameInput').value = 'Ann'; await click('#saveNameBtn');
  await tap('B2', null);                    // a plain card still works
  d.querySelector('#nameInput').value = 'Ben'; await click('#saveNameBtn');
  assert.equal(ev("state.players[0].token"), 'top-hat');
  assert.equal(ev("state.players[1].token"), undefined);
  assert.match(d.querySelector('#enrollRoster').textContent, /🎩 Ann/);
  await tap('B2', 'Token: Race-Car');       // written later: picked up on the next tap
  assert.equal(ev("state.players[1].token"), 'race-car');
  await tap('C3', 'hello');                 // other text is ignored
  assert.equal(ev("pendingToken"), null);
  assert.deepEqual(errs, []); console.log('TOKEN PASS');
})().catch(e => { console.error('FAIL', e.stack); process.exit(1); });
