const { default: next } = require("next");
const express = require("express");
const { createServer } = require("http");
const Websocket = require("ws");

// Setup Next.js and Express
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

const server = express();
const httpServer = createServer(server);

// Setup Websocket Server
const wss = new Websocket.Server({server: httpServer});
const watchers = new Map();

wss.on("connection", (ws, req) => {
  const productId = req.url && req.url.split("/").pop();
  if (!productId) return;

  // Increment watchers count
  const currentCount = (watchers.get(productId) ?? 0) + 1;
  watchers.set(productId, currentCount);
  console.log(
    `New connection for product ${productId}: ${currentCount} watchers.`
  );

  // Notify all connected clients about the new watcher count
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ productId, count: currentCount }));
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    const updatedCount = Math.max((watchers.get(productId) ?? 0) - 1, 0);
    if (updatedCount === 0) {
      watchers.delete(productId);
    } else {
      watchers.set(productId, updatedCount);
    }
    console.log(
      `Connection closed for the product ${productId}: ${updatedCount} watchers.`
    );

    // Notify all connected clients about the new watcher count
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ productId, count: updatedCount }));
      }
    });
  });

  // Send initial message
  ws.send(JSON.stringify({message: "Connected to the websocket server.", productId}))
});



// Handle Next.js routing
server.all("*", (req, res) => {
  return handler(req, res)
});

// Start the server
httpServer.listen(4000, (err) => {
  if (err) throw err;
  console.log("Server is listening on http://localhost:4000");
})