// ================================
// 🎭 CHARADES — FINAL MASTER VERSION
// ================================

const SUPABASE_URL = "https://wcgxbgjnamybcbtfjiyo.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjZ3hiZ2puYW15YmNidGZqaXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjU3NjgsImV4cCI6MjEwNzkwMTc2OH0.iMrEZLb3jjnbpwDfY6TqcpCLE7krgimKauvVOCkSzcE"; 

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
  timer: document.getElementById("timer"), 
  scoreDisplay: document.getElementById("scoreDisplay"),
  currentWord: document.getElementById("currentWord"), 
  wordCard: document.getElementById("wordCard"),
  finalScore: document.getElementById("finalScore"), 
  wordHistory: document.getElementById("wordHistory"),
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
    document.querySelectorAll(".segment").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
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
// ☁️ FETCH DECKS (With Timeout & Error Handling)
// ================================
async function loadCloudDecks() {
  try {
    els.category.innerHTML = "<option value=''>Loading...</option>";
    
    // Timeout to prevent infinite hanging on mobile networks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second limit

    const { data, error } = await dbClient
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

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
    els.category.innerHTML = "<option value=''>Error loading decks. Tap to retry.</option>";
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
    alert("Failed to save. Check connection.");
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
// 🎯 NAVIGATION & PERMISSIONS
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

// ================================
// 🎯 THE PERFECT TILT LOGIC (ZEROING)
// ================================
function handleTilt(event) {
  if (event.beta === null) return;

  // 1. ZEROING LOGIC
  // If we are NOT playing (i.e., during countdown), constantly update the baseline.
  // This locks in whatever angle you are holding the phone as the center (0).
  if (!state.isPlaying) {
    state.baselineBeta = event.beta;
    return; 
  }

  // Calculate tilt relative to the locked-in baseline
  const relativeBeta = event.beta - state.baselineBeta;

  // Cooldown
  const now = Date.now();
  if (now - state.lastTiltTime < 1200) return;

  // 2. THE CORRECT ANGLES
  // Tilt DOWN (Negative) = CORRECT (Green + Score)
  if (relativeBeta >15) { 
     state.lastTiltTime = now;
    triggerTilt("correct");
  }
  // Tilt UP (Positive) = PASS (Red + Skip)
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

function playCorrectSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }
function playSkipSound() { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 220; g.gain.setValueAtTime(0.1, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2); o.start(a.currentTime); o.stop(a.currentTime + 0.2); } catch(e){} }

// ================================
// 🎮 GAME ENGINE
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
  if (!state.category || !DECKS[state.category]) { 
    alert("Please select a valid deck!"); 
    return; 
  }
  
  showScreen("countdown");
  let count = 3;
  els.countdownNum.textContent = count;
  
  const interval = setInterval(() => {
    count--;
    if (count > 0) { 
      els.countdownNum.textContent = count; 
    } else { 
      clearInterval(interval); 
      els.countdownNum.textContent = "GO"; 
      setTimeout(startGame, 500); 
    }
  }, 1000);
}

function startGame() {
  // state.isPlaying = true stops the baseline zeroing and starts checking angles
  state.timeLeft = parseInt(els.timeLimit.value); 
  state.score = 0; 
  state.usedWords = []; 
  state.history = []; 
  state.isPlaying = true; 
  
  els.timer.textContent = state.timeLeft;
  els.scoreDisplay.textContent = "0 pts";
  els.currentWord.textContent = getRandomWord();
  
  showScreen("game");
  
  state.timerInterval = setInterval(() => {
    state.timeLeft--; 
    els.timer.textContent = state.timeLeft;
    if (state.timeLeft <= 0) endGame();
  }, 1000);
}

function handleAnswer(result) {
  if (!state.isPlaying) return;
  
  state.history.push({ word: state.currentWord, result });
  
  if (result === "correct") { 
    state.score++; 
    els.scoreDisplay.textContent = state.score + " pts"; 
  }
  
  state.currentWord = getRandomWord();
  els.currentWord.textContent = state.currentWord;
}

function endGame() {
  state.isPlaying = false; 
  clearInterval(state.timerInterval);
  
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

// Initialize
loadCloudDecks();
els.permissionBtn.style.display = "flex";