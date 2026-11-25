// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
//
// Sizzle & Serve: a fast kitchen shift. Orders hang on the board at the top, each a dish made
// of 2-4 ingredients. The chef runs along the counter, grabs ingredients from the bins with
// Space (or a click), stacks them on the plate, and serves with Enter when the plate matches
// the current order. Serve right and the till rings; serve wrong, or let an order's patience
// run out, and a life is lost. Three strikes, or the end of the 120-second shift, ends the day.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Length of one shift, in seconds. */
export const SHIFT_SECONDS = 120;

export const LIVES = 3;

/** Points for a served dish, plus a bonus for the patience still left on the order. */
export const SERVE_POINTS = 100;
export const PATIENCE_BONUS_MAX = 50;
/** Extra points per combo step (consecutive correct serves without a mistake). */
export const COMBO_POINTS = 25;

/** Seconds of play per level; higher levels mean busier orders and less patience. */
export const LEVEL = { seconds: 30, max: 4 };

export const CHEF = { width: 64, height: 96, speed: 520, y: 578 };

/** The countertop the ingredient bins and the plate sit on. */
export const COUNTER = { top: 430, bottom: 560, left: 40, right: 1240 };

/** The six ingredient bins, left to right across the counter. */
export const BINS = { firstX: 60, width: 118, gap: 12, y: 446, height: 96 };

/** The serving plate, on the right end of the counter. */
export const PLATE = { x: 900, y: 448, width: 300, height: 96 };

export const SERVE_BUTTON = { x: 940, y: 606, width: 150, height: 54 };
export const TRASH_BUTTON = { x: 1110, y: 606, width: 110, height: 54 };

/** The order board across the top of the kitchen. */
export const BOARD = { top: 72, height: 118, ticketWidth: 372, gap: 20, firstX: 60 };

/** Ingredients, in bin order. `draw` picks the icon the renderer paints. */
export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', color: '#e8a94f', draw: 'bun' },
  { id: 'patty', name: 'Patty', color: '#7a4a2b', draw: 'patty' },
  { id: 'lettuce', name: 'Lettuce', color: '#69b455', draw: 'lettuce' },
  { id: 'tomato', name: 'Tomato', color: '#e5534b', draw: 'tomato' },
  { id: 'cheese', name: 'Cheese', color: '#f2c94c', draw: 'cheese' },
  { id: 'noodle', name: 'Noodle', color: '#f0a35e', draw: 'noodle' },
];

/** The menu: original dishes, each a set of ingredients. Level 1 dishes use 2-3, later levels 4. */
export const DISHES = [
  { id: 'sunny-burger', name: 'Sunny Burger', ingredients: ['bun', 'patty', 'lettuce'] },
  { id: 'garden-salad', name: 'Garden Salad', ingredients: ['lettuce', 'tomato', 'cheese'] },
  { id: 'cheesy-noodles', name: 'Cheesy Noodles', ingredients: ['noodle', 'tomato', 'cheese'] },
  { id: 'stacked-sandwich', name: 'Stacked Sandwich', ingredients: ['bun', 'cheese', 'lettuce', 'tomato'] },
  { id: 'patty-melt', name: 'Patty Melt', ingredients: ['bun', 'patty', 'cheese'] },
  { id: 'noodle-bowl', name: 'Noodle Bowl', ingredients: ['noodle', 'lettuce', 'tomato'] },
];

/** Patience (seconds) an order waits before it walks out, by level. */
export const PATIENCE = [46, 40, 34, 28];
/** Seconds between a finished order and the next one arriving. */
export const ORDER_DELAY = 1.2;
/** Most ingredients a plate can hold at once. */
export const PLATE_MAX = 5;

export const PALETTE = {
  backdrop: '#241a12',
  wall: '#f3d9a4',
  wallTile: '#eedcae',
  floor: '#8a5a33',
  floorTile: '#7c4f2c',
  board: '#5b3a1e',
  boardEdge: '#3e2712',
  ticket: '#fff7e0',
  ticketHot: '#ffe9b0',
  counter: '#a06a35',
  counterTop: '#c98d4e',
  bin: '#f7ead0',
  binEdge: '#b98d54',
  plate: '#f4f6f8',
  plateEdge: '#c3ccd4',
  chefHat: '#f8f8f8',
  chefCoat: '#f2f2f2',
  chefSkin: '#f0c08a',
  chefPants: '#3a4a5a',
  text: '#2b1d10',
  lightText: '#fff7e0',
  muted: '#8b7a63',
  red: '#e5534b',
  green: '#4f9e44',
  gold: '#f2c94c',
  panel: '#2b1d10',
  serve: '#4f9e44',
  serveReady: '#63c254',
  trash: '#8a5a33',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
