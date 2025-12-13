// lichess-proxy.js
import http from "http";
import fetch from "node-fetch";
import fs from "fs";

const token = process.env.LICHESS_TOKEN;

if (!token) {
  console.error("LICHESS_TOKEN not found in environment");
  process.exit(1);
}

http.createServer(async (req, res) => {
  if (!req.url.startsWith("/stream/")) {
    res.writeHead(404);
    return res.end();
  }

  const gameId = req.url.split("/").pop();

  const lichessRes = await fetch(
    `https://lichess.org/api/board/game/stream/${gameId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Access-Control-Allow-Origin": "*",
  });

  lichessRes.body.pipe(res);
}).listen(3001, () =>
  console.log("Lichess proxy listening on http://localhost:3001")
);
