import http from "http";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const token = process.env.LICHESS_TOKEN;

if (!token) {
  console.error("❌ ERROR: LICHESS_TOKEN not found in .env.local");
  console.error("Create a .env.local file with:");
  console.error("LICHESS_TOKEN=your_token_here");
  process.exit(1);
}

console.log("✅ Lichess token loaded");

http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  console.log(`${req.method} ${req.url}`);

  // 1) SEND MOVE
  if (req.url.startsWith("/move/") && req.method === "POST") {
    const parts = req.url.split("/");
    const gameId = parts[2];
    const uci = parts[3];
    
    if (!gameId || !uci) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Missing gameId or uci" }));
      return;
    }
    
    try {
      console.log(`📤 Sending move ${uci} for game ${gameId}`);
      
      const lichessRes = await fetch(
        `https://lichess.org/api/board/game/${gameId}/move/${uci}`,
        { 
          method: "POST", 
          headers: { 
            Authorization: `Bearer ${token}`
          } 
        }
      );
      
      const responseText = await lichessRes.text();
      console.log(`📥 Lichess response: ${lichessRes.status} - ${responseText}`);
      
      res.writeHead(lichessRes.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        ok: lichessRes.ok,
        status: lichessRes.status,
        message: responseText 
      }));
    } catch (e) {
      console.error("❌ Move proxy error:", e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 2) STREAM GAME
  if (req.url.startsWith("/stream/")) {
    const gameId = req.url.split("/").pop();
    console.log(`🎮 Starting stream for game ${gameId}`);

    try {
      const lichessRes = await fetch(
        `https://lichess.org/api/board/game/stream/${gameId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!lichessRes.ok) {
        console.error(`❌ Lichess stream error: ${lichessRes.status}`);
        const errorText = await lichessRes.text();
        res.writeHead(lichessRes.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorText || "Failed to connect to Lichess stream" }));
        return;
      }

      console.log(`✅ Stream connected for ${gameId}`);
      res.writeHead(200, {
        "Content-Type": "application/x-ndjson",
        "Access-Control-Allow-Origin": "*",
      });

      // Pipe the stream
      lichessRes.body.pipe(res);
      
      // Log when stream ends
      lichessRes.body.on('end', () => {
        console.log(`🏁 Stream ended for ${gameId}`);
      });
      
    } catch (e) {
      console.error("❌ Stream connection error:", e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 3) CREATE AI CHALLENGE
  if (req.url === "/challenge/ai" && req.method === "POST") {
    try {
      console.log("🤖 Creating AI challenge...");
      
      const lichessRes = await fetch(
        "https://lichess.org/api/challenge/ai",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            level: 1, // Easy AI (1-8)
            clock: { limit: 300, increment: 3 } // 5+3
          })
        }
      );
      
      const data = await lichessRes.json();
      console.log("✅ AI game created:", data.id);
      
      res.writeHead(lichessRes.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error("❌ Create AI challenge error:", e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 4) CREATE OPEN CHALLENGE
  if (req.url === "/challenge/open" && req.method === "POST") {
    try {
      console.log("👥 Creating open challenge...");
      
      let body = "";
      req.on('data', chunk => body += chunk.toString());
      
      req.on('end', async () => {
        try {
          const params = JSON.parse(body);
          
          const lichessRes = await fetch(
            "https://lichess.org/api/challenge/open",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(params)
            }
          );
          
          const responseText = await lichessRes.text();
          console.log("✅ Challenge created:", responseText);
          
          res.writeHead(lichessRes.status, { 'Content-Type': 'application/json' });
          res.end(responseText);
          
        } catch (e) {
          console.error("❌ Error creating challenge:", e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      
    } catch (e) {
      console.error("❌ Challenge endpoint error:", e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 5) LIST ACTIVE GAMES
  if (req.url === "/account/playing" && req.method === "GET") {
    try {
      const lichessRes = await fetch(
        "https://lichess.org/api/account/playing",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = await lichessRes.json();
      console.log(`📋 Active games: ${data.nowPlaying?.length || 0}`);
      
      res.writeHead(lichessRes.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error("❌ Get active games error:", e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 6) GET ACCOUNT INFO
  if (req.url === "/api/account" && req.method === "GET") {
    try {
      const lichessRes = await fetch(
        "https://lichess.org/api/account",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = await lichessRes.json();
      console.log(`👤 Account: ${data.username || 'unknown'}`);
      
      res.writeHead(lichessRes.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error("❌ Get account info error:", e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 7) FALLBACK
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: "Endpoint not found" }));

}).listen(3001, () => {
  console.log("🚀 Lichess proxy listening on http://localhost:3001");
  console.log("📝 Make sure your .env.local file contains LICHESS_TOKEN");
});