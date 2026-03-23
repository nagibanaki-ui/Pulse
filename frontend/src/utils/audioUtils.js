// Soft Audio Generator for Calls
export const createSoftRingtone = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let oscillator = null;
  let gainNode = null;
  let isPlaying = false;
  let intervalId = null;

  return {
    play: () => {
      if (isPlaying) return;
      isPlaying = true;

      const playNote = () => {
        if (!isPlaying) return;

        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();

        // Soft sine wave (very gentle)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note
        
        // Very soft volume with smooth envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.2); // Very soft
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1.2);
      };

      playNote();
      intervalId = setInterval(playNote, 2000); // Play every 2 seconds
    },
    stop: () => {
      isPlaying = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (gainNode) {
        try {
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        } catch (e) {}
      }
    }
  };
};

export const playConnectedSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.error('Sound error:', e);
  }
};
