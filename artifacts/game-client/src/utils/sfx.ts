type SoundName = "spin" | "click" | "bang" | "toasty";

const SOUNDS: Record<SoundName, { src: string; volume: number }> = {
  spin:   { src: "/spin.mp3",   volume: 1 },
  click:  { src: "/click.mp3",  volume: 1 },
  bang:   { src: "/bang.mp3",   volume: 1 },
  toasty: { src: "/toasty.mp3", volume: 0.85 },
};

// One preloaded master element per sound — shared browser cache
const masters: Partial<Record<SoundName, HTMLAudioElement>> = {};

function getMaster(name: SoundName): HTMLAudioElement {
  if (!masters[name]) {
    const { src, volume } = SOUNDS[name];
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = volume;
    masters[name] = a;
  }
  return masters[name]!;
}

// Eagerly preload all sounds — call once on page load / first interaction
export function preloadSounds() {
  (Object.keys(SOUNDS) as SoundName[]).forEach(getMaster);
}

// Unlock all sounds by briefly playing them at 0 volume during a user gesture.
// Must be called from within a click/keydown handler synchronously.
export function unlockSounds() {
  (Object.keys(SOUNDS) as SoundName[]).forEach((name) => {
    const a = getMaster(name);
    const saved = a.volume;
    a.volume = 0;
    const p = a.play();
    if (p !== undefined) {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = saved;
      }).catch(() => {
        a.volume = saved;
      });
    }
  });
}

// Play a sound. Creates a lightweight clone of the preloaded element so
// rapid/overlapping plays work correctly and don't reset each other.
export function playSound(name: SoundName) {
  try {
    const master = getMaster(name);
    // cloneNode copies the src + browser's cached resource
    const clone = master.cloneNode() as HTMLAudioElement;
    clone.volume = SOUNDS[name].volume;
    const p = clone.play();
    if (p !== undefined) p.catch(() => {});
  } catch (_) {}
}
