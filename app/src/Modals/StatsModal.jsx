import React from 'react';

const StatsModal = ({ setShowStats, gameStats, teams }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
    <div className="bg-white rounded-xl p-6 w-full max-w-4xl text-center max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowStats(false)}
          aria-label="Close statistics"
          className="px-3 py-2 rounded-lg bg-red-500 text-white border border-red-600 hover:bg-red-600 text-sm font-semibold"
        >
          Close
        </button>
        <h2 className="text-2xl font-bold text-black flex-1 text-center">Game Statistics</h2>
        <div className="w-16"></div> 
      </div>
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4 text-black">Overall Game Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-black">
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{gameStats.totalSpins}</div>
            <div className="text-sm">Total Spins</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{gameStats.puzzlesSolved}</div>
            <div className="text-sm">Puzzles Solved</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{gameStats.vowelsBought}</div>
            <div className="text-sm">Vowels Bought</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{gameStats.correctGuesses}</div>
            <div className="text-sm">Correct Guesses</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{gameStats.incorrectGuesses}</div>
            <div className="text-sm">Wrong Guesses</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{gameStats.bankrupts}</div>
            <div className="text-sm">Bankrupts</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{gameStats.loseTurns}</div>
            <div className="text-sm">Lose a Turn</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{gameStats.correctGuesses + gameStats.incorrectGuesses === 0 ? "N/A" : Math.round((gameStats.correctGuesses / (gameStats.correctGuesses + gameStats.incorrectGuesses)) * 100) + "%"}</div>
            <div className="text-sm">Accuracy</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-cyan-600">{gameStats.puzzlesStarted > 0 ? Math.round((gameStats.puzzlesSolved / gameStats.puzzlesStarted) * 100) + "%" : "N/A"}</div>
            <div className="text-sm">Completion Rate</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{gameStats.gameStartTime ? Math.round((Date.now() - gameStats.gameStartTime) / 60000) + "m" : "N/A"}</div>
            <div className="text-sm">Game Duration</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-pink-600">${gameStats.maxComeback.toLocaleString()}</div>
            <div className="text-sm">Biggest Comeback</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Number.isFinite(gameStats.totalTurnTime) && (gameStats.turnCount || 0) > 0 ? Math.round((gameStats.totalTurnTime || 0) / (gameStats.turnCount || 1) / 1000) + "s" : "N/A"}
            </div>
            <div className="text-sm">Avg Turn Time</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-teal-600">
              {(gameStats.vowelSuccesses + gameStats.vowelFailures) > 0 ? Math.round((gameStats.vowelSuccesses / (gameStats.vowelSuccesses + gameStats.vowelFailures)) * 100) + "%" : "N/A"}
            </div>
            <div className="text-sm">Vowel Success Rate</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-lg font-bold text-red-600">
              {Object.entries(gameStats.incorrectLetters || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([letter, count]) => `${letter}(${count})`)
                .join(" ") || "None"}
            </div>
            <div className="text-sm">Most Missed Letters</div>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 text-black">Team Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team, i) => (
            <div key={i} className="bg-gray-50 p-4 rounded-lg text-black">
              <h4 className="font-bold text-lg mb-3">{team.name}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Score:</span><span className="font-bold">${team.total.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Puzzles Won:</span><span className="font-bold">{gameStats.teamStats[team.name]?.puzzlesSolved || 0}</span></div>
                <div className="flex justify-between"><span>Correct Guesses:</span><span className="font-bold">{gameStats.teamStats[team.name]?.correctGuesses || 0}</span></div>
                <div className="flex justify-between"><span>Wrong Guesses:</span><span className="font-bold">{gameStats.teamStats[team.name]?.incorrectGuesses || 0}</span></div>
                <div className="flex justify-between">
                  <span>Efficiency:</span>
                  <span className="font-bold">
                    {(gameStats.teamStats[team.name]?.totalTurns || 0) > 0 ? Math.round(team.total / (gameStats.teamStats[team.name]?.totalTurns || 1)) : 0} pts/action
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Turn Time:</span>
                  <span className="font-bold">
                    {Number.isFinite(gameStats.teamStats?.[team.name]?.avgTurnTime) ? Math.round(gameStats.teamStats[team.name].avgTurnTime / 1000) + "s" : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between"><span>Correct Letter Streak:</span><span className="font-bold">{gameStats.teamStats[team.name]?.maxConsecutive || 0}</span></div>
                <div className="flex justify-between"><span>Vowels Bought:</span><span className="font-bold">{gameStats.teamStats[team.name]?.vowelsBought || 0}</span></div>
                <div className="flex justify-between"><span>Vowel Success Rate:</span><span className="font-bold">{(() => { const successes = gameStats.teamStats[team.name]?.vowelSuccesses || 0; const failures = gameStats.teamStats[team.name]?.vowelFailures || 0; return (successes + failures) > 0 ? Math.round((successes / (successes + failures)) * 100) + "%" : "N/A"; })()}</span></div>
                <div className="flex justify-between"><span>Spins:</span><span className="font-bold">{gameStats.teamStats[team.name]?.spins || 0}</span></div>
                <div className="flex justify-between"><span>Bankrupts:</span><span className="font-bold">{gameStats.teamStats[team.name]?.bankrupts || 0}</span></div>
                <div className="flex justify-between"><span>Lose a Turn:</span><span className="font-bold">{gameStats.teamStats[team.name]?.loseTurns || 0}</span></div>
                <div className="flex justify-between"><span>Biggest Comeback:</span><span className="font-bold">${(gameStats.teamStats[team.name]?.biggestComeback || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Solved While Behind:</span><span className="font-bold">{gameStats.teamStats[team.name]?.solveWhenBehind || 0}</span></div>
                {team.prizes && team.prizes.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold">Prizes: </span>
                    {team.prizes.map((prize, idx) => (<span key={idx} className="inline-block px-1 py-0.5 text-xs bg-blue-200 rounded mr-1">{prize}</span>))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => setShowStats(false)} className="px-6 py-3 rounded-xl bg-red-500 text-white border border-red-600 hover:bg-red-600 font-bold">Close</button>
    </div>
  </div>
);

export default StatsModal;