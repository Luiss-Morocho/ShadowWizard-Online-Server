// Servidor WebSocket para Shadow Wizard - Hosting en Render

const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();

// Página de prueba en HTTP
app.get("/", (req, res) => {
    res.send("Shadow Wizard WebSocket server is running.");
});

// Crear servidor HTTP
const server = http.createServer(app);

// Crear servidor WebSocket encima de ese HTTP
const wss = new WebSocket.Server({ server });

// Manejo de conexiones WebSocket
wss.on("connection", (ws) => {
    console.log("Cliente conectado.");

    ws.on("message", (data) => {
        console.log("Mensaje recibido:", data.toString());

        // BROADCAST
        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
            }
        }
    });

    ws.on("close", () => {
        console.log("Cliente desconectado.");
    });
});

// Render da su propio puerto
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});