/**
 * Synthesizes and plays premium, clean notification sounds using the Web Audio API.
 * This does not require any external audio files and has zero network overhead.
 */

export type SoundProfile = 'chime' | 'glass' | 'bell' | 'pop' | 'cosmic';

export const playNotificationSound = (profile: SoundProfile = 'chime') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startTime: number,
      duration: number,
      oscType: OscillatorType = 'sine',
      gainValue = 0.12,
      fadeIn = 0.05
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth volume ramp
      gain.gain.setValueAtTime(0.0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + fadeIn); // fade in
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // fade out

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    switch (profile) {
      case 'glass':
        // High-pitched crystal ping
        playTone(1320, now, 0.35, 'sine', 0.12, 0.01);
        break;

      case 'bell':
        // Rich warm bell with harmonics
        playTone(523.25, now, 0.8, 'sine', 0.08, 0.03); // C5 (fundamental)
        playTone(783.99, now, 0.6, 'sine', 0.04, 0.03); // G5 (harmonic 1)
        playTone(1046.50, now, 0.4, 'sine', 0.02, 0.03); // C6 (harmonic 2)
        break;

      case 'pop':
        // Quick modern bubble pop
        {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

          gain.gain.setValueAtTime(0.0, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        }
        break;

      case 'cosmic':
        // Futuristic sci-fi sweep
        {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.linearRampToValueAtTime(440, now + 0.25);

          gain.gain.setValueAtTime(0.0, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        }
        break;

      case 'chime':
      default:
        // Soft double-chime (default)
        playTone(659.25, now, 0.35, 'sine', 0.12, 0.05); // E5
        playTone(880.00, now + 0.08, 0.45, 'sine', 0.12, 0.05); // A5
        break;
    }
  } catch (err) {
    console.error('Failed to play notification sound:', err);
  }
};

if (typeof window !== 'undefined') {
  (window as any).playNotificationSound = playNotificationSound;
}
