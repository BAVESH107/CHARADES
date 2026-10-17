// ================================
// 🎭 CHARADES — TILT VERSION v2
// ================================

// 📚 WORD DECKS
const DECKS = {
  movies: [
    "Titanic", "Inception", "The Matrix", "Avatar",
    "Interstellar", "Joker", "Frozen", "Lion King",
    "Avengers", "Spider-Man", "Batman", "Iron Man",
    "Star Wars", "Harry Potter", "Jurassic Park",
    "Finding Nemo", "Toy Story", "Shrek", "Coco",
    "The Godfather"
  ],
  animals: [
    "Elephant", "Kangaroo", "Penguin", "Octopus",
    "Butterfly", "Crocodile", "Giraffe", "Dolphin",
    "Hedgehog", "Peacock", "Sloth", "Chameleon",
    "Flamingo", "Raccoon", "Cheetah", "Koala",
    "Ostrich", "Platypus", "Squirrel", "Walrus"
  ],
  actions: [
    "Jumping", "Sleeping", "Running", "Swimming",
    "Dancing", "Sneezing", "Yawning", "Crying",
    "Laughing", "Skipping", "Whistling", "Snoring",
    "Stretching", "Crawling", "Hiccupping", "Winking",
    "Flying", "Diving", "Climbing", "Sliding"
  ],
  bollywood: [
    "Sholay", "Dilwale Dulhania Le Jayenge", "3 Idiots",
    "Lagaan", "Dangal", "PK", "Gully Boy", "Andhadhun",
    "Bahubali", "Queen", "Padmaavat", "Barfi",
    "Zindagi Na Milegi Dobara", "Wake Up Sid",
    "Rockstar", "Tamasha", "Yeh Jawaani Hai Deewani",
    "Kabir Singh", "Article 15", "Uri"
  ],
  vlsi: [
    "Moore's Law", "CMOS Inverter", "FinFET", "Bandgap",
    "Transistor", "Logic Gate", "Flip-Flop", "Multiplexer",
    "Demultiplexer", "Shift Register", "Counter",
    "ALU", "Cache Memory", "Pipelining", "Clock Cycle",
    "Threshold Voltage", "Doping", "Photolithography",
    "Wafer", "Chip"
  ]
};

// ================================
// 🎯 GAME STATE
// ================================
let state = {
  category: "movies",
  timeLimit: 60,
  timeLeft: 60,
  score: 0,
  currentWord: "",
  usedWords: [],
  history: [],
  timerInterval: null,
  isPlaying: false,
  motionEnabled: false,
  lastTiltTime: 0
};

// ================================
// 🎯 DOM ELEMENTS
// ================================
const screens = {
  home: document.getElementById("home"),
  countdown: document.getElementById("countdown"),
  game: document.getElementById("game"),
  result: document.getElementById("result")
};

const els = {
  category: document.getElementById("category"),
  timeLimit: document.getElementById("timeLimit"),
  startBtn: document.getElementById("startBtn"),
  permissionBtn: document.getElementById("permissionBtn"),
  permissionStatus: document.getElementById("permissionStatus"),
  countdownNum: document.getElementById("countdownNum"),
  timer: document.getElementById("timer"),
  scoreDisplay: document.getElementById("scoreDisplay"),
  currentWord: document.getElementById("currentWord"),
  wordCard: document.getElementById("wordCard"),
  finalScore: document.getElementById("finalScore"),
  wordHistory: document.getElementById("wordHistory"),
  restartBtn: document.getElementById("restartBtn")
};

// ================================
// 🎯 SCREEN SWITCHER
// ================================
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ================================
// 🎯 iOS PERMISSION HANDLER
// ================================
els.permissionBtn.addEventListener("click", async () => {
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === "granted") {
        state.motionEnabled = true;
        els.permissionStatus.textContent = "✅ Tilt enabled!";
        els.permissionStatus.style.color = "#00ffc8";
        window.addEventListener("deviceorientation", handleTilt);
      } else {
        els.permissionStatus.textContent = "❌ Permission denied";
        els.permissionStatus.style.color = "#ff5555";
      }
    } catch (err) {
      els.permissionStatus.textContent = "⚠️ Error: " + err.message;
      els.permissionStatus.style.color = "#ff5555";
    }
  } else {
    state.motionEnabled = true;
    els.permissionStatus.textContent = "✅ Tilt enabled (auto)!";
    els.permissionStatus.style.color = "#00ffc8";
    window.addEventListener("deviceorientation", handleTilt);
  }
});

// ================================
// 🎯 TILT HANDLER
// ================================
function handleTilt(event) {
  if (!state.isPlaying) return;
  if (event.beta === null) return;

  const beta = event.beta;
  const now = Date.now();

  // Cooldown: 1.2 seconds
  if (now - state.lastTiltTime < 1200) return;

  // ⬆️ TILT UP (beta > 45°) = SKIP
  if (beta > 20) {
    state.lastTiltTime = now;
    triggerTilt("skip");
  }
  // ⬇️ TILT DOWN (beta < -25°) = CORRECT (more sensitive)
  else if (beta < -20) {
    state.lastTiltTime = now;
    triggerTilt("correct");
  }
}

// ================================
// 🎯 TRIGGER TILT ACTION
// ================================
function triggerTilt(result) {
  // 1. Add the correct CSS class (guessed=green, pass=red)
  if (result === "correct") {
    els.wordCard.classList.add("flash-guessed");
    playCorrectSound();
  } else {
    els.wordCard.classList.add("flash-pass");
    playSkipSound();
  }
  
  // 2. Remove it after 400ms
  setTimeout(() => {
    els.wordCard.classList.remove("flash-guessed", "flash-pass");
  }, 400);

  // 3. Vibration
  if (navigator.vibrate) {
    navigator.vibrate(result === "correct" ? 100 : [50, 50, 50]);
  }

  // 4. Update Score & Word
  handleAnswer(result);
}

// ================================
// 🎵 SOUND EFFECTS
// ================================
function playCorrectSound() {
  try {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
    osc.start(audio.currentTime);
    osc.stop(audio.currentTime + 0.2);
  } catch (e) { }
}

function playSkipSound() {
  try {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.value = 220;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
    osc.start(audio.currentTime);
    osc.stop(audio.currentTime + 0.2);
  } catch (e) { }
}

// ================================
// 🎯 GET RANDOM WORD
// ================================
function getRandomWord() {
  const deck = DECKS[state.category];
  const available = deck.filter(w => !state.usedWords.includes(w));

  if (available.length === 0) {
    state.usedWords = [];
    return deck[Math.floor(Math.random() * deck.length)];
  }

  const word = available[Math.floor(Math.random() * available.length)];
  state.usedWords.push(word);
  return word;
}

// ================================
// 🎯 COUNTDOWN
// ================================
function runCountdown() {
  showScreen("countdown");
  let count = 3;
  els.countdownNum.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      els.countdownNum.textContent = count;
    } else {
      clearInterval(interval);
      els.countdownNum.textContent = "GO!";
      setTimeout(startGame, 500);
    }
  }, 1000);
}

// ================================
// 🎯 START GAME
// ================================
function startGame() {
  state.timeLeft = state.timeLimit;
  state.score = 0;
  state.usedWords = [];
  state.history = [];
  state.isPlaying = true;

  els.timer.textContent = state.timeLeft;
  els.scoreDisplay.textContent = "Score: 0";
  els.currentWord.textContent = getRandomWord();

  showScreen("game");

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    els.timer.textContent = state.timeLeft;

    if (state.timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// ================================
// 🎯 HANDLE ANSWER
// ================================
function handleAnswer(result) {
  if (!state.isPlaying) return;

  state.history.push({ word: state.currentWord, result });

  if (result === "correct") {
    state.score++;
    els.scoreDisplay.textContent = "Score: " + state.score;
  }

  state.currentWord = getRandomWord();
  els.currentWord.textContent = state.currentWord;
}

// ================================
// 🎯 END GAME
// ================================
function endGame() {
  state.isPlaying = false;
  clearInterval(state.timerInterval);

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

// ================================
// 🎯 EVENT LISTENERS
// ================================
els.startBtn.addEventListener("click", () => {
  state.category = els.category.value;
  state.timeLimit = parseInt(els.timeLimit.value);
  runCountdown();
});

els.restartBtn.addEventListener("click", () => {
  showScreen("home");
});