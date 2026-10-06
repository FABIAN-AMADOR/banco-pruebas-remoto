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

// ==========================================
// FASE 2: PRESENCIA AUTÓNOMA DEL AGENTE
// ==========================================
function initAvatarAnimation() {
    const svgEyes = document.getElementById('agent-eyes');
    if (!svgEyes) return;

    // Hacemos que el contenedor de los ojos siga el cursor del usuario
    document.addEventListener('mousemove', (e) => {
        // Normalizamos la posición del mouse de -1 a 1
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        
        // Movemos el SVG completo un máximo de 12 píxeles
        // Movemos el contenedor y no los rectángulos para no romper el @keyframes blink
        svgEyes.style.transform = `translate(${x * 12}px, ${y * 12}px)`;
        svgEyes.style.transition = 'transform 0.1s ease-out';
    });
}

// 3. ENVÍO DE COMANDOS MANUALES AL SERVIDOR
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
    const inputBw = document.getElementById('input-bw');

    if (btnPower) {
        btnPower.addEventListener('click', () => {
            const currentStateOn = btnPower.classList.contains('on');
            sendUpdate({ power: !currentStateOn });
        });
    }

    // === TIPO DE SEÑAL ===
    if (selectType) {
        selectType.addEventListener('change', async (e) => {
            const val = e.target.value;
            
            // 1. Actualiza local
            sendUpdate({ signal_type: val });

            // 2. Envía al central
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

    // === FRECUENCIA ===
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
                
                console.log("🟡 Enviando orden de frecuencia al laboratorio...");
                const respuesta = await enviarOrdenCentral(payload);
                if (respuesta && !respuesta.error) {
                    console.log("🟢 Laboratorio actualizado (Frecuencia)");
                } else {
                    console.log("🔴 Error al comunicarse con el laboratorio");
                }
            } else {
                console.warn("🔴 Frecuencia fuera de rango (100 Hz - 10000 Hz)");
            }
        });
    }

    // === AMPLITUD ===
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
                
                console.log("🟡 Enviando orden de amplitud al laboratorio...");
                const respuesta = await enviarOrdenCentral(payload);
                if (respuesta && !respuesta.error) {
                    console.log("🟢 Laboratorio actualizado (Amplitud)");
                } else {
                    console.log("🔴 Error al comunicarse con el laboratorio");
                }
            } else {
                console.warn("🔴 Amplitud fuera de rango (-30 dBm a +10 dBm)");
            }
        });
    }

    // === ANCHO DE BANDA ===
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
                
                console.log("🟡 Enviando orden de ancho de banda al laboratorio...");
                const respuesta = await enviarOrdenCentral(payload);
                if (respuesta && !respuesta.error) {
                    console.log("🟢 Laboratorio actualizado (Ancho de Banda)");
                } else {
                    console.log("🔴 Error al comunicarse con el laboratorio");
                }
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

        // Actualizar panel izquierdo
        const powerEl = document.getElementById("val-power");
        if (powerEl) {
            powerEl.textContent = state.power ? "ENCENDIDO" : "APAGADO";
            powerEl.className = state.power ? "status-value led-on" : "status-value led-off";
        }

        if (document.getElementById("val-type")) document.getElementById("val-type").textContent = state.signal_type;
        if (document.getElementById("val-freq")) document.getElementById("val-freq").textContent = formatFrequency(state.frequency);
        if (document.getElementById("val-amp")) document.getElementById("val-amp").textContent = state.amplitude + " dBm";
        if (document.getElementById("val-bw")) document.getElementById("val-bw").textContent = formatFrequency(state.bandwidth);

        // Actualizar controles inferiores (si no están en foco)
        const btnPower = document.getElementById('btn-power');
        if (btnPower) {
            btnPower.textContent = state.power ? "ENCENDIDO" : "APAGADO";
            btnPower.className = state.power ? "ctrl-btn on" : "ctrl-btn off";
        }
        
        const selectType = document.getElementById('select-type');
        if (selectType && document.activeElement !== selectType) selectType.value = state.signal_type.toLowerCase();
        
        const inputFreq = document.getElementById('input-freq');
        if (inputFreq && document.activeElement !== inputFreq) inputFreq.value = state.frequency;
        
        const inputAmp = document.getElementById('input-amp');
        if (inputAmp && document.activeElement !== inputAmp) inputAmp.value = state.amplitude;

        const inputBw = document.getElementById('input-bw');
        if (inputBw && document.activeElement !== inputBw) inputBw.value = state.bandwidth;

        // Actualizar gráfica
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
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = sender === 'user' ? 'msg-user' : 'msg-bot';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {
    if (!chatInput) return;
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
        
        if (!list) return;

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
initAvatarAnimation(); // <-- Agrega esta línea aquí
setInterval(fetchAndUpdateInstrument, 1000); 
setInterval(fetchCommits, 2000);

// ==========================================
// FASE 3: MOTOR DE VOZ Y SINCRONIZACIÓN LABIAL
// ==========================================
function initVoiceAgent() {
    const btnMic = document.getElementById('btn-mic');
    const statusText = document.getElementById('agent-status-text');
    const svgEyes = document.getElementById('agent-eyes');
    const btnPower = document.getElementById('btn-power-manual');

    // 1. Configurar STT (Speech to Text - Reconocimiento nativo)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        statusText.textContent = "Tu navegador no soporta voz.";
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;

    // Al hacer clic en el micrófono
    btnMic.addEventListener('click', () => {
        try {
            recognition.start();
            btnMic.classList.add('listening');
            statusText.textContent = "Escuchando...";
        } catch (e) {
            console.log("El micrófono ya está activo.");
        }
    });

    // Cuando detecta lo que dijiste
    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        btnMic.classList.remove('listening');
        statusText.textContent = `Entendido: "${command}"`;
        
        // Mini-motor lógico temporal para probar interacción
        let reply = "No entendí la instrucción, pero sigo procesando.";
        
        if (command.includes("encender") || command.includes("enciende")) {
            reply = "Secuencia de encendido iniciada. Activando el generador.";
            btnPower.textContent = "⚡ Apagar Lab";
            btnPower.style.borderColor = "#EF4444"; // Cambia a rojo
        } else if (command.includes("apagar") || command.includes("apaga")) {
            reply = "Apagando el laboratorio de inmediato.";
            btnPower.textContent = "⚡ Encender Lab";
            btnPower.style.borderColor = "#10B981"; // Vuelve a verde
        } else if (command.includes("frecuencia")) {
            reply = "Voy a preparar la modulación de frecuencia. Quedo a la espera de los parámetros numéricos.";
        }
        
        // Hacer hablar al agente
        speakAgent(reply, svgEyes, statusText);
    };

    recognition.onerror = () => {
        btnMic.classList.remove('listening');
        statusText.textContent = "Error o silencio detectado.";
    };
}

// 2. Configurar TTS (Text to Speech) y vibración de ojos
function speakAgent(text, svgEyes, statusText) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05; // Velocidad ligeramente robótica/ágil
    utterance.pitch = 1;

    // Simular sincronización labial cambiando la escala Y rápidamente
    let lipSyncInterval = setInterval(() => {
        const scale = Math.random() * 0.7 + 0.3; // Escala entre 0.3 y 1.0
        svgEyes.style.transform = `scaleY(${scale})`;
    }, 100);

    // Cuando termina de hablar, limpiar la animación
    utterance.onend = () => {
        clearInterval(lipSyncInterval);
        svgEyes.style.transform = `scaleY(1)`; // Reposo
        statusText.textContent = "Agente en reposo...";
    };

    window.speechSynthesis.speak(utterance);
}

// Ejecutar la función al cargar
initVoiceAgent();

// ==========================================
// CONTROL DE HARDWARE FÍSICO SIMULADO
// ==========================================

// 1. Simular presionar un botón (Se hunde y se ilumina)
window.toggleHardBtn = function(btn) {
    // Alterna la clase 'pressed' que activa la luz LED en CSS
    btn.classList.toggle('pressed');
    
    // Aquí a futuro enviaremos la orden al backend:
    // if(btn.classList.contains('pressed')) sendUpdate({...});
    console.log("Botón presionado:", btn.id);
};

// ==========================================
// CONTROL DE HARDWARE FÍSICO (INTERFAZ MAESTRA)
// ==========================================
let parametroActivo = 'freq'; // Por defecto la perilla controla Frecuencia

// 1. Botones de Tipo de Señal (Waveforms)
window.setFisicoSignal = function(tipo, btnElement) {
    // Apaga los demás botones y enciende el presionado
    document.querySelectorAll('.signal-btn').forEach(b => b.classList.remove('pressed'));
    btnElement.classList.add('pressed');

    // Mueve el selector oculto y dispara el evento que ya tienes programado
    const select = document.getElementById('select-type');
    if(select) {
        select.value = tipo;
        select.dispatchEvent(new Event('change')); // Esto envía la orden a Google
    }
};

// 2. Botones de Selección de Parámetro (Control)
window.setFisicoParam = function(param, btnElement) {
    // Apaga los demás parámetros y enciende el presionado
    document.querySelectorAll('.param-btn').forEach(b => b.classList.remove('pressed'));
    btnElement.classList.add('pressed');

    parametroActivo = param;
    console.log("Perilla asignada a:", param.toUpperCase());
};

// 3. Perilla Giratoria (Knob Principal)
function initMasterKnob() {
    const knob = document.getElementById('knob-main');
    if(!knob) return;

    let rotation = 0;

    knob.addEventListener('wheel', (e) => {
        e.preventDefault(); // Evita scroll de pantalla

        // Rota la perilla físicamente
        rotation += (e.deltaY < 0) ? 15 : -15; // Arriba derecha, abajo izquierda
        knob.style.transform = `rotate(${rotation}deg)`;

        // Identifica qué input oculto vamos a modificar
        let inputTarget;
        let step = 0;

        if (parametroActivo === 'freq') {
            inputTarget = document.getElementById('input-freq');
            step = 100; // Salto de frecuencia
        } else if (parametroActivo === 'amp') {
            inputTarget = document.getElementById('input-amp');
            step = 1; // Salto de amplitud
        } else if (parametroActivo === 'bw') {
            inputTarget = document.getElementById('input-bw');
            step = 50; // Salto de ancho de banda (Span/RBW)
        }

        if (inputTarget) {
            let currentValue = parseFloat(inputTarget.value);
            let newValue = (e.deltaY < 0) ? currentValue + step : currentValue - step;

            // Validar límites antes de enviar (para no romper la API)
            let min = parseFloat(inputTarget.min);
            let max = parseFloat(inputTarget.max);
            
            if (newValue >= min && newValue <= max) {
                inputTarget.value = newValue;
                inputTarget.dispatchEvent(new Event('change')); // Desencadena el envío a la API
            } else {
                console.warn(`Límite alcanzado para ${parametroActivo}`);
            }
        }
    }, { passive: false });
}

// Inicializar la perilla al cargar
initMasterKnob();