/**
 * ClassSeat Picker - Application Script
 * Built with HTML5, CSS Custom Properties, and Vanilla JavaScript.
 */

// ==========================================================================
// 1. State Management
// ==========================================================================

const state = {
  roster: [],
  rows: 6,
  cols: 5,
  disabledSeats: [], // Array of "row-col" strings
  assignments: {},   // Map of "row-col" -> "Student Name"
  soundOn: true,
  theme: 'light',
  currentStep: 1,
  currentMode: 'random' // 'random', 'roulette', or 'card'
};

// LocalStorage Keys
const STORAGE_KEYS = {
  ROSTER: 'csp_roster',
  ROWS: 'csp_rows',
  COLS: 'csp_cols',
  DISABLED_SEATS: 'csp_disabled_seats',
  ASSIGNMENTS: 'csp_assignments',
  SOUND: 'csp_sound',
  THEME: 'csp_theme'
};

// Load initial state from LocalStorage
function loadState() {
  try {
    const savedRoster = localStorage.getItem(STORAGE_KEYS.ROSTER);
    if (savedRoster) state.roster = JSON.parse(savedRoster);

    const savedRows = localStorage.getItem(STORAGE_KEYS.ROWS);
    if (savedRows) state.rows = parseInt(savedRows, 10);

    const savedCols = localStorage.getItem(STORAGE_KEYS.COLS);
    if (savedCols) state.cols = parseInt(savedCols, 10);

    const savedDisabled = localStorage.getItem(STORAGE_KEYS.DISABLED_SEATS);
    if (savedDisabled) state.disabledSeats = JSON.parse(savedDisabled);

    const savedAssignments = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    if (savedAssignments) state.assignments = JSON.parse(savedAssignments);

    const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND);
    if (savedSound !== null) state.soundOn = JSON.parse(savedSound);

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) state.theme = savedTheme;
  } catch (e) {
    console.error('Failed to load state from LocalStorage:', e);
  }
}

// Save state back to LocalStorage
function saveState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save state to LocalStorage:', e);
  }
}

// ==========================================================================
// 2. Audio Engine (Web Audio API Synthesizer)
// ==========================================================================

const AudioSynth = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playTick() {
    if (!state.soundOn) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  },
  playSuccess() {
    if (!state.soundOn) return;
    this.init();
    const playTone = (freq, time, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.start(time);
      osc.stop(time + duration);
    };
    
    const now = this.ctx.currentTime;
    playTone(523.25, now, 0.12); // C5
    playTone(659.25, now + 0.12, 0.12); // E5
    playTone(783.99, now + 0.24, 0.12); // G5
    playTone(1046.50, now + 0.36, 0.35); // C6
  },
  playFlip() {
    if (!state.soundOn) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  },
  playReset() {
    if (!state.soundOn) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
};

// ==========================================================================
// 3. UI Helpers & Modals
// ==========================================================================

const DOM = {
  themeToggle: document.getElementById('btn-theme-toggle'),
  soundToggle: document.getElementById('btn-sound-toggle'),
  stepIndicators: document.querySelectorAll('.step-indicator'),
  sections: document.querySelectorAll('.step-section'),
  
  // Section 1
  singleInput: document.getElementById('roster-single-input'),
  btnAddStudent: document.getElementById('btn-add-student'),
  bulkInput: document.getElementById('roster-bulk-input'),
  btnImportBulk: document.getElementById('btn-import-bulk'),
  btnClearRoster: document.getElementById('btn-clear-roster'),
  studentCount: document.getElementById('student-count'),
  studentBadges: document.getElementById('student-badges'),
  
  // Section 2
  inputRows: document.getElementById('input-rows'),
  inputCols: document.getElementById('input-cols'),
  btnApplyGrid: document.getElementById('btn-apply-grid'),
  totalSeatsCount: document.getElementById('total-seats-count'),
  rosterCountStat: document.getElementById('roster-count-stat'),
  disabledSeatsCount: document.getElementById('disabled-seats-count'),
  activeSeatsCount: document.getElementById('active-seats-count'),
  seatWarningMsg: document.getElementById('seat-warning-msg'),
  warnActiveSeats: document.getElementById('warn-active-seats'),
  warnStudents: document.getElementById('warn-students'),
  seatSetupGrid: document.getElementById('seat-setup-grid'),
  btnGoToDraw: document.getElementById('btn-go-to-draw'),
  
  // Section 3
  modeTabs: document.querySelectorAll('.mode-tab'),
  modePanels: document.querySelectorAll('.mode-panel'),
  btnDrawRandom: document.getElementById('btn-draw-random'),
  btnDrawRouletteAuto: document.getElementById('btn-draw-roulette-auto'),
  btnDrawCardSetup: document.getElementById('btn-draw-card-setup'),
  btnDrawCardRevealAll: document.getElementById('btn-draw-card-reveal-all'),
  seatResultGrid: document.getElementById('seat-result-grid'),
  exportControls: document.getElementById('export-controls'),
  btnExportImage: document.getElementById('btn-export-image'),
  btnCopyClipboard: document.getElementById('btn-copy-clipboard'),
  btnPrint: document.getElementById('btn-print'),
  btnResetDrawing: document.getElementById('btn-reset-drawing'),
  
  // Confirmation Modal
  modalConfirm: document.getElementById('modal-confirm'),
  modalConfirmMsg: document.getElementById('modal-confirm-msg'),
  btnModalCancel: document.getElementById('btn-modal-cancel'),
  btnModalOk: document.getElementById('btn-modal-ok'),
  btnCloseModal: document.querySelector('.btn-close-modal'),
  
  // Roulette Modal
  rouletteOverlay: document.getElementById('roulette-overlay'),
  rouletteNamesWrapper: document.getElementById('roulette-names-wrapper'),
  rouletteTargetSeatLabel: document.getElementById('roulette-target-seat-label')
};

// Navigation Steps
function setupNavigation() {
  document.querySelectorAll('[data-next-step]').forEach(button => {
    button.addEventListener('click', () => {
      const nextStep = parseInt(button.getAttribute('data-next-step'), 10);
      if (nextStep === 3) {
        // Double check seat availability before entering Step 3
        const activeSeats = getActiveSeatsCount();
        if (activeSeats < state.roster.length) {
          showWarningAlert();
          return;
        }
      }
      goToStep(nextStep);
    });
  });

  document.querySelectorAll('[data-prev-step]').forEach(button => {
    button.addEventListener('click', () => {
      const prevStep = parseInt(button.getAttribute('data-prev-step'), 10);
      goToStep(prevStep);
    });
  });

  DOM.stepIndicators.forEach(indicator => {
    indicator.addEventListener('click', () => {
      const step = parseInt(indicator.getAttribute('data-step'), 10);
      if (step > state.currentStep) {
        // Moving forward: validation checks
        if (step === 3 && getActiveSeatsCount() < state.roster.length) {
          showWarningAlert();
          return;
        }
      }
      goToStep(step);
    });
  });
}

function goToStep(stepNum) {
  state.currentStep = stepNum;
  
  // Update Stepper UI
  DOM.stepIndicators.forEach(indicator => {
    const step = parseInt(indicator.getAttribute('data-step'), 10);
    if (step <= stepNum) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  });

  // Update Sections Visibility
  DOM.sections.forEach(section => {
    section.classList.remove('active');
  });
  
  let targetSection;
  if (stepNum === 1) targetSection = document.getElementById('section-roster');
  if (stepNum === 2) targetSection = document.getElementById('section-seats');
  if (stepNum === 3) targetSection = document.getElementById('section-draw');
  
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Refresh Grid structures based on steps
  if (stepNum === 2) {
    renderSetupGrid();
  } else if (stepNum === 3) {
    renderResultGrid();
  }
}

// Confirmation Modal Promise wrapper
let modalResolveCallback = null;
function showConfirmation(message) {
  return new Promise((resolve) => {
    DOM.modalConfirmMsg.textContent = message;
    DOM.modalConfirm.classList.add('show');
    modalResolveCallback = resolve;
  });
}

function closeModal(approved) {
  DOM.modalConfirm.classList.remove('show');
  if (modalResolveCallback) {
    modalResolveCallback(approved);
    modalResolveCallback = null;
  }
}

DOM.btnModalOk.addEventListener('click', () => closeModal(true));
DOM.btnModalCancel.addEventListener('click', () => closeModal(false));
DOM.btnCloseModal.addEventListener('click', () => closeModal(false));

// Theme & Sound setup
function setupThemeAndSound() {
  // Apply loaded settings
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
  updateSoundIcon();

  DOM.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState(STORAGE_KEYS.THEME, state.theme);
    updateThemeIcon();
  });

  DOM.soundToggle.addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    saveState(STORAGE_KEYS.SOUND, state.soundOn);
    updateSoundIcon();
  });
}

function updateThemeIcon() {
  const icon = DOM.themeToggle.querySelector('i');
  if (state.theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

function updateSoundIcon() {
  const icon = DOM.soundToggle.querySelector('i');
  if (state.soundOn) {
    icon.className = 'fa-solid fa-volume-high';
  } else {
    icon.className = 'fa-solid fa-volume-xmark';
  }
}

// ==========================================================================
// 4. Roster Controller (Step 1)
// ==========================================================================

function setupRosterEvents() {
  DOM.btnAddStudent.addEventListener('click', addSingleStudent);
  DOM.singleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSingleStudent();
  });
  DOM.btnImportBulk.addEventListener('click', importBulkStudents);
  DOM.btnClearRoster.addEventListener('click', clearRoster);
}

function updateRosterUI() {
  DOM.studentCount.textContent = state.roster.length;
  DOM.rosterCountStat.textContent = state.roster.length;

  if (state.roster.length === 0) {
    DOM.studentBadges.innerHTML = `
      <div class="empty-list-placeholder">
        <i class="fa-solid fa-user-slash"></i>
        <p>등록된 학생이 없습니다. 이름을 추가해주세요.</p>
      </div>
    `;
    return;
  }

  DOM.studentBadges.innerHTML = '';
  state.roster.forEach((student, index) => {
    const badge = document.createElement('div');
    badge.className = 'student-badge';
    badge.innerHTML = `
      <span>${student}</span>
      <i class="fa-solid fa-circle-xmark btn-remove-student" data-index="${index}" title="삭제"></i>
    `;
    DOM.studentBadges.appendChild(badge);
  });

  // Attach delete handlers
  DOM.studentBadges.querySelectorAll('.btn-remove-student').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'), 10);
      removeStudent(index);
    });
  });

  validateSeatCapacity();
}

function addSingleStudent() {
  const name = DOM.singleInput.value.trim();
  if (!name) return;

  if (state.roster.includes(name)) {
    alert('이미 등록된 이름입니다.');
    return;
  }

  state.roster.push(name);
  saveState(STORAGE_KEYS.ROSTER, state.roster);
  updateRosterUI();
  DOM.singleInput.value = '';
  DOM.singleInput.focus();
  AudioSynth.playTick();
}

function importBulkStudents() {
  const rawText = DOM.bulkInput.value.trim();
  if (!rawText) return;

  // Split by comma or newlines
  const parsedNames = rawText
    .split(/[\n,]+/)
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (parsedNames.length === 0) return;

  const duplicates = [];
  const added = [];

  parsedNames.forEach(name => {
    if (state.roster.includes(name) || added.includes(name)) {
      duplicates.push(name);
    } else {
      added.push(name);
    }
  });

  state.roster = [...state.roster, ...added];
  saveState(STORAGE_KEYS.ROSTER, state.roster);
  updateRosterUI();
  DOM.bulkInput.value = '';
  
  if (added.length > 0) {
    AudioSynth.playSuccess();
  }

  if (duplicates.length > 0) {
    alert(`${added.length}명의 학생이 추가되었습니다.\n중복 이름 제외: ${duplicates.join(', ')}`);
  } else {
    alert(`${added.length}명의 학생이 성공적으로 추가되었습니다.`);
  }
}

async function removeStudent(index) {
  if (Object.keys(state.assignments).length > 0) {
    const confirm = await showConfirmation('배치 결과가 초기화됩니다. 계속 진행하시겠습니까?');
    if (!confirm) return;
    state.assignments = {};
    saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
  }

  state.roster.splice(index, 1);
  saveState(STORAGE_KEYS.ROSTER, state.roster);
  updateRosterUI();
  AudioSynth.playReset();
}

async function clearRoster() {
  if (state.roster.length === 0) return;
  
  const confirm = await showConfirmation('전체 학생 명렬과 기존 배치 데이터가 모두 지워집니다. 정말 초기화하시겠습니까?');
  if (!confirm) return;

  state.roster = [];
  state.assignments = {};
  saveState(STORAGE_KEYS.ROSTER, state.roster);
  saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
  updateRosterUI();
  AudioSynth.playReset();
}

// ==========================================================================
// 5. Classroom Setup Controller (Step 2)
// ==========================================================================

function setupGridEvents() {
  DOM.btnApplyGrid.addEventListener('click', async () => {
    if (Object.keys(state.assignments).length > 0) {
      const confirm = await showConfirmation('격자를 재구성하면 기존 배치 정보가 사라집니다. 적용하시겠습니까?');
      if (!confirm) return;
      state.assignments = {};
      saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
    }

    const r = parseInt(DOM.inputRows.value, 10);
    const c = parseInt(DOM.inputCols.value, 10);
    
    if (isNaN(r) || r < 1 || r > 15 || isNaN(c) || c < 1 || c > 15) {
      alert('행과 열의 개수는 1에서 15 사이여야 합니다.');
      return;
    }

    state.rows = r;
    state.cols = c;
    state.disabledSeats = []; // Reset disabled seats on grid recreate
    
    saveState(STORAGE_KEYS.ROWS, state.rows);
    saveState(STORAGE_KEYS.COLS, state.cols);
    saveState(STORAGE_KEYS.DISABLED_SEATS, state.disabledSeats);
    
    renderSetupGrid();
    AudioSynth.playSuccess();
  });
}

function getActiveSeatsCount() {
  const total = state.rows * state.cols;
  return total - state.disabledSeats.length;
}

function validateSeatCapacity() {
  const activeSeats = getActiveSeatsCount();
  const studentCount = state.roster.length;
  
  DOM.totalSeatsCount.textContent = state.rows * state.cols;
  DOM.disabledSeatsCount.textContent = state.disabledSeats.length;
  DOM.activeSeatsCount.textContent = activeSeats;

  if (activeSeats < studentCount) {
    DOM.seatWarningMsg.classList.remove('hide');
    DOM.warnActiveSeats.textContent = activeSeats;
    DOM.warnStudents.textContent = studentCount;
    DOM.btnGoToDraw.disabled = true;
  } else {
    DOM.seatWarningMsg.classList.add('hide');
    DOM.btnGoToDraw.disabled = false;
  }
}

function showWarningAlert() {
  alert(`사용가능한 좌석(${getActiveSeatsCount()}개)이 학생 수(${state.roster.length}명)보다 부족합니다! 좌석 배치를 넓히거나 비활성화 좌석을 해제해주세요.`);
}

function renderSetupGrid() {
  // Sync grid columns custom variable
  document.documentElement.style.setProperty('--cols', state.cols);
  DOM.seatSetupGrid.innerHTML = '';

  for (let r = 1; r <= state.rows; r++) {
    for (let c = 1; c <= state.cols; c++) {
      const seatId = `${r}-${c}`;
      const cell = document.createElement('div');
      const isDisabled = state.disabledSeats.includes(seatId);
      
      cell.className = `seat-cell ${isDisabled ? 'disabled' : ''}`;
      cell.dataset.seatId = seatId;
      
      cell.innerHTML = `
        <span class="seat-label">${r}-${c}</span>
        <div class="seat-content"></div>
      `;
      
      cell.addEventListener('click', async () => {
        if (Object.keys(state.assignments).length > 0) {
          const confirm = await showConfirmation('좌석 활성화 상태를 변경하면 기존 배치 결과가 리셋됩니다. 계속하시겠습니까?');
          if (!confirm) return;
          state.assignments = {};
          saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
        }

        const index = state.disabledSeats.indexOf(seatId);
        if (index > -1) {
          state.disabledSeats.splice(index, 1);
          cell.classList.remove('disabled');
        } else {
          state.disabledSeats.push(seatId);
          cell.classList.add('disabled');
        }
        
        saveState(STORAGE_KEYS.DISABLED_SEATS, state.disabledSeats);
        validateSeatCapacity();
        AudioSynth.playTick();
      });

      DOM.seatSetupGrid.appendChild(cell);
    }
  }

  // Update statistics values
  DOM.inputRows.value = state.rows;
  DOM.inputCols.value = state.cols;
  validateSeatCapacity();
}

// ==========================================================================
// 6. Draw Controller & Algorithms (Step 3)
// ==========================================================================

function setupDrawEvents() {
  // Setup Drawing Mode Tabs
  DOM.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      switchDrawMode(mode);
    });
  });

  // Mode Actions
  DOM.btnDrawRandom.addEventListener('click', runRandomDraw);
  DOM.btnResetDrawing.addEventListener('click', resetAssignments);
  DOM.btnDrawRouletteAuto.addEventListener('click', runAutoRouletteDraw);
  
  DOM.btnDrawCardSetup.addEventListener('click', setupCardDrawing);
  DOM.btnDrawCardRevealAll.addEventListener('click', revealAllCards);

  // Export Events
  DOM.btnExportImage.addEventListener('click', exportGridToImage);
  DOM.btnCopyClipboard.addEventListener('click', copyResultsToClipboard);
  DOM.btnPrint.addEventListener('click', () => window.print());
}

function switchDrawMode(mode) {
  state.currentMode = mode;
  
  DOM.modeTabs.forEach(t => t.classList.remove('active'));
  DOM.modePanels.forEach(p => p.classList.remove('active'));

  const activeTab = document.querySelector(`.mode-tab[data-mode="${mode}"]`);
  if (activeTab) activeTab.classList.add('active');

  const activePanel = document.getElementById(`panel-${mode}`);
  if (activePanel) activePanel.classList.add('active');

  // Redraw grid according to mode
  renderResultGrid();
}

// Helper: Get active unassigned seat IDs
function getActiveSeats() {
  const active = [];
  for (let r = 1; r <= state.rows; r++) {
    for (let c = 1; c <= state.cols; c++) {
      const id = `${r}-${c}`;
      if (!state.disabledSeats.includes(id)) {
        active.push(id);
      }
    }
  }
  return active;
}

// Helper: Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Draw Mode 1: Random Shuffle Allocation
function runRandomDraw() {
  const activeSeats = getActiveSeats();
  
  if (activeSeats.length < state.roster.length) {
    alert('사용 가능 좌석 수가 부족합니다.');
    return;
  }

  // Shuffle roster and assign
  const shuffledRoster = shuffle(state.roster);
  const shuffledSeats = shuffle(activeSeats);

  state.assignments = {};
  shuffledRoster.forEach((student, index) => {
    const seatId = shuffledSeats[index];
    state.assignments[seatId] = student;
  });

  saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
  renderResultGrid();
  
  // Celebrate
  AudioSynth.playSuccess();
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 }
  });
}

// Reset assignments
async function resetAssignments() {
  if (Object.keys(state.assignments).length === 0) return;

  const confirm = await showConfirmation('모든 배치 결과가 초기화됩니다. 정말 초기화하시겠습니까?');
  if (!confirm) return;

  state.assignments = {};
  saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
  renderResultGrid();
  AudioSynth.playReset();
}

// Draw Mode 2: Roulette draw
let rouletteInProgress = false;

function setupRouletteClickHandlers() {
  const cells = DOM.seatResultGrid.querySelectorAll('.seat-cell:not(.disabled)');
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      if (state.currentMode !== 'roulette') return;
      if (rouletteInProgress) return;
      
      const seatId = cell.dataset.seatId;
      
      // If already assigned, clear it
      if (state.assignments[seatId]) {
        delete state.assignments[seatId];
        saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
        renderResultGrid();
        AudioSynth.playReset();
        return;
      }

      // Check if all roster are already assigned
      const assignedStudents = Object.values(state.assignments);
      const remainingStudents = state.roster.filter(s => !assignedStudents.includes(s));
      
      if (remainingStudents.length === 0) {
        alert('모든 학생이 이미 배치되었습니다.');
        return;
      }

      runSingleRouletteDraw(seatId, remainingStudents);
    });
  });
}

function runSingleRouletteDraw(seatId, remainingStudents) {
  rouletteInProgress = true;
  DOM.rouletteTargetSeatLabel.textContent = `좌석: [${seatId}]`;
  DOM.rouletteOverlay.classList.add('show');
  
  // Prepare wheel contents
  const wheel = DOM.rouletteNamesWrapper;
  wheel.innerHTML = '';
  
  // Create randomized list repeating names for rolling effect
  const pool = shuffle(remainingStudents);
  const items = [];
  const rotationsCount = 4; // Scroll iterations
  
  for (let r = 0; r < rotationsCount; r++) {
    pool.forEach(name => {
      items.push(name);
    });
  }

  // Draw list
  items.forEach(name => {
    const el = document.createElement('div');
    el.className = 'roulette-name-item';
    el.textContent = name;
    wheel.appendChild(el);
  });

  // Calculate destination index (end near the middle of the last pool repetition)
  const itemHeight = 60; // 60px height of items
  const winnerIndex = (rotationsCount - 1) * pool.length + Math.floor(Math.random() * pool.length);
  const winnerName = items[winnerIndex];
  
  // Animation settings
  let currentY = 0;
  const targetY = -(winnerIndex * itemHeight - 30); // 30px offsets for alignment
  let speed = 45; // Initial pixels per tick
  const deceleration = 0.96; // Deceleration rate
  const minSpeed = 0.5;

  let audioTickTimer = 0;

  function spinTick() {
    currentY -= speed;
    speed *= deceleration;

    // Trigger tick sound periodically as list rolls
    audioTickTimer += speed;
    if (audioTickTimer > itemHeight) {
      AudioSynth.playTick();
      audioTickTimer = 0;
    }

    if (speed < minSpeed) {
      // Finished
      wheel.style.transform = `translateY(${targetY}px)`;
      
      setTimeout(() => {
        state.assignments[seatId] = winnerName;
        saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
        
        DOM.rouletteOverlay.classList.remove('show');
        renderResultGrid();
        AudioSynth.playSuccess();
        
        rouletteInProgress = false;
      }, 500);
    } else {
      wheel.style.transform = `translateY(${currentY}px)`;
      requestAnimationFrame(spinTick);
    }
  }

  // Start spinner
  requestAnimationFrame(spinTick);
}

// Auto draw remaining seats in sequence using Roulette
async function runAutoRouletteDraw() {
  if (rouletteInProgress) return;
  
  const activeSeats = getActiveSeats();
  const unassignedSeats = activeSeats.filter(id => !state.assignments[id]);
  const assignedStudents = Object.values(state.assignments);
  const remainingStudents = state.roster.filter(s => !assignedStudents.includes(s));

  if (remainingStudents.length === 0) {
    alert('더 배치할 학생이 없습니다.');
    return;
  }

  if (unassignedSeats.length === 0) {
    alert('비어있는 자리가 없습니다.');
    return;
  }

  // Pick first empty seat and student
  const seatId = unassignedSeats[0];
  runSingleRouletteDraw(seatId, remainingStudents);
}

// Draw Mode 3: Card Flipping Layout
let isCardLayoutActive = false;

function setupCardDrawing() {
  const activeSeats = getActiveSeats();
  if (activeSeats.length < state.roster.length) {
    alert('사용 가능 좌석 수가 부족합니다.');
    return;
  }

  // Preset assignments randomly but keep them hidden!
  const shuffledRoster = shuffle(state.roster);
  const shuffledSeats = shuffle(activeSeats);

  state.assignments = {};
  shuffledRoster.forEach((student, index) => {
    const seatId = shuffledSeats[index];
    state.assignments[seatId] = student;
  });

  saveState(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
  isCardLayoutActive = true;
  
  renderResultGrid();
  AudioSynth.playSuccess();
}

function revealAllCards() {
  if (!isCardLayoutActive) return;
  const cards = DOM.seatResultGrid.querySelectorAll('.seat-card-container');
  cards.forEach(card => {
    card.classList.add('flipped');
  });
  AudioSynth.playSuccess();
}

// ==========================================================================
// 7. Grid Renderer (Step 3 Output)
// ==========================================================================

function renderResultGrid() {
  document.documentElement.style.setProperty('--cols', state.cols);
  DOM.seatResultGrid.innerHTML = '';

  const activeSeats = getActiveSeats();
  const assignedStudents = Object.values(state.assignments);
  
  // Decide export panel visibility
  if (assignedStudents.length > 0) {
    DOM.exportControls.classList.remove('hide');
  } else {
    DOM.exportControls.classList.add('hide');
  }

  // Handle Card UI mode
  if (state.currentMode === 'card' && isCardLayoutActive) {
    DOM.btnDrawCardRevealAll.classList.remove('hide');
    
    for (let r = 1; r <= state.rows; r++) {
      for (let c = 1; c <= state.cols; c++) {
        const seatId = `${r}-${c}`;
        const cell = document.createElement('div');
        const isDisabled = state.disabledSeats.includes(seatId);
        
        if (isDisabled) {
          cell.className = 'seat-cell disabled';
          cell.innerHTML = `
            <span class="seat-label">${r}-${c}</span>
            <div class="seat-content"></div>
          `;
          DOM.seatResultGrid.appendChild(cell);
        } else {
          // Render Card Container
          const cardContainer = document.createElement('div');
          cardContainer.className = 'seat-card-container';
          cardContainer.dataset.seatId = seatId;
          
          const studentName = state.assignments[seatId] || '';
          
          cardContainer.innerHTML = `
            <div class="card-inner">
              <div class="card-front">
                <span class="seat-label">${r}-${c}</span>
                <i class="fa-solid fa-question"></i>
              </div>
              <div class="card-back">
                <span class="seat-label">${r}-${c}</span>
                <div class="seat-content">${studentName}</div>
              </div>
            </div>
          `;

          // If result was loaded from storage and already assigned, we reveal it
          if (studentName) {
            // Check if card is flipped (let's assume default not flipped unless clicked or reveal all)
          }

          cardContainer.addEventListener('click', () => {
            if (cardContainer.classList.contains('flipped')) return;
            cardContainer.classList.add('flipped');
            AudioSynth.playFlip();
          });

          DOM.seatResultGrid.appendChild(cardContainer);
        }
      }
    }
    return;
  }

  // Normal Layout / Roulette Layout
  DOM.btnDrawCardRevealAll.classList.add('hide');
  isCardLayoutActive = false;

  for (let r = 1; r <= state.rows; r++) {
    for (let c = 1; c <= state.cols; c++) {
      const seatId = `${r}-${c}`;
      const cell = document.createElement('div');
      const isDisabled = state.disabledSeats.includes(seatId);
      const studentName = state.assignments[seatId];
      
      cell.className = `seat-cell ${isDisabled ? 'disabled' : ''} ${studentName ? 'assigned' : ''}`;
      cell.dataset.seatId = seatId;
      
      cell.innerHTML = `
        <span class="seat-label">${r}-${c}</span>
        <div class="seat-content">${studentName || ''}</div>
      `;
      
      DOM.seatResultGrid.appendChild(cell);
    }
  }

  if (state.currentMode === 'roulette') {
    setupRouletteClickHandlers();
  }
}

// ==========================================================================
// 8. Export Utilities
// ==========================================================================

function exportGridToImage() {
  const target = document.getElementById('result-board');
  
  // Set temporary styling for beautiful capture
  const originalBackground = target.style.background;
  const originalPadding = target.style.padding;
  
  target.style.background = 'var(--bg-primary)';
  target.style.padding = '40px 24px';
  
  html2canvas(target, {
    scale: 2, // Double scale for HD output
    backgroundColor: null,
    useCORS: true
  }).then(canvas => {
    // Restore styling
    target.style.background = originalBackground;
    target.style.padding = originalPadding;
    
    // Create download link
    const link = document.createElement('a');
    link.download = `학급자리배치_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    AudioSynth.playSuccess();
  }).catch(err => {
    console.error('Image capture failed:', err);
    alert('이미지 저장 중 오류가 발생했습니다.');
  });
}

function copyResultsToClipboard() {
  let textOutput = `[학급 자리 배치 결과]\n작성일: ${new Date().toLocaleDateString()}\n\n`;
  
  for (let r = 1; r <= state.rows; r++) {
    let rowText = [];
    for (let c = 1; c <= state.cols; c++) {
      const seatId = `${r}-${c}`;
      if (state.disabledSeats.includes(seatId)) {
        rowText.push('[  빈자리  ]');
      } else {
        const student = state.assignments[seatId];
        rowText.push(`[${student ? student.padEnd(4, ' ') : '   미정   '}]`);
      }
    }
    textOutput += `줄 ${r}: ${rowText.join('  ')}\n`;
  }
  
  navigator.clipboard.writeText(textOutput).then(() => {
    alert('배치 결과가 클립보드에 복사되었습니다.');
    AudioSynth.playSuccess();
  }).catch(err => {
    console.error('Failed to copy text:', err);
    alert('복사 중 오류가 발생했습니다.');
  });
}

// ==========================================================================
// 9. App Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupThemeAndSound();
  setupNavigation();
  setupRosterEvents();
  setupGridEvents();
  setupDrawEvents();
  
  // Initial updates
  updateRosterUI();
});
