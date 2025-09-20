import React from 'react';
import { VOWELS, VOWEL_COST } from '../lib/constants';
import { cls } from '../lib/utils';

const VowelModal = ({ handleBuyVowel, letters, isRevealingLetters, setShowVowelModal }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">Buy a Vowel (${VOWEL_COST})</h2>
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from(VOWELS).map((vowel) => (
            <button key={vowel} onClick={() => handleBuyVowel(vowel)} disabled={isRevealingLetters || letters.has(vowel)} className={cls("w-12 h-12 rounded-lg text-lg font-bold", letters.has(vowel) ? "bg-gray-400 text-gray-600" : "bg-blue-500 text-white")}>
              {vowel}
            </button>
          ))}
        </div>
        <button onClick={() => setShowVowelModal(false)} className="mt-4 px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-semibold">Cancel</button>
      </div>
    </div>
);

export default VowelModal;