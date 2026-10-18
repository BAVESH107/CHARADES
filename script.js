// ================================
// 🎭 CHARADES — PURE CLOUD EDITION (FIXED)
// ================================

// 🔑 SUPABASE SETUP
const SUPABASE_URL = "https://wcgxbgjnamybcbtfjiyo.supabase.co"; // <--- PASTE URL HERE
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjZ3hiZ2puYW15YmNidGZqaXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjU3NjgsImV4cCI6MjEwNzkwMTc2OH0.iMrEZLb3jjnbpwDfY6TqcpCLE7krgimKauvVOCkSzcE"; // <--- PASTE KEY HERE
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  category: document.getElementById("category"), timeLimit: document.getElementById("timeLimit"),
  startBtn: document.getElementById("startBtn"), 
  createDeckBtn: document.getElementById("createDeckBtn"),
  syncBtn: document.getElementById("syncBtn"),
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

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ================================
// ☁️ FETCH DECKS FROM SUPABASE
// ================================
async function loadCloudDecks() {
  try {
    els.createDeckBtn.textContent = "☁️ Loading Cloud..."; 
    
    const { data, error } = await supabase.from('decks').select('*').order('created_at', { ascending: false });
    
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
    console.error("Error loading cloud decks:", error);
    alert("Could not load cloud decks. Check your internet or Supabase keys.");
  } finally {
    els.createDeckBtn.textContent = "➕ CREATE CUSTOM DECK";
  }
}

function populateDropdown() {
  els.category.innerHTML = ""; 
  const keys = Object.keys(DECKS);
  
  if (keys.length === 0) {
    const option = document.createElement("option");
    option.textContent = "No decks available. Create one!";
    option.value = "";
    els.category.appendChild(option);
    return;
  }

  keys.forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    let displayName = key.split('_').slice(2).join(' ');
    displayName = displayName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    option.textContent = "☁️ " + displayName;
    els.category.appendChild(option);
  });
}

// ================================
// ☁️ SAVE NEW DECK TO SUPABASE
// ================================
els.saveDeckBtn.addEventListener("click", async () => {
  const name = els.customDeckName.value.trim();
  const wordsString = els.customDeckWords.value.trim();

  if (!name || !wordsString) { alert("Please enter both a name and some words!"); return; }
  const wordsArray = wordsString.split(",").map(w => w.trim()).filter(w => w !== "");
  if (wordsArray.length < 3) { alert("Please enter at least 3 words!"); return; }

  els.saveDeckBtn.textContent = "☁️ Saving to Cloud...";
  els.saveDeckBtn.disabled = true;

  try {
    const { data, error } = await supabase.from('decks').insert([{ name: name, words: wordsArray }]).select();
    if (error) throw error;

    await loadCloudDecks();
    showScreen("home");
    
    if (data && data.length > 0) {
      const newKey = `cloud_${data[0].id}_${data[0].name.toLowerCase().replace(/\s+/g, "_")}`;
      els.category.value = newKey;
    }
    alert("Deck Saved to Cloud! 🎉");
  } catch (error) {
    console.error("Error saving deck:", error);
    alert("Failed to save to cloud. Check console.");
  } finally {
    els.saveDeckBtn.textContent = "💾 SAVE DECK";
    els.saveDeckBtn.disabled = false;
  }
});

// ================================
// ☁️ SYNC OLD LOCAL DECKS
// ================================
els.syncBtn.addEventListener("click", async () => {
  const localDecks = JSON.parse(localStorage.getItem("charades_custom_decks")) || {};
  const keys = Object.keys(localDecks);

  if (keys.length === 0) { alert("No old local decks found to sync!"); return; }
  if (!confirm(`Found ${keys.length} local decks. Upload them to the cloud?`)) return;

  els.syncBtn.textContent = "☁️ Syncing...";
  els.syncBtn.disabled = true;
  let successCount = 0;

  for (const key of keys) {
    let deckName = key.replace("custom_", "").replace(/_/g, " ");
    deckName = deckName.replace(/\b\w/g, l => l.toUpperCase());
    try {
      const { error } = await supabase.from('decks').insert([{ name: deckName, words: localDecks[key] }]);
      if (!error) successCount++;
    } catch (err) {}
  }

  localStorage.removeItem("charades_custom_decks");
  await loadCloudDecks();
  els.syncBtn.textContent = "☁️ SYNC OLD DECKS";
  els.syncBtn.disabled = false;
  alert(`Synced ${successCount} decks to the cloud! 🎉`);
});

// ================================
// 🎯 GAME LOGIC & TILT
// ================================
els.createDeckBtn.addEventListener("click", () => {
  els.customDeckName.value = "";
  els.customDeckWords.value = "";
  showScreen("createDeck");
});

els.backToHomeBtn.addEventListener("click", () => showScreen("home"));

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

function handleTilt(event) {
  if (event.beta === null) return;
  if (!state.isPlaying) { state.baselineBeta = event.beta; }
  const relativeBeta = event.beta - state.baselineBeta;
  if (!state.isPlaying) return;

  const now = Date.now();
  if (now - state.lastTiltTime < 1200) return;

  // TILT DOWN = CORRECT
  if (relativeBeta < -15) {
    state.lastTiltTime = now;
    triggerTilt("correct");
  }
  // TILT UP = SKIP
  else if (relativeBeta > 15) {
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
  if (!state.category) { alert("Please select or create a deck first!"); return; }
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

// Initialize
loadCloudDecks();