// Keyboard and pointer input. Held keys give a steering direction; one-shot presses (grab,
// serve, trash, start, pause) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. Pointer clicks are queued as
// logical-field coordinates, so the loop can test them against bins and buttons.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GRAB = 4;
export const ACTION_SERVE = 8;
export const ACTION_TRASH = 16;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const GRAB = new Set(['Space', 'KeyG']);
const SERVE = new Set(['Enter', 'KeyS']);
const TRASH = new Set(['KeyT', 'Backspace']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  const clicks = [];

  function toField(event) {
    const rect = target.getBoundingClientRect();
    const scaleX = 1280 / Math.max(1, rect.width);
    const scaleY = 720 / Math.max(1, rect.height);
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (GRAB.has(event.code)) {
      if (!event.repeat) actions |= ACTION_GRAB;
    } else if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (TRASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_TRASH;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });
  target.addEventListener('pointerdown', (event) => {
    clicks.push(toField(event));
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The pointer clicks since the last call, in logical-field coordinates. */
    takeClicks() {
      if (clicks.length === 0) return clicks;
      const taken = clicks.slice();
      clicks.length = 0;
      return taken;
    },
  };
}
