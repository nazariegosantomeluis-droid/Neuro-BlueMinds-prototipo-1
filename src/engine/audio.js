// Audio de las consignas. Los archivos de assets/audio/ se precargan y se reproducen
// con Web Audio API. Si falta el archivo, se usa la voz del navegador en español
// (de México si existe) y se marca como "sintesis", porque su inicio es impreciso.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normLang = (v) => (v.lang || '').toLowerCase().replace('_', '-');

export function createAudio({ base = 'assets/audio/' } = {}) {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const synth = globalThis.speechSynthesis ?? null;
  const buffers = new Map(); // clave → AudioBuffer, o null si el archivo no existe
  let ctx = null;
  let gain = null;
  let volume = 1;
  let voicePromise = null;

  function context() {
    if (!ctx && AC) {
      ctx = new AC();
      gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
    }
    return ctx;
  }

  // Se llama dentro del toque de «Empezar»: iOS solo permite sonido después de un gesto.
  function unlock() {
    context()?.resume?.();
    if (synth) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    }
  }

  async function preload(keys) {
    const c = context();
    const pending = [...new Set(keys)].filter((k) => !buffers.has(k));
    await Promise.all(
      pending.map(async (k) => {
        try {
          const res = await fetch(`${base}${k}.mp3`);
          if (!res.ok || !c) throw new Error('sin archivo');
          buffers.set(k, await c.decodeAudioData(await res.arrayBuffer()));
        } catch {
          buffers.set(k, null);
        }
      }),
    );
  }

  // Voz en español: es-MX, luego es-US o es-419, luego cualquier español. null si no hay.
  function voice() {
    voicePromise ??= (async () => {
      if (!synth) return null;
      let voices = synth.getVoices();
      if (!voices.length) {
        await Promise.race([new Promise((r) => synth.addEventListener('voiceschanged', r, { once: true })), sleep(1500)]);
        voices = synth.getVoices();
      }
      const es = voices.filter((v) => normLang(v).startsWith('es'));
      return (
        es.find((v) => normLang(v) === 'es-mx') ??
        es.find((v) => ['es-us', 'es-419'].includes(normLang(v))) ??
        es[0] ??
        null
      );
    })();
    return voicePromise;
  }

  // Hay audio si existen todos los archivos del bloque o, si no, una voz en español.
  async function available(keys) {
    await preload(keys);
    if (keys.length && keys.every((k) => buffers.get(k))) return true;
    return Boolean(await voice());
  }

  async function play(key, texto) {
    const buffer = buffers.get(key);
    if (buffer && ctx) {
      if (ctx.state !== 'running') await Promise.race([ctx.resume(), sleep(300)]);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gain);
      // Inicio programado un poco en el futuro para que ocurra exactamente en `when`.
      const when = ctx.currentTime + 0.03;
      const tNow = performance.now();
      const cNow = ctx.currentTime;
      src.start(when);
      return {
        tInicio: tNow + (when - cNow) * 1000,
        fuente: 'archivo',
        latenciaMs: Number.isFinite(ctx.outputLatency) ? ctx.outputLatency * 1000 : null,
        fin: new Promise((resolve) => (src.onended = () => resolve(performance.now()))),
        stop: () => {
          try {
            src.stop();
          } catch {
            // ya había terminado
          }
        },
      };
    }
    const v = await voice();
    if (!v) return null;
    const u = new SpeechSynthesisUtterance(texto);
    u.voice = v;
    u.lang = v.lang;
    u.volume = volume;
    let markStart;
    const started = new Promise((resolve) => (markStart = resolve));
    u.onstart = () => markStart(performance.now());
    const fin = new Promise((resolve, reject) => {
      u.onend = () => resolve(performance.now());
      u.onerror = (e) => reject(new Error(e.error));
    });
    fin.catch(() => {}); // el ensayo decide qué hacer con el fallo
    synth.cancel();
    const tCall = performance.now();
    synth.speak(u);
    // Si el navegador no avisa el inicio, se toma el momento de la llamada.
    const tInicio = await Promise.race([started, sleep(1000).then(() => tCall)]);
    return { tInicio, fuente: 'sintesis', latenciaMs: null, fin, stop: () => synth.cancel() };
  }

  return {
    unlock,
    preload,
    available,
    play,
    setVolume(v) {
      volume = v;
      if (gain) gain.gain.value = v;
    },
  };
}
