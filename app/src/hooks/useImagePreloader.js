// src/hooks/useImagePreloader.js
import { useEffect, useState } from "react";

export default function useImagePreloader() {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  useEffect(() => {
    const imagePaths = [
      '/images/hub-image.png',
      '/images/winner-icon.png'
    ];
    
    if (imagePaths.length === 0) {
      setImagesLoaded(true);
      return;
    }
    
    let loadedCount = 0;
    const totalImages = imagePaths.length;
    
    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setImagesLoaded(true);
      }
    };
    
    const onImageError = (path) => {
      console.warn(`Failed to load image: ${path}`);
      loadedCount++; // Still count as "loaded" to prevent hanging
      if (loadedCount === totalImages) {
        setImagesLoaded(true);
      }
    };
    
    imagePaths.forEach(path => {
      const img = new Image();
      img.onload = onImageLoad;
      img.onerror = () => onImageError(path);
      img.src = path;
    });
    
  }, []);

  return imagesLoaded;
}