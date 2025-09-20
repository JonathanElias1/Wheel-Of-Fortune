import React from 'react';
import { cls, parseIntSafe } from '../lib/utils';
import { TEAM_NAME_MAX, MAX_TEAMS } from '../lib/constants';

const SetupPanel = ({ sfx, imagesLoaded, tempTeamCount, setTempTeamCount, applyTempTeamCount, tempRoundsCount, setTempRoundsCount, applyTempRoundsCount, teamNames, setTeamNames, teamCount, startGameFromSetup, VOWEL_COST }) => {
    
    const liveCount = (() => {
      const n = parseIntSafe(tempTeamCount);
      return Number.isFinite(n) ? Math.max(2, Math.min(MAX_TEAMS, n)) : Math.max(2, Math.min(MAX_TEAMS, teamCount));
    })();

    return (
      <div className="max-w-7xl w-full mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-center text-white [text-shadow:0_6px_18px_rgba(0,0,0,0.45)]"
          style={{ fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}
        >
          <span className="inline-block mr-2"></span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-400 to-white">Wheel of Jon-Tune</span>
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl p-6 md:p-8 backdrop-blur-md bg-white/10 border border-white/10 shadow-lg">
            <h2 className="text-3xl font-bold text-center text-white mb-8">Game Setup</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <label className="text-xl uppercase tracking-wider font-bold text-white/90 flex-1" htmlFor="team-count-input">Number of Teams</label>
                <input
                  id="team-count-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3}
                  value={tempTeamCount} onChange={(e) => setTempTeamCount(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => applyTempTeamCount()}
                  className="w-20 px-4 py-3 rounded-lg bg-black/30 text-white text-center font-bold text-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                />
              </div>
              <div>
                <div className="flex justify-between items-center gap-4 mb-2">
                  <label className="text-xl uppercase tracking-wider font-bold text-white/90 flex-1" htmlFor="rounds-count-input">Number of Main Rounds</label>
                  <input
                    id="rounds-count-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3}
                    value={tempRoundsCount} onChange={(e) => setTempRoundsCount(e.target.value.replace(/\D/g, ""))}
                    onBlur={() => applyTempRoundsCount()}
                    className="w-20 px-4 py-3 rounded-lg bg-black/30 text-white text-center font-bold text-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                  />
                </div>
                <p className="text-lg text-white/70 italic">Bonus round is a single extra round.</p>
              </div>
              <div>
                <label className="text-xl uppercase tracking-wider font-bold text-white/90 mb-3 block">Team Names</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                  {Array.from({ length: liveCount }).map((_, i) => (
                    <input
                      key={i} value={teamNames[i] || ""}
                      onChange={(e) => setTeamNames((arr) => {
                        const n = [...arr];
                        n[i] = e.target.value.slice(0, TEAM_NAME_MAX);
                        return n;
                      })}
                      className="w-full px-4 py-2 rounded-lg bg-black/20 text-white font-semibold border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                      placeholder={`Team ${i + 1}`}
                    />
                  ))}
                </div>
                <p className="text-xl text-white/70 mt-3">Max name length: {TEAM_NAME_MAX} characters.</p>
              </div>
              <div className="pt-4">
                <button
                  onClick={startGameFromSetup} disabled={!sfx.loaded || !imagesLoaded}
                  className={cls(
                    "w-full px-6 py-4 rounded-xl font-extrabold text-lg shadow-xl transform transition duration-200",
                    (!sfx.loaded || !imagesLoaded)
                      ? "bg-gray-400 text-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:-translate-y-1 active:translate-y-0"
                  )}
                >
                  {!sfx.loaded ? "Loading Sounds..." : !imagesLoaded ? "Loading Images..." : "Start Game"}
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-6 md:p-8 backdrop-blur-md bg-white/10 border border-white/10 shadow-lg">
            <h2 className="text-3xl font-bold text-center text-white mb-8">How to Play</h2>
            <div className="space-y-6 text-white/95 leading-relaxed">
              <div>
                <h3 className="font-semibold text-lg mb-2"> The Goal</h3>
                <p className="text-white/80">Work with your team to solve the word puzzle. The team with the most money at the end of all rounds wins!</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2"> On Your Turn</h3>
                <ul className="list-inside space-y-2 text-white/80">
                  <li><span className="font-bold">Spin the Wheel:</span> Land on a dollar amount and guess a consonant.</li>
                  <li><span className="font-bold">Buy a Vowel:</span> Pay ${VOWEL_COST} to reveal a vowel.</li>
                  <li><span className="font-bold">Solve the Puzzle:</span> Guess the entire phrase to win the round!</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2"> Watch Out For...</h3>
                <ul className="list-inside space-y-2 text-white/80">
                  <li><strong className="text-red-400">Bankrupt:</strong> You lose all your money for the current round.</li>
                  <li><strong>Lose a Turn:</strong> Your turn ends immediately.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

export default SetupPanel;