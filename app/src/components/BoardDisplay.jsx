import React from 'react';
import { cls, isLetter } from '../lib/utils';

export default function BoardDisplay({ category, wordTokens }) {
  return (
    <>
      <h2 className="text-2xl font-bold tracking-widest uppercase text-center">
        {category}
      </h2>
      <div className="flex flex-wrap justify-center gap-2 p-4 rounded-xl backdrop-blur-md bg-white/10 w-full">
        {wordTokens.map((tok, i) => {
          if (tok.type === "space") {
            return <div key={i} className="w-4 h-10 sm:h-14 flex-shrink-0 fullscreen:w-6" />;
          }
          return (
            <div key={i} className="flex gap-2">
              {tok.cells.map((cell, j) => {
                const isSpecial = !isLetter(cell.ch);
                return (
                  <div
                    key={`${i}-${j}`}
                    className={cls(
                      "w-8 h-12 sm:w-10 sm:h-16 text-2xl sm:text-3xl font-bold flex items-center justify-center rounded-md",
                      cell.shown ? "bg-yellow-300 text-black shadow-lg" : "bg-blue-950/80 text-white",
                      isSpecial && "bg-transparent text-white"
                    )}
                  >
                    {isSpecial ? cell.ch : cell.shown ? cell.ch : ""}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}