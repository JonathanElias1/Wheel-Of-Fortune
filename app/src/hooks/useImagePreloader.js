// src/hooks/useImagePreloader.js
import { useState, useEffect } from "react";

export default function useImagePreloader(imageList = []) {
  const [loaded, setLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const total = imageList.length;

  useEffect(() => {
    if (!imageList || imageList.length === 0) {
      setLoaded(true);
      setLoadedCount(0);
      return;
    }

    let cancelled = false;
    let completed = 0;

    imageList.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        completed += 1;
        setLoadedCount(completed);
        if (completed === total) setLoaded(true);
      };
      img.onerror = () => {
        if (cancelled) return;
        completed += 1;
        setLoadedCount(completed);
        if (completed === total) setLoaded(true);
      };
      // start loading
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [imageList, total]);

  return { loaded, loadedCount, total };
}
