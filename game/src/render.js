// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Flat
// shapes and canvas text for the HUD and the panels. Text that holds a number is rebuilt only
// when the number changes, so a frame allocates nothing.
import {
  BINS,
  BOARD,
  CHEF,
  COUNTER,
  FIELD,
  FONT,
  INGREDIENTS,
  LIVES,
  PALETTE,
  PLATE,
  SERVE_BUTTON,
  TRASH_BUTTON,
} from './config.js';
import { binAt, ingredientById, nextNeeded, plateMatchesOrder } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const HEART = { size: 15, gap: 10 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const servedLabel = cachedLabel('Served ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const comboLabel = cachedLabel('Combo x');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  /** One ingredient icon, centred at (cx, cy), about `size` across. */
  function drawIngredientIcon(kind, cx, cy, size) {
    const s = size / 2;
    if (kind === 'bun') {
      context.fillStyle = '#e8a94f';
      context.beginPath();
      context.arc(cx, cy + s * 0.25, s * 0.9, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillRect(cx - s * 0.9, cy + s * 0.25, s * 1.8, s * 0.3);
      context.fillStyle = '#fff2cf';
      context.beginPath();
      context.arc(cx - s * 0.4, cy - s * 0.35, s * 0.1, 0, Math.PI * 2);
      context.arc(cx + s * 0.15, cy - s * 0.55, s * 0.1, 0, Math.PI * 2);
      context.arc(cx + s * 0.5, cy - s * 0.2, s * 0.1, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'patty') {
      context.fillStyle = '#7a4a2b';
      roundRect(cx - s, cy - s * 0.45, s * 2, s * 0.9, s * 0.4);
      context.fill();
      context.fillStyle = '#93582f';
      roundRect(cx - s * 0.7, cy - s * 0.45, s * 1.4, s * 0.35, s * 0.18);
      context.fill();
    } else if (kind === 'lettuce') {
      context.fillStyle = '#69b455';
      for (let leaf = -1; leaf <= 1; leaf += 1) {
        context.beginPath();
        context.arc(cx + leaf * s * 0.55, cy + (leaf === 0 ? -s * 0.2 : s * 0.15), s * 0.55, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = '#8ed07e';
      context.beginPath();
      context.arc(cx, cy - s * 0.1, s * 0.35, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'tomato') {
      context.fillStyle = '#e5534b';
      context.beginPath();
      context.arc(cx, cy, s * 0.9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#4f9e44';
      context.beginPath();
      context.moveTo(cx, cy - s * 0.9);
      context.lineTo(cx - s * 0.35, cy - s * 0.55);
      context.lineTo(cx + s * 0.35, cy - s * 0.55);
      context.closePath();
      context.fill();
      context.fillStyle = '#f28a83';
      context.beginPath();
      context.arc(cx - s * 0.35, cy - s * 0.3, s * 0.22, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'cheese') {
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.moveTo(cx - s, cy + s * 0.6);
      context.lineTo(cx + s, cy + s * 0.6);
      context.lineTo(cx + s, cy - s * 0.6);
      context.closePath();
      context.fill();
      context.fillStyle = '#d9a91f';
      context.beginPath();
      context.arc(cx + s * 0.3, cy + s * 0.15, s * 0.14, 0, Math.PI * 2);
      context.arc(cx - s * 0.1, cy - s * 0.3, s * 0.11, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'noodle') {
      context.strokeStyle = '#f0a35e';
      context.lineWidth = s * 0.28;
      context.lineCap = 'round';
      for (let wave = -1; wave <= 1; wave += 1) {
        context.beginPath();
        const y = cy + wave * s * 0.5;
        context.moveTo(cx - s, y);
        context.bezierCurveTo(cx - s * 0.5, y - s * 0.45, cx + s * 0.5, y + s * 0.45, cx + s, y);
        context.stroke();
      }
    }
  }

  /** One layer of the dish being assembled, drawn as a flat stack on the plate. */
  function drawPlateLayer(kind, cx, topY, width) {
    const h = 15;
    if (kind === 'bun') {
      context.fillStyle = '#e8a94f';
      context.beginPath();
      context.arc(cx, topY + h, width / 2, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillRect(cx - width / 2, topY + h, width, 5);
    } else if (kind === 'patty') {
      context.fillStyle = '#7a4a2b';
      roundRect(cx - width / 2, topY, width, h, 7);
      context.fill();
    } else if (kind === 'lettuce') {
      context.fillStyle = '#69b455';
      roundRect(cx - width / 2, topY, width, h * 0.7, 6);
      context.fill();
      context.beginPath();
      context.arc(cx - width * 0.32, topY + h * 0.5, 9, 0, Math.PI * 2);
      context.arc(cx + width * 0.3, topY + h * 0.5, 9, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'tomato') {
      context.fillStyle = '#e5534b';
      roundRect(cx - width / 2, topY, width * 0.92, h, 7);
      context.fill();
    } else if (kind === 'cheese') {
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.moveTo(cx - width / 2, topY + h);
      context.lineTo(cx + width / 2, topY + h);
      context.lineTo(cx + width / 2, topY + 2);
      context.closePath();
      context.fill();
    } else if (kind === 'noodle') {
      context.strokeStyle = '#f0a35e';
      context.lineWidth = 7;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(cx - width / 2, topY + h * 0.5);
      context.bezierCurveTo(cx - width * 0.2, topY - 4, cx + width * 0.2, topY + h + 4, cx + width / 2, topY + h * 0.5);
      context.stroke();
    }
  }

  function drawHeart(cx, cy, size, filled) {
    context.fillStyle = filled ? PALETTE.red : '#5a4632';
    context.beginPath();
    context.moveTo(cx, cy + size * 0.9);
    context.bezierCurveTo(cx - size * 1.2, cy, cx - size * 0.6, cy - size, cx, cy - size * 0.3);
    context.bezierCurveTo(cx + size * 0.6, cy - size, cx + size * 1.2, cy, cx, cy + size * 0.9);
    context.fill();
  }

  function drawKitchen(state) {
    // Wall and floor.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.wallTile;
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 32; col += 1) {
        if ((row + col) % 2 === 0) context.fillRect(col * 40 + (row % 2) * 20 - 20, 200 + row * 38, 38, 36);
      }
    }
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, COUNTER.bottom, FIELD.width, FIELD.height - COUNTER.bottom);
    context.fillStyle = PALETTE.floorTile;
    for (let col = 0; col < 16; col += 1) {
      context.fillRect(col * 80, 640, 76, 76);
    }

    // Window with a sunny street, and a shelf of pots above the counter.
    context.fillStyle = '#bfe3f2';
    context.fillRect(60, 210, 220, 130);
    context.fillStyle = '#fff2b0';
    context.beginPath();
    context.arc(120, 250, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#7fae7a';
    context.fillRect(60, 310, 220, 30);
    context.fillStyle = '#8a5a33';
    context.fillRect(164, 210, 12, 130);
    context.fillRect(60, 268, 220, 12);
    context.fillStyle = '#5b3a1e';
    context.fillRect(1000, 216, 220, 14);
    context.fillStyle = '#3a4a5a';
    context.beginPath();
    context.arc(1050, 200, 22, Math.PI, 0);
    context.fill();
    context.fillRect(1028, 200, 44, 10);
    context.fillStyle = '#c96f2e';
    context.beginPath();
    context.arc(1140, 202, 20, Math.PI, 0);
    context.fill();
    context.fillRect(1120, 202, 40, 10);

    // Stove with two steaming pots, left of the counter's end.
    context.fillStyle = '#3a4a5a';
    roundRect(60, 372, 150, 58, 8);
    context.fill();
    context.fillStyle = '#2c3844';
    context.beginPath();
    context.arc(100, 386, 12, 0, Math.PI * 2);
    context.arc(170, 386, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e5534b';
    context.beginPath();
    context.arc(100, 386, 6, 0, Math.PI * 2);
    context.arc(170, 386, 6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.7)';
    context.lineWidth = 4;
    context.lineCap = 'round';
    const steam = Math.sin(state.elapsed * 2) * 4;
    context.beginPath();
    context.moveTo(100 + steam, 360);
    context.quadraticCurveTo(108 + steam, 344, 100 + steam, 330);
    context.moveTo(170 - steam, 360);
    context.quadraticCurveTo(162 - steam, 344, 170 - steam, 330);
    context.stroke();

    // Counter.
    context.fillStyle = PALETTE.counter;
    context.fillRect(COUNTER.left, COUNTER.top, COUNTER.right - COUNTER.left, COUNTER.bottom - COUNTER.top);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(COUNTER.left, COUNTER.top, COUNTER.right - COUNTER.left, 16);
    context.fillStyle = 'rgba(0,0,0,0.12)';
    context.fillRect(COUNTER.left, COUNTER.bottom - 12, COUNTER.right - COUNTER.left, 12);
  }

  function drawBoard(state) {
    context.fillStyle = PALETTE.board;
    roundRect(40, BOARD.top, FIELD.width - 80, BOARD.height, 12);
    context.fill();
    context.fillStyle = PALETTE.boardEdge;
    roundRect(40, BOARD.top, FIELD.width - 80, BOARD.height, 12);
    context.stroke();

    for (let index = 0; index < state.orders.length; index += 1) {
      const order = state.orders[index];
      const x = BOARD.firstX + index * (BOARD.ticketWidth + BOARD.gap);
      const y = BOARD.top + 8;
      const isCurrent = index === 0;
      context.fillStyle = isCurrent ? PALETTE.ticketHot : PALETTE.ticket;
      roundRect(x, y, BOARD.ticketWidth, BOARD.height - 16, 10);
      context.fill();
      if (isCurrent) {
        context.strokeStyle = PALETTE.red;
        context.lineWidth = 3;
        roundRect(x, y, BOARD.ticketWidth, BOARD.height - 16, 10);
        context.stroke();
        context.fillStyle = PALETTE.red;
        roundRect(x + 8, y + 8, 52, 22, 6);
        context.fill();
        text('NOW', x + 34, y + 25, 15, '#ffffff', 'center');
      }
      if (order.dish === null) {
        text('Next order…', x + BOARD.ticketWidth / 2, y + 52, 20, PALETTE.muted, 'center');
        continue;
      }
      text(order.dish.name, x + (isCurrent ? 70 : 16), y + 30, 22, PALETTE.text, 'left');
      const have = state.plate.slice();
      for (let item = 0; item < order.dish.ingredients.length; item += 1) {
        const id = order.dish.ingredients[item];
        const iconX = x + 30 + item * 52;
        const iconY = y + 66;
        const at = isCurrent ? have.indexOf(id) : -1;
        if (at !== -1) have.splice(at, 1);
        drawIngredientIcon(ingredientById(id).draw, iconX, iconY, 34);
        if (isCurrent && at !== -1) {
          context.strokeStyle = PALETTE.green;
          context.lineWidth = 4;
          context.beginPath();
          context.moveTo(iconX - 12, iconY + 2);
          context.lineTo(iconX - 4, iconY + 10);
          context.lineTo(iconX + 14, iconY - 10);
          context.stroke();
        }
      }
      // Patience bar.
      const ratio = Math.max(0, order.patience / order.maxPatience);
      context.fillStyle = '#e0d3b8';
      roundRect(x + 16, y + BOARD.height - 30, BOARD.ticketWidth - 32, 10, 5);
      context.fill();
      context.fillStyle = ratio > 0.5 ? PALETTE.green : ratio > 0.25 ? '#e8a13c' : PALETTE.red;
      if (ratio > 0) {
        roundRect(x + 16, y + BOARD.height - 30, (BOARD.ticketWidth - 32) * ratio, 10, 5);
        context.fill();
      }
    }
  }

  function drawBins(state) {
    const chefCentre = state.chef.x + CHEF.width / 2;
    const hotBin = binAt(chefCentre);
    const needed = nextNeeded(state.plate, state.orders[0].dish);
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      const item = INGREDIENTS[index];
      const x = BINS.firstX + index * (BINS.width + BINS.gap);
      const y = BINS.y;
      context.fillStyle = PALETTE.bin;
      roundRect(x, y, BINS.width, BINS.height, 10);
      context.fill();
      context.strokeStyle = hotBin === index ? PALETTE.red : PALETTE.binEdge;
      context.lineWidth = hotBin === index ? 4 : 2;
      roundRect(x, y, BINS.width, BINS.height, 10);
      context.stroke();
      drawIngredientIcon(item.draw, x + BINS.width / 2, y + 38, 52);
      text(item.name, x + BINS.width / 2, y + BINS.height - 12, 17, PALETTE.text, 'center');
      if (needed === item.id) {
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.moveTo(x + BINS.width / 2, y - 16);
        context.lineTo(x + BINS.width / 2 - 10, y - 30);
        context.lineTo(x + BINS.width / 2 + 10, y - 30);
        context.closePath();
        context.fill();
        text('NEED', x + BINS.width / 2, y - 34, 13, PALETTE.gold, 'center');
      }
    }
  }

  function drawPlate(state) {
    const ready = plateMatchesOrder(state.plate, state.orders[0].dish);
    if (ready) {
      context.fillStyle = 'rgba(99,194,84,0.35)';
      roundRect(PLATE.x - 12, PLATE.y - 12, PLATE.width + 24, PLATE.height + 24, 14);
      context.fill();
    }
    // The plate itself.
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.ellipse(PLATE.x + PLATE.width / 2, PLATE.y + PLATE.height - 18, 130, 16, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.plateEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(PLATE.x + PLATE.width / 2, PLATE.y + PLATE.height - 18, 130, 16, 0, 0, Math.PI * 2);
    context.stroke();
    // The dish mid-assembly, stacked bottom to top.
    const cx = PLATE.x + PLATE.width / 2;
    let topY = PLATE.y + PLATE.height - 34;
    for (let index = 0; index < state.plate.length; index += 1) {
      topY -= 13;
      drawPlateLayer(ingredientById(state.plate[index]).draw, cx, topY, 210 - index * 6);
    }
    if (state.plate.length === 0) {
      text('Empty plate', cx, PLATE.y + 30, 17, PALETTE.muted, 'center');
    } else if (ready) {
      text('READY TO SERVE!', cx, PLATE.y + 22, 19, PALETTE.green, 'center');
    } else {
      const need = nextNeeded(state.plate, state.orders[0].dish);
      text(need ? `Add: ${ingredientById(need).name}` : 'Check the board!', cx, PLATE.y + 22, 17, PALETTE.text, 'center');
    }
  }

  function drawButtons(state) {
    const ready = plateMatchesOrder(state.plate, state.orders[0].dish);
    context.fillStyle = ready ? PALETTE.serveReady : PALETTE.serve;
    roundRect(SERVE_BUTTON.x, SERVE_BUTTON.y, SERVE_BUTTON.width, SERVE_BUTTON.height, 10);
    context.fill();
    text('SERVE  ⏎', SERVE_BUTTON.x + SERVE_BUTTON.width / 2, SERVE_BUTTON.y + 36, 22, '#ffffff', 'center');
    context.fillStyle = PALETTE.trash;
    roundRect(TRASH_BUTTON.x, TRASH_BUTTON.y, TRASH_BUTTON.width, TRASH_BUTTON.height, 10);
    context.fill();
    text('TRASH  T', TRASH_BUTTON.x + TRASH_BUTTON.width / 2, TRASH_BUTTON.y + 36, 18, '#ffffff', 'center');
  }

  function drawChef(state) {
    const x = state.chef.x;
    const y = CHEF.y;
    // Legs.
    context.fillStyle = PALETTE.chefPants;
    context.fillRect(x + 12, y + 70, 16, 26);
    context.fillRect(x + 36, y + 70, 16, 26);
    // Coat.
    context.fillStyle = PALETTE.chefCoat;
    roundRect(x + 4, y + 30, CHEF.width - 8, 44, 10);
    context.fill();
    context.fillStyle = '#d8d8d8';
    context.fillRect(x + CHEF.width / 2 - 2, y + 32, 4, 40);
    // Arms reaching to the counter.
    context.fillStyle = PALETTE.chefCoat;
    roundRect(x - 6, y + 34, 14, 30, 7);
    context.fill();
    roundRect(x + CHEF.width - 8, y + 34, 14, 30, 7);
    context.fill();
    // Head and tall chef's hat.
    context.fillStyle = PALETTE.chefSkin;
    context.beginPath();
    context.arc(x + CHEF.width / 2, y + 18, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2b1d10';
    context.beginPath();
    context.arc(x + CHEF.width / 2 - 6, y + 15, 2, 0, Math.PI * 2);
    context.arc(x + CHEF.width / 2 + 6, y + 15, 2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#2b1d10';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x + CHEF.width / 2, y + 24, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    context.stroke();
    context.fillStyle = PALETTE.chefHat;
    context.fillRect(x + 8, y - 2, CHEF.width - 16, 8);
    context.beginPath();
    context.arc(x + CHEF.width / 2 - 14, y - 4, 12, 0, Math.PI * 2);
    context.arc(x + CHEF.width / 2, y - 10, 14, 0, Math.PI * 2);
    context.arc(x + CHEF.width / 2 + 14, y - 4, 12, 0, Math.PI * 2);
    context.fill();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    // The dark band across the top, behind the HUD.
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, 64);
    text(scoreLabel(state.score), 24, 16, 28, PALETTE.lightText, 'left');
    text(servedLabel(state.served), 200, 20, 20, PALETTE.gold, 'left');
    // Shift timer, centre.
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const timerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    text(`⏱ ${timerText}`, FIELD.width / 2, 12, 30, state.timeLeft <= 15 ? PALETTE.red : PALETTE.lightText, 'center');
    context.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(FIELD.width / 2 - 110, 48, 220, 8, 4);
    context.fill();
    context.fillStyle = state.timeLeft <= 15 ? PALETTE.red : PALETTE.green;
    roundRect(FIELD.width / 2 - 110, 48, 220 * Math.max(0, state.timeLeft / 120), 8, 4);
    context.fill();
    if (state.combo >= 2) {
      text(comboLabel(state.combo), FIELD.width / 2 + 150, 20, 20, PALETTE.gold, 'left');
    }
    const firstHeart = FIELD.width - 24 - LIVES * (HEART.size * 2 + HEART.gap) + HEART.gap;
    text('Lives', firstHeart - 14, 16, 24, PALETTE.lightText, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(firstHeart + life * (HEART.size * 2 + HEART.gap) + HEART.size, 32, HEART.size, life < state.lives);
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20,12,6,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 3;
    roundRect(x, y, PANEL.width, height, 16);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.lightText, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, '#d8c9ae', 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Orders hang on the board — build each dish on your plate.',
    'Move with ← → or A D. Grab with Space, serve with Enter,',
    'trash the plate with T. Click bins and buttons too.',
    'Serve right before patience runs out. 3 strikes ends the shift.',
    '',
  ];
  const PAUSED_LINES = ['The orders will wait for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Every text call below assumes the alphabetic baseline; the HUD sets 'top' for itself.
    context.textBaseline = 'alphabetic';

    drawKitchen(state);
    drawBoard(state);
    drawBins(state);
    drawPlate(state);
    drawButtons(state);
    drawChef(state);
    drawHud(state);

    if (screen === SCREEN_TITLE) {
      drawPanel('SIZZLE & SERVE', TITLE_LINES, 'Press Space or click to start your shift');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = `Dishes served: ${state.served}   Mistakes: ${state.mistakes}`;
      drawPanel(state.timeLeft <= 0 ? 'Shift Over!' : 'Kitchen Closed!', OVER_LINES, 'Press Space to cook again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
