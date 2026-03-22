const express = require('express');
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)];
}

function parseColor(color) {
    if (color.startsWith('#')) return hexToRgb(color);
    const m = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (m) return hslToRgb(+m[1], +m[2], +m[3]);
    return [128, 128, 128];
}

function renderToPPM(voxels, width, height, length, angle) {
    const W = 600, H = 400;
    const pixels = new Uint8Array(W * H * 3).fill(26);
    pixels.fill(26, 0, W * H * 3);
    for (let i = 0; i < W * H * 3; i += 3) { pixels[i] = 26; pixels[i+1] = 26; pixels[i+2] = 46; }

    const maxDim = Math.max(width, height, length);
    const scale = Math.min(W, H) / (maxDim * 2.2);
    const cosA = Math.cos(angle), sinA = Math.sin(angle);

    const projected = voxels.map(v => {
        const rx = (v.x - width/2) * cosA - (v.z - length/2) * sinA;
        const rz = (v.x - width/2) * sinA + (v.z - length/2) * cosA;
        const sx = Math.round(W/2 + rx * scale);
        const sy = Math.round(H * 0.65 - (v.y - height/2) * scale - rz * scale * 0.5);
        return { ...v, sx, sy, depth: rz + v.y * 0.01 };
    });
    projected.sort((a, b) => a.depth - b.depth);

    const s = Math.max(1, Math.round(scale * 0.98));
    for (const v of projected) {
        const rgb = parseColor(v.color);
        const light = Math.max(0.6, 1 - v.depth / (maxDim * 3));
        const r = Math.min(255, Math.round(rgb[0] * light));
        const g = Math.min(255, Math.round(rgb[1] * light));
        const b = Math.min(255, Math.round(rgb[2] * light));
        for (let dy = -s/2; dy < s/2; dy++) {
            for (let dx = -s/2; dx < s/2; dx++) {
                const px = v.sx + Math.round(dx);
                const py = v.sy + Math.round(dy);
                if (px >= 0 && px < W && py >= 0 && py < H) {
                    const idx = (py * W + px) * 3;
                    pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = b;
                }
            }
        }
    }

    // Convert to base64 PNG via PPM
    let ppm = `P6\n${W} ${H}\n255\n`;
    const header = Buffer.from(ppm, 'ascii');
    const data = Buffer.concat([header, Buffer.from(pixels)]);
    return `data:image/png;base64,${data.toString('base64')}`;
}

app.post('/render', async (req, res) => {
    const { voxels, width, height, length } = req.body;
    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    const screenshots = angles.map(angle => renderToPPM(voxels, width, height, length, angle));
    res.json({ screenshots });
});

app.get('/health', (req, res) => res.json({ ok: true }));
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Renderer running on port ${PORT}`));
