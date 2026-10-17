// ================================
// 🎭 CHARADES — CUSTOM DECKS V5
// ================================

// 📚 MASSIVE BUILT-IN DECKS
const DEFAULT_DECKS = {
  movies: ["Titanic", "Inception", "The Matrix", "Avatar", "Interstellar", "Joker", "Frozen", "Lion King", "Avengers", "Spider-Man", "Batman", "Iron Man", "Star Wars", "Harry Potter"],
  animals: ["Elephant", "Kangaroo", "Penguin", "Octopus", "Butterfly", "Crocodile", "Giraffe", "Dolphin", "Hedgehog", "Peacock", "Sloth", "Chameleon", "Flamingo", "Raccoon"],
  actions: ["Jumping", "Sleeping", "Running", "Swimming", "Dancing", "Sneezing", "Yawning", "Crying", "Laughing", "Skipping", "Whistling", "Snoring", "Stretching", "Crawling"],
  bollywood: ["Sholay", "DDLJ", "3 Idiots", "Lagaan", "Dangal", "PK", "Gully Boy", "Andhadhun", "Bahubali", "Queen", "Padmaavat", "Barfi", "ZNMD", "Rockstar"],
  vlsi: ["Moore's Law", "CMOS Inverter", "FinFET", "Bandgap", "Transistor", "Logic Gate", "Flip-Flop", "Multiplexer", "ALU", "Cache Memory", "Pipelining", "Threshold Voltage", "Doping", "Wafer"],
  food: ["Pizza", "Sushi", "Burger", "Pasta", "Biryani", "Tacos", "Ice Cream", "Chocolate", "Samosa", "Dosa", "Pav Bhaji", "Paneer Tikka", "Momos", "Noodles"],
  brands: ["Apple", "Nike", "Samsung", "Sony", "Coca-Cola", "Adidas", "Puma", "Tesla", "McDonald's", "Starbucks", "Gucci", "Ferrari", "Rolex", "Amazon"],
  anime: ["Naruto", "Dragon Ball Z", "One Piece", "Attack on Titan", "Death Note", "Demon Slayer", "Jujutsu Kaisen", "My Hero Academia", "Pokemon", "Doraemon", "Shinchan", "Spy x Family"],
  tech: ["ChatGPT", "Blockchain", "Quantum Computing", "Machine Learning", "Cloud", "Algorithm", "Database", "API", "Bug", "Server", "RAM", "GPU", "Wi-Fi", "Bluetooth"],
  places: ["Eiffel Tower", "Taj Mahal", "Statue of Liberty", "Great Wall of China", "Pyramids", "Colosseum", "Machu Picchu", "Big Ben", "Burj Khalifa", "Times Square", "Gateway of India"],
  celebrities: ["Shah Rukh Khan", "Virat Kohli", "Elon Musk", "Taylor Swift", "Cristiano Ronaldo", "Amitabh Bachchan", "Deepika Padukone", "Robert Downey Jr.", "Lionel Messi", "Priyanka Chopra", "MS Dhoni", "Selena Gomez"]
};

let DECKS = {};

// Load custom decks from localStorage
function loadDecks() {
  const customDecks = JSON.parse(localStorage.getItem("charades_custom_decks")) || {};
  DECKS = { ...DEFAULT_DECKS, ...customDecks };
  populateDropdown();
}

function populateDropdown() {
  els.category.innerHTML = ""; // Clear current
  Object.keys(DECKS).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    // Capitalize first letter and replace underscores
    let displayName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    if (key.startsWith("custom_")) displayName = "⭐ " + displayName.replace("Custom ", "");
    option.textContent = displayName;
    els.category.appendChild(option);
  });
}

// ================================
// 🎯 GAME STATE
// ================================
let state = {
  category: "movies", timeLimit: 60, timeLeft: 60, score: 0,
  currentWord: "", usedWords: [], history: [], timerInterval: null,
  isPlaying: false, motionEnabled: false, lastTiltTime: 0, baselineBeta: 0
};

// ================================
// 🎯 DOM ELEMENTS
// ================================
const screens = { 
  home: document.getElementById("home"), 
  createDeck: document.getElementById("createDeck"),
  countdown: document.getElementById("countdown"), 
  game: document.getElementById("game"), 
  result: document.getElementById("result") 
};

const els = {
  category: document.getElementById("category"), timeLimit: document.getElementById("timeLimit"),
  startBtn: document.getElementById("startBtn"), 
  createDeckBtn: document.getElementById("createDeckBtn"),
  saveDeckBtn: document.getElementById("saveDeckBtn"),
  backToHomeBtn: document.getElementById("backToHomeBtn"),
  customDeckName: document.getElementById("customDeckName"),
  customDeckWords: document.getElementById("customDeckWords"),
  permissionBtn: document.getElementById("permissionBtn"),
  permissionStatus: document.getElementById("permissionStatus"), countdownNum: document.getElementById("countdownNum"),
  timer: document.getElementById("timer"), scoreDisplay: document.getElementById("scoreDisplay"),
  currentWord: document.getElementById("currentWord"), wordCard: document.getElementById("wordCard"),
  finalScore: document.getElementById("finalScore"), wordHistory: document.getElementById("wordHistory"),
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

// ================================
// 🎯 TILT HANDLER
// ================================
function handleTilt(event) {
  if (event.beta === null) return;
  
  if (!state.isPlaying) { state.baselineBeta = event.beta; }

  const relativeBeta = event.beta - state.baselineBeta;

  if (!state.isPlaying) return;

  const now = Date.now();
  if (now - state.lastTiltTime < 1200) return;

  // SWAPPED LOGIC AS REQUESTED
  if (relativeBeta > 15) {
    state.lastTiltTime = now;
    triggerTilt("correct");
  }
  else if (relativeBeta < -15) {
    state.lastTiltTime = now;
    triggerTilt("skip");
  }
}

function triggerTilt(result) {
  els.wordCard.classList.remove("flash-guessed", "flash-pass");
  
  if (result === "correct") {
    els.wordCard.classList.add("flash-guessed"); 
    playCorrectSound();
  } else {
    els.wordCard.classList.add("flash-pass"); 
    playSkipSound();
  }
  
  setTimeout(() => { els.wordCard.classList.remove("flash-guessed", "flash-pass"); }, 300);
  if (navigator.vibrate) navigator.vibrate(result === "correct" ? 100 : [50, 50, 50]);
  handleAnswer(result);
}

// SOUNDS
function playCorrectSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }
function playSkipSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 220; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }

// ================================
// 🎯 CUSTOM DECK LOGIC
// ================================
els.createDeckBtn.addEventListener("click", () => {
  els.customDeckName.value = "";
  els.customDeckWords.value = "";
  showScreen("createDeck");
});

els.backToHomeBtn.addEventListener("click", () => showScreen("home"));

els.saveDeckBtn.addEventListener("click", () => {
  const name = els.customDeckName.value.trim();
  const wordsString = els.customDeckWords.value.trim();

  if (!name || !wordsString) {
    alert("Please enter both a name and some words!");
    return;
  }

  // Split by comma and clean up spaces
  const wordsArray = wordsString.split(",").map(w => w.trim()).filter(w => w !== "");

  if (wordsArray.length < 3) {
    alert("Please enter at least 3 words for a good game!");
    return;
  }

  // Create unique key (replace spaces with underscores)
  const deckKey = "custom_" + name.toLowerCase().replace(/\s+/g, "_");

  // Save to localStorage
  const customDecks = JSON.parse(localStorage.getItem("charades_custom_decks")) || {};
  customDecks[deckKey] = wordsArray;
  localStorage.setItem("charades_custom_decks", JSON.stringify(customDecks));

  // Reload decks and go home
  loadDecks();
  showScreen("home");
  
  // Auto-select the new deck
  els.category.value = deckKey;
  alert("Deck Saved! 🎉");
});

// ================================
// 🎯 GAME LOGIC
// ================================
function getRandomWord() {
  const deck = DECKS[state.category];
  if (!deck || deck.length === 0) return "No words!";
  
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

// Initialize on load
loadDecks();