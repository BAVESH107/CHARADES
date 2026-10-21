// ================================
// 🎭 CHARADES — DARK UI FINAL
// ================================

const SUPABASE_URL = "https://wcgxbgjnamybcbtfjiyo.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjZ3hiZ2puYW15YmNidGZqaXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjU3NjgsImV4cCI6MjEwNzkwMTc2OH0.iMrEZLb3jjnbpwDfY6TqcpCLE7krgimKauvVOCkSzcE"; 

const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let DECKS = {};

let state = {
  category: "", timeLimit: 120, timeLeft: 120, score: 0,
  currentWord: "", usedWords: [], history: [], timerInterval: null,
  isPlaying: false, motionEnabled: false, lastTiltTime: 0, baselineBeta: 0
};

let currentTags = [];

const screens = { 
  home: document.getElementById("home"), 
  createDeck: document.getElementById("createDeck"),
  countdown: document.getElementById("countdown"), 
  game: document.getElementById("game"), 
  result: document.getElementById("result") 
};

const els = {
  deckGrid: document.getElementById("deckGrid"),
  timeLimit: document.getElementById("timeLimit"),
  timeLimitGroup: document.getElementById("timeLimitGroup"),
  startBtn: document.getElementById("startBtn"), 
  createDeckBtn: document.getElementById("createDeckBtn"),
  saveDeckBtn: document.getElementById("saveDeckBtn"),
  backToHomeBtn: document.getElementById("backToHomeBtn"),
  customDeckName: document.getElementById("customDeckName"),
  tagContainer: document.getElementById("tagContainer"),
  tagInput: document.getElementById("tagInput"),
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

// ⏱️ SEGMENTED TIMER
els.timeLimitGroup.addEventListener("click", (e) => {
  if (e.target.classList.contains("segment")) {
    document.querySelectorAll(".segment").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
    els.timeLimit.value = e.target.dataset.value;
  }
});

// 🏷️ TAG INPUT SYSTEM
els.tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = els.tagInput.value.trim().replace(/,/g, '');
    if (val && !currentTags.includes(val)) {
      currentTags.push(val);
      renderTags();
      els.tagInput.value = "";
    }
  }
});

function renderTags() {
  document.querySelectorAll('.chip').forEach(c => c.remove());
  currentTags.forEach((tag, index) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `${tag} <i class="ph ph-x" onclick="removeTag(${index})"></i>`;
    els.tagContainer.insertBefore(chip, els.tagInput);
  });
  els.wordCount.textContent = `${currentTags.length} cards added`;
}

window.removeTag = function(index) {
  currentTags.splice(index, 1);
  renderTags();
};

// ☁️ FETCH DECKS
async function loadCloudDecks() {
  try {
    els.deckGrid.innerHTML = "<div class='empty-state'>Loading decks...</div>";
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
    renderDeckGrid();
  } catch (error) {
    console.error("Error:", error);
    els.deckGrid.innerHTML = "<div class='empty-state'>Error loading decks.</div>";
  }
}

function renderDeckGrid() {
  els.deckGrid.innerHTML = ""; 
  const keys = Object.keys(DECKS);
  
  if (keys.length === 0) {
    els.deckGrid.innerHTML = "<div class='empty-state'>No decks. Create one!</div>";
  }

  keys.forEach((key, index) => {
    let displayName = key.split('_').slice(2).join(' ');
    displayName = displayName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const card = document.createElement("div");
    card.className = `deck-card`;
    card.dataset.key = key;
    
    if (state.category === key) card.classList.add("active");

    card.innerHTML = `
      <div>
        <div class="name">${displayName}</div>
        <div class="count">${DECKS[key].length} cards</div>
      </div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll('.deck-card').forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      state.category = key;
    });

    els.deckGrid.appendChild(card);
  });
  
  // Add custom deck button to grid
  const customCard = document.createElement("div");
  customCard.className = `deck-card custom`;
  customCard.innerHTML = `
    <div>
      <div class="name">+ Custom</div>
      <div class="count">Create new</div>
    </div>
  `;
  customCard.addEventListener("click", () => {
    els.customDeckName.value = "";
    currentTags = [];
    renderTags();
    showScreen("createDeck");
  });
  els.deckGrid.appendChild(customCard);
}

// ☁️ SAVE DECK
els.saveDeckBtn.addEventListener("click", async () => {
  const name = els.customDeckName.value.trim();

  if (!name || currentTags.length === 0) { alert("Please enter a name and at least one card!"); return; }
  if (currentTags.length < 3) { alert("Please add at least 3 cards!"); return; }

  els.saveDeckBtn.textContent = "Saving...";
  els.saveDeckBtn.disabled = true;

  try {
    const { data, error } = await dbClient.from('decks').insert([{ name: name, words: currentTags }]).select();
    if (error) throw error;

    await loadCloudDecks();
    showScreen("home");
    
    if (data && data.length > 0) {
      state.category = `cloud_${data[0].id}_${data[0].name.toLowerCase().replace(/\s+/g, "_")}`;
      renderDeckGrid(); 
    }
  } catch (error) {
    alert("Failed to save.");
  } finally {
    els.saveDeckBtn.textContent = "Save deck";
    els.saveDeckBtn.disabled = false;
  }
});

// 🎯 NAVIGATION & PERMISSIONS
els.createDeckBtn.addEventListener("click", () => {
  els.customDeckName.value = "";
  currentTags = [];
  renderTags();
  showScreen("createDeck");
});

els.backToHomeBtn.addEventListener("click", () => showScreen("home"));

els.permissionBtn.addEventListener("click", async () => {
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === "granted") enableTilt();
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

// 🎯 TILT LOGIC
function handleTilt(event) {
  if (event.beta === null) return;
  if (!state.isPlaying) { state.baselineBeta = event.beta; return; }

  const relativeBeta = event.beta - state.baselineBeta;
  const now = Date.now();
  if (now - state.lastTiltTime < 1200) return;

  if (relativeBeta < -35) { state.lastTiltTime = now; triggerTilt("correct"); }
  else if (relativeBeta > 35) { state.lastTiltTime = now; triggerTilt("skip"); }
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

// 🎮 GAME ENGINE
function getRandomWord() {
  const deck = DECKS[state.category];
  if (!deck || deck.length === 0) return "No cards!";
  const available = deck.filter(w => !state.usedWords.includes(w));
  if (available.length === 0) { state.usedWords = []; return deck[Math.floor(Math.random() * deck.length)]; }
  const word = available[Math.floor(Math.random() * available.length)];
  state.usedWords.push(word);
  return word;
}

function runCountdown() {
  if (!state.category || !DECKS[state.category]) { alert("Please select a deck first!"); return; }
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
  state.timeLeft = parseInt(els.timeLimit.value); 
  state.score = 0; state.usedWords = []; state.history = []; state.isPlaying = true; 
  
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

els.startBtn.addEventListener("click", () => runCountdown());
els.restartBtn.addEventListener("click", () => showScreen("home"));

loadCloudDecks();
els.permissionBtn.style.display = "flex";