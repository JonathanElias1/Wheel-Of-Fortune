import React, { useEffect, useRef } from 'react';

const SolveModal = ({ solveGuess, setSolveGuess, handleSolve, setShowSolveModal }) => {
    const inputRef = useRef(null);
    useEffect(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }, []);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-black">Solve the Puzzle</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleSolve(); }}>
            <input ref={inputRef} type="text" value={solveGuess} onChange={(e) => setSolveGuess(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSolve(); } }} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 text-lg font-semibold text-black mb-4" placeholder="Enter your guess" autoFocus />
            <div className="flex gap-2 justify-center">
              <button type="submit" className="px-6 py-3 rounded-xl bg-purple-500 text-white font-bold">Submit</button>
              <button type="button" onClick={() => { setSolveGuess(""); setShowSolveModal(false); }} className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-bold">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
};

export default SolveModal;