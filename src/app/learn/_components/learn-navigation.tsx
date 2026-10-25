"use client";

import { useI18n } from "@/app/_components/language-provider";
import { LanguageSelector } from "@/app/_components/language-selector";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import styles from "../learn.module.css";

export type LearnChapterNavItem = {
  id: string;
  label: string;
  number: string;
  available: boolean;
};

type LearnNavigationProps = {
  chapters: LearnChapterNavItem[];
};

export function LearnNavigation({ chapters }: LearnNavigationProps) {
  const { t } = useI18n();
  const firstAvailable = chapters.find((chapter) => chapter.available);
  const [activeId, setActiveId] = useState(firstAvailable?.id ?? "");
  const progressRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    const chapterElements = chapters
      .filter((chapter) => chapter.available)
      .map((chapter) => document.getElementById(chapter.id))
      .filter((chapter): chapter is HTMLElement => Boolean(chapter));

    if (chapterElements.length === 0) {
      return;
    }

    let frame: number | null = null;

    const updateActiveChapter = () => {
      frame = null;
      const probe = window.innerHeight * 0.34;
      const active = chapterElements.find((chapter) => {
        const bounds = chapter.getBoundingClientRect();
        return bounds.top <= probe && bounds.bottom > probe;
      });

      if (active) {
        setActiveId(active.id);
      }
    };

    const requestUpdate = () => {
      if (frame === null) {
        frame = requestAnimationFrame(updateActiveChapter);
      }
    };

    const geometryObserver = new ResizeObserver(requestUpdate);
    chapterElements.forEach((chapter) => geometryObserver.observe(chapter));

    updateActiveChapter();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    document.addEventListener("toggle", requestUpdate, true);

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      geometryObserver.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      document.removeEventListener("toggle", requestUpdate, true);
    };
  }, [chapters]);

  useEffect(() => {
    if (CSS.supports("animation-timeline: scroll()")) {
      return;
    }

    let frame: number | null = null;

    const updateProgress = () => {
      frame = null;
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maximum > 0 ? window.scrollY / maximum : 0;
      progressRef.current?.style.setProperty(
        "--learn-progress-fallback",
        String(Math.max(0, Math.min(progress, 1))),
      );
    };

    const requestUpdate = () => {
      if (frame === null) {
        frame = requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const activeItem = itemRefs.current.get(activeId);

    if (!nav || !activeItem || !window.matchMedia("(max-width: 900px)").matches) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetLeft = activeItem.offsetLeft - (nav.clientWidth - activeItem.offsetWidth) / 2;
    nav.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [activeId]);

  const activeChapter =
    chapters.find((chapter) => chapter.id === activeId) ?? firstAvailable;

  return (
    <>
      <header className={styles.learnBar}>
        <Link className={styles.learnBrand} href="/" aria-label={t("Back to Rialo Arena")}>
          <Image
            src="/brand/rialo/rialo-lockup-off-white.svg"
            alt="Rialo"
            width={496}
            height={182}
            priority
          />
          <span>{t("Field manual")}</span>
        </Link>

        <div className={styles.chapterReadout} aria-live="polite">
          <span>{t("Chapter")}</span>
          <strong>{activeChapter?.number ?? "01"}</strong>
          <i>/</i>
          <span>{String(chapters.length).padStart(2, "0")}</span>
        </div>

        <div className={styles.headerActions}>
          <LanguageSelector />
          <Link className={styles.arenaReturn} href="/">{t("Arena")}<span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className={styles.pageProgress} aria-hidden="true">
          <span ref={progressRef} className={styles.pageProgressFill} />
        </div>
      </header>

      <nav dir="ltr" ref={navRef} className={styles.chapterNav} aria-label={t("Learn chapters")}>
        <ol>
          {chapters.map((chapter) => (
            <li
              className={
                chapter.id === activeId ? styles.activeChapterLink : undefined
              }
              key={chapter.id}
              ref={(element) => {
                if (element) {
                  itemRefs.current.set(chapter.id, element);
                } else {
                  itemRefs.current.delete(chapter.id);
                }
              }}
            >
              <span className={styles.navNumber}>{chapter.number}</span>
              {chapter.available ? (
                <a
                  dir="auto"
                  href={`#${chapter.id}`}
                  aria-current={chapter.id === activeId ? "location" : undefined}
                >
                  {chapter.label}
                </a>
              ) : (
                <span className={styles.pendingChapter} aria-disabled="true">
                  {chapter.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
