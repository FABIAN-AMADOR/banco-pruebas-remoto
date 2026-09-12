// 1. SOLICITAR NOMBRE AL VISITANTE
let currentUser = sessionStorage.getItem('banco_user');
if (!currentUser) {
    currentUser = prompt("Bienvenido al Banco de Pruebas Remoto. Por favor, ingresa tu nombre:") || "anonimo";
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
    if (!plotDiv) return;
    
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

// 3. ENVÍO DE COMANDOS AL SERVIDOR (LOCAL Y CENTRAL)
async function sendUpdate(payload) {
    payload.usuario = currentUser; 
    try {
        await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        fetchAndUpdateInstrument(); 
        fetchCommits(); 
    } catch (error) {
        console.error("Error al enviar comando:", error);
    }
}

function setupListeners() {
    const btnPower = document.getElementById('btn-power');
    const selectType = document.getElementById('select-type');
    const inputFreq = document.getElementById('input-freq');
    const inputAmp = document.getElementById('input-amp');
    const inputBw = document.getElementById('input-bw'); // Preparado para Ancho de Banda

    if (btnPower) {
        btnPower.addEventListener('click', () => {
            const currentStateOn = btnPower.classList.contains('on');
            sendUpdate({ power: !currentStateOn });
        });
    }

    // === TIPO DE SEÑAL (ETAPA 7) ===
    if (selectType) {
        selectType.addEventListener('change', async (e) => {
            const val = e.target.value;
            sendUpdate({ signal_type: val });

            const valoresPermitidos = ["senoidal", "cuadrada", "triangular"];
            if (valoresPermitidos.includes(val)) {
                const payload = {
                    "tipo_senal": val,
                    "usuario": sessionStorage.getItem('banco_user') || "anonimo"
                };
                console.log("🟡 Enviando tipo de señal al laboratorio...");
                const respuesta = await enviarOrdenCentral(payload);
                if (respuesta && !respuesta.error) console.log("🟢 Laboratorio actualizado (Señal)");
                else console.log("🔴 Error al comunicarse con el laboratorio");
            } else {
                console.warn("🔴 Tipo de señal no permitido");
            }
        });
    }

    // === FRECUENCIA (ETAPA 4) ===
    if (inputFreq) {
        inputFreq.addEventListener('change', async (e) => {
            const val = parseFloat(e.target.value);
            if (isNaN(val)) return;

            sendUpdate({ frequency: val });

            if (val >= 100 && val <= 10000) {
                const payload = {
                    "frecuencia_hz": val,
                    "usuario": sessionStorage.getItem('banco_user') || "anonimo"
                };
                console.log("🟡 Enviando frecuencia al laboratorio...");
                const respuesta = await enviarOrdenCentral(payload);
                if (respuesta && !respuesta.error) console.log("🟢 Laboratorio actualizado (Frecuencia)");
                else console.log("🔴 Error al comunicarse con el laboratorio");
            } else {
                console.warn("🔴 Frecuencia fuera de rango (100 Hz - 10000 Hz)");
            }
        });
    }

    // === AMPLITUD (ETAPA 5) ===
    if (inputAmp) {
        inputAmp.addEventListener('change', async (e) => {
            const val = parseFloat(e.target.value);
            if (isNaN(val)) return;

            sendUpdate({ amplitude: val });

            if (val >= -30 && val <= 10) {
                const payload = {
                    "amplitud_dbm": val,
                    "usuario": sessionStorage.getItem('banco_user') || "anonimo"
                };
                console.log("🟡 Enviando amplitud al laboratorio...");
                const respuesta = await enviarOrdenCentral(payload);
                if (respuesta && !respuesta.error) console.log("🟢 Laboratorio actualizado (Amplitud)");
                else console.log("🔴 Error al comunicarse con el laboratorio");
            } else {
                console.warn("🔴 Amplitud fuera de rango (-30 dBm a +10 dBm)");
            }
        });
    }

    // === ANCHO DE BANDA (ETAPA 6) ===
    if (inputBw) {
        inputBw.addEventListener('change', async (e) => {
            const val = parseFloat(e.target.value);
            if (isNaN(val)) return;

            sendUpdate({ bandwidth: val });

            if (val >= 50 && val <= 1000) {
                const payload = {
                    "ancho_banda_hz": val,
                    "usuario": sessionStorage.getItem('banco_user') || "anonimo"
                };
                console.log("🟡 Enviando ancho de banda al laboratorio...");
                const respuesta = await enviarOrdenCentral(payload);
                if (respuesta && !respuesta.error) console.log("🟢 Laboratorio actualizado (Ancho de Banda)");
                else console.log("🔴 Error al comunicarse con el laboratorio");
            } else {
                console.warn("🔴 Ancho de banda fuera de rango (50 Hz - 1000 Hz)");
            }
        });
    }
}

// 4. ACTUALIZACIÓN DEL ESTADO Y ESPECTRO (POLLING)
async function fetchAndUpdateInstrument() {
    try {
        const stateRes = await fetch('/api/state');
        const state = await stateRes.json();

        const powerEl = document.getElementById("val-power");
        if(powerEl) {
            powerEl.textContent = state.power ? "ENCENDIDO" : "APAGADO";
            powerEl.className = state.power ? "status-value led-on" : "status-value led-off";
        }

        if(document.getElementById("val-type")) document.getElementById("val-type").textContent = state.signal_type;
        if(document.getElementById("val-freq")) document.getElementById("val-freq").textContent = formatFrequency(state.frequency);
        if(document.getElementById("val-amp")) document.getElementById("val-amp").textContent = state.amplitude + " dBm";
        if(document.getElementById("val-bw")) document.getElementById("val-bw").textContent = formatFrequency(state.bandwidth);

        const btnPower = document.getElementById('btn-power');
        if(btnPower) {
            btnPower.textContent = state.power ? "ENCENDIDO" : "APAGADO";
            btnPower.className = state.power ? "ctrl-btn on" : "ctrl-btn off";
        }
        
        const uiType = document.getElementById('select-type');
        const uiFreq = document.getElementById('input-freq');
        const uiAmp = document.getElementById('input-amp');
        const uiBw = document.getElementById('input-bw');

        if (uiType && document.activeElement !== uiType) uiType.value = state.signal_type;
        if (uiFreq && document.activeElement !== uiFreq) uiFreq.value = state.frequency;
        if (uiAmp && document.activeElement !== uiAmp) uiAmp.value = state.amplitude;
        if (uiBw && document.activeElement !== uiBw) uiBw.value = state.bandwidth;

        const spectrumRes = await fetch('/api/spectrum');
        const spectrum = await spectrumRes.json();
        const plotDiv = document.getElementById('spectrum-plot');
        
        if (plotDiv) {
            Plotly.react(plotDiv, [{
                x: spectrum.x,
                y: spectrum.y,
                type: 'scatter',
                line: { color: '#00ff00', width: 1.5 }
            }], plotDiv.layout);
        }

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

if (chatHeader) {
    chatHeader.addEventListener('click', () => {
        chatContainer.classList.toggle('chat-open');
        chatContainer.classList.toggle('chat-closed');
        chatToggleBtn.textContent = chatContainer.classList.contains('chat-open') ? '▼' : '▲';
    });
}

function appendMessage(sender, text) {
    if(!chatMessages) return;
    const div = document.createElement('div');
    div.className = sender === 'user' ? 'msg-user' : 'msg-bot';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {
    if(!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}

// 6. CARGAR HISTORIAL DE OPERACIONES (BITÁCORA)
async function fetchCommits() {
    try {
        const res = await fetch('/api/commits');
        const commits = await res.json();
        const list = document.getElementById('commits-list');
        if(!list) return;
        
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

// 7. SECUENCIA DE INICIO LIMPIA
initSpectrumPlot();
setupListeners();
fetchAndUpdateInstrument();
fetchCommits();
setInterval(fetchAndUpdateInstrument, 1000); 
setInterval(fetchCommits, 2000);