// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives the same frame.
//
// The autopilot walks the chef toward the bin holding the next ingredient the current order
// needs, grabs it, and serves when the plate matches. The play scene stops mid-assembly of
// its second dish; the end scene's pilot never serves, so orders walk out and the shift ends.
import { BINS, CHEF, INGREDIENTS, STEP } from './config.js';
import { EVENT_OVER, binAt, nextNeeded } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_LIMIT_SECONDS = 60;
const END_LIMIT_SECONDS = 200;

/** -1, 0 or 1: which way the chef should walk to reach the bin for `ingredientId`. */
function steerToward(state, ingredientId) {
  const bins = BINS;
  let targetBin = -1;
  for (let index = 0; index < INGREDIENTS.length; index += 1) {
    if (ingredientId === INGREDIENTS[index].id) targetBin = index;
  }
  if (targetBin === -1) return 0;
  const centre = bins.firstX + targetBin * (bins.width + bins.gap) + bins.width / 2;
  const chefCentre = state.chef.x + CHEF.width / 2;
  if (chefCentre < centre - 6) return 1;
  if (chefCentre > centre + 6) return -1;
  return 0;
}

/** One autopilot step: move, grab when over the right bin, serve when the plate is complete. */
function autopilotStep(world, state) {
  const order = state.orders[0];
  if (order.dish === null) return world.step(STEP, 0, false, false, false, false);
  const need = nextNeeded(state.plate, order.dish);
  if (need === null) {
    // Plate complete: serve it.
    return world.step(STEP, 0, false, true, false, false);
  }
  const direction = steerToward(state, need);
  const overBin = binAt(state.chef.x + CHEF.width / 2);
  const wantBin = INGREDIENTS.findIndex((item) => item.id === need);
  const grab = direction === 0 && overBin === wantBin;
  return world.step(STEP, direction, grab, false, false, false);
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, false, false, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Play until the first dish is served and the second is mid-assembly, then stop.
    for (let index = 0; index < PLAY_LIMIT_SECONDS / STEP; index += 1) {
      autopilotStep(world, world.state);
      if (world.state.served >= 1 && world.state.plate.length >= 1) break;
      if (world.state.lives === 0 || world.state.timeLeft <= 0) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // End: the pilot stands still and never serves; orders walk out until the shift ends.
  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    if (world.step(STEP, 0, false, false, false, false) & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
