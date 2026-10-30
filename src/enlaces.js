// Enlaces opcionales de config/enlaces.json. Si el archivo no existe, no se muestra nada.
let enlaces = null;
const cargar = () => (enlaces ??= fetch('config/enlaces.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

// En la galería: «Calificar en el formulario F3» abre el formulario de expertos en otra pestaña.
export async function agregarEnlaceF3(app) {
  const { formularioF3 } = (await cargar()) ?? {};
  // Solo direcciones https, y solo si la galería sigue en pantalla.
  if (!/^https:\/\//.test(formularioF3 ?? '') || !location.hash.startsWith('#galeria') || app.querySelector('#formulario-f3')) return;
  const boton = Object.assign(document.createElement('button'), {
    type: 'button',
    id: 'formulario-f3',
    className: 'primario',
    textContent: 'Calificar en el formulario F3',
  });
  boton.style.marginBottom = '0.75rem'; // sin tocar styles.css
  boton.onclick = () => open(formularioF3, '_blank', 'noopener');
  app.querySelector('h1')?.after(boton);
}
