const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'); const assert = require('assert');
const html = fs.readFileSync(process.argv[2], 'utf8').replace(/<link[^>]+fonts[^>]*>/g, '');
const errs = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message)); vc.on('error', e => errs.push(String(e)));
let store = {};
function makeDom(){
  return new JSDOM(html, { runScripts:'dangerously', virtualConsole: vc, url:'https://example.test/', beforeParse(w){
    let t = 1e12; w.Date.now = () => (t += 2000);
    w.NDEFReader = class { scan(){ w.__r = this; return Promise.resolve(); } };
    w.scrollTo = () => {}; w.confirm = () => true;
    Object.defineProperty(w, 'localStorage', { value: { getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v} } });
  }});
}
(async () => {
  let dom = makeDom(); let w = dom.window, d = w.document;
  const tick = () => new Promise(r => setTimeout(r, 0));
  const ev = s => w.eval(s);
  const tap = async s => { w.__r.onreading({ serialNumber: s }); await tick(); };
  const click = async sel => { const el = d.querySelector(sel); assert(el, 'missing ' + sel); el.click(); await tick(); };
  const clickText = async (sel, txt) => { const el = [...d.querySelectorAll(sel)].find(e => e.textContent.includes(txt)); assert(el, 'missing ' + sel + ' ' + txt); el.click(); await tick(); };
  const text = sel => d.querySelector(sel).textContent;
  const bal = n => ev(`balanceOf(state.players.find(p=>p.name==='${n}').id)`);
  const view = () => ev('current');
  const houses = i => ev(`deedState(${i}).houses`);

  assert.equal(view(), 'start');
  assert.equal(d.querySelector('#continueBtn').hidden, true, 'no saved game: no Continue');
  await click('#newGameBtn'); assert.equal(view(), 'setup');
  await click('#enrollBtn');
  for (const [s,n] of [['A1','Ann'],['B2','Ben'],['C3','Cal']]) {
    await tap(s); assert.equal(view(), 'name');
    d.querySelector('#nameInput').value = n; await click('#saveNameBtn');
  }
  assert.equal(ev('state.players.length'), 3);
  assert.notEqual(ev('state.players[0].color'), ev('state.players[1].color'));
  await tap('A1'); assert.equal(view(), 'enroll'); // already enrolled: stays put
  assert.equal(text('#nfcNotice'), '', 'no notice when NFC works');
  await click('#enrollDone'); assert.equal(view(), 'setup');

  await click('#deedSetupBtn'); assert.equal(view(), 'deedsetup');
  await tap('A1'); assert.equal(ev('Object.keys(state.deeds).length'), 0);
  for (let i=0;i<28;i++) await tap('D'+i);
  assert.equal(ev('Object.keys(state.deeds).length'), 28);
  assert.equal(view(), 'setup');
  assert.equal(ev("state.deeds['D21']"), 21);
  assert.match(text('#deedCount'), /28 of 28/);

  await click('#openBankBtn'); assert.equal(view(), 'idle');
  await tap('A1'); assert.equal(view(), 'player');
  await click('#passGoBtn'); assert.equal(bal('Ann'), 1700);

  await tap('A1'); await click('[data-act="buy"]'); assert.equal(view(), 'property');
  await tap('D21'); assert.equal(view(), 'amount'); assert.equal(text('#amtDisplay'), '$400');
  await click('#amtConfirm'); assert.equal(bal('Ann'), 1300);
  assert.equal(ev('deedState(21).owner'), 'A1');
  await tap('A1'); await click('[data-act="buy"]');
  await tap('D21'); assert.equal(view(), 'property'); // already owned: refused
  await clickText('#propList button', 'Park Place'); await click('#amtConfirm');
  assert.equal(bal('Ann'), 950);

  await tap('D21'); assert.equal(view(), 'deed'); assert.match(text('#dRent'), /\$100 rent/);
  await clickText('#dActions button', 'Charge Rent');
  await tap('A1'); assert.equal(view(), 'choose');
  await tap('B2'); assert.equal(view(), 'amount'); assert.equal(text('#amtDisplay'), '$100');
  await click('#amtConfirm'); assert.equal(bal('Ben'), 1400); assert.equal(bal('Ann'), 1050);

  await tap('D21');
  await clickText('#dActions button', 'Add House');
  await clickText('#dActions button', 'Add House');
  assert.equal(houses(21), 1);
  await tap('D20'); await clickText('#dActions button', 'Add House');
  await tap('D21'); await clickText('#dActions button', 'Add House');
  assert.equal(houses(21), 2); assert.equal(bal('Ann'), 450);

  await click('section[data-view="deed"] [data-back="idle"]');
  await tap('C3'); await click('[data-act="payrent"]'); await tap('D21');
  assert.equal(text('#amtDisplay'), '$600'); await click('#amtConfirm');
  assert.equal(bal('Cal'), 900); assert.equal(bal('Ann'), 1050);

  for (const s of ['D22','D23','D26']) { await tap('B2'); await click('[data-act="buy"]'); await tap(s); await click('#amtConfirm'); }
  assert.equal(bal('Ben'), 850);
  await tap('C3'); await click('[data-act="payrent"]'); await tap('D22');
  assert.equal(text('#amtDisplay'), '$50'); await click('#amtConfirm');
  await tap('C3'); await click('[data-act="payrent"]'); await tap('D26');
  assert.equal(view(), 'dice'); await clickText('#diceGrid button', '8');
  assert.equal(text('#amtDisplay'), '$32'); await click('#amtConfirm');
  assert.equal(bal('Cal'), 818);

  await tap('D20'); await clickText('#dActions button', 'Mortgage');
  assert.equal(ev('deedState(20).mortgaged'), false); // buildings in set: refused
  await tap('D21'); await clickText('#dActions button', 'Sell House'); assert.equal(houses(21), 1);
  await clickText('#dActions button', 'Sell House'); assert.equal(houses(21), 0);
  await clickText('#dActions button', 'Add House'); await clickText('#dActions button', 'Add House'); assert.equal(houses(21), 2);
  await clickText('#dActions button', 'Add House'); assert.equal(houses(21), 2); // uneven: refused
  await tap('D20'); await clickText('#dActions button', 'Sell House'); assert.equal(houses(20), 1); // uneven sell: refused
  await tap('D21'); await clickText('#dActions button', 'Sell House'); await clickText('#dActions button', 'Sell House');
  await tap('D20'); await clickText('#dActions button', 'Sell House');
  assert.equal(houses(21) + houses(20), 0);
  await tap('D20'); await clickText('#dActions button', 'Mortgage');
  assert.equal(ev('deedState(20).mortgaged'), true);
  const annBefore = bal('Ann');
  await click('section[data-view="deed"] [data-back="idle"]');
  await tap('B2'); await click('[data-act="payrent"]'); await tap('D20');
  assert.equal(view(), 'property');
  await click('#prCancel'); assert.equal(view(), 'player');
  await tap('D20'); assert.equal(view(), 'deed'); // any tap jumps to it
  await click('section[data-view="player"] [data-back="idle"]');
  await tap('D20'); await clickText('#dActions button', 'Lift Mortgage');
  assert.equal(bal('Ann'), annBefore - 193);

  await clickText('#dActions button', 'Hand Over');
  await tap('B2'); assert.equal(ev('deedState(20).owner'), 'B2');
  await click('footer button[data-nav="ledger"]'); await click('#undoBtn');
  assert.equal(ev('deedState(20).owner'), 'A1');
  // bankrupt: hand Boardwalk back to bank
  await click('footer button[data-nav="idle"]');
  await tap('D21'); await clickText('#dActions button', 'Hand Over'); await clickText('#chList li', 'The bank');
  assert.equal(ev('deedState(21).owner'), null);

  await tap('B2'); await click('[data-act="pay"]'); await clickText('#presetRow button', 'Income Tax');
  await click('#amtConfirm');
  assert.equal(ev('state.ledger.at(-1).note'), 'Income tax');
  const benB = bal('Ben');
  await tap('B2'); await click('[data-act="payplayer"]'); await clickText('#keypad button', '5'); await [...d.querySelectorAll('#keypad button')].find(b=>b.textContent==='0').click();
  await click('#amtConfirm'); await clickText('#chList li', 'Cal');
  assert.equal(bal('Ben'), benB - 50);

  await tap('B2'); await click('[data-act="mine"]');
  assert.equal(d.querySelectorAll('#propList button').length, 3);

  // hotels: give Cal all browns cheaply, build to hotel
  await click('#prCancel'); await click('section[data-view="player"] [data-back="idle"]');
  for (const s of ['D0','D1']) { await tap('C3'); await click('[data-act="buy"]'); await tap(s); await click('#amtConfirm'); }
  for (let k=0;k<5;k++) for (const s of ['D0','D1']) { await tap(s); await clickText('#dActions button', k===4?'Build Hotel':'Add House'); }
  assert.equal(houses(0)+houses(1), 10);
  await tap('B2'); await click('[data-act="payrent"]'); await tap('D1');
  assert.equal(text('#amtDisplay'), '$450');
  await click('#amtCancel');

  // reload survives
  const snap = ev('JSON.stringify({b:state.players.map(p=>balanceOf(p.id)), o:W().props})');
  dom = makeDom(); w = dom.window; d = w.document; await tick();
  assert.equal(view(), 'start');
  assert.equal(d.querySelector('#continueBtn').hidden, false, 'saved game: Continue shown');
  await click('#continueBtn'); assert.equal(view(), 'idle');
  assert.equal(ev('JSON.stringify({b:state.players.map(p=>balanceOf(p.id)), o:W().props})'), snap);

  // Bank tab actions: pick the action first, then the player by card
  await click('footer button[data-nav="idle"]'); assert.equal(view(), 'idle');
  const annB = bal('Ann');
  await click('[data-bank="passgo"]'); assert.equal(view(), 'choose');
  await tap('A1'); assert.equal(bal('Ann'), annB + 200); assert.equal(view(), 'idle');
  await click('[data-bank="buy"]'); await tap('B2'); assert.equal(view(), 'property');
  await click('#prCancel'); assert.equal(view(), 'idle', 'cancel goes back to the Bank tab');
  await click('[data-bank="pay"]'); await tap('C3'); assert.equal(view(), 'amount');
  await click('#amtCancel'); assert.equal(view(), 'idle');
  await tap('A1'); assert.equal(view(), 'player', 'a card tap still opens the player');
  await click('section[data-view="player"] [data-back="idle"]');
  await click('footer button[data-nav="ledger"]'); await click('#standingsBtn'); assert.equal(view(), 'standings');
  console.log([...d.querySelectorAll('#standList li')].map(li => li.textContent).join('\n'));
  await click('#ledgerSegBtn'); assert.equal(view(), 'ledger');
  await click('footer button[data-nav="setup"]');
  await click('section[data-view="setup"] [data-back="start"]'); assert.equal(view(), 'start');
  await click('#newGameBtn'); assert.equal(view(), 'setup');
  assert.equal(ev('state.ledger.length'), 0);
  assert.equal(ev('state.players.length'), 0, 'new game clears players');
  assert.equal(ev('Object.keys(state.deeds).length'), 28, 'new game keeps deed stickers');
  assert.equal(ev('state.open'), false);
  assert.equal(ev('JSON.parse(localStorage.getItem("monopoly-bank")).players.length'), 0);
  assert.equal(ev('hasSavedGame()'), false, 'nothing to continue');

  assert.deepEqual(errs, []);
  console.log('ALL PASS');
})().catch(e => { console.error('FAIL', e.stack.split('\n').slice(0,3).join(' | '), '\nview:', errs); process.exit(1); });
