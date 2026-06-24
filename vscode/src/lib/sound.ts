/**
 * Synthesizes and plays a premium, clean notification sound using the Web Audio API.
 * This does not require any external audio files and has zero network overhead.
 */
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth volume ramp
      gain.gain.setValueAtTime(0.0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05); // fade in
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // fade out

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    
    // Soft double-chime (harmonic chord progression)
    // Tone 1: E5 (659.25 Hz) at t = 0
    playTone(659.25, now, 0.35);
    
    // Tone 2: A5 (880.00 Hz) at t = 0.08
    playTone(880.00, now + 0.08, 0.45);
  } catch (err) {
    console.error('Failed to play notification sound:', err);
  }
};
