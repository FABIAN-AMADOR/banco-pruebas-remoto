import json
import urllib.request
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from backend.state import current_state, operation_history, add_history
from backend.synthesis import generate_spectrum
from backend.assistant import process_chat_message

app = FastAPI(title="Banco de Pruebas Remoto")

class StateUpdate(BaseModel):
    usuario: str = "Anónimo"
    power: Optional[bool] = None
    signal_type: Optional[str] = None
    frequency: Optional[float] = None
    amplitude: Optional[float] = None
    bandwidth: Optional[float] = None

class ChatMessage(BaseModel):
    usuario: str = "Anónimo"
    message: str

@app.get("/api/state")
async def get_state():
    return current_state

@app.post("/api/update")
async def update_state(update: StateUpdate):
    if update.power is not None:
        current_state.power = update.power
        estado_str = "ENCENDIDO" if update.power else "APAGADO"
        add_history(update.usuario, f"Cambió estado a {estado_str}")
        
    if update.signal_type is not None:
        current_state.signal_type = update.signal_type
        add_history(update.usuario, f"Cambió señal a {update.signal_type}")
        
    if update.frequency is not None:
        current_state.frequency = update.frequency
        add_history(update.usuario, f"Cambió frecuencia a {update.frequency} Hz")
        
    if update.amplitude is not None:
        current_state.amplitude = update.amplitude
        add_history(update.usuario, f"Cambió amplitud a {update.amplitude} dBm")
        
    if update.bandwidth is not None:
        current_state.bandwidth = update.bandwidth
        add_history(update.usuario, f"Cambió ancho de banda a {update.bandwidth} Hz")
        
    return {"status": "success", "state": current_state}

@app.get("/api/spectrum")
async def get_spectrum():
    return generate_spectrum(current_state)

@app.post("/api/chat")
async def chat_endpoint(chat: ChatMessage):
    respuesta = process_chat_message(chat.message)
    add_history(chat.usuario, f"Comando por chat: '{chat.message}'")
    return {"response": respuesta}

@app.get("/api/commits")
async def get_history():
    return operation_history

# ==========================================
# PUENTE CON EL SISTEMA CENTRAL (GOOGLE)
# ==========================================
@app.post("/api/central")
async def proxy_central(request: Request):
    payload = await request.json()
    url = "https://script.google.com/macros/s/AKfycbzqnGeKDXXL_D25oE31Ndo1yMJbjaW3yfb4jnIQUaoeKco5lWN1AYeMOADNXhAgeQP3/exec"
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

# El montaje de estáticos siempre debe ir al final
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")