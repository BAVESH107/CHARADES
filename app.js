// ================================
// 🎭 CHARADES — UI POLISH UPDATE
// ================================

const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE"; 
const SUPABASE_KEY = "YOUR_SUPABASE_KEY_HERE"; 
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let DECKS = {};

let state = {
  category: "", timeLimit: 60, timeLeft: 60, score: 0,
  currentWord: "", usedWords: [], history: [], timerInterval: null,
  isPlaying: false, motionEnabled: false, lastTiltTime: 0, baselineBeta: 0
};

const screens = { 
  home: document.getElementById("home"), 
  createDeck: document.getElementById("createDeck"),
  countdown: document.getElementById("countdown"), 
  game: document.getElementById("game"), 
  result: document.getElementById("result") 
};

const els = {
  category: document.getElementById("category"), 
  timeLimit: document.getElementById("timeLimit"),
  timeLimitGroup: document.getElementById("timeLimitGroup"),
  startBtn: document.getElementById("startBtn"), 
  createDeckBtn: document.getElementById("createDeckBtn"),
  syncBtn: document.getElementById("syncBtn"),
  saveDeckBtn: document.getElementById("saveDeckBtn"),
  backToHomeBtn: document.getElementById("backToHomeBtn"),
  customDeckName: document.getElementById("customDeckName"),
  customDeckWords: document.getElementById("customDeckWords"),
  wordCount: document.getElementById("wordCount"),
  permissionBtn: document.getElementById("permissionBtn"),
  permissionActive: document.getElementById("permissionActive"),
  countdownNum: document.getElementById("countdownNum"),
  timer: document.getElementById("timer"), scoreDisplay: document.getElementById("scoreDisplay"),
  currentWord: document.getElementById("currentWord"), wordCard: document.getElementById("wordCard"),
  finalScore: document.getElementById("finalScore"), wordHistory: document.getElementById("wordHistory"),
  restartBtn: document.getElementById("restartBtn")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ================================
// ⏱️ SEGMENTED TIMER LOGIC
// ================================
els.timeLimitGroup.addEventListener("click", (e) => {
  if (e.target.classList.contains("segment")) {
    // Remove active from all
    document.querySelectorAll(".segment").forEach(btn => btn.classList.remove("active"));
    // Add active to clicked
    e.target.classList.add("active");
    // Update hidden input
    els.timeLimit.value = e.target.dataset.value;
  }
});

// ================================
// 📝 WORD COUNTER FOR CREATE DECK
// ================================
els.customDeckWords.addEventListener("input", (e) => {
  const text = e.target.value.trim();
  if (!text) {
    els.wordCount.textContent = "0 words";
    return;
  }
  const words = text.split(",").filter(w => w.trim() !== "");
  els.wordCount.textContent = `${words.length} word${words.length !== 1 ? 's' : ''}`;
});

// ================================
// ☁️ FETCH DECKS
// ================================
async function loadCloudDecks() {
  try {
    els.category.innerHTML = "<option value=''>Loading...</option>";
    const { data, error } = await dbClient.from('decks').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    DECKS = {};
    if (data && data.length > 0) {
      data.forEach(deck => {
        const deckKey = `cloud_${deck.id}_${deck.name.toLowerCase().replace(/\s+/g, "_")}`;
        DECKS[deckKey] = deck.words;
      });
    }
    populateDropdown();
  } catch (error) {
    console.error("Error:", error);
    els.category.innerHTML = "<option value=''>Error loading decks</option>";
  }
}

function populateDropdown() {
  els.category.innerHTML = ""; 
  const keys = Object.keys(DECKS);
  
  if (keys.length === 0) {
    els.category.innerHTML = "<option value=''>No decks. Create one!</option>";
    return;
  }

  keys.forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    let displayName = key.split('_').slice(2).join(' ');
    displayName = displayName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    option.textContent = displayName;
    els.category.appendChild(option);
  });
}

// ================================
// ☁️ SAVE DECK
// ================================
els.saveDeckBtn.addEventListener("click", async () => {
  const name = els.customDeckName.value.trim();
  const wordsString = els.customDeckWords.value.trim();

  if (!name || !wordsString) { alert("Please enter a name and words!"); return; }
  const wordsArray = wordsString.split(",").map(w => w.trim()).filter(w => w !== "");
  if (wordsArray.length < 3) { alert("Please enter at least 3 words!"); return; }

  els.saveDeckBtn.textContent = "Saving...";
  els.saveDeckBtn.disabled = true;

  try {
    const { data, error } = await dbClient.from('decks').insert([{ name: name, words: wordsArray }]).select();
    if (error) throw error;

    await loadCloudDecks();
    showScreen("home");
    
    if (data && data.length > 0) {
      const newKey = `cloud_${data[0].id}_${data[0].name.toLowerCase().replace(/\s+/g, "_")}`;
      els.category.value = newKey;
    }
  } catch (error) {
    alert("Failed to save.");
  } finally {
    els.saveDeckBtn.textContent = "Save Deck";
    els.saveDeckBtn.disabled = false;
    els.customDeckWords.value = "";
    els.wordCount.textContent = "0 words";
  }
});

// ================================
// 🔄 SYNC DECKS
// ================================
els.syncBtn.addEventListener("click", async () => {
  const localDecks = JSON.parse(localStorage.getItem("charades_custom_decks")) || {};
  const keys = Object.keys(localDecks);

  if (keys.length === 0) { alert("No old decks to sync!"); return; }
  if (!confirm(`Upload ${keys.length} local decks to the cloud?`)) return;

  els.syncBtn.innerHTML = "Syncing...";
  els.syncBtn.disabled = true;
  let count = 0;

  for (const key of keys) {
    let name = key.replace("custom_", "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    try {
      const { error } = await dbClient.from('decks').insert([{ name: name, words: localDecks[key] }]);
      if (!error) count++;
    } catch (e) {}
  }

  localStorage.removeItem("charades_custom_decks");
  await loadCloudDecks();
  els.syncBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Sync decks';
  els.syncBtn.disabled = false;
  alert(`Synced ${count} decks!`);
});

// ================================
// 🎯 GAME LOGIC
// ================================
els.createDeckBtn.addEventListener("click", () => {
  els.customDeckName.value = "";
  els.customDeckWords.value = "";
  els.wordCount.textContent = "0 words";
  showScreen("createDeck");
});

els.backToHomeBtn.addEventListener("click", () => showScreen("home"));

els.permissionBtn.addEventListener("click", async () => {
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === "granted") {
        enableTilt();
      }
    } catch (err) { alert("Error: " + err.message); }
  } else {
    enableTilt();
  }
});

function enableTilt() {
  state.motionEnabled = true;
  els.permissionBtn.style.display = "none";
  els.permissionActive.style.display = "flex";
  window.addEventListener("deviceorientation", handleTilt);
}

function handleTilt(event) {
  if (event.beta === null || !state.isPlaying) return;
  if (!state.isPlaying) { state.baselineBeta = event.beta; }
  const relativeBeta = event.beta - state.baselineBeta;

  const now = Date.now();
  if (now - state.lastTiltTime < 1200) return;

  if (relativeBeta < -15) {
    state.lastTiltTime = now;
    triggerTilt("correct");
  } else if (relativeBeta > 15) {
    state.lastTiltTime = now;
    triggerTilt("skip");
  }
}

function triggerTilt(result) {
  els.wordCard.classList.remove("flash-guessed", "flash-pass");
  if (result === "correct") { els.wordCard.classList.add("flash-guessed"); playCorrectSound(); } 
  else { els.wordCard.classList.add("flash-pass"); playSkipSound(); }
  setTimeout(() => { els.wordCard.classList.remove("flash-guessed", "flash-pass"); }, 300);
  if (navigator.vibrate) navigator.vibrate(result === "correct" ? 100 : [50, 50, 50]);
  handleAnswer(result);
}

function playCorrectSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }
function playSkipSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 220; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }

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
  if (!state.category) { alert("Select a deck!"); return; }
  showScreen("countdown");
  let count = 3;
  els.countdownNum.textContent = count;
  const interval = setInterval(() => {
    count--;
    if (count > 0) { els.countdownNum.textContent = count; } 
    else { clearInterval(interval); els.countdownNum.textContent = "GO"; setTimeout(startGame, 500); }
  }, 1000);
}

function startGame() {
  // Zero out the tilt baseline right as the game starts
  state.baselineBeta = 0; 
  
  state.timeLeft = parseInt(els.timeLimit.value); 
  state.score = 0; state.usedWords = []; state.history = []; state.isPlaying = true;
  els.timer.textContent = state.timeLeft;
  els.scoreDisplay.textContent = "0 pts";
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
  if (result === "correct") { state.score++; els.scoreDisplay.textContent = state.score + " pts"; }
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
    li.textContent = item.word;
    els.wordHistory.appendChild(li);
  });
  showScreen("result");
}

els.startBtn.addEventListener("click", () => {
  state.category = els.category.value;
  runCountdown();
});

els.restartBtn.addEventListener("click", () => showScreen("home"));

loadCloudDecks();

// Show enable tilt button on load if not enabled
els.permissionBtn.style.display = "flex";