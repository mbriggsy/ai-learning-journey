import yaml
import numpy as np
from game.track import Track

with open('configs/default.yaml', 'r') as f:
    config = yaml.safe_load(f)

track = Track.from_config(config)
spawn_x, spawn_y, spawn_angle = track.get_spawn_position()
print(f'Spawn: ({spawn_x:.1f}, {spawn_y:.1f}), angle={np.degrees(spawn_angle):.1f} deg')

progress = track.get_track_progress(spawn_x, spawn_y)
print(f'Track progress at spawn: {progress:.3f}')

curvatures = track.get_curvature_lookahead(progress, 3)
print(f'Curvature lookahead: {[f"{c:.3f}" for c in curvatures]}')
print(f'  (0.0=sharp left, 0.5=straight, 1.0=sharp right)')

base = int(progress)
print(f'Base idx: {base}')
for i in range(-1, 6):
    idx = (base + i) % len(track.centerline)
    c = track.get_curvature_at_index(idx)
    print(f'  idx {idx}: curvature={c:.3f}')
