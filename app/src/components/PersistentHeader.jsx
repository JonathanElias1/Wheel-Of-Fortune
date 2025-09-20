import React from 'react';

const PersistentHeader = ({ 
  sfx, 
  phase, 
  backToSetup, 
  toggleFullscreen, 
  awaitingConsonant, 
  zoomed, 
  landed, 
  spinning, 
  showSolveModal, 
  showWinScreen, 
  bonusReadyModalVisible, 
  bonusResult, 
  showStats, 
  showBonusLetterModal, 
  showBonusSelector, 
  bonusActive, 
  bonusRevealing, 
  bonusAwaitingReady, 
  isFullscreen, 
  showBonusSolveModal, 
  bonusSpinning, 
  showMysterySpinner 
}) => {
  const isPostSpinConsonantOverlay = !!awaitingConsonant && !!zoomed && landed != null;
  const isBonusPrizeSpin = phase === "bonus" && !bonusActive && !bonusRevealing && !bonusAwaitingReady && !showBonusSelector;
  
  const shouldHideHeader = !!showSolveModal ||
    !!spinning || 
    isPostSpinConsonantOverlay || 
    !!showWinScreen || 
    !!bonusReadyModalVisible || 
    !!bonusResult || 
    !!showStats || 
    !!showBonusLetterModal || 
    !!showBonusSelector || 
    isBonusPrizeSpin || 
    !!showBonusSolveModal ||
    !!bonusSpinning || 
    !!showMysterySpinner || 
    !!zoomed;

  if (shouldHideHeader) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex items-center justify-between gap-3 pointer-events-auto">
      <div className="flex items-center gap-3">
        {phase !== "setup" && (
          <button
            onClick={backToSetup}
            className="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-sm font-semibold shadow-sm hover:scale-[1.02] hover:bg-white/20 transition transform"
            aria-label="Back to setup"
          >
             Setup
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4 mr-4 justify-end">
        <button
          onClick={sfx.toggleTheme}
          className="px-3 py-2 rounded-lg bg-gradient-to-r from-white/10 to-white/5 border border-white/10 text-sm font-semibold flex items-center gap-2 hover:scale-[1.03] hover:bg-white/20 transition"
          aria-pressed={sfx.themeOn}
          title={sfx.themeOn ? "Turn music off" : "Turn music on"}
        >
          <span className="hidden sm:inline">{sfx.themeOn ? "Music On" : "Music Off"}</span>
        </button>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
          <label htmlFor="global-volume" className="sr-only">Volume</label>
          <input id="global-volume" type="range" min="0" max="1" step="0.01" value={sfx.volume} onChange={(e) => sfx.setVolume(parseFloat(e.target.value))} className="w-24 md:w-36" aria-label="Global volume" />
        </div>
        <button onClick={toggleFullscreen} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm font-semibold hover:scale-[1.03] hover:bg-white/20 transition" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={isFullscreen}>
          Fullscreen
        </button>
      </div>
    </div>
  );
};

export default PersistentHeader;