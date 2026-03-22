const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/render', async (req, res) => {
    const { voxels, width, height, length } = req.body;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=swiftshader']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 600, height: 400 });

        const html = `
<!DOCTYPE html>
<html>
<head><style>body { margin: 0; background: #1a1a2e; }</style></head>
<body>
<canvas id="c" width="600" height="400"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const voxels = ${JSON.stringify(voxels)};
const width = ${width};
const height = ${height};
const length = ${length};

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(600, 400);
renderer.setClearColor(0x1a1a2e);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 600/400, 0.1, 2000);
const maxDim = Math.max(width, height, length);
const dist = maxDim * 1.2;

scene.add(new THREE.AmbientLight(0x8899aa, 0.6));
const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
sun.position.set(20, 40, 20);
scene.add(sun);

const geo = new THREE.BoxGeometry(0.94, 0.94, 0.94);
const materialCache = {};
voxels.forEach(({ x, y, z, color }) => {
    if (!materialCache[color]) materialCache[color] = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, materialCache[color]);
    mesh.position.set(x, y, z);
    scene.add(mesh);
});

window.screenshots = [];
const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
angles.forEach(angle => {
    const cx = width / 2 + Math.sin(angle) * dist;
    const cz = length / 2 + Math.cos(angle) * dist;
    camera.position.set(cx, dist * 0.8, cz);
    camera.lookAt(width / 2, height / 2, length / 2);
    renderer.render(scene, camera);
    window.screenshots.push(document.getElementById('c').toDataURL('image/jpeg', 0.85));
});
window.renderDone = true;
</script>
</body>
</html>`;

        await page.setContent(html);
        await page.waitForFunction('window.renderDone === true', { timeout: 30000 });
        const screenshots = await page.evaluate(() => window.screenshots);

        res.json({ screenshots });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Renderer running on port ${PORT}`));