const currentEl        = document.getElementById('current');
const historyEl        = document.getElementById('history');
const historyList      = document.getElementById('historyList');
const historyPanel     = document.getElementById('historyPanel');
const toggleHistoryBtn = document.getElementById('toggleHistory');
const clearHistoryBtn  = document.getElementById('clearHistory');

//   State 
let tokens    = [];      // alternating numbers & operators: ['7','+','5','+']
let current   = '0';     // number currently being typed / shown
let newNumber = false;   // next digit replaces current instead of appending
let afterCalc = false;   // "=" was just pressed
let memory    = 0;

//  Evaluator (precedence: × ÷ before + −) 
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

//   Helpers 
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

//  Digit / decimal input 
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

//  Operator 
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

//   Equals 
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

//   Clear
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

//  Angle mode (DEG / RAD) 
let angleDeg = true;
const btnDeg = document.getElementById('btnDeg');
const btnRad = document.getElementById('btnRad');
btnDeg.addEventListener('click', () => { angleDeg = true;  btnDeg.classList.add('active');    btnRad.classList.remove('active'); });
btnRad.addEventListener('click', () => { angleDeg = false; btnRad.classList.add('active');    btnDeg.classList.remove('active'); });

function toRad(x) { return angleDeg ? x * Math.PI / 180 : x; }
function fromRad(x) { return angleDeg ? x * 180 / Math.PI : x; }

//  Advanced functions
function applyFn(action) {
  const v = parseFloat(current);
  if (isNaN(v)) return;

  let r, label;

  switch (action) {
    case 'sqrt':
      if (v < 0) { showError('Invalid input'); return; }
      r = fmt(Math.sqrt(v)); label = `√(${v})`;
      break;
    case 'square':
      r = fmt(v * v); label = `(${v})²`;
      break;
    case 'percent': {
      const base = tokens.length >= 2 ? parseFloat(tokens[tokens.length - 2]) : null;
      current = fmt(base !== null ? (base * v) / 100 : v / 100);
      render(); return;
    }
    case 'negate':
      current = fmt(v * -1); render(); return;

    // Trig (input in DEG or RAD based on mode)
    case 'sin':  r = fmt(Math.sin(toRad(v)));  label = `sin(${v})`; break;
    case 'cos':  r = fmt(Math.cos(toRad(v)));  label = `cos(${v})`; break;
    case 'tan':
      if (angleDeg && Math.abs(v % 180) === 90) { showError('Undefined'); return; }
      r = fmt(Math.tan(toRad(v))); label = `tan(${v})`; break;

    // Inverse trig (result in DEG or RAD based on mode)
    case 'asin':
      if (v < -1 || v > 1) { showError('Domain error'); return; }
      r = fmt(fromRad(Math.asin(v))); label = `sin⁻¹(${v})`; break;
    case 'acos':
      if (v < -1 || v > 1) { showError('Domain error'); return; }
      r = fmt(fromRad(Math.acos(v))); label = `cos⁻¹(${v})`; break;
    case 'atan':
      r = fmt(fromRad(Math.atan(v))); label = `tan⁻¹(${v})`; break;

    // Logarithms
    case 'ln':
      if (v <= 0) { showError('Domain error'); return; }
      r = fmt(Math.log(v)); label = `ln(${v})`; break;
    case 'log10':
      if (v <= 0) { showError('Domain error'); return; }
      r = fmt(Math.log10(v)); label = `log(${v})`; break;

    // Hyperbolic
    case 'sinh':  r = fmt(Math.sinh(v));  label = `sinh(${v})`; break;
    case 'cosh':  r = fmt(Math.cosh(v));  label = `cosh(${v})`; break;
    case 'tanh':  r = fmt(Math.tanh(v));  label = `tanh(${v})`; break;

    // Inverse hyperbolic
    case 'asinh': r = fmt(Math.asinh(v)); label = `sinh⁻¹(${v})`; break;
    case 'acosh':
      if (v < 1) { showError('Domain error'); return; }
      r = fmt(Math.acosh(v)); label = `cosh⁻¹(${v})`; break;
    case 'atanh':
      if (v <= -1 || v >= 1) { showError('Domain error'); return; }
      r = fmt(Math.atanh(v)); label = `tanh⁻¹(${v})`; break;

    default: return;
  }

  addHistory(`${label} = ${r}`);
  current = r; newNumber = true;
  render(label);
}

//  Scientific panel toggle 
const sciPanel  = document.getElementById('sciPanel');
const toggleSci = document.getElementById('toggleSci');
toggleSci.addEventListener('click', () => {
  sciPanel.classList.toggle('open');
  toggleSci.textContent = sciPanel.classList.contains('open')
    ? '𝑓(𝑥) Scientific ▴'
    : '𝑓(𝑥) Scientific ▾';
});

//   Memory
function memoryAction(action) {
  const v = parseFloat(current);
  switch (action) {
    case 'mc':
      memory = 0;
      render();
      break;
    case 'mr':
      current   = fmt(memory);
      newNumber = false;
      afterCalc = false;
      render('M▸ ' + fmt(memory));
      break;
    case 'm-plus':
      if (!isNaN(v)) {
        memory += v;
        afterCalc = false;
        newNumber = true;
        render('M+ (' + fmt(memory) + ')');
      }
      break;
    case 'm-minus':
      if (!isNaN(v)) {
        memory -= v;
        afterCalc = false;
        newNumber = true;
        render('M− (' + fmt(memory) + ')');
      }
      break;
  }
}

//   History panel 
function addHistory(entry) {
  const li = document.createElement('li');
  li.textContent = entry;
  historyList.prepend(li);
}
toggleHistoryBtn.addEventListener('click', () => historyPanel.classList.toggle('open'));
clearHistoryBtn.addEventListener('click',  () => { historyList.innerHTML = ''; });

//   Operator highlight
function highlightActive(action) {
  document.querySelectorAll('.btn.op').forEach(b => b.classList.remove('active'));
  if (action) document.querySelector(`[data-action="${action}"]`)?.classList.add('active');
}

//    Button clicks 
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
      case 'sin': case 'cos': case 'tan':
      case 'asin': case 'acos': case 'atan':
      case 'sinh': case 'cosh': case 'tanh':
      case 'asinh': case 'acosh': case 'atanh':
      case 'ln': case 'log10':
        applyFn(a); break;
      case 'mc': case 'mr': case 'm-plus': case 'm-minus':
        memoryAction(a); break;
    }
  });
});

//   Keyboard 
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
