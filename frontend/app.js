// 1. SOLICITAR NOMBRE AL VISITANTE
let currentUser = sessionStorage.getItem('banco_user');
if (!currentUser) {
    currentUser = prompt("Bienvenido al Banco de Pruebas Remoto. Por favor, ingresa tu nombre:") || "Usuario Anónimo";
    sessionStorage.setItem('banco_user', currentUser);
}

// ==========================================
// MÓDULO DE COMUNICACIÓN - SISTEMA CENTRAL
// ==========================================
const API_CENTRAL_URL = "/api/central";

async function enviarOrdenCentral(payload) {
    console.log("-> Petición enviada a API Central");
    console.log("-> JSON enviado:", JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch(API_CENTRAL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        console.log("-> Código HTTP:", response.status);
        
        const data = await response.json();
        console.log("-> Respuesta recibida:", data);
        
        return data;
    } catch (error) {
        console.error("-> Error de comunicación:", error);
    }
}

// 2. FUNCIONES AUXILIARES Y GRÁFICA
function formatFrequency(hz) {
    if (hz >= 1000000) {
        return (hz / 1000000).toFixed(1).replace('.0', '') + " MHz";
    } else if (hz >= 1000) {
        return (hz / 1000).toFixed(1).replace('.0', '') + " kHz";
    }
    return hz + " Hz";
}

function initSpectrumPlot() {
    const plotDiv = document.getElementById('spectrum-plot');
    const layout = {
        title: false,
        paper_bgcolor: '#000000',
        plot_bgcolor: '#000000',
        margin: { t: 10, r: 20, b: 40, l: 50 },
        xaxis: { title: 'Frecuencia (Hz)', color: '#aaaaaa', gridcolor: '#333333', zerolinecolor: '#555555' },
        yaxis: { title: 'Amplitud (dBm)', color: '#aaaaaa', gridcolor: '#333333', zerolinecolor: '#555555', range: [-120, 20] }
    };
    const config = { responsive: true, displayModeBar: false };
    const initialData = [{ x: [], y: [], type: 'scatter', line: { color: '#00ff00' } }];
    Plotly.newPlot(plotDiv, initialData, layout, config);
}

// 3. ENVÍO DE COMANDOS MANUALES AL SERVIDOR
async function sendUpdate(payload) {
    payload.usuario = currentUser; // Se adjunta el nombre a la petición
    try {
        await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        fetchAndUpdateInstrument(); // Actualizar panel de estado
        fetchCommits(); // Actualizar historial de modificaciones
    } catch (error) {
        console.error("Error al enviar comando:", error);
    }
}

function setupListeners() {
    const btnPower = document.getElementById('btn-power');
    const selectType = document.getElementById('select-type');
    const inputFreq = document.getElementById('input-freq');
    const inputAmp = document.getElementById('input-amp');

    btnPower.addEventListener('click', () => {
        const currentStateOn = btnPower.classList.contains('on');
        sendUpdate({ power: !currentStateOn });
    });

    selectType.addEventListener('change', (e) => {
        sendUpdate({ signal_type: e.target.value });
    });

    inputFreq.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) sendUpdate({ frequency: val });
    });

    inputAmp.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) sendUpdate({ amplitude: val });
    });
}

// 4. ACTUALIZACIÓN DEL ESTADO Y ESPECTRO (POLLING)
async function fetchAndUpdateInstrument() {
    try {
        const stateRes = await fetch('/api/state');
        const state = await stateRes.json();

        const powerEl = document.getElementById("val-power");
        powerEl.textContent = state.power ? "ENCENDIDO" : "APAGADO";
        powerEl.className = state.power ? "status-value led-on" : "status-value led-off";

        document.getElementById("val-type").textContent = state.signal_type;
        document.getElementById("val-freq").textContent = formatFrequency(state.frequency);
        document.getElementById("val-amp").textContent = state.amplitude + " dBm";
        document.getElementById("val-bw").textContent = formatFrequency(state.bandwidth);

        const btnPower = document.getElementById('btn-power');
        btnPower.textContent = state.power ? "ENCENDIDO" : "APAGADO";
        btnPower.className = state.power ? "ctrl-btn on" : "ctrl-btn off";
        
        if (document.activeElement !== document.getElementById('select-type')) {
            document.getElementById('select-type').value = state.signal_type;
        }
        if (document.activeElement !== document.getElementById('input-freq')) {
            document.getElementById('input-freq').value = state.frequency;
        }
        if (document.activeElement !== document.getElementById('input-amp')) {
            document.getElementById('input-amp').value = state.amplitude;
        }

        const spectrumRes = await fetch('/api/spectrum');
        const spectrum = await spectrumRes.json();
        const plotDiv = document.getElementById('spectrum-plot');
        
        Plotly.react(plotDiv, [{
            x: spectrum.x,
            y: spectrum.y,
            type: 'scatter',
            line: { color: '#00ff00', width: 1.5 }
        }], plotDiv.layout);

    } catch (error) {
        console.error("Error de comunicación:", error);
    }
}

// 5. LÓGICA DEL CHAT IA
const chatContainer = document.getElementById('chat-container');
const chatHeader = document.getElementById('chat-header');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

chatHeader.addEventListener('click', () => {
    chatContainer.classList.toggle('chat-open');
    chatContainer.classList.toggle('chat-closed');
    chatToggleBtn.textContent = chatContainer.classList.contains('chat-open') ? '▼' : '▲';
});

function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.className = sender === 'user' ? 'msg-user' : 'msg-bot';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Se adjunta el usuario al mensaje del chat
            body: JSON.stringify({ message: text, usuario: currentUser }) 
        });
        const data = await response.json();
        appendMessage('bot', data.response);
        
        fetchAndUpdateInstrument(); 
        fetchCommits(); 
    } catch (error) {
        appendMessage('bot', 'Error de conexión con el servidor.');
    }
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// 6. CARGAR HISTORIAL DE OPERACIONES (BITÁCORA)
async function fetchCommits() {
    try {
        const res = await fetch('/api/commits');
        const commits = await res.json();
        const list = document.getElementById('commits-list');
        
        if (commits.length === 0) {
            list.innerHTML = '<div class="commit-item">No hay operaciones recientes.</div>';
            return;
        }
        
        list.innerHTML = '';
        commits.forEach(c => {
            list.innerHTML += `
                <div class="commit-item">
                    <div class="commit-author">👤 ${c.author}</div>
                    <div class="commit-msg">"${c.message}"</div>
                    <div class="commit-date">${c.date}</div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error al cargar historial", error);
    }
}

// 7. SECUENCIA DE INICIO
initSpectrumPlot();
setupListeners();
fetchAndUpdateInstrument();
fetchCommits();
setInterval(fetchAndUpdateInstrument, 1000); // Sondeo de instrumentos cada 1s
setInterval(fetchCommits, 2000); // Sondeo del historial cada 2s para ver acciones de otros

setTimeout(() => enviarOrdenCentral({ "frecuencia_hz": 2500, "usuario": "Fabian" }), 2000);