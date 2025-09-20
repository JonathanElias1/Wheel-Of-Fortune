import React from 'react';

const MysterySpinnerModal = ({ mysteryPrize }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-8 w-full max-w-lg text-center">
        <h2 className="text-3xl font-bold mb-6 text-black">MYSTERY PRIZE!</h2>
        <div className="mb-6">
          <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center animate-spin">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center">
              <div className="text-2xl font-black text-purple-600">{mysteryPrize || "?"}</div>
            </div>
          </div>
        </div>
        <p className="text-lg text-gray-700">{mysteryPrize ? `You could win: ${mysteryPrize}!` : "Spinning for your mystery prize..."}</p>
        <p className="text-sm text-gray-500 mt-2">Solve the puzzle to claim your prize!</p>
      </div>
    </div>
);

export default MysterySpinnerModal;