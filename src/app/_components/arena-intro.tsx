"use client";

import { useI18n } from "@/app/_components/language-provider";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import styles from "./arena-intro.module.css";
import { Grainient } from "./grainient";
import { LanguageSelector } from "./language-selector";

const WORD = "RIALO";
const RESTING_WIDTH = 28;
const RESTING_WEIGHT = 120;
const ACTIVE_WIDTH = 145;
const ACTIVE_WEIGHT = 920;
const TYPOGRAPHY_RESPONSE = 0.26;
const BACKGROUND_BASE_RESPONSE = 0.085;
const BACKGROUND_ECHO_RESPONSE = 0.055;
const BACKGROUND_LIGHT_RESPONSE = 0.13;
const REFERENCE_FRAME_MS = 1000 / 60;

type IntroPhase = "open" | "closing" | "closed";

type ArenaIntroProps = {
  children: ReactNode;
  fontVariableClassName: string;
};

type Point = {
  x: number;
  y: number;
};

type LetterSettings = {
  width: number;
  weight: number;
};

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function frameRateSafeFactor(response: number, elapsedMs: number) {
  return 1 - Math.pow(1 - response, elapsedMs / REFERENCE_FRAME_MS);
}

function normalizeToViewport(value: number, viewportSize: number) {
  return Math.max(-1, Math.min(1, (value / viewportSize - 0.5) * 2));
}

export function ArenaIntro({
  children,
  fontVariableClassName,
}: ArenaIntroProps) {
  const { t, locale, direction } = useI18n();
  const [phase, setPhase] = useState<IntroPhase>("open");
  const [pressureEnabled, setPressureEnabled] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const platformRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const centersRef = useRef<Point[]>([]);
  const maxDistanceRef = useRef(1);
  const pointerRef = useRef({
    targetX: 0,
    targetY: 0,
    backgroundBaseX: 0,
    backgroundBaseY: 0,
    backgroundEchoX: 0,
    backgroundEchoY: 0,
    backgroundLightX: 0,
    backgroundLightY: 0,
    inside: false,
    initialized: false,
  });
  const settingsRef = useRef<LetterSettings[]>(
    Array.from({ length: WORD.length }, () => ({
      width: RESTING_WIDTH,
      weight: RESTING_WEIGHT,
    })),
  );

  const measureLetters = useCallback(() => {
    const word = wordRef.current;

    if (!word) {
      return;
    }

    const wordRect = word.getBoundingClientRect();
    centersRef.current = cellRefs.current.map((cell) => {
      const rect = cell?.getBoundingClientRect();

      return rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: wordRect.left + wordRect.width / 2, y: wordRect.top };
    });
    maxDistanceRef.current = Math.max(wordRect.width * 0.36, 1);

    if (!pointerRef.current.initialized) {
      const x = wordRect.left + wordRect.width / 2;
      const y = wordRect.top + wordRect.height / 2;
      pointerRef.current.targetX = x;
      pointerRef.current.targetY = y;
      pointerRef.current.backgroundBaseX = x;
      pointerRef.current.backgroundBaseY = y;
      pointerRef.current.backgroundEchoX = x;
      pointerRef.current.backgroundEchoY = y;
      pointerRef.current.backgroundLightX = x;
      pointerRef.current.backgroundLightY = y;
      pointerRef.current.initialized = true;
    }
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");

    const updateCapability = () => {
      const motionIsEnabled = !reducedMotion.matches;
      setMotionEnabled(motionIsEnabled);
      setPressureEnabled(motionIsEnabled && !coarsePointer.matches);
    };

    updateCapability();
    reducedMotion.addEventListener("change", updateCapability);
    coarsePointer.addEventListener("change", updateCapability);

    return () => {
      reducedMotion.removeEventListener("change", updateCapability);
      coarsePointer.removeEventListener("change", updateCapability);
    };
  }, []);

  useEffect(() => {
    if (phase === "closed") {
      return;
    }

    const word = wordRef.current;

    if (!word) {
      return;
    }

    let measurementFrame = requestAnimationFrame(measureLetters);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(measurementFrame);
      measurementFrame = requestAnimationFrame(measureLetters);
    });

    observer.observe(word);
    cellRefs.current.forEach((cell) => {
      if (cell) {
        observer.observe(cell);
      }
    });

    void document.fonts?.ready.then(measureLetters);

    return () => {
      cancelAnimationFrame(measurementFrame);
      observer.disconnect();
    };
  }, [measureLetters, phase]);

  useEffect(() => {
    if (phase !== "open" || !pressureEnabled) {
      return;
    }

    let animationFrame: number | null = null;
    let previousFrameTime: number | null = null;

    const animate = (frameTime: number) => {
      const pointer = pointerRef.current;
      const elapsedMs = Math.min(
        previousFrameTime === null
          ? REFERENCE_FRAME_MS
          : frameTime - previousFrameTime,
        50,
      );
      previousFrameTime = frameTime;

      const typographyFactor = frameRateSafeFactor(
        TYPOGRAPHY_RESPONSE,
        elapsedMs,
      );
      const baseFactor = frameRateSafeFactor(
        BACKGROUND_BASE_RESPONSE,
        elapsedMs,
      );
      const echoFactor = frameRateSafeFactor(
        BACKGROUND_ECHO_RESPONSE,
        elapsedMs,
      );
      const lightFactor = frameRateSafeFactor(
        BACKGROUND_LIGHT_RESPONSE,
        elapsedMs,
      );

      pointer.backgroundBaseX +=
        (pointer.targetX - pointer.backgroundBaseX) * baseFactor;
      pointer.backgroundBaseY +=
        (pointer.targetY - pointer.backgroundBaseY) * baseFactor;
      pointer.backgroundEchoX +=
        (pointer.targetX - pointer.backgroundEchoX) * echoFactor;
      pointer.backgroundEchoY +=
        (pointer.targetY - pointer.backgroundEchoY) * echoFactor;
      pointer.backgroundLightX +=
        (pointer.targetX - pointer.backgroundLightX) * lightFactor;
      pointer.backgroundLightY +=
        (pointer.targetY - pointer.backgroundLightY) * lightFactor;

      const baseX = normalizeToViewport(
        pointer.backgroundBaseX,
        window.innerWidth,
      );
      const baseY = normalizeToViewport(
        pointer.backgroundBaseY,
        window.innerHeight,
      );
      const echoX = normalizeToViewport(
        pointer.backgroundEchoX,
        window.innerWidth,
      );
      const echoY = normalizeToViewport(
        pointer.backgroundEchoY,
        window.innerHeight,
      );
      const lightX = normalizeToViewport(
        pointer.backgroundLightX,
        window.innerWidth,
      );
      const lightY = normalizeToViewport(
        pointer.backgroundLightY,
        window.innerHeight,
      );
      const intro = introRef.current;

      if (intro) {
        intro.style.setProperty("--bg-x", `${(baseX * 20).toFixed(2)}px`);
        intro.style.setProperty("--bg-y", `${(baseY * 15).toFixed(2)}px`);
        intro.style.setProperty(
          "--bg-counter-x",
          `${(echoX * -30).toFixed(2)}px`,
        );
        intro.style.setProperty(
          "--bg-counter-y",
          `${(echoY * -23).toFixed(2)}px`,
        );
        intro.style.setProperty(
          "--pointer-x",
          `${((lightX + 1) * 50).toFixed(2)}%`,
        );
        intro.style.setProperty(
          "--pointer-y",
          `${((lightY + 1) * 50).toFixed(2)}%`,
        );
      }

      letterRefs.current.forEach((letter, index) => {
        if (!letter) {
          return;
        }

        let targetWidth = RESTING_WIDTH;
        let targetWeight = RESTING_WEIGHT;

        if (pointer.inside) {
          const center = centersRef.current[index];

          if (center) {
            const distance = Math.hypot(
              pointer.targetX - center.x,
              pointer.targetY - center.y,
            );
            const proximity = smoothstep(
              1 - Math.min(distance / maxDistanceRef.current, 1),
            );
            targetWidth =
              RESTING_WIDTH + proximity * (ACTIVE_WIDTH - RESTING_WIDTH);
            targetWeight =
              RESTING_WEIGHT + proximity * (ACTIVE_WEIGHT - RESTING_WEIGHT);
          }
        }

        const current = settingsRef.current[index];
        current.width += (targetWidth - current.width) * typographyFactor;
        current.weight += (targetWeight - current.weight) * typographyFactor;
        letter.style.fontVariationSettings =
          `'wght' ${current.weight.toFixed(1)}, ` +
          `'wdth' ${current.width.toFixed(1)}, 'opsz' 144`;
      });

      animationFrame = requestAnimationFrame(animate);
    };

    const start = () => {
      if (animationFrame === null) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    const stop = () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      previousFrameTime = null;
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
    };
  }, [phase, pressureEnabled]);

  useEffect(() => {
    if (phase === "closed") {
      const main = platformRef.current?.querySelector("main");
      requestAnimationFrame(() => main?.focus({ preventScroll: true }));
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [phase]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!pressureEnabled || event.pointerType === "touch") {
      return;
    }

    pointerRef.current.targetX = event.clientX;
    pointerRef.current.targetY = event.clientY;
    pointerRef.current.inside = true;
  };

  const handlePointerLeave = () => {
    pointerRef.current.inside = false;
    pointerRef.current.targetX = window.innerWidth / 2;
    pointerRef.current.targetY = window.innerHeight / 2;
  };

  const enterArena = () => {
    if (phase !== "open") {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      setPhase("closed");
      return;
    }

    setPhase("closing");
    window.setTimeout(() => setPhase("closed"), 860);
  };

  const platformIsReady = phase === "closed";

  return (
    <div className={`${styles.stage} ${fontVariableClassName}`}>
      <div
        ref={platformRef}
        className={`${styles.platformLayer} ${
          platformIsReady ? styles.platformReady : ""
        }`}
        aria-hidden={!platformIsReady}
        inert={!platformIsReady ? true : undefined}
      >
        {children}
      </div>

      {phase !== "closed" ? (
        <section
          ref={introRef}
          className={styles.intro}
          lang={locale}
          dir={direction}
          data-phase={phase}
          aria-labelledby="arena-intro-title"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div className={styles.backgroundScene} aria-hidden="true">
            <div
              className={`${styles.backgroundLayer} ${styles.backgroundBaseLayer}`}
            >
              <Image
                src="/arena/rialo-arena-background.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className={`${styles.backgroundImage} ${styles.backgroundBase}`}
              />
            </div>
            {phase === "open" && motionEnabled ? (
              <div className={styles.grainientLayer}>
                <Grainient
                  className={styles.grainientCanvas}
                  color1="#e8e3d5"
                  color2="#010101"
                  color3="#e8e3d5"
                  timeSpeed={2.65}
                  colorBalance={0}
                  warpStrength={1.35}
                  warpFrequency={3.3}
                  warpSpeed={1.6}
                  warpAmplitude={50}
                  blendAngle={0}
                  blendSoftness={0.05}
                  rotationAmount={500}
                  noiseScale={2}
                  grainAmount={0.1}
                  grainScale={2}
                  grainAnimated={false}
                  contrast={1.5}
                  gamma={1}
                  saturation={1}
                  centerX={0}
                  centerY={0}
                  zoom={1.35}
                />
              </div>
            ) : null}
            <div
              className={`${styles.backgroundLayer} ${styles.backgroundEchoLayer}`}
            >
              <Image
                src="/arena/rialo-arena-background.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className={`${styles.backgroundImage} ${styles.backgroundEcho}`}
              />
            </div>
            <div className={styles.pointerLight} />
          </div>
          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.composition}>
            <header className={styles.identity}>
              <Image
                src="/brand/rialo/rialo-symbol-off-white.svg"
                alt=""
                width={303}
                height={331}
                className={styles.introSymbol}
                priority
              />
              <div className={styles.languageControl}>
                <LanguageSelector />
              </div>
            </header>

            <div className={styles.wordCluster}>
              <h1
                id="arena-intro-title"
                className={styles.visuallyHidden}
                aria-label="Rialo"
              >
                Rialo
              </h1>
              <div
                ref={wordRef}
                className={styles.pressureWord}
                dir="ltr"
                aria-hidden="true"
              >
                {Array.from(WORD).map((letter, index) => (
                  <span
                    className={styles.letterCell}
                    key={`${letter}-${index}`}
                    ref={(element) => {
                      cellRefs.current[index] = element;
                    }}
                    aria-hidden="true"
                  >
                    <span
                      className={styles.letter}
                      ref={(element) => {
                        letterRefs.current[index] = element;
                      }}
                    >
                      {letter}
                    </span>
                  </span>
                ))}
              </div>
              <p className={styles.arenaSubtitle}>Arena</p>
              <p className={styles.supportingLine}>
                {t("15 questions · 20 seconds each · up to 3,000 points")}
              </p>
            </div>
          </div>

          <button
            className={styles.enterButton}
            type="button"
            onClick={enterArena}
            aria-label={t("Enter Rialo Arena")}
          >
            <span className={styles.entryCue}>
              <span className={styles.entryDot} aria-hidden="true" />
              {t("Enter the Arena")}
            </span>
          </button>
        </section>
      ) : null}
    </div>
  );
}
