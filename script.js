// ================================
// 🎭 CHARADES — FINAL LOGIC
// ================================

const DECKS = {
  movies: ["Titanic", "Inception", "The Matrix", "Avatar", "Interstellar", "Joker", "Frozen", "Lion King", "Avengers", "Spider-Man"],
  animals: ["Elephant", "Kangaroo", "Penguin", "Octopus", "Butterfly", "Crocodile", "Giraffe", "Dolphin", "Hedgehog", "Peacock"],
  actions: ["Jumping", "Sleeping", "Running", "Swimming", "Dancing", "Sneezing", "Yawning", "Crying", "Laughing", "Skipping"],
  bollywood: ["Sholay", "DDLJ", "3 Idiots", "Lagaan", "Dangal", "PK", "Gully Boy", "Andhadhun", "Bahubali", "Queen"],
  vlsi: ["Moore's Law", "CMOS Inverter", "FinFET", "Bandgap", "Transistor", "Logic Gate", "Flip-Flop", "Multiplexer", "ALU", "Chip"]
};

let state = {
  category: "movies", timeLimit: 60, timeLeft: 60, score: 0,
  currentWord: "", usedWords: [], history: [], timerInterval: null,
  isPlaying: false, motionEnabled: false, lastTiltTime: 0,
  baselineBeta: 0
};

const screens = { home: document.getElementById("home"), countdown: document.getElementById("countdown"), game: document.getElementById("game"), result: document.getElementById("result") };
const els = {
  category: document.getElementById("category"), timeLimit: document.getElementById("timeLimit"),
  startBtn: document.getElementById("startBtn"), permissionBtn: document.getElementById("permissionBtn"),
  permissionStatus: document.getElementById("permissionStatus"), countdownNum: document.getElementById("countdownNum"),
  timer: document.getElementById("timer"), scoreDisplay: document.getElementById("scoreDisplay"),
  currentWord: document.getElementById("currentWord"), wordCard: document.getElementById("wordCard"),
  finalScore: document.getElementById("finalScore"), wordHistory: document.getElementById("wordHistory"),
  restartBtn: document.getElementById("restartBtn"), debugText: document.getElementById("debugText")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// iOS PERMISSION
els.permissionBtn.addEventListener("click", async () => {
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === "granted") {
        state.motionEnabled = true;
        els.permissionStatus.textContent = "✅ Tilt enabled!";
        els.permissionStatus.style.color = "#00ffc8";
        window.addEventListener("deviceorientation", handleTilt);
      } else {
        els.permissionStatus.textContent = "❌ Permission denied";
      }
    } catch (err) { els.permissionStatus.textContent = "⚠️ Error: " + err.message; }
  } else {
    state.motionEnabled = true;
    els.permissionStatus.textContent = "✅ Tilt enabled (auto)!";
    els.permissionStatus.style.color = "#00ffc8";
    window.addEventListener("deviceorientation", handleTilt);
  }
});

// 🎯 TILT HANDLER
function handleTilt(event) {
  if (event.beta === null) return;
  
  // Update baseline if game hasn't started
  if (!state.isPlaying) {
    state.baselineBeta = event.beta;
  }

  const relativeBeta = event.beta - state.baselineBeta;

  // Debugger
  if (els.debugText) {
    els.debugText.textContent = `Raw: ${event.beta.toFixed(0)}° | Rel: ${relativeBeta.toFixed(0)}°`;
  }

  if (!state.isPlaying) return;

  const now = Date.now();
  if (now - state.lastTiltTime < 1200) return;

  // 🔥 THE RULES 🔥
  // ⬇️ TILT DOWN (Negative relative angle) = CORRECT
  if (relativeBeta > 15) {
    state.lastTiltTime = now;
    triggerTilt("correct");
  }
  // ⬆️ TILT UP (Positive relative angle) = SKIP
  else if (relativeBeta < -15) {
    state.lastTiltTime = now;
    triggerTilt("skip");
  }
}

// 🎯 TRIGGER TILT
function triggerTilt(result) {
  els.wordCard.classList.remove("flash-guessed", "flash-pass");
  
  if (result === "correct") {
    els.wordCard.classList.add("flash-guessed"); // Green
    playCorrectSound();
  } else {
    els.wordCard.classList.add("flash-pass"); // Red
    playSkipSound();
  }
  
  setTimeout(() => { els.wordCard.classList.remove("flash-guessed", "flash-pass"); }, 300);
  if (navigator.vibrate) navigator.vibrate(result === "correct" ? 100 : [50, 50, 50]);
  handleAnswer(result);
}

// SOUNDS
function playCorrectSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }
function playSkipSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 220; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }

// GAME LOGIC
function getRandomWord() {
  const deck = DECKS[state.category];
  const available = deck.filter(w => !state.usedWords.includes(w));
  if (available.length === 0) { state.usedWords = []; return deck[Math.floor(Math.random() * deck.length)]; }
  const word = available[Math.floor(Math.random() * available.length)];
  state.usedWords.push(word);
  return word;
}

function runCountdown() {
  showScreen("countdown");
  let count = 3;
  els.countdownNum.textContent = count;
  const interval = setInterval(() => {
    count--;
    if (count > 0) { els.countdownNum.textContent = count; } 
    else { clearInterval(interval); els.countdownNum.textContent = "GO!"; setTimeout(startGame, 500); }
  }, 1000);
}

function startGame() {
  state.timeLeft = state.timeLimit; state.score = 0; state.usedWords = []; state.history = []; state.isPlaying = true;
  els.timer.textContent = state.timeLeft;
  els.scoreDisplay.textContent = "Score: 0";
  els.currentWord.textContent = getRandomWord();
  showScreen("game");
  
  state.timerInterval = setInterval(() => {
    state.timeLeft--; els.timer.textContent = state.timeLeft;
    if (state.timeLeft <= 0) endGame();
  }, 1000);
}

function handleAnswer(result) {
  if (!state.isPlaying) return;
  state.history.push({ word: state.currentWord, result });
  if (result === "correct") { state.score++; els.scoreDisplay.textContent = "Score: " + state.score; }
  state.currentWord = getRandomWord();
  els.currentWord.textContent = state.currentWord;
}

function endGame() {
  state.isPlaying = false; clearInterval(state.timerInterval);
  els.finalScore.textContent = state.score;
  els.wordHistory.innerHTML = "";
  state.history.forEach(item => {
    const li = document.createElement("li");
    li.className = item.result;
    li.textContent = (item.result === "correct" ? "✅ " : "❌ ") + item.word;
    els.wordHistory.appendChild(li);
  });
  showScreen("result");
}

els.startBtn.addEventListener("click", () => {
  state.category = els.category.value;
  state.timeLimit = parseInt(els.timeLimit.value);
  runCountdown();
});
els.restartBtn.addEventListener("click", () => showScreen("home"));