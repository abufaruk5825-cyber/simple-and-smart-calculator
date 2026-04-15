const currentEl        = document.getElementById('current');
const historyEl        = document.getElementById('history');
const historyList      = document.getElementById('historyList');
const historyPanel     = document.getElementById('historyPanel');
const toggleHistoryBtn = document.getElementById('toggleHistory');
const clearHistoryBtn  = document.getElementById('clearHistory');

// ── State ─────────────────────────────────────────────────
let tokens    = [];      // alternating numbers & operators: ['7','+','5','+']
let current   = '0';     // number currently being typed / shown
let newNumber = false;   // next digit replaces current instead of appending
let afterCalc = false;   // "=" was just pressed
let memory    = 0;

// ── Evaluator (precedence: × ÷ before + −) ───────────────
function evaluate(toks) {
  const nums = [], ops = [];
  for (let i = 0; i < toks.length; i++) {
    if (i % 2 === 0) {
      const n = parseFloat(toks[i]);
      if (isNaN(n)) throw new Error('NaN');
      nums.push(n);
    } else {
      ops.push(toks[i]);
    }
  }
  if (nums.length !== ops.length + 1) throw new Error('bad');

  // pass 1 – * /
  let i = 0;
  while (i < ops.length) {
    if (ops[i] === '*' || ops[i] === '/') {
      if (ops[i] === '/' && nums[i + 1] === 0) throw new Error('DIV0');
      nums.splice(i, 2, ops[i] === '*' ? nums[i] * nums[i+1] : nums[i] / nums[i+1]);
      ops.splice(i, 1);
    } else { i++; }
  }
  // pass 2 – + -
  let acc = nums[0];
  for (let j = 0; j < ops.length; j++)
    acc = ops[j] === '+' ? acc + nums[j+1] : acc - nums[j+1];
  return acc;
}

// ── Helpers ───────────────────────────────────────────────
const SYM = { '+':'+', '-':'−', '*':'×', '/':'÷' };

function fmt(n)     { return parseFloat(n.toPrecision(12)).toString(); }
function histStr()  { return tokens.map((t, i) => i % 2 === 1 ? SYM[t] : t).join(' '); }

function render(histOverride) {
  currentEl.className   = 'current';
  if (current.length > 14) currentEl.classList.add('small');
  currentEl.textContent = current;
  historyEl.textContent = histOverride !== undefined ? histOverride : histStr();
}

function showError(msg) {
  currentEl.className   = 'current error';
  currentEl.textContent = msg;
  historyEl.textContent = '';
}

// ── Digit / decimal input ─────────────────────────────────
function inputDigit(d) {
  if (afterCalc) {
    tokens = []; current = (d === '.') ? '0.' : d;
    newNumber = false; afterCalc = false;
    render('');
    return;
  }
  if (newNumber) {
    current = (d === '.') ? '0.' : d;
    newNumber = false;
  } else {
    if (d === '.') {
      if (current.includes('.')) return;
      current += '.';
    } else {
      current = current === '0' ? d : current + d;
    }
  }
  render();
}

// ── Operator ──────────────────────────────────────────────
const OP = { add:'+', subtract:'-', multiply:'*', divide:'/' };

function setOperator(action) {
  const op = OP[action];
  afterCalc = false;

  // two operators in a row → swap the last one
  if (newNumber && tokens.length > 0) {
    tokens[tokens.length - 1] = op;
    highlightActive(action);
    render();
    return;
  }

  tokens.push(current);
  tokens.push(op);
  newNumber = true;
  highlightActive(action);
  render();
}

// ── Equals ────────────────────────────────────────────────
function calculate() {
  if (tokens.length === 0) return;

  let result;
  try {
    result = evaluate([...tokens, current]);
  } catch(e) {
    showError(e.message === 'DIV0' ? 'Cannot divide by zero' : 'Error');
    hardReset();
    return;
  }

  const expr   = histStr() + ' ' + current + ' =';
  const resStr = fmt(result);
  addHistory(expr + ' ' + resStr);

  tokens    = [];
  current   = resStr;
  newNumber = false;
  afterCalc = true;
  highlightActive(null);
  render('');   // clean display — expression already saved to history panel
}

// ── Clear ─────────────────────────────────────────────────
function hardReset() {
  tokens = []; current = '0'; newNumber = false; afterCalc = false;
}

function clearAll()   { hardReset(); highlightActive(null); render(''); }
function clearEntry() { current = '0'; newNumber = false; render(); }
function backspace()  {
  if (newNumber) return;
  current = current.length > 1 ? current.slice(0, -1) : '0';
  render();
}

// ── Advanced functions ────────────────────────────────────
function applyFn(action) {
  const v = parseFloat(current);
  if (isNaN(v)) return;

  if (action === 'sqrt') {
    if (v < 0) { showError('Invalid input'); return; }
    const r = fmt(Math.sqrt(v));
    addHistory(`√(${current}) = ${r}`);
    current = r; newNumber = true;
    render(`√(${v})`);

  } else if (action === 'square') {
    const r = fmt(v * v);
    addHistory(`(${current})² = ${r}`);
    current = r; newNumber = true;
    render(`(${v})²`);

  } else if (action === 'percent') {
    const base = tokens.length >= 2 ? parseFloat(tokens[tokens.length - 2]) : null;
    current = fmt(base !== null ? (base * v) / 100 : v / 100);
    render();

  } else if (action === 'negate') {
    current = fmt(v * -1);
    render();
  }
}

// ── Memory ────────────────────────────────────────────────
function memoryAction(action) {
  const v = parseFloat(current);
  if      (action === 'mc')      { memory = 0; }
  else if (action === 'mr')      { current = memory.toString(); newNumber = true; render(); }
  else if (action === 'm-plus')  { memory += v; }
  else if (action === 'm-minus') { memory -= v; }
}

// ── History panel ─────────────────────────────────────────
function addHistory(entry) {
  const li = document.createElement('li');
  li.textContent = entry;
  historyList.prepend(li);
}
toggleHistoryBtn.addEventListener('click', () => historyPanel.classList.toggle('open'));
clearHistoryBtn.addEventListener('click',  () => { historyList.innerHTML = ''; });

// ── Operator highlight ────────────────────────────────────
function highlightActive(action) {
  document.querySelectorAll('.btn.op').forEach(b => b.classList.remove('active'));
  if (action) document.querySelector(`[data-action="${action}"]`)?.classList.add('active');
}

// ── Button clicks ─────────────────────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.value;
    const a = btn.dataset.action;
    if (v !== undefined) { inputDigit(v); return; }
    switch (a) {
      case 'clear':     clearAll();   break;
      case 'ce':        clearEntry(); break;
      case 'backspace': backspace();  break;
      case 'equals':    calculate();  break;
      case 'add': case 'subtract': case 'multiply': case 'divide':
        setOperator(a); break;
      case 'sqrt': case 'square': case 'percent': case 'negate':
        applyFn(a); break;
      case 'mc': case 'mr': case 'm-plus': case 'm-minus':
        memoryAction(a); break;
    }
  });
});

// ── Keyboard ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') { inputDigit(e.key); return; }
  if (e.key === '.') { inputDigit('.'); return; }
  const map = {
    '+': () => setOperator('add'),
    '-': () => setOperator('subtract'),
    '*': () => setOperator('multiply'),
    '/': () => { e.preventDefault(); setOperator('divide'); },
    'Enter': calculate, '=': calculate,
    'Backspace': backspace, 'Escape': clearAll,
    '%': () => applyFn('percent'),
  };
  map[e.key]?.();
});
