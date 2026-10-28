// "Add an item, then come back to this swap": remembers which item's swap offer to reopen.
let pending = null;

export function reopenSwapFor(itemId) {
  pending = itemId;
}

export function takeReopenSwap(itemId) {
  if (pending && pending === itemId) {
    pending = null;
    return true;
  }
  return false;
}
