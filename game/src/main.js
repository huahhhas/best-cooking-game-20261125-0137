// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
//
// Clicks on a bin grab that ingredient, on SERVE serve the plate, on TRASH clear it. A tiny
// WebAudio synth blips on grab, rings on a serve and buzzes on a mistake; it stays silent
// until the first user gesture, as browsers require.
import { BEST_KEY, BINS, INGREDIENTS, LIVES, PLATE, SERVE_BUTTON, SHIFT_SECONDS, STEP, TRASH_BUTTON } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_GRAB,
  EVENT_ORDER_LOST,
  EVENT_OVER,
  EVENT_SERVE_BAD,
  EVENT_SERVE_OK,
  EVENT_TRASH,
  binAt,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_GRAB, ACTION_PAUSE, ACTION_SERVE, ACTION_TRASH, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

// --- Sound: a few synthesized blips, no audio files. ---
let audio = null;
function beep(frequency, duration, type, gain) {
  try {
    audio = audio ?? new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator();
    const amp = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(amp).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch {
    // No audio on this browser: the game plays on silently.
  }
}
function soundFor(events) {
  if (events & EVENT_SERVE_OK) {
    beep(660, 0.12, 'sine', 0.15);
    window.setTimeout(() => beep(880, 0.18, 'sine', 0.15), 110);
  } else if (events & (EVENT_SERVE_BAD | EVENT_ORDER_LOST)) {
    beep(160, 0.25, 'sawtooth', 0.1);
  } else if (events & EVENT_GRAB) {
    beep(520, 0.07, 'triangle', 0.12);
  } else if (events & EVENT_TRASH) {
    beep(300, 0.08, 'triangle', 0.08);
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives, ${SHIFT_SECONDS} seconds on the clock.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(
      world.state.timeLeft <= 0
        ? `Shift over. Score ${world.state.score}. Best ${best}.`
        : `Kitchen closed. Score ${world.state.score}. Best ${best}.`,
    );
  }

  /** Turn a click into a grab/serve/trash intent for this step, or null when it hit nothing. */
  function clickIntent(click) {
    if (click.y >= BINS.y && click.y <= BINS.y + 96) {
      const bin = binAt(click.x);
      if (bin !== -1) return { grabBin: INGREDIENTS[bin].id };
    }
    if (
      click.x >= SERVE_BUTTON.x && click.x <= SERVE_BUTTON.x + SERVE_BUTTON.width &&
      click.y >= SERVE_BUTTON.y && click.y <= SERVE_BUTTON.y + SERVE_BUTTON.height
    ) return { serve: true };
    if (
      click.x >= TRASH_BUTTON.x && click.x <= TRASH_BUTTON.x + TRASH_BUTTON.width &&
      click.y >= TRASH_BUTTON.y && click.y <= TRASH_BUTTON.y + TRASH_BUTTON.height
    ) return { trash: true };
    return null;
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicks = input.takeClicks();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    // Clicks: a bin click walks the chef there and grabs; buttons act at once.
    for (const click of clicks) {
      const intent = clickIntent(click);
      if (intent === null) continue;
      if (intent.grabBin) {
        const bin = INGREDIENTS.findIndex((item) => item.id === intent.grabBin);
        const centre = BINS.firstX + bin * (BINS.width + 12) + BINS.width / 2;
        world.state.chef.x = Math.min(1280 - 64, Math.max(0, centre - 32));
        const events = world.step(STEP, 0, true, false, false, false);
        soundFor(events);
        if (events & EVENT_OVER) endGame();
      } else if (intent.serve || intent.trash) {
        const events = world.step(STEP, 0, false, Boolean(intent.serve), Boolean(intent.trash), false);
        soundFor(events);
        if (events & EVENT_OVER) endGame();
      }
    }
    // Keyboard one-shots are consumed by the stepping loop through pending flags.
    pendingGrab = pendingGrab || Boolean(actions & ACTION_GRAB);
    pendingServe = pendingServe || Boolean(actions & ACTION_SERVE);
    pendingTrash = pendingTrash || Boolean(actions & ACTION_TRASH);
  }

  let pendingGrab = false;
  let pendingServe = false;
  let pendingTrash = false;

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, false, false, false, true);
      return;
    }
    const events = world.step(STEP, input.direction(), pendingGrab, pendingServe, pendingTrash, false);
    pendingGrab = false;
    pendingServe = false;
    pendingTrash = false;
    soundFor(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVE_OK) announce(`Served! Score ${world.state.score}.`);
    else if (events & EVENT_SERVE_BAD) announce(`Wrong dish. ${world.state.lives} lives left.`);
    else if (events & EVENT_ORDER_LOST) announce(`An order walked out. ${world.state.lives} lives left.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting orders walk out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
