// server.js
// Servidor WebSocket para Shadow Wizard con TOP global persistente

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// ================================
// PERSISTENCIA: cargar / guardar
// ================================

let globalScores = [];

function loadScores() {
    try {
        if (fs.existsSync(SCORES_FILE)) {
            const raw = fs.readFileSync(SCORES_FILE, 'utf8');
            globalScores = JSON.parse(raw);
            console.log(`✅ Puntajes cargados desde ${SCORES_FILE} (${globalScores.length} registros).`);
        } else {
            console.log('ℹ️ No existe scores.json, se iniciará con TOP vacío.');
        }
    } catch (err) {
        console.error('❌ Error leyendo scores.json:', err);
        globalScores = [];
    }
}

function saveScores() {
    try {
        fs.writeFileSync(SCORES_FILE, JSON.stringify(globalScores, null, 2), 'utf8');
        console.log('💾 Puntajes guardados en scores.json');
    } catch (err) {
        console.error('❌ Error escribiendo scores.json:', err);
    }
}

// Actualiza el TOP 10 con un nuevo resultado
function updateGlobalScores(msg) {
    const entry = {
        player: msg.player || 'Jugador',
        level: msg.level || '?',
        stars: (msg.stars != null) ? msg.stars : 0,
        score: (msg.score != null) ? msg.score : 0,
        time: (msg.time != null) ? msg.time : 0,
        timestamp: msg.timestamp || Date.now()
    };

    globalScores.push(entry);
    globalScores.sort((a, b) => (b.score || 0) - (a.score || 0));
    globalScores = globalScores.slice(0, 10);

    saveScores();
}

// ================================
// HTTP + WebSocket
// ================================

const app = express();

// Endpoint simple para verificar que el server corre
app.get('/', (req, res) => {
    res.send('Shadow Wizard WebSocket server running.');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Cargar puntajes al iniciar
loadScores();

wss.on('connection', (ws) => {
    console.log('Cliente conectado.');

    // Al conectar → mandar snapshot actual del TOP
    if (globalScores.length > 0) {
        ws.send(JSON.stringify({
            type: 'scores_snapshot',
            scores: globalScores
        }));
    }

    ws.on('message', (data) => {
        const text = data.toString();
        console.log('Mensaje recibido:', text);

        let msg;
        try {
            msg = JSON.parse(text);
        } catch (err) {
            console.error('No se pudo parsear JSON:', err);
            return;
        }

        // Solo nos interesa level_complete
        if (msg.type === 'level_complete') {
            // 1) Actualizar TOP global y guardar en archivo
            updateGlobalScores(msg);

            // 2) Reenviar este mensaje a todos (para el ONLINE FEED)
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(msg));
                }
            });

            // Nuevo snapshot a todos
            
            const snapshot = JSON.stringify({
                type: 'scores_snapshot',
                scores: globalScores
            });
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(snapshot);
                }
            });
            
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
    });
});

server.listen(PORT, () => {
    console.log(`Servidor WebSocket escuchando en puerto ${PORT}`);
});
