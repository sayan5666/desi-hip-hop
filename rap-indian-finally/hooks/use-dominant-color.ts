"use client";

import { useState, useEffect } from "react";
import { FastAverageColor } from "fast-average-color";

export function useDominantColor(imageUrl: string, defaultColor: string = "#F27D26") {
  const [color, setColor] = useState(defaultColor);

  useEffect(() => {
    if (!imageUrl || typeof window === "undefined") return;
    
    let isMounted = true;
    let fac: FastAverageColor | null = null;

    try {
      fac = new FastAverageColor();
      fac.getColorAsync(imageUrl, { algorithm: "dominant" })
        .then((res) => {
          if (isMounted && res?.hex) {
            setColor(res.hex);
          }
        })
        .catch(() => {
          // Gracefully keep current/default color on CORS or network error
        });
    } catch (e) {
      // Fallback silently
    }

    return () => {
      isMounted = false;
      if (fac) {
        try {
          fac.destroy();
        } catch {}
      }
    };
  }, [imageUrl, defaultColor]);

  return color;
}

