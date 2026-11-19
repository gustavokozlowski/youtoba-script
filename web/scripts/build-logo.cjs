// Gera o logo do youtoba (peça de grafite) e o favicon com as letras convertidas em vetor.
// As saídas ficam commitadas; rode só quando mudar o desenho: `npm run build:logo`.
const fs = require('node:fs');
const path = require('node:path');
const opentype = require('opentype.js');

const font = opentype.loadSync(path.join(__dirname, 'fonts/Knewave-Regular.ttf'));

const COLORS = {
    fill: ['#FFF25A', '#FFB321', '#FF6B2C', '#FF2E88'],
    cut: '#FFFFFF', // contorno interno e brilhos
    side: '#3B0F5C', // face da extrusão
    line: '#0E0716', // contorno externo
};

// Por letra: deslocamento vertical, rotação (graus) e escala. É o "pulo" das letras da peça.
const BOUNCE = [
    { dy: 6, rot: -10, s: 1.12 },
    { dy: -8, rot: -4, s: 0.96 },
    { dy: 4, rot: 5, s: 0.95 },
    { dy: -14, rot: -6, s: 1.05 },
    { dy: 2, rot: 4, s: 0.96 },
    { dy: -10, rot: -3, s: 1.04 },
    { dy: 4, rot: 8, s: 1.0 },
];
const SIZE = 220;
const OVERLAP = 0.07;
const BASELINE = 300;
const OUTLINE = 22;
const DEPTH = 16;
// Escorridos: índice da letra → [onde, na largura da letra; comprimento]. Só no "u" e no "a",
// para não transformar o "o" num "q".
const DRIPS = { 2: [0.8, 44], 6: [0.84, 36] };

function layout(text, bounce) {
    let x = 60;
    return [...text].map((char, i) => {
        const glyph = font.charToGlyph(char);
        const { dy, rot, s } = bounce[i];
        const size = SIZE * s;
        const glyphPath = glyph.getPath(x, BASELINE + dy, size);
        const bb = glyphPath.getBoundingBox();
        x += (glyph.advanceWidth / font.unitsPerEm) * size * (1 - OVERLAP);
        return { i, d: glyphPath.toPathData(2), bb, cx: (bb.x1 + bb.x2) / 2, cy: (bb.y1 + bb.y2) / 2, rot, end: x };
    });
}

const drip = (l) => {
    const [at, len] = DRIPS[l.i];
    const w = 22;
    const x = l.bb.x1 + (l.bb.x2 - l.bb.x1) * at;
    const top = l.bb.y2 - 16;
    return `M${x - w / 2},${top} L${x - w / 2},${top + len} A${w / 2},${w / 2} 0 0 0 ${x + w / 2},${top + len} L${x + w / 2},${top} Z`;
};

const arrow = (l) => {
    const sx = l.bb.x2 - 18;
    const sy = l.cy - 6;
    return `M${sx},${sy} C${sx + 60},${sy - 10} ${sx + 80},${sy - 60} ${sx + 70},${sy - 110} L${sx + 46},${sy - 104} L${sx + 92},${sy - 170} L${sx + 118},${sy - 92} L${sx + 94},${sy - 100} C${sx + 104},${sy - 40} ${sx + 74},${sy + 18} ${sx},${sy + 22} Z`;
};

const shine = (l) => {
    const w = l.bb.x2 - l.bb.x1;
    const h = l.bb.y2 - l.bb.y1;
    const x = l.bb.x1 + w * 0.2;
    const y = l.bb.y1 + h * 0.28;
    return `<g transform="rotate(${l.rot} ${l.cx} ${l.cy})"><path d="M${x},${y + 18} Q${x + 2},${y} ${x + 20},${y - 6}" fill="none" stroke="${COLORS.cut}" stroke-width="7" stroke-linecap="round"/><circle cx="${x - 1}" cy="${y + 34}" r="4.2" fill="${COLORS.cut}"/></g>`;
};

const star = (cx, cy, r) =>
    `<path d="M${cx},${cy - r} Q${cx + r * 0.18},${cy - r * 0.18} ${cx + r},${cy} Q${cx + r * 0.18},${cy + r * 0.18} ${cx},${cy + r} Q${cx - r * 0.18},${cy + r * 0.18} ${cx - r},${cy} Q${cx - r * 0.18},${cy - r * 0.18} ${cx},${cy - r} Z" fill="${COLORS.cut}" stroke="${COLORS.line}" stroke-width="5" stroke-linejoin="round"/>`;

/** Cada peça (letra ou seta) é desenhada inteira, em camadas, por cima da anterior. */
function stack(ref) {
    const offsets = Array.from({ length: DEPTH }, (_, k) => k + 1);
    const use = (attrs, k = 0) => `<use href="#${ref}"${k ? ` x="${(k * 0.9).toFixed(1)}" y="${k}"` : ''} ${attrs}/>`;
    return [
        ...[0, ...offsets].map((k) =>
            use(`fill="${COLORS.line}" stroke="${COLORS.line}" stroke-width="${OUTLINE}" stroke-linejoin="round"`, k),
        ),
        ...offsets.map((k) => use(`fill="${COLORS.side}"`, k)),
        use(`fill="none" stroke="${COLORS.cut}" stroke-width="6" stroke-linejoin="round"`),
        use('fill="url(#yt-fill)"'),
    ].join('');
}

function render({ text, bounce, withArrow, viewBox }) {
    const letters = layout(text, bounce);
    const defs = letters.map((l) => {
        const d = DRIPS[l.i] && withArrow ? `${l.d} ${drip(l)}` : l.d;
        return `<path id="yt-l${l.i}" d="${d}" transform="rotate(${l.rot} ${l.cx} ${l.cy})"/>`;
    });
    if (withArrow) defs.push(`<path id="yt-arrow" d="${arrow(letters.at(-1))}"/>`);
    const [f1, f2, f3, f4] = COLORS.fill;
    const pieces = [withArrow ? stack('yt-arrow') : '', ...letters.map((l) => stack(`yt-l${l.i}`) + shine(l))];
    const stars = [star(letters[0].bb.x1 + 6, letters[0].bb.y1 + 10, 26)];
    if (letters[3]) stars.push(star(letters[3].bb.x2 + 4, letters[3].bb.y1 - 6, 16));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(letters)}" role="img" aria-label="youtoba">
<defs>${defs.join('')}<linearGradient id="yt-fill" x1="0" y1="120" x2="40" y2="350" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${f1}"/><stop offset=".42" stop-color="${f2}"/><stop offset=".42" stop-color="${f3}"/><stop offset="1" stop-color="${f4}"/></linearGradient></defs>
${pieces.join('')}${stars.join('')}
</svg>
`;
}

const logo = render({
    text: 'youtoba',
    bounce: BOUNCE,
    withArrow: true,
    viewBox: (letters) => `20 40 ${Math.ceil(letters.at(-1).end + 120)} 380`,
});
const favicon = render({
    text: 'y',
    bounce: [{ dy: 0, rot: -8, s: 1 }],
    withArrow: false,
    viewBox: ([y]) => {
        const side = Math.max(y.bb.x2 - y.bb.x1, y.bb.y2 - y.bb.y1) + 90;
        return `${y.bb.x1 - 40} ${y.bb.y1 - 40} ${side} ${side}`;
    },
});

const web = path.join(__dirname, '..');
fs.writeFileSync(path.join(web, 'src/assets/logo.svg'), logo);
fs.writeFileSync(path.join(web, 'public/favicon.svg'), favicon);
console.log('logo.svg e favicon.svg gerados');
