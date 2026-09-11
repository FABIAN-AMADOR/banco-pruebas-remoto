import re
from backend.state import current_state

def process_chat_message(message: str) -> str:
    msg = message.lower()
    response_parts = []

    # 1. Comandos de Encendido/Apagado
    if any(word in msg for word in ["enciende", "prende", "activa"]):
        current_state.power = True
        response_parts.append("Generador encendido.")
    elif any(word in msg for word in ["apaga", "desactiva"]):
        current_state.power = False
        response_parts.append("Generador apagado.")

    # 2. Comandos de Tipo de Señal
    if "seno" in msg or "senoidal" in msg:
        current_state.signal_type = "Seno"
        response_parts.append("Señal cambiada a Senoidal.")
    elif "cuadrada" in msg:
        current_state.signal_type = "Cuadrada"
        response_parts.append("Señal cambiada a Cuadrada.")
    elif "ruido" in msg:
        current_state.signal_type = "Ruido"
        response_parts.append("Señal cambiada a Ruido.")
    elif "voz" in msg:
        current_state.signal_type = "Voz"
        response_parts.append("Señal cambiada a Voz.")

    # 3. Comandos de Frecuencia
    freq_match = re.search(r'(\d+(?:\.\d+)?)\s*(hz|khz|mhz)', msg)
    if freq_match:
        val = float(freq_match.group(1))
        unit = freq_match.group(2)
        multiplier = 1000000 if unit == 'mhz' else (1000 if unit == 'khz' else 1)
        final_freq = val * multiplier
        
        if 0 <= final_freq <= 5000000:
            current_state.frequency = final_freq
            response_parts.append(f"Frecuencia ajustada a {val} {unit.upper()}.")
        else:
            response_parts.append("Error: Frecuencia fuera de rango (Máximo 5 MHz).")

    # 4. Comandos de Amplitud
    amp_match = re.search(r'(-?\d+(?:\.\d+)?)\s*dbm', msg)
    if amp_match:
        val = float(amp_match.group(1))
        if -120 <= val <= 20:
            current_state.amplitude = val
            response_parts.append(f"Amplitud ajustada a {val} dBm.")
        else:
            response_parts.append("Error: Amplitud fuera de rango (-120 a 20 dBm).")

    # 5. Consultas de Estado
    if "estado" in msg or "cómo está" in msg:
        estado_str = "encendido" if current_state.power else "apagado"
        freq_mhz = current_state.frequency / 1000000
        return f"El generador está {estado_str}. Señal: {current_state.signal_type}, Frecuencia: {freq_mhz} MHz, Amplitud: {current_state.amplitude} dBm."

    if not response_parts:
        return "No he comprendido el comando. Puedes pedirme cosas como: 'Enciende el equipo y pon una señal cuadrada a 2 MHz y -10 dBm'."

    return " ".join(response_parts)