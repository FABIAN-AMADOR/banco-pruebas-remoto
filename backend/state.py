from pydantic import BaseModel
from datetime import datetime

class GeneratorState(BaseModel):
    power: bool = False
    signal_type: str = "Seno"
    frequency: float = 1000000.0  # en Hz
    amplitude: float = -10.0      # en dBm
    bandwidth: float = 100000.0   # en Hz

current_state = GeneratorState()

# Lista en memoria para guardar el historial de operaciones
operation_history = [] 

def add_history(usuario: str, accion: str):
    hora = datetime.now().strftime("%H:%M:%S")
    # Insertar el evento más reciente al inicio
    operation_history.insert(0, {"author": usuario, "message": accion, "date": hora})
    # Mantener únicamente los últimos 5 eventos para no saturar la memoria
    if len(operation_history) > 5:
        operation_history.pop()