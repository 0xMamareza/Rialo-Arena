"use client";

import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function LearnMotionCoordinator() {
  useLayoutEffect(() => {
    let frame: number | null = null;

    const requestRefresh = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = null;
          ScrollTrigger.refresh();
        });
      });
    };

    const main = document.querySelector("main");
    const observer = new ResizeObserver(requestRefresh);
    if (main) observer.observe(main);

    void document.fonts.ready.then(requestRefresh);
    window.addEventListener("load", requestRefresh, { once: true });
    window.addEventListener("orientationchange", requestRefresh);
    window.addEventListener("pageshow", requestRefresh);
    document.addEventListener("toggle", requestRefresh, true);
    requestRefresh();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("load", requestRefresh);
      window.removeEventListener("orientationchange", requestRefresh);
      window.removeEventListener("pageshow", requestRefresh);
      document.removeEventListener("toggle", requestRefresh, true);
    };
  }, []);

  return null;
}
