const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.get("/", (req, res) => {
    res.send("Shadow Wizard WebSocket server is running.");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 🔹 AQUÍ guardamos el ranking global en memoria del servidor
let globalScores = [];

wss.on("connection", (ws) => {
    console.log("Cliente conectado.");

    // 🔹 Cuando alguien se conecta, le envío el snapshot actual
    ws.send(JSON.stringify({
        type: "scores_snapshot",
        scores: globalScores
    }));

    ws.on("message", (data) => {
        console.log("Mensaje recibido:", data.toString());

        let parsed;
        try {
            parsed = JSON.parse(data.toString());
        } catch (e) {
            console.error("Mensaje no válido:", data.toString());
            return;
        }

        // Si es un resultado de nivel
        if (parsed.type === "level_complete") {
            // Guardar en el ranking global
            globalScores.push(parsed);
            globalScores.sort((a, b) => (b.score || 0) - (a.score || 0));
            globalScores = globalScores.slice(0, 20); // top 20 en servidor

            // 🔹 Broadcast del score individual (para el feed)
            broadcast({
                type: "level_complete",
                ...parsed
            });

            // 🔹 Broadcast del snapshot actualizado (para el ranking)
            broadcast({
                type: "scores_snapshot",
                scores: globalScores
            });

        } else {
            // Otros tipos de mensajes, solo rebotar si quisieras
            broadcast(parsed);
        }
    });

    ws.on("close", () => {
        console.log("Cliente desconectado.");
    });
});

function broadcast(obj) {
    const str = JSON.stringify(obj);
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(str);
        }
    }
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});
