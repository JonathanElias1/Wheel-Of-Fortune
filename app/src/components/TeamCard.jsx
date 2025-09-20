import React from 'react';
import { cls } from '../lib/utils';

const TeamCard = ({ t, i, active, phase }) => {
  const prizeCounts = (t.prizes || []).reduce((acc, p) => {
    const key = String(p).toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const holdingCounts = (t.holding || []).reduce((acc, h) => {
    const k = String(h).toUpperCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={cls(
        "rounded-2xl p-3 sm:p-4 backdrop-blur-md bg-white/10 fullscreen:p-6 flex flex-col justify-between min-h-[84px] transform-gpu",
        i === active ? "ring-4 ring-inset ring-yellow-300 ring-offset-0" : ""
      )}
      style={{ cursor: "default" }}
      aria-current={i === active ? "true" : "false"}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-90 select-none">{t.name}</div>
          <div className="text-xs opacity-70">Total: ${t.total.toLocaleString()}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {Object.entries(prizeCounts).map(([prizeLabel, count]) => (
            <div
              key={`${prizeLabel}-${count}`}
              className={cls(
                "px-2 py-1 text-xs font-bold rounded-md",
                prizeLabel === "T-SHIRT" ? "bg-purple-600" :
                prizeLabel === "PIN" ? "bg-red-600" :
                prizeLabel === "STICKER" ? "bg-blue-600" :
                prizeLabel === "MAGNET" ? "bg-gray-600" :
                prizeLabel === "KEYCHAIN" ? "bg-orange-600" : "bg-green-600"
              )}
            >
              {prizeLabel}{count > 1 ? ` x${count}` : ""}
            </div>
          ))}
          {Array.isArray(t.holding) && t.holding.length > 0 && phase === "play" && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {Object.entries(holdingCounts).map(([label, cnt]) => (
                <div key={`holding-${label}`} className="px-2 py-1 text-[10px] font-extrabold rounded-md bg-purple-700/80 text-white">
                  HOLDING {label}{cnt > 1 ? ` x${cnt}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-black tabular-nums fullscreen:text-4xl">${t.round.toLocaleString()}</div>
    </div>
  );
};

export default TeamCard;