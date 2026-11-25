// The game's rules and state, with no drawing and no browser in it: the chef, the order board,
// the plate being assembled, patience, score, combo, lives and the shift timer. step() advances
// one fixed step and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after createWorld returns.
import {
  BINS,
  BOARD,
  CHEF,
  COMBO_POINTS,
  DISHES,
  FIELD,
  INGREDIENTS,
  LEVEL,
  LIVES,
  ORDER_DELAY,
  PATIENCE,
  PATIENCE_BONUS_MAX,
  PLATE,
  PLATE_MAX,
  SERVE_POINTS,
  SHIFT_SECONDS,
} from './config.js';

export const EVENT_GRAB = 1;
export const EVENT_SERVE_OK = 2;
export const EVENT_SERVE_BAD = 4;
export const EVENT_ORDER_LOST = 8;
export const EVENT_TRASH = 16;
export const EVENT_OVER = 32;

export function ingredientById(id) {
  for (let index = 0; index < INGREDIENTS.length; index += 1) {
    if (INGREDIENTS[index].id === id) return INGREDIENTS[index];
  }
  return INGREDIENTS[0];
}

/** The bin (0-5) whose x-range holds `x`, or -1 when the chef stands between bins. */
export function binAt(x) {
  for (let index = 0; index < INGREDIENTS.length; index += 1) {
    const left = BINS.firstX + index * (BINS.width + BINS.gap);
    if (x >= left && x < left + BINS.width) return index;
  }
  return -1;
}

/** Whether the plate, as assembled, is exactly the current order (same ingredients, any order). */
export function plateMatchesOrder(plate, order) {
  if (order === null || plate.length !== order.ingredients.length) return false;
  const wanted = order.ingredients.slice().sort();
  const have = plate.slice().sort();
  for (let index = 0; index < wanted.length; index += 1) {
    if (wanted[index] !== have[index]) return false;
  }
  return true;
}

/** The next ingredient the current order still needs, or null when the plate is done/wrong. */
export function nextNeeded(plate, order) {
  if (order === null) return null;
  const have = plate.slice();
  for (let index = 0; index < order.ingredients.length; index += 1) {
    const need = order.ingredients[index];
    const at = have.indexOf(need);
    if (at === -1) return need;
    have.splice(at, 1);
  }
  return null;
}

export function createWorld(random) {
  const chef = { x: (FIELD.width - CHEF.width) / 2 };
  const orders = [];
  for (let index = 0; index < 3; index += 1) {
    orders.push({ dish: null, patience: 0, maxPatience: 1, delay: 0 });
  }
  const plate = [];
  const state = {
    chef,
    orders,
    plate,
    score: 0,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    combo: 0,
    served: 0,
    mistakes: 0,
  };

  function pickDish() {
    // Level 1 keeps to the quick 3-ingredient dishes; later levels use the whole menu.
    const pool = state.level === 1 ? DISHES.slice(0, 3) : DISHES;
    return pool[Math.floor(random() * pool.length)];
  }

  function newOrder(slot, delay) {
    const patience = PATIENCE[Math.min(state.level, PATIENCE.length) - 1];
    slot.dish = pickDish();
    slot.patience = patience;
    slot.maxPatience = patience;
    slot.delay = delay;
  }

  function reset() {
    chef.x = (FIELD.width - CHEF.width) / 2;
    plate.length = 0;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.timeLeft = SHIFT_SECONDS;
    state.combo = 0;
    state.served = 0;
    state.mistakes = 0;
    for (let index = 0; index < orders.length; index += 1) {
      newOrder(orders[index], index * 0.6);
    }
  }

  function loseLife(events) {
    state.lives -= 1;
    state.mistakes += 1;
    state.combo = 0;
    if (state.lives <= 0) return events | EVENT_OVER;
    return events;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1. `grab`, `serve` and `trash` are one-shot intents
   * for this step. With `harmless` set (the title screen's backdrop) orders wait patiently, the
   * clock holds, and nothing is lost.
   */
  function step(dt, direction, grab, serve, trash, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));

    chef.x = Math.min(FIELD.width - CHEF.width, Math.max(0, chef.x + direction * CHEF.speed * dt));

    if (grab && plate.length < PLATE_MAX) {
      const bin = binAt(chef.x + CHEF.width / 2);
      if (bin !== -1) {
        plate.push(INGREDIENTS[bin].id);
        events |= EVENT_GRAB;
      }
    }
    if (trash && plate.length > 0) {
      plate.length = 0;
      events |= EVENT_TRASH;
    }

    const current = orders[0];
    if (serve && current.dish !== null && plate.length > 0) {
      if (plateMatchesOrder(plate, current.dish)) {
        const bonus = Math.round((current.patience / current.maxPatience) * PATIENCE_BONUS_MAX);
        state.score += SERVE_POINTS + bonus + state.combo * COMBO_POINTS;
        state.combo += 1;
        state.served += 1;
        plate.length = 0;
        newOrder(current, ORDER_DELAY);
        events |= EVENT_SERVE_OK;
      } else {
        plate.length = 0;
        events |= EVENT_SERVE_BAD;
        events = loseLife(events);
      }
    }

    if (!harmless) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        return events | EVENT_OVER;
      }
      for (let index = 0; index < orders.length; index += 1) {
        const order = orders[index];
        if (order.dish === null) {
          order.delay -= dt;
          if (order.delay <= 0) newOrder(order, 0);
          continue;
        }
        order.patience -= dt;
        if (order.patience <= 0) {
          events |= EVENT_ORDER_LOST;
          events = loseLife(events);
          if (events & EVENT_OVER) return events;
          newOrder(order, ORDER_DELAY);
        }
      }
      // The front of the queue is always the current order; refill behind it.
      for (let index = 0; index < orders.length; index += 1) {
        if (orders[index].dish === null && orders[index].delay <= 0) newOrder(orders[index], 0);
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}

// Re-exported for the renderer and shots, so they share one layout source.
export { BOARD, BINS, PLATE };
