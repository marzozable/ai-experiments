const content = document.getElementById("content");

const timeText = document.getElementById("timeText");
const timeFill = document.getElementById("timeFill");

const energyText = document.getElementById("energyText");
const energyFill = document.getElementById("energyFill");

const clarityText = document.getElementById("clarityText");
const clarityFill = document.getElementById("clarityFill");

const badge = document.getElementById("badge");
const micro = document.getElementById("micro");

const TOTAL_SECONDS = 120;

let state = {
  step: 0,
  secondsLeft: TOTAL_SECONDS,
  energy: 70,
  clarity: 45,
  inspirationScore: 0,
  aceableNod: 0,
  choices: []
};

let timer = null;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setFill(el, value0to100) {
  el.style.width = `${clamp(value0to100, 0, 100)}%`;
}

function updateHUD() {
  timeText.textContent = fmtTime(state.secondsLeft);
  const pctTimeUsed = 100 * (1 - state.secondsLeft / TOTAL_SECONDS);
  setFill(timeFill, pctTimeUsed);

  energyText.textContent = state.energy;
  setFill(energyFill, state.energy);

  clarityText.textContent = state.clarity;
  setFill(clarityFill, state.clarity);

  if (state.inspirationScore >= 3) badge.textContent = "Loop status: inevitable";
  else if (state.step === 0) badge.textContent = "Loop status: warming up";
  else badge.textContent = "Loop status: converging";

  if (state.secondsLeft <= 20) micro.textContent = "Hurry, the loop is closing";
  else if (state.aceableNod >= 1) micro.textContent = "Aceable energy detected";
  else micro.textContent = "Tip: pick chaos, it still lands";
}

function tick() {
  state.secondsLeft = clamp(state.secondsLeft - 1, 0, TOTAL_SECONDS);
  updateHUD();

  if (state.secondsLeft === 0) {
    endGame("Time ran out. The loop still resolves.");
  }
}

function startTimer() {
  if (timer) return;
  timer = setInterval(tick, 1000);
}

function stopTimer() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

function softGlitch() {
  const card = document.querySelector(".card");
  card.classList.remove("glitch");
  void card.offsetWidth;
  card.classList.add("glitch");
}

function applyEffects(delta) {
  state.energy = clamp(state.energy + (delta.energy || 0), 0, 100);
  state.clarity = clamp(state.clarity + (delta.clarity || 0), 0, 100);
  state.inspirationScore = clamp(state.inspirationScore + (delta.inspiration || 0), 0, 10);
  state.aceableNod = clamp(state.aceableNod + (delta.aceable || 0), 0, 10);
}

function renderScreen(screen) {
  const prompt = `<p class="prompt">${screen.prompt}</p>`;
  const note = screen.note ? `<p class="note">${screen.note}</p>` : "";
  const buttons = screen.choices.map(c => {
    return `<button data-choice="${c.id}">${c.label}</button>`;
  }).join("");

  content.innerHTML = `${prompt}${note}<div class="choices">${buttons}</div>`;

  document.querySelectorAll("button[data-choice]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-choice");
      handleChoice(id);
    });
  });
}

function handleChoice(choiceId) {
  const screen = SCREENS[state.step];
  const choice = screen.choices.find(c => c.id === choiceId);
  if (!choice) return;

  state.choices.push({ step: state.step, choice: choiceId });

  applyEffects(choice.effects || {});
  if (choice.glitch) softGlitch();

  if (choice.timeCost) {
    state.secondsLeft = clamp(state.secondsLeft - choice.timeCost, 0, TOTAL_SECONDS);
  }

  updateHUD();

  if (choice.next === "END") {
    endGame(choice.endLine || "Convergence complete.");
    return;
  }

  state.step = choice.next;
  renderScreen(SCREENS[state.step]);
}

function endGame(reasonLine) {
  stopTimer();
  softGlitch();

  const aceableLine = state.aceableNod >= 1
    ? "Aceable mindset engaged: learn fast, ship faster."
    : "Somewhere, Aceable would still want you to pass the test.";

  const choicesRecap = state.choices.map((c, i) => `Step ${c.step + 1}: ${c.choice}`).slice(0, 3).join(" • ");

  content.innerHTML = `
    <p class="prompt">Every path converges.</p>
    <p class="note">${reasonLine}</p>
    <p class="note">${aceableLine}</p>
    <p class="prompt"><strong>Inspiration confirmed.</strong></p>
    <p class="note"><strong>Blake Garrett</strong><br/>AI Inspiration</p>
    <p class="note">Thanks from Mario</p>
    <p class="note" style="opacity:.65">Recap: ${choicesRecap || "You entered the loop."}</p>
    <div class="choices">
      <button id="restart">Restart the Loop</button>
    </div>
  `;

  document.getElementById("restart").addEventListener("click", resetGame);
}

function resetGame() {
  stopTimer();
  state = {
    step: 0,
    secondsLeft: TOTAL_SECONDS,
    energy: 70,
    clarity: 45,
    inspirationScore: 0,
    aceableNod: 0,
    choices: []
  };
  updateHUD();
  renderScreen(SCREENS[state.step]);
  startTimer();
}

const SCREENS = [
  {
    prompt: "You’re in Belize.<br/>Kids are awake.<br/>Work is loud.",
    note: "You get 2 minutes. Choose fast. The loop is unforgiving.",
    choices: [
      { id: "start", label: "Start", next: 1, effects: { inspiration: 1 } }
    ]
  },
  {
    prompt: "First move. What do you do?",
    note: "Pick one. Your stats will move. Your fate will not.",
    choices: [
      {
        id: "kids_first",
        label: "Focus on kids",
        next: 2,
        effects: { energy: -6, clarity: +10, inspiration: +1 },
        timeCost: 6
      },
      {
        id: "work_call",
        label: "Take a work call",
        next: 2,
        effects: { energy: -10, clarity: +6, inspiration: +1 },
        timeCost: 10
      },
      {
        id: "vibe_code",
        label: "Vibe code",
        next: 2,
        effects: { energy: -4, clarity: +12, inspiration: +2 },
        timeCost: 4
      },
      {
        id: "all_three",
        label: "Try all three",
        next: 2,
        effects: { energy: -18, clarity: -6, inspiration: +2 },
        timeCost: 15,
        glitch: true
      }
    ]
  },
  {
    prompt: "You hit friction. How do you respond?",
    note: "This is where Aceable energy shows up: learn, adapt, proceed.",
    choices: [
      {
        id: "push_manual",
        label: "Push harder manually",
        next: 3,
        effects: { energy: -14, clarity: -6, inspiration: +1 },
        timeCost: 12
      },
      {
        id: "ignore_it",
        label: "Ignore it",
        next: 3,
        effects: { energy: -6, clarity: -10, inspiration: +1 },
        timeCost: 6
      },
      {
        id: "use_ai",
        label: "Use AI",
        next: 3,
        effects: { energy: +4, clarity: +12, inspiration: +2, aceable: +1 },
        timeCost: 3
      },
      {
        id: "ask_blake_ai",
        label: "Ask Blake (AI)",
        next: 3,
        effects: { energy: +6, clarity: +16, inspiration: +3, aceable: +2 },
        timeCost: 2
      }
    ]
  },
  {
    prompt: "Final move before burnout.",
    note: "No matter what you pick, the loop resolves the same way.",
    choices: [
      {
        id: "power_through",
        label: "Power through",
        next: "END",
        effects: { energy: -12, clarity: +4, inspiration: +1 },
        timeCost: 10,
        glitch: true,
        endLine: "You brute forced it. Predictable, expensive, effective."
      },
      {
        id: "sleep",
        label: "Sleep",
        next: "END",
        effects: { energy: +10, clarity: +6, inspiration: +1, aceable: +1 },
        timeCost: 4,
        endLine: "You slept. The rarest optimization."
      },
      {
        id: "automate",
        label: "Automate",
        next: "END",
        effects: { energy: +6, clarity: +14, inspiration: +2, aceable: +2 },
        timeCost: 3,
        endLine: "You automated. Aceable approved."
      },
      {
        id: "reflect",
        label: "Reflect",
        next: "END",
        effects: { energy: +2, clarity: +10, inspiration: +2 },
        timeCost: 5,
        endLine: "You reflected. Then you shipped anyway."
      }
    ]
  }
];

updateHUD();
renderScreen(SCREENS[state.step]);
startTimer();
