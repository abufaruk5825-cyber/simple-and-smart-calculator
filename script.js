const currentEl  = document.getElementById('current');
const historyEl  = document.getElementById('history');
const historyList  = document.getElementById('historyList');
const historyPanel = document.getElementById('historyPanel');
const toggleHistoryBtn = document.getElementById('toggleHistory');
const clearHistoryBtn  = document.getElementById('clearHistory');

// ── State ─────────────────────────────────────────────────
// tokens: alternating numbers (string) and operators ('+','-','*','/')
// e.g. ['7', '*', '3']  or  ['2', '+', '3', '*', '4']
let tokens          = [];       // expression tokens built up before =
let currentInput    = '0';      // what the user is currently typing
let justCalculated  = false;    // true right after = was pressed
let memory          = 0;

// ── Reliable precedence-aware evaluator ───────────────────
// Parses an array like ['2','+','3','*','4'] → 14
function evaluate(toks) {
  // Convert to numbers, validate
  const nums = [];
  const ops  = [];

  for (let i = 0; i < toks.length; i++) {
    if (i % 2 === 0) {
      const n = parseFloat(toks[i]);
      if (isNaN(n)) throw new Error('Invalid number: ' + toks[i]);
      nums.push(n);
    } else {
      ops.push(toks[i]);
    }
  }

  if (nums.length !== ops.length + 1) throw new Error('Malformed expression');

  // Pass 1 – resolve * and / (left to right)
  let i = 0;
  while (i < ops.length) {
    if (ops[i] === '*' || ops[i] === '/') {
      if (ops[i] === '/' && nums[i + 1] === 0) throw new Error('DIV0');
      const result = ops[i] === '*'
        ? nums[i] * nums[i + 1]
        : nums[i] / nums[i + 1];
      nums.splice(i, 2, result);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  // Pass 2 – resolve + and - (left to right)
  let acc = nums[0];
  for (let j = 0; j < ops.length; j++) {
    if (ops[j] === '+') acc += nums[j + 1];
    else                acc -= nums[j + 1];
  }

  return acc;
}

// ── Display helpers ───────────────────────────────────────
function updateDisplay(val, hist) {
  currentEl.className = 'current';
  if (String(val).length > 14) currentEl.classList.add('small');
  currentEl.textContent = val;
  if (hist !== undefined) historyEl.textContent = hist;
}

function showError(msg) {
  currentEl.className = 'current error';
  currentEl.textContent = msg;
  historyEl.textContent = '';
}

function formatResult(n) {
  // Avoid floating-point noise (e.g. 0.1+0.2 → 0.3 not 0.30000000000000004)
  return parseFloat(n.toPrecision(12)).toString();
}

function buildHistoryStr() {
  // Display tokens with pretty symbols
  return tokens.map((t, i) =>
    i % 2 === 1 ? { '+':'+', '-':'−', '*':'×', '/':'÷' }[t] : t
  ).join(' ');
}

// ── Input digit / decimal ─────────────────────────────────
function inputDigit(digit) {
  // Start fresh after = or after an operator was just pressed
  const operatorJustPressed = tokens.length > 0 && tokens.length % 2 === 0;

  if (justCalculated || operatorJustPressed) {
    if (justCalculated) tokens = [];
    currentInput = digit === '.' ? '0.' : digit;
    justCalculated = false;
  } else {
    if (digit === '.') {
      if (currentInput.includes('.')) return;   // prevent double decimal
      currentInput += '.';
    } else {
      currentInput = currentInput === '0' ? digit : currentInput + digit;
    }
  }
  updateDisplay(currentInput, buildHistoryStr());
}

// ── Operator ──────────────────────────────────────────────
const OP_MAP = { add:'+', subtract:'-', multiply:'*', divide:'/' };

function setOperator(action) {
  const op = OP_MAP[action];

  // If the last token is already an operator, just replace it
  if (tokens.length > 0 && tokens.length % 2 === 0) {
    tokens[tokens.length - 1] = op;
    highlightActive(action);
    updateDisplay(currentInput, buildHistoryStr());
    return;
  }

  // Push current number then operator
  tokens.push(currentInput);
  tokens.push(op);
  justCalculated = false;

  updateDisplay(currentInput, buildHistoryStr());
  highlightActive(action);
}

// ── Equals ────────────────────────────────────────────────
function calculate() {
  if (tokens.length === 0) return;   // nothing to evaluate

  // Complete the expression with the current input
  const fullTokens = [...tokens, currentInput];

  let result;
  try {
    result = evaluate(fullTokens);
  } catch (e) {
    if (e.message === 'DIV0') showError('Cannot divide by zero');
    else showError('Error');
    resetState();
    return;
  }

  const expr   = buildHistoryStr() + ' ' + currentInput + ' =';
  const resStr = formatResult(result);

  addHistory(`${expr} ${resStr}`);

  currentInput   = resStr;
  tokens         = [];
  justCalculated = true;

  updateDisplay(resStr, expr);
  highlightActive(null);
}

// ── Clear ─────────────────────────────────────────────────
function clearAll() {
  resetState();
  updateDisplay('0', '');
  highlightActive(null);
}

function clearEntry() {
  currentInput = '0';
  updateDisplay('0', buildHistoryStr());
}

function backspace() {
  if (justCalculated) return;
  currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : '0';
  updateDisplay(currentInput, buildHistoryStr());
}

function resetState() {
  tokens        = [];
  currentInput  = '0';
  justCalculated = false;
}

// ── Advanced functions ────────────────────────────────────
function applyFn(action) {
  const val = parseFloat(currentInput);
  if (isNaN(val)) return;

  if (action === 'sqrt') {
    if (val < 0) { showError('Invalid input'); return; }
    const res = formatResult(Math.sqrt(val));
    addHistory(`√(${currentInput}) = ${res}`);
    currentInput = res;
    justCalculated = true;
    updateDisplay(res, `√(${val})`);

  } else if (action === 'square') {
    const res = formatResult(val * val);
    addHistory(`(${currentInput})² = ${res}`);
    currentInput = res;
    justCalculated = true;
    updateDisplay(res, `(${val})²`);

  } else if (action === 'percent') {
    // If mid-expression use previous number as base, else just /100
    let res;
    if (tokens.length >= 2) {
      const base = parseFloat(tokens[tokens.length - 2]);
      res = formatResult((base * val) / 100);
    } else {
      res = formatResult(val / 100);
    }
    currentInput = res;
    updateDisplay(res, buildHistoryStr());

  } else if (action === 'negate') {
    currentInput = formatResult(val * -1);
    updateDisplay(currentInput, buildHistoryStr());
  }
}

// ── Memory ────────────────────────────────────────────────
function memoryAction(action) {
  const val = parseFloat(currentInput);
  if (action === 'mc')       { memory = 0; }
  else if (action === 'mr')  { currentInput = memory.toString(); justCalculated = true; updateDisplay(currentInput); }
  else if (action === 'm-plus')  { memory += val; }
  else if (action === 'm-minus') { memory -= val; }
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
  if (action) {
    const btn = document.querySelector(`[data-action="${action}"]`);
    if (btn) btn.classList.add('active');
  }
}

// ── Button clicks ─────────────────────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val    = btn.dataset.value;
    const action = btn.dataset.action;

    if (val !== undefined) { inputDigit(val); return; }

    switch (action) {
      case 'clear':     clearAll();   break;
      case 'ce':        clearEntry(); break;
      case 'backspace': backspace();  break;
      case 'equals':    calculate();  break;
      case 'add': case 'subtract': case 'multiply': case 'divide':
        setOperator(action); break;
      case 'sqrt': case 'square': case 'percent': case 'negate':
        applyFn(action); break;
      case 'mc': case 'mr': case 'm-plus': case 'm-minus':
        memoryAction(action); break;
    }
  });
});

// ── Keyboard ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') { inputDigit(e.key); return; }
  if (e.key === '.')         { inputDigit('.'); return; }

  const map = {
    '+':       () => setOperator('add'),
    '-':       () => setOperator('subtract'),
    '*':       () => setOperator('multiply'),
    '/':       () => { e.preventDefault(); setOperator('divide'); },
    'Enter':   () => calculate(),
    '=':       () => calculate(),
    'Backspace': () => backspace(),
    'Escape':  () => clearAll(),
    '%':       () => applyFn('percent'),
  };

  if (map[e.key]) map[e.key]();
});
