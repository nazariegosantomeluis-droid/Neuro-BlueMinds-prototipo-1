// Estilo AutiPal: la marca va solo en las pantallas del adulto. La pantalla del niño conserva los
// colores y el tamaño de la versión anterior (main, a694560), salvo el marco de retroalimentación,
// que pasa a gris muy oscuro. Todo par texto/fondo cumple 4.5 a 1, no hay verde ni rojo para
// aciertos o errores, y la calibración de 5 cm no cambia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const texto = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const css = texto('src/styles.css');
const sinComentarios = (hoja) => hoja.replace(/\/\*[\s\S]*?\*\//g, '');

// Variables de :root en tema claro (todos los bloques :root fuera de @media) y en tema oscuro
// (las mismas, sobrescritas por el :root de prefers-color-scheme: dark).
function variables(hoja) {
  const limpia = sinComentarios(hoja);
  const leer = (cuerpo) => Object.fromEntries([...cuerpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
  const oscuroInicio = limpia.indexOf('@media (prefers-color-scheme: dark)');
  const oscuroCuerpo = /:root\s*\{([^}]*)\}/.exec(limpia.slice(oscuroInicio))[1];
  const fuera = limpia.slice(0, oscuroInicio) + limpia.slice(oscuroInicio).replace(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/, '');
  const claro = Object.assign({}, ...[...fuera.matchAll(/(?:^|\})\s*:root\s*\{([^}]*)\}/g)].map(([, c]) => leer(c)));
  return { claro, oscuro: { ...claro, ...leer(oscuroCuerpo) } };
}
const TEMAS = variables(css);

const resolver = (valor, vars, n = 0) => {
  const m = /^var\((--[\w-]+)\)$/.exec(valor?.trim() ?? '');
  return m && n < 10 ? resolver(vars[m[1]], vars, n + 1) : valor?.trim();
};
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v ?? '') ? v.toLowerCase() : null);
const canales = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const luminancia = (h) => {
  const [r, g, b] = canales(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// Tono (0 a 360) y saturación (0 a 1) de un color.
function tono(h) {
  const [r, g, b] = canales(h);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let t = 0;
  if (d) t = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { tono: (t * 60 + 360) % 360, saturacion: s };
}
const esVerde = (h) => {
  const { tono: t, saturacion } = tono(h);
  return saturacion > 0.25 && t >= 75 && t <= 170;
};
const esRojo = (h) => {
  const { tono: t, saturacion } = tono(h);
  return saturacion > 0.25 && (t <= 20 || t >= 340);
};

// Reglas de la hoja: selector y declaraciones, sin @media de por medio.
const reglas = [...sinComentarios(css).matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({
  selector: selector.trim(),
  decl: Object.fromEntries([...cuerpo.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()])),
}));

// ---------- Pantalla del niño ----------

test('la pantalla del niño conserva --fondo-nino, --opcion-fondo, --control y --cm de main', () => {
  const MAIN = {
    claro: { '--cm': '37.8px', '--fondo-nino': '#ecebe6', '--opcion-fondo': '#ffffff', '--control': '#8a8f94' },
    oscuro: { '--cm': '37.8px', '--fondo-nino': '#1e2023', '--opcion-fondo': '#e4e4e1', '--control': '#6c7278' },
  };
  for (const tema of ['claro', 'oscuro']) {
    for (const [k, v] of Object.entries(MAIN[tema])) assert.equal(TEMAS[tema][k]?.toLowerCase(), v, `${tema}: ${k}`);
  }
});

test('el marco de retroalimentación es #1f2937 en tema claro y #f3f4f6 en tema oscuro', () => {
  assert.equal(TEMAS.claro['--marco'].toLowerCase(), '#1f2937');
  assert.equal(TEMAS.oscuro['--marco'].toLowerCase(), '#f3f4f6');
  // Se ve sobre las opciones y sobre el fondo del niño en los dos temas (3 a 1 o más, elemento gráfico).
  for (const tema of ['claro', 'oscuro']) {
    const v = TEMAS[tema];
    assert.ok(contraste(v['--marco'], v['--fondo-nino']) >= 3, `${tema}: marco sobre el fondo`);
  }
});

test('la pantalla del niño no usa colores de la marca', () => {
  const MARCA = ['--acento', '--acento-fuerte', '--acento-suave', '--acento-presionado', '--titulo', '--marca-2', '--fondo', '--fuente-titulos', '--fuente-nombre'];
  const nino = reglas.filter((r) => /(^|[\s,])\.(nino|stage|opcion|consigna|opciones|tarjeta-regla|cajas|caja|esquina|siguiente|codigo-item|fin|terminar)\b/.test(r.selector) && !/\.adulto|\.capa/.test(r.selector));
  assert.ok(nino.length >= 8, 'se encontraron las reglas de la pantalla del niño');
  for (const { selector, decl } of nino) {
    for (const valor of Object.values(decl)) {
      for (const v of MARCA) assert.ok(!valor.includes(`var(${v})`), `${selector}: usa ${v}`);
    }
  }
});

// ---------- Contraste ----------

// Pares que la hoja usa como texto sobre fondo, además de los que aparecen juntos en una regla.
const PARES = [
  ...['--texto', '--titulo', '--suave', '--acento', '--problema'].flatMap((t) => [[t, '--fondo'], [t, '--tarjeta']]),
  ['--texto', '--aviso'],
  ['--texto', '--acento-suave'],
  ['--texto', '--acento-presionado'],
  ['--acento-texto', '--acento'],
  ['--acento-texto', '--acento-fuerte'],
  ['--problema', '--problema-suave'],
  ['--suave-nino', '--fondo-nino'],
  ['--tarjeta', '--marco'],
];

test('todo par texto/fondo de las variables tiene contraste de al menos 4.5 a 1, en los dos temas', () => {
  for (const tema of ['claro', 'oscuro']) {
    const v = TEMAS[tema];
    for (const [t, f] of PARES) {
      const [a, b] = [hex(resolver(`var(${t})`, v)), hex(resolver(`var(${f})`, v))];
      assert.ok(a && b, `${tema}: ${t} y ${f} son colores`);
      assert.ok(contraste(a, b) >= 4.5, `${tema}: ${t} (${a}) sobre ${f} (${b}) = ${contraste(a, b).toFixed(2)}`);
    }
    // Toda regla que fija a la vez color de texto y de fondo con variables.
    let revisadas = 0;
    for (const { selector, decl } of reglas) {
      const color = hex(resolver(decl.color, v));
      const fondo = hex(resolver(decl['background-color'] ?? decl.background, v));
      if (!color || !fondo) continue;
      revisadas++;
      assert.ok(contraste(color, fondo) >= 4.5, `${tema}: ${selector} = ${contraste(color, fondo).toFixed(2)}`);
    }
    assert.ok(revisadas >= 5, `${tema}: reglas con texto y fondo revisadas`);
  }
});

// ---------- Sin verde ni rojo para aciertos o errores ----------

test('no hay verde en ninguna parte ni rojo para aciertos o errores del niño', () => {
  // Ninguna variable de color es verde.
  for (const tema of ['claro', 'oscuro']) {
    for (const [k, valor] of Object.entries(TEMAS[tema])) {
      const h = hex(valor);
      if (h) assert.ok(!esVerde(h), `${tema}: ${k} = ${h} es verde`);
    }
  }
  for (const [h] of sinComentarios(css).matchAll(/#[0-9a-f]{6}\b/gi)) assert.ok(!esVerde(h), `${h} es verde`);
  // Las reglas de la retroalimentación y de la respuesta correcta solo usan colores neutros.
  const deResultado = reglas.filter((r) => /correcta|incorrecta|acierto|\.error(?![\w-])|marco|resultado|omision/.test(r.selector));
  assert.ok(deResultado.some((r) => r.selector.includes('.opcion.marco')));
  for (const tema of ['claro', 'oscuro']) {
    for (const { selector, decl } of deResultado) {
      for (const valor of Object.values(decl)) {
        for (const [, v] of valor.matchAll(/var\((--[\w-]+)\)/g)) {
          const h = hex(resolver(`var(${v})`, TEMAS[tema]));
          if (h) assert.ok(!esVerde(h) && !esRojo(h), `${tema}: ${selector} usa ${v} (${h})`);
        }
      }
    }
  }
  // La pantalla del niño marca siempre la opción correcta con el mismo marco, sin clases de acierto o error.
  for (const m of ['seleccion', 'cambia-regla']) {
    const src = texto(`src/activities/${m}.js`);
    assert.doesNotMatch(src, /classList\.add\('(acierto|error|incorrecta|correcta)'\)/, m);
    assert.match(src, /classList\.add\('marco'\)/, m);
  }
  // El color de los problemas (rojo) solo va en avisos de formulario, en «Borrar registro» y en
  // los ítems retirados por la revisión clínica; nunca en la pantalla del niño.
  for (const { selector, decl } of reglas) {
    if (!Object.values(decl).some((v) => v.includes('var(--problema'))) continue;
    assert.match(selector, /error-campo|aria-invalid|mensaje|problemas|peligro|retirado|campo|\.f3|\.rev|:root/, selector);
  }
});

// ---------- Calibración ----------

test('la calibración de 5 cm no cambia', () => {
  // Hoja de estilos: la misma regla de 5 cm y la misma muestra de 2 cm con 0.5 cm de separación.
  const limpia = sinComentarios(css);
  assert.match(limpia, /\.regla \{\s*position: relative;\s*width: calc\(var\(--cm\) \* 5 \+ 2px\);\s*height: calc\(var\(--cm\) \* 1\.4\);/);
  assert.match(limpia, /repeating-linear-gradient\(to right, var\(--texto\) 0 1px, transparent 1px calc\(var\(--cm\) \/ 10\)\)/);
  assert.match(limpia, /repeating-linear-gradient\(to right, var\(--texto\) 0 2px, transparent 2px var\(--cm\)\)/);
  assert.match(limpia, /\.muestra-minima \{\s*display: flex;\s*gap: calc\(var\(--cm\) \* 0\.5\);\s*\}/);
  assert.match(limpia, /\.muestra-minima span \{\s*width: calc\(var\(--cm\) \* 2\);\s*height: calc\(var\(--cm\) \* 2\);/);
  // Página: marcas de 0 a 5 cm, ajuste de 20 a 120 px por cm en pasos de 0.1.
  const paginas = texto('src/paginas.js');
  assert.ok(paginas.includes('${[0, 1, 2, 3, 4, 5].map((i) => `<span style="left: calc(var(--cm) * ${i})">${i}</span>`).join(\'\')}'));
  assert.ok(paginas.includes('<input type="range" min="20" max="120" step="0.1" value="${px}" id="cm-ajuste">'));
  assert.ok(paginas.includes('px = Math.min(120, Math.max(20, Math.round(v * 10) / 10));'));
  // Aplicación: la misma estimación de --cm y el mismo valor guardado en el dispositivo.
  const app = texto('src/app.js');
  assert.ok(app.includes("matchMedia('(pointer: coarse)').matches ? Math.hypot(screen.width, screen.height) / (10 * 2.54) : 96 / 2.54"));
  assert.ok(app.includes("saved: () => Number(prefs.get('nbm.cm', '')) || null,"));
  assert.ok(app.includes("set: (px) => document.documentElement.style.setProperty('--cm', `${px}px`),"));
});

// ---------- Encabezado ----------

test('el encabezado del adulto lleva AutiPal, la línea de la herramienta y el aviso de prototipo', async () => {
  const { marcaHTML, navHTML, LINEA_HERRAMIENTA, AVISO_PROTOTIPO } = await import('../src/paginas.js');
  assert.equal(LINEA_HERRAMIENTA, 'Herramienta de apoyo y medición para el terapeuta');
  assert.equal(AVISO_PROTOTIPO, 'Prototipo para revisión de expertos. No es una herramienta diagnóstica.');
  for (const html of [marcaHTML(), navHTML('inicio'), navHTML('galeria')]) {
    assert.match(html, /alt="AutiPal"/);
    assert.ok(html.includes(`<p class="marca-linea">${LINEA_HERRAMIENTA}</p>`));
    assert.ok(html.includes(`<p class="aviso marca-aviso">${AVISO_PROTOTIPO}</p>`));
  }
  // Visible: el aviso no se oculta en ninguna regla de la hoja.
  for (const { selector, decl } of reglas.filter((r) => /aviso/.test(r.selector))) {
    assert.notEqual(decl.display, 'none', selector);
    assert.notEqual(decl.visibility, 'hidden', selector);
  }
  const index = texto('index.html');
  assert.match(index, /<title>AutiPal · Prototipo E13<\/title>/);
  // Todas las pantallas del adulto con pestañas usan el encabezado común.
  for (const ruta of ['src/inicio.js', 'src/sesiones.js', 'src/revision.js', 'src/f3.js', 'src/ninos-pantalla.js']) assert.match(texto(ruta), /navHTML\(/, ruta);
});
