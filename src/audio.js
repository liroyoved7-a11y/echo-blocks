const NOTES = [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 349.23];

export function createAudioController() {
  let context;
  let musicBus;
  let effectBus;
  let musicTimer;
  let noteIndex = 0;
  let volume = 0.38;
  let muted = false;

  function prepare() {
    if (context) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    context = new AudioContextClass();
    musicBus = context.createGain();
    effectBus = context.createGain();
    musicBus.gain.value = 0.32;
    effectBus.gain.value = 0.72;
    musicBus.connect(context.destination);
    effectBus.connect(context.destination);
    updateMusicVolume();
    return true;
  }

  function updateMusicVolume() {
    if (musicBus && context) {
      musicBus.gain.setTargetAtTime(muted ? 0 : volume * 0.32, context.currentTime, 0.04);
    }
  }

  function tone(frequency, duration, destination, wave = "sine", level = 0.18, delay = 0) {
    if (!context || !destination) return;
    const startAt = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(Math.max(level, 0.0002), startAt + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  }

  function start() {
    if (!prepare()) return;
    context.resume().catch(() => {});
    if (musicTimer) return;
    const playNextNote = () => {
      tone(NOTES[noteIndex % NOTES.length], 0.42, musicBus, "triangle", 0.09);
      noteIndex += 1;
    };
    playNextNote();
    musicTimer = window.setInterval(playNextNote, 520);
  }

  function setVolume(value) {
    const nextVolume = Number(value);
    volume = Number.isFinite(nextVolume) ? Math.min(1, Math.max(0, nextVolume)) : volume;
    updateMusicVolume();
  }

  function setMuted(value) {
    muted = Boolean(value);
    updateMusicVolume();
  }

  function playClear(combo = 1) {
    if (!prepare()) return;
    context.resume().catch(() => {});
    const safeCombo = Math.max(1, Math.min(8, Number(combo) || 1));
    const root = NOTES[(safeCombo + noteIndex) % NOTES.length] * 2;
    tone(root, 0.35, effectBus, "sine", 0.2);
    if (safeCombo >= 2) tone(root * 1.25, 0.42, effectBus, "triangle", 0.13, 0.06);
    if (safeCombo >= 3) tone(root * 1.5, 0.5, effectBus, "sine", 0.1, 0.12);
  }

  function playGameOver() {
    if (!prepare()) return;
    context.resume().catch(() => {});
    tone(392, 0.28, effectBus, "triangle", 0.13);
    tone(329.63, 0.34, effectBus, "triangle", 0.13, 0.16);
    tone(261.63, 0.5, effectBus, "sine", 0.12, 0.32);
  }

  return { start, setVolume, setMuted, playClear, playGameOver };
}

