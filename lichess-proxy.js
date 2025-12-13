import http from "http";
import fetch from "node-fetch";
import fs from "fs";

http.createServer(async (req, res) => {

  // CORS for browser -> proxy requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // 1) SEND MOVE
  if (req.url.startsWith("/move/") && req.method === "POST") {
    const [, , gameId, uci] = req.url.split("/");
    try {
      const r = await fetch(
        `https://lichess.org/api/board/game/${gameId}/move/${uci}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      res.writeHead(r.status);
      return res.end();
    } catch (e) {
      res.writeHead(500);
      return res.end();
    }
  }

  // 2) STREAM GAME
  if (req.url.startsWith("/stream/")) {
    const gameId = req.url.split("/").pop();

    const lichessRes = await fetch(
      `https://lichess.org/api/board/game/stream/${gameId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.writeHead(200, {
      "Content-Type": "application/x-ndjson",
      "Access-Control-Allow-Origin": "*",
    });

    return lichessRes.body.pipe(res);
  }

  // 3) FALLBACK
  res.writeHead(404);
  res.end();

}).listen(3001, () =>
  console.log("Lichess proxy listening on http://localhost:3001")
);
