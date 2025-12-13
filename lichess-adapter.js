// lichess-adapter.js
// Goal: later, this file will subscribe to a Lichess game stream and keep board.html in sync.
// For now, it just exposes one function you can call manually.

export function feedMovesStringToBoard(movesStr) {
  // board.html will provide applyUciMoves globally in the next step
  if (typeof window.applyUciMoves !== "function") {
    console.error("applyUciMoves not found on window. Is board.html exposing it?");
    return;
  }
  window.applyUciMoves(movesStr);
  if (typeof window.renderBoard === "function") window.renderBoard();
}
