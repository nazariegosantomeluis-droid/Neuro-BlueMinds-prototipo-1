// Página de producto de AutiPal: selectores, visor de diseño, bandas, carrusel, recorrido y
// apariciones al desplazarse. Sin JavaScript la página se lee completa: todos los paneles se
// ven y el recorrido queda como lista.
// Igual que en el prototipo: nada de setInterval ni .animate(). Lo automático usa setTimeout
// y no arranca solo si el sistema pide reducir el movimiento.

const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cada grupo [data-selector] muestra los paneles [data-panel] con su mismo valor.
function selector(nombre, alCambiar = () => {}) {
  const grupo = document.querySelector(`[data-selector="${nombre}"]`);
  if (!grupo) return;
  const botones = [...grupo.querySelectorAll('button[data-valor]')];
  const paneles = [...document.querySelectorAll(`[data-panel="${nombre}"]`)];
  const elegir = (valor) => {
    for (const b of botones) b.setAttribute('aria-pressed', String(b.dataset.valor === valor));
    for (const p of paneles) p.hidden = p.dataset.valor !== valor;
    alCambiar(valor, botones.find((b) => b.dataset.valor === valor));
  };
  for (const b of botones) b.addEventListener('click', () => elegir(b.dataset.valor));
  const inicial = botones.find((b) => b.getAttribute('aria-pressed') === 'true') ?? botones[0];
  elegir(inicial.dataset.valor);
}

selector('actividad');
selector('rol');

// Bandas: el esquema de la pantalla del niño muestra tantas opciones como la banda.
const esquema = document.querySelector('[data-esquema]');
const NUMEROS = { 2: 'dos', 3: 'tres', 4: 'cuatro' };
selector('banda', (valor, boton) => {
  if (!esquema) return;
  const n = boton.dataset.opciones;
  esquema.dataset.n = n;
  esquema.setAttribute('aria-label', `Esquema de la pantalla del niño en ${valor}: el pictograma de un tren arriba y ${NUMEROS[n]} fotografías abajo.`);
});

// Visor de diseño: pantalla del niño o del adulto, en tema claro u oscuro.
const imagen = document.querySelector('[data-visor]');
const pieVisor = document.querySelector('[data-visor-pie]');
const nombreTema = document.querySelector('[data-tema-nombre]');
const visor = { vista: 'nino', tema: 'claro' };
const ALT = {
  nino: 'Pantalla del niño en Cambia la regla: fondo liso, una tarjeta arriba y dos cajas abajo',
  adulto: 'Pantalla del adulto Preparar el bloque, con las tres actividades en tarjetas y el registro a un lado',
};
const PIE = {
  nino: 'Pantalla del niño: sin logotipo, sin colores de marca y sin texto.',
  adulto: 'Pantalla del adulto: con la marca AutiPal y todo para preparar el bloque.',
};
function pintarVisor() {
  if (!imagen) return;
  imagen.src = imagen.dataset[`${visor.vista}${visor.tema === 'claro' ? 'Claro' : 'Oscuro'}`];
  imagen.alt = `${ALT[visor.vista]}, en tema ${visor.tema}.`;
  pieVisor.textContent = PIE[visor.vista];
  nombreTema.textContent = visor.tema === 'claro' ? 'Tema claro' : 'Tema oscuro';
}
selector('vista', (valor) => {
  visor.vista = valor;
  pintarVisor();
});
selector('tema', (valor) => {
  visor.tema = valor;
  pintarVisor();
});

// Carrusel de lo más destacado: avanza solo cada 6 s, con botón para pausar.
const pista = document.querySelector('[data-pista]');
const puntos = [...document.querySelectorAll('[data-puntos] button')];
const botonCarrusel = document.querySelector('[data-reproducir]');
const PAUSA_CARRUSEL = 6000;
let diapositiva = 0;
let carruselActivo = !reducir;
let esperaCarrusel = null;

function mostrarDiapositiva(i) {
  diapositiva = (i + puntos.length) % puntos.length;
  pista.style.transform = `translateX(calc(-1 * ${diapositiva} * 88%))`;
  puntos.forEach((p, j) => p.setAttribute('aria-current', String(j === diapositiva)));
}

function programarCarrusel() {
  clearTimeout(esperaCarrusel);
  if (!carruselActivo || document.hidden) return;
  esperaCarrusel = setTimeout(() => {
    mostrarDiapositiva(diapositiva + 1);
    programarCarrusel();
  }, PAUSA_CARRUSEL);
}

function reproducirCarrusel(si) {
  carruselActivo = si;
  botonCarrusel.dataset.reproduciendo = String(si);
  botonCarrusel.setAttribute('aria-label', si ? 'Pausar el carrusel' : 'Reproducir el carrusel');
  programarCarrusel();
}

if (pista && botonCarrusel) {
  puntos.forEach((p, j) =>
    p.addEventListener('click', () => {
      mostrarDiapositiva(j);
      reproducirCarrusel(false);
    }),
  );
  botonCarrusel.addEventListener('click', () => reproducirCarrusel(!carruselActivo));
  for (const enlace of document.querySelectorAll('[data-ir-diapositiva]')) {
    enlace.addEventListener('click', () => {
      mostrarDiapositiva(Number(enlace.dataset.irDiapositiva));
      reproducirCarrusel(false);
    });
  }
  document.addEventListener('visibilitychange', programarCarrusel);
  mostrarDiapositiva(0);
  reproducirCarrusel(carruselActivo);
}

// Recorrido de una sesión: un paso a la vez, con anterior, siguiente y reproducir.
const recorrido = document.querySelector('[data-recorrido]');
if (recorrido) {
  const pasos = [...recorrido.querySelectorAll('.paso')];
  const contenedorPuntos = recorrido.querySelector('[data-puntos-recorrido]');
  const botonRecorrido = recorrido.querySelector('[data-reproducir-recorrido]');
  const textoRecorrido = recorrido.querySelector('[data-texto-recorrido]');
  const PAUSA_PASO = 3800;
  let paso = 0;
  let recorridoActivo = false;
  let esperaRecorrido = null;

  const irA = (i) => {
    paso = Math.max(0, Math.min(pasos.length - 1, i));
    pasos.forEach((li, j) => {
      li.hidden = j !== paso;
    });
    puntosRecorrido.forEach((b, j) => b.setAttribute('aria-current', String(j === paso)));
  };

  const programarRecorrido = () => {
    clearTimeout(esperaRecorrido);
    if (!recorridoActivo) return;
    esperaRecorrido = setTimeout(() => {
      if (paso >= pasos.length - 1) return reproducirRecorrido(false);
      irA(paso + 1);
      programarRecorrido();
    }, PAUSA_PASO);
  };

  const reproducirRecorrido = (si) => {
    recorridoActivo = si;
    botonRecorrido.dataset.reproduciendo = String(si);
    textoRecorrido.textContent = si ? 'Pausar' : 'Reproducir';
    programarRecorrido();
  };

  const puntosRecorrido = pasos.map((li, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Paso ${i + 1}: ${li.querySelector('h3').textContent}`);
    b.append(document.createElement('span'));
    b.addEventListener('click', () => {
      irA(i);
      reproducirRecorrido(false);
    });
    contenedorPuntos.append(b);
    return b;
  });

  recorrido.classList.add('recorrido--activo');
  recorrido.querySelector('.recorrido__controles').hidden = false;
  recorrido.querySelector('[data-paso-anterior]').addEventListener('click', () => {
    irA(paso - 1);
    reproducirRecorrido(false);
  });
  recorrido.querySelector('[data-paso-siguiente]').addEventListener('click', () => {
    irA(paso + 1);
    reproducirRecorrido(false);
  });
  botonRecorrido.addEventListener('click', () => {
    if (!recorridoActivo && paso >= pasos.length - 1) irA(0);
    reproducirRecorrido(!recorridoActivo);
  });
  // «Ver el recorrido», en el héroe, baja hasta aquí y lo empieza desde el primer paso.
  document.querySelector('[data-ver-recorrido]')?.addEventListener('click', () => {
    irA(0);
    reproducirRecorrido(!reducir);
  });
  irA(0);
  reproducirRecorrido(false);
}

// El menú del celular se cierra al elegir una sección.
const menu = document.querySelector('.menu-movil');
menu?.addEventListener('click', (e) => {
  if (e.target.closest('a')) menu.open = false;
});

// Apariciones al desplazarse: solo con movimiento permitido. Sin esto, todo se ve desde el inicio.
if (!reducir && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('con-movimiento');
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('visible');
        observador.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  for (const el of document.querySelectorAll('.aparece')) observador.observe(el);
}
