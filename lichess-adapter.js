// lichess-adapter.js - This should be in a SEPARATE FILE
async function connectToGame(gameId) {
  const url = `http://127.0.0.1:3001/stream/${gameId}`;
  const res = await fetch(url);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;

      const msg = JSON.parse(line);

      // Lichess sends gameState updates with a `moves` string
      if (msg.type === "gameState" && typeof msg.moves === "string") {
        console.log("LIVE moves:", msg.moves);

        if (typeof window.applyUciMoves === "function") {
          window.applyUciMoves(msg.moves);
          if (typeof window.renderBoard === "function") window.renderBoard();
        }
      }
    }
  }
}

// Make it available globally
window.connectToGame = connectToGame;