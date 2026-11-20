// Gera o logo do youtoba ("chiclete e grafite", letra Anton) e o favicon com as letras em vetor.
// As saídas ficam commitadas; rode só quando mudar o desenho: `npm run build:logo`.
const fs = require('node:fs');
const path = require('node:path');
const opentype = require('opentype.js');

const loadFont = (file) => opentype.loadSync(path.join(__dirname, 'fonts', file));
// Anton (alta) no logo; Archivo Black (larga) no favicon, que precisa ler em 16 px.
const ANTON = loadFont('Anton-Regular.woff');
const ARCHIVO = loadFont('ArchivoBlack-Regular.woff');

// Rosa chiclete manda (face), grafite sustenta (bloco), creme de adesivo separa do fundo.
const COLORS = {
    face: ['#FFA6D2', '#FF4FA3'], // degradê de cima para baixo
    bevel: '#FFE0EF', // chanfro de luz na borda de cima/esquerda da letra
    side: ['#5C5C6B', '#1F1F27'], // bloco: claro perto da face, escuro no fundo
    sticker: '#F5EFE3', // borda de adesivo em volta da peça
    ink: '#0B0B12', // contorno
};

const hex = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) =>
    `#${hex(a)
        .map((v, i) =>
            Math.round(v + (hex(b)[i] - v) * t)
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;

function wordPath(font, text, size, track) {
    let x = 40;
    const parts = [...text].map((ch) => {
        const glyph = font.charToGlyph(ch);
        const d = glyph.getPath(x, 40 + size, size).toPathData(2);
        x += (glyph.advanceWidth / font.unitsPerEm) * size + track;
        return d;
    });
    const bb = font.getPath(text, 40, 40 + size, size, { letterSpacing: track / size }).getBoundingBox();
    return { d: parts.join(' '), bb, right: x - track };
}

const [dx, dy] = [0.75, 1]; // extrusão para baixo e à direita

/** Caixa que cabe a palavra, o bloco e o adesivo; quadrada para o favicon. */
function viewBox(bb, right, depth, pad, square) {
    const w = right - bb.x1 + dx * depth + pad * 2;
    const h = bb.y2 - bb.y1 + dy * depth + pad * 2;
    if (!square) return [bb.x1 - pad, bb.y1 - pad, w, h];
    const side = Math.max(w, h);
    return [bb.x1 - pad - (side - w) / 2, bb.y1 - pad - (side - h) / 2, side, side];
}

/** Peça em camadas: adesivo, contorno, bloco sombreado, chanfro e face. */
function render({ font, text, size, track, depth, outline, id, square = false }) {
    const { d, bb, right } = wordPath(font, text, size, track);
    const border = outline * 1.4;
    const box = viewBox(bb, right, depth, outline + border + 10, square);
    const steps = Array.from({ length: depth + 1 }, (_, k) => k);
    const use = (attrs, k = 0, shift = 0) =>
        `<use href="#${id}-w" x="${(k * dx + shift).toFixed(1)}" y="${(k * dy + shift).toFixed(1)}" ${attrs}/>`;
    const stroke = (color, width) =>
        `fill="${color}" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"`;

    const layers = [
        ...steps.map((k) => use(stroke(COLORS.sticker, (outline + border) * 2), k)),
        ...steps.map((k) => use(stroke(COLORS.ink, outline * 2), k)),
        // do fundo para a frente, clareando: a luz vem de cima à esquerda
        ...steps
            .slice(1)
            .reverse()
            .map((k) => use(`fill="${mix(COLORS.side[0], COLORS.side[1], (k - 1) / (depth - 1))}"`, k)),
        use(
            `fill="none" stroke="${COLORS.ink}" stroke-width="${Math.max(3, outline * 0.45)}" stroke-linejoin="round"`,
            1,
        ),
        `<g clip-path="url(#${id}-c)">${use(`fill="${COLORS.bevel}"`)}${use(`fill="url(#${id}-f)"`, 0, Math.max(3, size * 0.022))}</g>`,
    ];
    const [top, low] = COLORS.face;
    const defs = `<linearGradient id="${id}-f" x1="0" y1="${bb.y1}" x2="0" y2="${bb.y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${low}"/></linearGradient><path id="${id}-w" d="${d}"/><clipPath id="${id}-c"><use href="#${id}-w"/></clipPath>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.map((n) => n.toFixed(0)).join(' ')}" role="img" aria-label="youtoba"><defs>${defs}</defs>${layers.join('')}</svg>\n`;
}

const logo = render({ font: ANTON, text: 'YOUTOBA', size: 230, track: 6, depth: 36, outline: 12, id: 'yt' });
const favicon = render({
    font: ARCHIVO,
    text: 'Y',
    size: 200,
    track: 0,
    depth: 24,
    outline: 10,
    id: 'yf',
    square: true,
});

const web = path.join(__dirname, '..');
fs.writeFileSync(path.join(web, 'src/assets/logo.svg'), logo);
fs.writeFileSync(path.join(web, 'public/favicon.svg'), favicon);
console.log('logo.svg e favicon.svg gerados');
