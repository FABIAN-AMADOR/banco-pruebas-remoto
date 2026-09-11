import random
import math
from backend.state import GeneratorState

def generate_spectrum(state: GeneratorState):
    f_max = 5000000.0  # 5 MHz
    num_points = 500
    step = f_max / num_points
    
    x = [i * step for i in range(num_points)]
    y = [-100.0 + random.uniform(-3, 3) for _ in range(num_points)]
    
    if state.power:
        tipo = state.signal_type.lower()
        amp = state.amplitude
        freq = state.frequency
        bw = state.bandwidth
        
        idx_center = int(freq / step)
        
        if tipo == "seno":
            if 0 <= idx_center < num_points:
                y[idx_center] = amp
                if idx_center > 0: y[idx_center-1] = amp - 30
                if idx_center < num_points - 1: y[idx_center+1] = amp - 30
                
        elif tipo == "cuadrada":
            for n in range(1, 12, 2):
                f_n = freq * n
                idx_n = int(f_n / step)
                if 0 <= idx_n < num_points:
                    arm_amp = amp if n == 1 else amp + (20 * math.log10(1/n))
                    y[idx_n] = arm_amp
                    if idx_n > 0: y[idx_n-1] = arm_amp - 30
                    if idx_n < num_points - 1: y[idx_n+1] = arm_amp - 30
                    
        elif tipo == "ruido":
            idx_start = max(0, int((freq - bw/2) / step))
            idx_end = min(num_points, int((freq + bw/2) / step))
            for i in range(idx_start, idx_end):
                y[i] = amp + random.uniform(-5, 0)
                
        elif tipo == "voz":
            idx_start = max(0, int((freq - bw/2) / step))
            idx_end = min(num_points, int((freq + bw/2) / step))
            for i in range(idx_start, idx_end):
                distancia = abs(i - idx_center) / (max(1, (idx_end - idx_start) / 2))
                y[i] = amp - (distancia * 20) + random.uniform(-15, 0)

    return {"x": x, "y": y}