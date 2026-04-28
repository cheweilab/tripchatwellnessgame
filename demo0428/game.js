const screens = {
  start: document.getElementById('startScreen'),
  setup: document.getElementById('setupScreen'),
  game: document.getElementById('gameScreen'),
  end: document.getElementById('endScreen'),
};

const el = {
  startBtn: document.getElementById('startBtn'),
  restartBtn: document.getElementById('restartBtn'),
  clientName: document.getElementById('clientName'),
  clientRequest: document.getElementById('clientRequest'),
  clientHint: document.getElementById('clientHint'),
  setupClientImage: document.getElementById('setupClientImage'),
  clientImage: document.getElementById('clientImage'),
  timerText: document.getElementById('timerText'),
  relaxBar: document.getElementById('relaxBar'),
  puppetBar: document.getElementById('puppetBar'),
  stateLabel: document.getElementById('stateLabel'),
  captionText: document.getElementById('captionText'),
  sequenceDisplay: document.getElementById('sequenceDisplay'),
  feedbackText: document.getElementById('feedbackText'),
  endImage: document.getElementById('endImage'),
  endTitle: document.getElementById('endTitle'),
  endMessage: document.getElementById('endMessage'),
  endStats: document.getElementById('endStats'),
};

const arrowMap = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};
const keys = Object.keys(arrowMap);

const clients = [
  {
    name: '疲憊上班族',
    request: '「肩頸很緊，今天想好好放鬆。」',
    hint: '穩定操作比速度重要。',
    tolerance: 1.0,
    baseDrain: 1.0,
    captions: {
      neutral: '客人看起來有點疲憊，正在等你開始。',
      tense: '他皺了一下眉，好像力道不太對。',
      relaxing: '呼吸慢下來了，肩膀放鬆了一點。',
      overwhelmed: '房間變得安靜，他的眼神有點空。',
      puppet: '木偶線從天花板落下，他不再像人一樣動。'
    }
  },
  {
    name: '失眠客人',
    request: '「我已經幾天沒睡好了……請不要太用力。」',
    hint: '他比較敏感，錯誤會更危險。',
    tolerance: 0.82,
    baseDrain: 1.15,
    captions: {
      neutral: '他的眼睛很累，但一直盯著天花板。',
      tense: '他突然吸了一口氣，手指抓緊床單。',
      relaxing: '他的眼皮慢慢垂下，像終於能休息。',
      overwhelmed: '他低聲說：「不要讓我睡著……」',
      puppet: '他睜開眼，瞳孔像被細線拉住。'
    }
  },
  {
    name: '奇怪的預約',
    request: '「不管發生什麼，都不要停。」',
    hint: '高風險客人：放鬆快，但木偶值也升得快。',
    tolerance: 0.72,
    baseDrain: 1.35,
    captions: {
      neutral: '他笑得太安靜，好像早就知道結果。',
      tense: '他沒有喊痛，只是問：「你聽到線的聲音嗎？」',
      relaxing: '他說舒服，但鏡子裡的表情沒有變。',
      overwhelmed: '背景音樂開始走調，他卻叫你繼續。',
      puppet: '他坐了起來，動作一格一格，像被人操控。'
    }
  }
];

const stateImages = {
  neutral: 'assets/client_normal.svg',
  tense: 'assets/client_tense.svg',
  relaxing: 'assets/client_relaxed.svg',
  overwhelmed: 'assets/client_overwhelmed.svg',
  puppet: 'assets/client_puppet.svg',
};

let game = {};
let timerInterval = null;
let tensionInterval = null;
let audioContext = null;

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function pickClient() {
  return clients[Math.floor(Math.random() * clients.length)];
}

function resetGame() {
  clearInterval(timerInterval);
  clearInterval(tensionInterval);
  game = {
    client: pickClient(),
    oil: null,
    timeLeft: 30,
    relaxation: 0,
    puppet: 0,
    score: 0,
    wrong: 0,
    combo: 0,
    sequence: [],
    index: 0,
    state: 'neutral',
    running: false,
    ended: false,
  };
  document.body.classList.remove('warning', 'panic');
}

function renderSetup() {
  el.clientName.textContent = game.client.name;
  el.clientRequest.textContent = game.client.request;
  el.clientHint.textContent = `提示：${game.client.hint}`;
  el.setupClientImage.src = stateImages.neutral;
}

function startSetup() {
  resetGame();
  renderSetup();
  showScreen('setup');
}

function chooseOil(oil) {
  game.oil = oil;
  startRound();
}

function startRound() {
  game.running = true;
  game.ended = false;
  generateSequence();
  updateState('neutral');
  renderAll();
  showScreen('game');
  playTone(220, 0.08, 0.03);

  timerInterval = setInterval(() => {
    if (!game.running) return;
    game.timeLeft -= 1;
    if (game.timeLeft <= 0) endGame('timeout');
    renderAll();
  }, 1000);

  tensionInterval = setInterval(() => {
    if (!game.running) return;
    const risk = game.client.baseDrain * (game.oil === 'strong' ? 1.25 : 0.82);
    game.puppet = clamp(game.puppet + risk, 0, 100);
    if (game.puppet > 42 && Math.random() < 0.18) glitchMoment();
    evaluateState();
    if (game.puppet >= 100) endGame('puppet');
    renderAll();
  }, 950);
}

function generateSequence() {
  const baseLength = 4 + Math.floor(game.score / 70);
  const length = clamp(baseLength, 4, 7);
  game.sequence = Array.from({ length }, () => keys[Math.floor(Math.random() * keys.length)]);
  game.index = 0;
}

function handleKey(code) {
  if (!game.running || !keys.includes(code)) return;
  const expected = game.sequence[game.index];
  if (code === expected) correctInput();
  else wrongInput();
  if (game.relaxation >= 100) endGame('win');
  if (game.puppet >= 100) endGame('puppet');
  renderAll();
}

function correctInput() {
  game.index += 1;
  game.combo += 1;
  const oilBonus = game.oil === 'strong' ? 1.2 : 0.9;
  game.relaxation = clamp(game.relaxation + (7 * oilBonus), 0, 100);
  game.puppet = clamp(game.puppet - 2, 0, 100);
  game.score += 10 + game.combo;
  feedback(game.combo >= 3 ? `連續成功 x${game.combo}` : '正確', 'good');
  playTone(420 + game.combo * 35, 0.06, 0.025);
  if (game.index >= game.sequence.length) {
    game.relaxation = clamp(game.relaxation + 12 * oilBonus, 0, 100);
    feedback('完成一組按摩流程！', 'good');
    generateSequence();
  }
  evaluateState();
}

function wrongInput() {
  game.wrong += 1;
  game.combo = 0;
  const oilPenalty = game.oil === 'strong' ? 1.35 : 0.9;
  const clientPenalty = 1 / game.client.tolerance;
  game.puppet = clamp(game.puppet + 14 * oilPenalty * clientPenalty, 0, 100);
  game.relaxation = clamp(game.relaxation - 4, 0, 100);
  feedback('力道不對，客人緊繃了。', 'bad');
  playTone(120, 0.12, 0.045);
  updateState('tense');
}

function evaluateState() {
  if (game.puppet >= 86) updateState('overwhelmed');
  else if (game.relaxation >= 62 && game.combo >= 2) updateState('relaxing');
  else if (game.puppet >= 45 || game.wrong >= 3) updateState('tense');
  else updateState('neutral');
}

function updateState(state) {
  game.state = state;
  el.clientImage.src = stateImages[state];
  el.clientImage.className = `client-image ${state}`;
  el.captionText.textContent = game.client.captions[state];
  el.stateLabel.textContent = state.toUpperCase();
}

function renderAll() {
  el.timerText.textContent = game.timeLeft;
  el.relaxBar.style.width = `${game.relaxation}%`;
  el.puppetBar.style.width = `${game.puppet}%`;
  renderSequence();

  document.body.classList.toggle('warning', game.puppet >= 45 && game.puppet < 75);
  document.body.classList.toggle('panic', game.puppet >= 75);
}

function renderSequence() {
  el.sequenceDisplay.innerHTML = '';
  game.sequence.forEach((key, i) => {
    const span = document.createElement('span');
    span.className = 'arrow';
    if (i < game.index) span.classList.add('done');
    if (i === game.index) span.classList.add('current');
    span.textContent = arrowMap[key];
    el.sequenceDisplay.appendChild(span);
  });
}

function feedback(text, type) {
  el.feedbackText.textContent = text;
  el.feedbackText.className = `feedback-text ${type}`;
}

function glitchMoment() {
  el.feedbackText.textContent = '燈閃了一下。你確定方向正確嗎？';
  el.feedbackText.className = 'feedback-text bad';
  playTone(80, 0.08, 0.03);
}

function endGame(reason) {
  if (game.ended) return;
  game.ended = true;
  game.running = false;
  clearInterval(timerInterval);
  clearInterval(tensionInterval);
  document.body.classList.remove('warning', 'panic');

  if (reason === 'win') {
    el.endImage.src = stateImages.relaxing;
    el.endTitle.textContent = '挑戰成功';
    el.endMessage.textContent = '客人的呼吸慢了下來。這次夜班，平安結束。';
    playTone(620, 0.16, 0.04);
  } else if (reason === 'timeout') {
    el.endImage.src = stateImages.overwhelmed;
    el.endTitle.textContent = '中立結局';
    el.endMessage.textContent = '時間到了。客人沒有完全放鬆，但你也沒有被線拉走。';
    playTone(210, 0.18, 0.04);
  } else {
    el.endImage.src = stateImages.puppet;
    el.endTitle.textContent = '木偶結局';
    el.endMessage.textContent = '木偶值滿格。線從天花板落下，你聽見自己關節發出喀的一聲。';
    playTone(90, 0.28, 0.06);
  }

  el.endStats.innerHTML = `
    <div>放鬆值：${Math.round(game.relaxation)}%</div>
    <div>木偶值：${Math.round(game.puppet)}%</div>
    <div>分數：${game.score}</div>
  `;
  showScreen('end');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function playTone(freq, duration, volume) {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Audio is optional; ignore browser restrictions.
  }
}

el.startBtn.addEventListener('click', startSetup);
el.restartBtn.addEventListener('click', startSetup);
document.querySelectorAll('.oil-btn').forEach(btn => {
  btn.addEventListener('click', () => chooseOil(btn.dataset.oil));
});
document.querySelectorAll('.touch-controls button').forEach(btn => {
  btn.addEventListener('click', () => handleKey(btn.dataset.key));
});
window.addEventListener('keydown', e => {
  if (keys.includes(e.code)) {
    e.preventDefault();
    handleKey(e.code);
  }
});

resetGame();
