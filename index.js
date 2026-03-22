const express = require('express');
const { createCanvas } = require('canvas');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

function projectVoxel(x, y, z, angleY, width, height, length, scale, offsetX, offsetY) {
    const cosA = Math.cos(angleY);
    const sinA = Math.sin(angleY);
    const rx = (x - width / 2) * cosA - (z - length / 2) * sinA;
    const rz = (x - width / 2) * sinA + (z - length / 2) * cosA;
    const screenX = offsetX + rx * scale;
    const screenY = offsetY - (y - height / 2) * scale - rz * scale * 0.5;
    return { screenX, screenY, depth: rz + y * 0.01 };
}

app.post('/render', async (req, res) => {
    const { voxels, width, height, length } = req.body;
    const W = 600, H = 400;
    const screenshots = [];
    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    const maxDim = Math.max(width, height, length);
    const scale = Math.min(W, H) / (maxDim * 2.2);

    for (const angle of angles) {
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, W, H);

        const projected = voxels.map(v => ({
            ...v,
            ...projectVoxel(v.x, v.y, v.z, angle, width, height, length, scale, W / 2, H * 0.65)
        }));

        projected.sort((a, b) => a.depth - b.depth);

        for (const v of projected) {
            const s = scale * 0.98;
            ctx.fillStyle = v.color;
            ctx.fillRect(v.screenX - s / 2, v.screenY - s / 2, s, s);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(v.screenX - s / 2, v.screenY - s / 2, s, s);
        }

        screenshots.push(canvas.toDataURL('image/jpeg', 0.85));
    }

    res.json({ screenshots });
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Renderer running on port ${PORT}`));
