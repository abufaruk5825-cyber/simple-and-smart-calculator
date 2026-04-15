const currentEl = document.getElementById('current');
const historyEl = document.getElementById('history');
const historyList = document.getElementById('historyList');
const historyPanel = document.getElementById('historyPanel');
const toggleHistoryBtn = document.getElementById('toggleHistory');
const clearHistoryBtn = document.getElementById('clearHistory');

let state = {
  current: '0',
  previous: '',
  operator: null,
  justCalculated: false,
  memory: 0,
};

// ── Display ──────────────────────────────────────────────
function updateDisplay(val, hist = '') {
  currentEl.className = 'current';
  if (val.length > 14) currentEl.classList.add('small');
  currentEl.textContent = val;
  historyEl.textContent = hist;
}

function showError(msg) {
  currentEl.className = 'current error';
  currentEl.textContent = msg;
  historyEl.textContent = '';
}

// ── Number input ─────────────────────────────────────────
function inputDigit(digit) {
  if (state.justCalculated) {
    state.current = digit === '.' ? '0.' : digit;
    state.justCalculated = false;
  } else {
    if (digit === '.') {
      if (state.current.includes('.')) return;
      state.current = state.current + '.';
    } else {
      state.current = state.current === '0' ? digit : state.current + digit;
    }
  }
  updateDisplay(state.current, historyEl.textContent);
}

// ── Operators ─────────────────────────────────────────────
function setOperator(op) {
  if (state.operator && !state.justCalculated) {
    calculate(false);
  }
  state.previous = state.current;
  state.operator = op;
  state.justCalculated = false;
  updateDisplay(state.current, `${state.previous} ${opSymbol(op)}`);
}

function opSymbol(op) {
  return { add: '+', subtract: '−', multiply: '×', divide: '÷' }[op] || op;
}

// ── Calculate ─────────────────────────────────────────────
function calculate(addToHistory = true) {
  if (!state.operator || state.previous === '') return;

  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);
  let result;

  if (state.operator === 'divide' && b === 0) {
    showError('Cannot divide by zero');
    resetState();
    return;
  }

  switch (state.operator) {
    case 'add':      result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide':   result = a / b; break;
  }

  const expr = `${state.previous} ${opSymbol(state.operator)} ${state.current} =`;
  result = parseFloat(result.toPrecision(12)).toString();

  if (addToHistory) addHistory(`${expr} ${result}`);

  state.current = result;
  state.previous = '';
  state.operator = null;
  state.justCalculated = true;

  updateDisplay(result, expr);
  highlightActive(null);
}

// ── Clear functions ───────────────────────────────────────
function clearAll() {
  resetState();
  updateDisplay('0', '');
  highlightActive(null);
}

function clearEntry() {
  state.current = '0';
  updateDisplay('0', historyEl.textContent);
}

function backspace() {
  if (state.justCalculated) return;
  state.current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
  updateDisplay(state.current, historyEl.textContent);
}

function resetState() {
  state.current = '0';
  state.previous = '';
  state.operator = null;
  state.justCalculated = false;
}

// ── Advanced functions ────────────────────────────────────
function applyFn(action) {
  const val = parseFloat(state.current);

  if (action === 'sqrt') {
    if (val < 0) { showError('Invalid input'); return; }
    const result = parseFloat(Math.sqrt(val).toPrecision(12)).toString();
    addHistory(`√(${state.current}) = ${result}`);
    state.current = result;
    state.justCalculated = true;
    updateDisplay(result, `√(${val})`);

  } else if (action === 'square') {
    const result = parseFloat((val * val).toPrecision(12)).toString();
    addHistory(`(${state.current})² = ${result}`);
    state.current = result;
    state.justCalculated = true;
    updateDisplay(result, `(${val})²`);

  } else if (action === 'percent') {
    const result = state.operator && state.previous !== ''
      ? parseFloat(((parseFloat(state.previous) * val) / 100).toPrecision(12)).toString()
      : parseFloat((val / 100).toPrecision(12)).toString();
    state.current = result;
    updateDisplay(result, historyEl.textContent);

  } else if (action === 'negate') {
    state.current = (val * -1).toString();
    updateDisplay(state.current, historyEl.textContent);
  }
}

// ── Memory ────────────────────────────────────────────────
function memoryAction(action) {
  const val = parseFloat(state.current);
  if (action === 'mc')      { state.memory = 0; }
  else if (action === 'mr') { state.current = state.memory.toString(); state.justCalculated = true; updateDisplay(state.current, historyEl.textContent); }
  else if (action === 'm-plus')  { state.memory += val; }
  else if (action === 'm-minus') { state.memory -= val; }
}

// ── History panel ─────────────────────────────────────────
function addHistory(entry) {
  const li = document.createElement('li');
  li.textContent = entry;
  historyList.prepend(li);
}

toggleHistoryBtn.addEventListener('click', () => {
  historyPanel.classList.toggle('open');
});

clearHistoryBtn.addEventListener('click', () => {
  historyList.innerHTML = '';
});

// ── Active operator highlight ─────────────────────────────
function highlightActive(op) {
  document.querySelectorAll('.btn.op').forEach(b => b.classList.remove('active'));
  if (op) {
    const btn = document.querySelector(`[data-action="${op}"]`);
    if (btn) btn.classList.add('active');
  }
}

// ── Button click events ───────────────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.value;
    const action = btn.dataset.action;

    if (val !== undefined) {
      inputDigit(val);
      return;
    }

    switch (action) {
      case 'clear':     clearAll(); break;
      case 'ce':        clearEntry(); break;
      case 'backspace': backspace(); break;
      case 'equals':    calculate(); break;
      case 'add':
      case 'subtract':
      case 'multiply':
      case 'divide':
        setOperator(action);
        highlightActive(action);
        break;
      case 'sqrt':
      case 'square':
      case 'percent':
      case 'negate':
        applyFn(action);
        break;
      case 'mc':
      case 'mr':
      case 'm-plus':
      case 'm-minus':
        memoryAction(action);
        break;
    }
  });
});

// ── Keyboard support ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') { inputDigit(e.key); return; }
  if (e.key === '.') { inputDigit('.'); return; }

  const keyMap = {
    '+': () => { setOperator('add'); highlightActive('add'); },
    '-': () => { setOperator('subtract'); highlightActive('subtract'); },
    '*': () => { setOperator('multiply'); highlightActive('multiply'); },
    '/': () => { e.preventDefault(); setOperator('divide'); highlightActive('divide'); },
    'Enter': () => calculate(),
    '=': () => calculate(),
    'Backspace': () => backspace(),
    'Escape': () => clearAll(),
    '%': () => applyFn('percent'),
  };

  if (keyMap[e.key]) keyMap[e.key]();
});
