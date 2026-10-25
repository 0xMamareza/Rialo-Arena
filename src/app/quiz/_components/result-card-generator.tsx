"use client";

import { useI18n } from "@/app/_components/language-provider";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { getPublicSiteUrl } from "@/lib/config/public-site-url";
import type { PersonalBestStats } from "@/lib/leaderboard/api-types";
import { createArenaResultShareUrl } from "@/lib/share/arena-result";

import styles from "./result-card-generator.module.css";

const CARD_WIDTH = 1_600;
const CARD_HEIGHT = 900;

export const RESULT_CARD_DIMENSIONS = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
} as const;

const GENERATION_STAGES = [
  "Calculating result",
  "Assigning rank",
  "Rendering card",
  "Preparing share",
] as const;

type ArenaTier = Exclude<PersonalBestStats["tier"], null>;

const TIER_NUMBER: Record<ArenaTier, string> = {
  Explorer: "I",
  Builder: "II",
  Operator: "III",
  Architect: "IV",
  Vanguard: "V",
  Apex: "VI",
};

const CHARACTER_PATHS: Record<ArenaTier, string> = {
  Explorer: "/brand/rialo/ranks/explorer.png",
  Builder: "/brand/rialo/ranks/builder.png",
  Operator: "/brand/rialo/ranks/operator.png",
  Architect: "/brand/rialo/ranks/architect.png",
  Vanguard: "/brand/rialo/ranks/vanguard.png",
  Apex: "/brand/rialo/ranks/apex.png",
};

const TIER_STYLE: Record<
  ArenaTier,
  { accent: string; glow: string; gold: string; atmosphere: number }
> = {
  Explorer: {
    accent: "#a9ddd3",
    glow: "rgba(95, 197, 175, 0.17)",
    gold: "#a78149",
    atmosphere: 0.12,
  },
  Builder: {
    accent: "#acd9c7",
    glow: "rgba(107, 181, 151, 0.18)",
    gold: "#aa7d42",
    atmosphere: 0.14,
  },
  Operator: {
    accent: "#a8dcca",
    glow: "rgba(76, 190, 164, 0.19)",
    gold: "#ae8147",
    atmosphere: 0.16,
  },
  Architect: {
    accent: "#b0dfce",
    glow: "rgba(115, 202, 176, 0.2)",
    gold: "#b18750",
    atmosphere: 0.18,
  },
  Vanguard: {
    accent: "#b7dfcf",
    glow: "rgba(119, 205, 176, 0.22)",
    gold: "#b99156",
    atmosphere: 0.21,
  },
  Apex: {
    accent: "#bfe8da",
    glow: "rgba(149, 222, 195, 0.25)",
    gold: "#c49a5d",
    atmosphere: 0.24,
  },
};

const CHARACTER_BOUNDS: Record<
  ArenaTier,
  { x: number; y: number; width: number; height: number }
> = {
  Explorer: { x: 62, y: 86, width: 565, height: 684 },
  Builder: { x: 92, y: 70, width: 510, height: 700 },
  Operator: { x: 70, y: 82, width: 550, height: 682 },
  Architect: { x: 92, y: 66, width: 510, height: 710 },
  Vanguard: { x: 58, y: 48, width: 585, height: 736 },
  Apex: { x: 66, y: 38, width: 570, height: 748 },
};

export type ResultCardData = {
  username: string;
  profileImageUrl: string;
  score: number;
  personalBestScore: number;
  correctCount: number;
  timeoutCount: number;
  completedRuns: number;
  globalRank: number | null;
  tier: ArenaTier;
  isPersonalBest: boolean;
};

type ResultCardGeneratorProps = {
  data: ResultCardData;
};

type CardI18n = Pick<ReturnType<typeof useI18n>, "locale" | "t" | "direction">;

type GeneratorMode = "idle" | "generating" | "ready" | "error";

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function createCardBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Card download is unavailable."));
    }, "image/png");
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawAtmosphere(context: CanvasRenderingContext2D, tier: ArenaTier) {
  const style = TIER_STYLE[tier];
  const leftGradient = context.createLinearGradient(0, 0, 700, 790);
  leftGradient.addColorStop(0, "#06120f");
  leftGradient.addColorStop(0.55, "#071511");
  leftGradient.addColorStop(1, "#020706");
  context.fillStyle = leftGradient;
  context.fillRect(14, 14, 686, 778);

  const halo = context.createRadialGradient(335, 365, 30, 335, 365, 440);
  halo.addColorStop(0, style.glow);
  halo.addColorStop(0.56, `rgba(87, 166, 145, ${style.atmosphere * 0.32})`);
  halo.addColorStop(1, "rgba(1, 5, 4, 0)");
  context.fillStyle = halo;
  context.fillRect(14, 14, 686, 778);

  context.save();
  context.translate(332, 365);
  context.lineWidth = 1.5;
  [208, 278, 350].forEach((radius, index) => {
    context.strokeStyle =
      index === 1
        ? `rgba(169, 221, 211, ${0.075 + style.atmosphere * 0.22})`
        : `rgba(184, 142, 79, ${0.055 + style.atmosphere * 0.18})`;
    context.beginPath();
    context.arc(0, 0, radius, Math.PI * (1.03 + index * 0.08), Math.PI * (1.9 - index * 0.04));
    context.stroke();
  });
  context.restore();

  context.save();
  context.strokeStyle = `rgba(184, 142, 79, ${0.04 + style.atmosphere * 0.2})`;
  context.lineWidth = 1;
  for (let index = 0; index < 6; index += 1) {
    const y = 690 + index * 18;
    context.beginPath();
    context.moveTo(32, y);
    context.quadraticCurveTo(340, y - 26 - index * 2, 682, y + 8);
    context.stroke();
  }
  context.restore();

  context.save();
  context.strokeStyle = `rgba(169, 221, 211, ${0.025 + style.atmosphere * 0.1})`;
  context.lineWidth = 1;
  if (tier === "Builder") {
    context.strokeRect(152, 184, 356, 372);
    context.strokeRect(196, 228, 268, 284);
  } else if (tier === "Operator") {
    [172, 245, 318, 391].forEach((y, index) => {
      context.beginPath();
      context.moveTo(72, y);
      context.bezierCurveTo(220, y - 32, 448, y + 24, 642, y - index * 6);
      context.stroke();
    });
  } else if (tier === "Architect") {
    context.strokeRect(112, 118, 432, 524);
    context.beginPath();
    context.moveTo(330, 82);
    context.lineTo(330, 702);
    context.moveTo(72, 380);
    context.lineTo(624, 380);
    context.stroke();
  } else if (tier === "Vanguard") {
    context.beginPath();
    context.moveTo(72, 656);
    context.lineTo(332, 114);
    context.lineTo(632, 656);
    context.stroke();
  } else if (tier === "Apex") {
    [150, 220, 292].forEach((radius) => {
      context.beginPath();
      context.arc(345, 285, radius, Math.PI * 1.08, Math.PI * 1.92);
      context.stroke();
    });
    [[182, 142], [512, 152], [572, 322], [120, 306]].forEach(([x, y]) => {
      context.beginPath();
      context.moveTo(x - 8, y);
      context.lineTo(x + 8, y);
      context.moveTo(x, y - 8);
      context.lineTo(x, y + 8);
      context.stroke();
    });
  }
  context.restore();
}

function drawCardFrame(context: CanvasRenderingContext2D, tier: ArenaTier) {
  const { gold } = TIER_STYLE[tier];
  context.save();
  roundedRect(context, 14, 14, 1_572, 872, 28);
  context.strokeStyle = gold;
  context.globalAlpha = 0.82;
  context.lineWidth = 2;
  context.stroke();
  context.globalAlpha = 0.62;
  context.beginPath();
  context.moveTo(700, 14);
  context.lineTo(700, 792);
  context.moveTo(14, 792);
  context.lineTo(1_586, 792);
  context.stroke();
  context.restore();
}

function drawHeaderOrnament(context: CanvasRenderingContext2D, tier: ArenaTier) {
  const { gold } = TIER_STYLE[tier];
  context.save();
  context.strokeStyle = gold;
  context.fillStyle = gold;
  context.globalAlpha = 0.76;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(910, 63);
  context.lineTo(1_308, 63);
  context.stroke();
  context.translate(1_109, 63);
  context.rotate(Math.PI / 4);
  context.strokeRect(-5, -5, 10, 10);
  context.restore();
}

async function loadCanvasImage(
  source: string,
  cache: RequestCache = "force-cache",
) {
  const response = await fetch(source, {
    cache,
    credentials: "omit",
    mode: "cors",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("Image could not be loaded.");
  return createImageBitmap(await response.blob());
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.width, height / image.height);
  const targetWidth = image.width * scale;
  const targetHeight = image.height * scale;
  context.drawImage(
    image,
    x + (width - targetWidth) / 2,
    y + (height - targetHeight) / 2,
    targetWidth,
    targetHeight,
  );
}

async function drawCharacter(context: CanvasRenderingContext2D, tier: ArenaTier) {
  const image = await loadCanvasImage(CHARACTER_PATHS[tier], "no-store");
  const bounds = CHARACTER_BOUNDS[tier];
  drawContainedImage(
    context,
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );
  image.close();
}

async function drawAvatar(context: CanvasRenderingContext2D, source: string) {
  let image: ImageBitmap | null = null;
  try {
    image = await loadCanvasImage(source);
  } catch {
    try {
      image = await loadCanvasImage(
        "/brand/rialo/rialo-symbol-off-white.png?v=canvas-mark",
      );
    } catch {
      image = null;
    }
  }

  const x = 764;
  const y = 421;
  const size = 112;
  context.save();
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = "#111714";
  context.fillRect(x, y, size, size);
  if (image) {
    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
    image.close();
  } else {
    context.fillStyle = "#e8e3d5";
    context.font = '600 42px "Arial Narrow", Arial, sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("R", x + size / 2, y + size / 2);
  }
  context.restore();
  context.save();
  context.strokeStyle = "rgba(169, 221, 211, 0.8)";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2 + 6, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(184, 142, 79, 0.72)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2 + 12, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawStatIcon(
  context: CanvasRenderingContext2D,
  kind: "target" | "clock" | "crown" | "globe" | "flag",
  x: number,
  y: number,
  size: number,
) {
  context.save();
  context.translate(x, y);
  context.strokeStyle = "#a9d6c5";
  context.fillStyle = "#a9d6c5";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (kind === "target") {
    [size * 0.42, size * 0.25, size * 0.08].forEach((radius) => {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
    });
    context.beginPath();
    context.moveTo(-size * 0.58, 0);
    context.lineTo(-size * 0.42, 0);
    context.moveTo(size * 0.42, 0);
    context.lineTo(size * 0.58, 0);
    context.moveTo(0, -size * 0.58);
    context.lineTo(0, -size * 0.42);
    context.moveTo(0, size * 0.42);
    context.lineTo(0, size * 0.58);
    context.stroke();
  } else if (kind === "clock") {
    context.beginPath();
    context.arc(0, 2, size * 0.42, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(0, 2);
    context.lineTo(0, -size * 0.25);
    context.moveTo(0, 2);
    context.lineTo(size * 0.2, size * 0.16);
    context.moveTo(-size * 0.14, -size * 0.5);
    context.lineTo(size * 0.14, -size * 0.5);
    context.stroke();
  } else if (kind === "crown") {
    context.beginPath();
    context.moveTo(-size * 0.48, size * 0.2);
    context.lineTo(-size * 0.36, -size * 0.3);
    context.lineTo(-size * 0.1, 0);
    context.lineTo(0, -size * 0.42);
    context.lineTo(size * 0.14, 0);
    context.lineTo(size * 0.42, -size * 0.3);
    context.lineTo(size * 0.48, size * 0.2);
    context.closePath();
    context.fill();
    context.fillRect(-size * 0.45, size * 0.28, size * 0.9, 6);
  } else if (kind === "globe") {
    context.beginPath();
    context.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(0, 0, size * 0.2, size * 0.45, 0, 0, Math.PI * 2);
    context.moveTo(-size * 0.42, -size * 0.15);
    context.lineTo(size * 0.42, -size * 0.15);
    context.moveTo(-size * 0.42, size * 0.15);
    context.lineTo(size * 0.42, size * 0.15);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(-size * 0.34, -size * 0.5);
    context.lineTo(-size * 0.34, size * 0.5);
    context.moveTo(-size * 0.34, -size * 0.42);
    context.lineTo(size * 0.34, -size * 0.28);
    context.lineTo(-size * 0.34, -size * 0.08);
    context.stroke();
  }
  context.restore();
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minimumSize: number,
  font: string,
) {
  let size = startSize;
  context.font = font.replace("{size}", String(size));
  while (context.measureText(text).width > maxWidth && size > minimumSize) {
    size -= 2;
    context.font = font.replace("{size}", String(size));
  }
  return size;
}

// Measure complete strings so Arabic shaping and Unicode fallback stay intact.
function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  direction: "ltr" | "rtl" = "ltr",
  serif = false,
) {
  context.save();
  context.direction = direction;
  context.textAlign = direction === "rtl" ? "right" : "left";
  context.letterSpacing = "0px";
  fitText(context, text, width, size, Math.min(size, 12),
    serif ? '500 {size}px Georgia, "Times New Roman", serif' : '600 {size}px Arial, sans-serif');
  context.fillText(text, direction === "rtl" ? x + width : x, y, width);
  context.restore();
}

function drawStatBox(
  context: CanvasRenderingContext2D,
  tier: ArenaTier,
  x: number,
  y: number,
  width: number,
  height: number,
  icon: "target" | "clock" | "crown" | "globe" | "flag",
  label: string,
  value: string,
  large = false,
  direction: "ltr" | "rtl" = "ltr",
  valueDirection: "ltr" | "rtl" = "ltr",
) {
  const { gold } = TIER_STYLE[tier];
  const compact = width < 200;
  roundedRect(context, x, y, width, height, 12);
  context.fillStyle = "rgba(2, 10, 8, 0.68)";
  context.fill();
  context.strokeStyle = gold;
  context.globalAlpha = 0.7;
  context.lineWidth = 1.5;
  context.stroke();
  context.globalAlpha = 1;
  const iconSize = compact ? 34 : large ? 50 : 44;
  const iconX = compact ? x + 36 : x + 54;
  const textX = compact ? x + 72 : x + 102;
  drawStatIcon(context, icon, iconX, y + height / 2, iconSize);
  context.fillStyle = "rgba(169, 221, 211, 0.78)";
  const textWidth = width - (textX - x) - 12;
  drawText(context, label, textX, y + (large ? 34 : 31), textWidth, compact ? 14 : 17, direction);
  context.fillStyle = "#e6d4b5";
  drawText(context, value, textX, y + (large ? 78 : 70), textWidth, compact ? 28 : large ? 42 : 31, valueDirection, true);
}

export async function renderResultCard(
  canvas: HTMLCanvasElement,
  data: ResultCardData,
  { t, locale, direction }: CardI18n,
) {
  canvas.lang = locale;
  if (typeof document !== "undefined") await document.fonts.ready;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Card rendering is unavailable.");
  const style = TIER_STYLE[data.tier];

  context.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  context.fillStyle = "#020806";
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const rightField = context.createLinearGradient(700, 0, 1_600, 900);
  rightField.addColorStop(0, "#03100c");
  rightField.addColorStop(0.55, "#020907");
  rightField.addColorStop(1, "#010403");
  context.fillStyle = rightField;
  context.fillRect(700, 14, 886, 778);
  drawAtmosphere(context, data.tier);
  drawCardFrame(context, data.tier);
  await drawCharacter(context, data.tier);
  drawCardFrame(context, data.tier);
  drawHeaderOrnament(context, data.tier);

  let lockup: ImageBitmap | null = null;
  try {
    lockup = await loadCanvasImage(
      "/brand/rialo/rialo-lockup-a9ddd3-off-white.svg",
    );
  } catch {
    lockup = null;
  }
  if (lockup) {
    drawContainedImage(context, lockup, 754, 36, 132, 54);
    lockup.close();
  } else {
    context.fillStyle = style.accent;
    context.font = '700 23px "Arial Narrow", Arial, sans-serif';
    context.letterSpacing = "5px";
    context.fillText("RIALO ARENA", 758, 70);
  }

  context.save();
  context.textAlign = "right";
  context.fillStyle = "#d4ab70";
  context.font = '500 27px Georgia, "Times New Roman", serif';
  context.letterSpacing = "2px";
  drawText(context, t("ARENA TIER {tier}", { tier: TIER_NUMBER[data.tier] }), 1_332, 72, 216, 27, direction, true);
  context.strokeStyle = style.gold;
  context.globalAlpha = 0.72;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(1_345, 87);
  context.lineTo(1_548, 87);
  context.stroke();
  context.restore();

  context.strokeStyle = style.gold;
  context.globalAlpha = 0.75;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(758, 118);
  context.lineTo(758, 104);
  context.quadraticCurveTo(758, 96, 768, 96);
  context.lineTo(932, 96);
  context.lineTo(957, 116);
  context.lineTo(1_014, 116);
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = "rgba(169, 221, 211, 0.8)";
  context.font = '700 17px "Arial Narrow", Arial, sans-serif';
  context.letterSpacing = "4px";
  drawText(context, t("CURRENT RUN"), 776, 120, 360, 17, direction);

  const tierText = locale === "en" ? t(data.tier).toUpperCase() : t(data.tier);
  context.fillStyle = style.accent;
  drawText(context, tierText, 756, 220, 790, 86, direction, true);

  const scoreText = data.score.toLocaleString(locale);
  context.fillStyle = style.accent;
  drawText(context, scoreText, 752, 350, 440, 126, "ltr", true);
  context.fillStyle = "#d9bd93";
  drawText(context, "/ " + (3000).toLocaleString(locale), 1_200, 342, 100, 40, "ltr", true);

  if (data.isPersonalBest) {
    roundedRect(context, 1_310, 304, 232, 46, 23);
    context.fillStyle = style.accent;
    context.fill();
    context.fillStyle = "#010101";
    context.font = '800 14px "Arial Narrow", Arial, sans-serif';
    context.letterSpacing = "3px";
    context.textAlign = "center";
    drawText(context, t("PERSONAL BEST"), 1_322, 333, 208, 14, direction);
    context.textAlign = "left";
  }

  context.strokeStyle = style.gold;
  context.globalAlpha = 0.65;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(746, 382);
  context.lineTo(1_548, 382);
  context.stroke();
  context.globalAlpha = 1;
  await drawAvatar(context, data.profileImageUrl);

  context.fillStyle = "rgba(169, 221, 211, 0.76)";
  context.font = '700 17px "Arial Narrow", Arial, sans-serif';
  context.letterSpacing = "4px";
  drawText(context, t("ARENA IDENTITY"), 918, 459, 612, 17, direction);
  const username = `@${data.username}`;
  context.fillStyle = "#e6d4b5";
  drawText(context, username, 918, 515, 612, 46, "ltr", true);

  drawStatBox(
    context,
    data.tier,
    746,
    553,
    390,
    104,
    "target",
    t("CORRECT"),
    `${data.correctCount.toLocaleString(locale)} / ${(15).toLocaleString(locale)}`,
    true,
    direction,
  );
  drawStatBox(
    context,
    data.tier,
    1_148,
    553,
    400,
    104,
    "clock",
    t("TIMEOUTS"),
    data.timeoutCount.toLocaleString(locale),
    true,
    direction,
  );
  drawStatBox(
    context,
    data.tier,
    746,
    672,
    328,
    102,
    "crown",
    t("PERSONAL BEST"),
    `${data.personalBestScore.toLocaleString(locale)} / ${(3000).toLocaleString(locale)}`,
    false,
    direction,
  );
  drawStatBox(
    context,
    data.tier,
    1_086,
    672,
    300,
    102,
    "globe",
    t("GLOBAL PB RANK"),
    data.globalRank ? `#${data.globalRank.toLocaleString(locale)}` : t("UNRANKED"),
    false,
    direction,
    data.globalRank ? "ltr" : direction,
  );
  drawStatBox(
    context,
    data.tier,
    1_398,
    672,
    150,
    102,
    "flag",
    t("RUNS"),
    data.completedRuns.toLocaleString(locale),
    false,
    direction,
  );

  let symbol: ImageBitmap | null = null;
  try {
    symbol = await loadCanvasImage(
      "/brand/rialo/rialo-symbol-a9ddd3.png?v=canvas-mark",
    );
  } catch {
    symbol = null;
  }
  if (symbol) {
    context.save();
    context.globalAlpha = 0.86;
    drawContainedImage(context, symbol, 46, 817, 54, 44);
    context.globalAlpha = 0.2;
    drawContainedImage(context, symbol, 56, 92, 72, 58);
    context.restore();
  }
  context.strokeStyle = style.gold;
  context.globalAlpha = 0.62;
  context.beginPath();
  context.moveTo(126, 814);
  context.lineTo(126, 862);
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = "#c49a63";
  context.font = '700 16px "Arial Narrow", Arial, sans-serif';
  context.letterSpacing = "5px";
  drawText(context, t("RIALO ARENA RESULT"), 158, 849, 900, 16, direction);

  context.save();
  context.strokeStyle = "rgba(169, 221, 211, 0.28)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(1_112, 852);
  context.lineTo(1_224, 852);
  context.lineTo(1_252, 833);
  context.lineTo(1_394, 833);
  context.lineTo(1_426, 852);
  context.lineTo(1_486, 852);
  context.stroke();
  context.beginPath();
  context.arc(1_520, 840, 34, 0, Math.PI * 2);
  context.stroke();
  if (symbol) {
    context.globalAlpha = 0.58;
    drawContainedImage(context, symbol, 1_499, 823, 42, 34);
    symbol.close();
  }
  context.restore();
}

export function ResultCardGenerator({ data }: ResultCardGeneratorProps) {
  const { t, locale, direction } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generationRef = useRef(0);
  const cardLocaleRef = useRef(locale);
  const downloadUrlRef = useRef<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<GeneratorMode>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [browserOrigin, setBrowserOrigin] = useState<string>();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => {
      query.removeEventListener("change", updatePreference);
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const shareUrl = useMemo(() => {
    return createArenaResultShareUrl({
      arenaUrl: getPublicSiteUrl(browserOrigin),
      score: data.score,
      tier: data.tier,
      locale,
      t,
    });
  }, [browserOrigin, data.score, data.tier, locale, t]);

  const closeGenerator = () => {
    generationRef.current += 1;
    setIsOpen(false);
    setMode("idle");
    setStageIndex(0);
  };

  const generateCard = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    cardLocaleRef.current = locale;
    setBrowserOrigin(window.location.origin);
    setIsOpen(true);
    setMode("generating");
    setStageIndex(0);
    setDownloadUrl(null);
    try {
      for (let index = 0; index < GENERATION_STAGES.length; index += 1) {
        if (generationRef.current !== generation) return;
        setStageIndex(index);
        if (index === 2) {
          const canvas = canvasRef.current;
          if (!canvas) throw new Error("Card preview is unavailable.");
          // Render offscreen so a superseded locale cannot overwrite the preview.
          const rendered = document.createElement("canvas");
          rendered.width = CARD_WIDTH;
          rendered.height = CARD_HEIGHT;
          await renderResultCard(rendered, data, { t, locale, direction });
          const blob = await createCardBlob(rendered);
          if (generationRef.current !== generation) return;
          canvas.getContext("2d")?.drawImage(rendered, 0, 0);
          if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
          downloadUrlRef.current = URL.createObjectURL(blob);
          setDownloadUrl(downloadUrlRef.current);
        }
        await wait(reducedMotion ? 20 : index === 2 ? 520 : 300);
      }
      if (generationRef.current === generation) setMode("ready");
    } catch {
      if (generationRef.current === generation) setMode("error");
    }
  }, [data, direction, locale, reducedMotion, t]);

  useEffect(() => {
    if (!isOpen || cardLocaleRef.current === locale) return;
    const task = window.setTimeout(() => void generateCard(), 0);
    return () => window.clearTimeout(task);
  }, [generateCard, isOpen, locale]);

  return (
    <>
      <button className={styles.generateButton} type="button" onClick={generateCard}>
        {t("Generate card")}
        <span aria-hidden="true">✦</span>
      </button>
      <dialog
        className={styles.dialog}
        lang={locale}
        dir={direction}
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          closeGenerator();
        }}
        onClose={() => setIsOpen(false)}
      >
        <div className={styles.dialogShell}>
          <header className={styles.dialogHeader}>
            <div>
              <span>{t("Rialo Arena result")}</span>
              <h2 id={titleId}>
                {mode === "ready" ? t("Your card is ready.") : t("Generate your card.")}
              </h2>
            </div>
            <button type="button" onClick={closeGenerator} aria-label={t("Close card generator")}>×</button>
          </header>
          <div className={styles.generatorLayout}>
            <div className={styles.previewFrame} data-ready={mode === "ready"} data-stage={stageIndex}>
              <canvas
                ref={canvasRef}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                role="img"
                aria-label={t("{tier} Rialo Arena record card for {username}, score {score} out of {maximum}", { tier: t(data.tier), username: data.username, score: data.score.toLocaleString(locale), maximum: (3000).toLocaleString(locale, { useGrouping: false }) })}
              />
              {mode === "generating" ? <div className={styles.scan} aria-hidden="true" /> : null}
            </div>
            <div className={styles.generatorPanel}>
              {mode === "generating" ? (
                <div className={styles.stagePanel} aria-live="polite" aria-busy="true">
                  <span className={styles.stageCount}>0{stageIndex + 1} / 04</span>
                  <strong>{t(GENERATION_STAGES[stageIndex])}</strong>
                  <div className={styles.stageTrack} aria-hidden="true">
                    <span style={{ width: `${((stageIndex + 1) / 4) * 100}%` }} />
                  </div>
                  <ol>
                    {GENERATION_STAGES.map((stage, index) => (
                      <li key={stage} data-active={index === stageIndex} data-complete={index < stageIndex}>
                        <span>0{index + 1}</span>
                        {t(stage)}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {mode === "ready" ? (
                <div className={styles.readyPanel}>
                  <span>{t("{tier} / Arena tier {number}", { tier: t(data.tier), number: TIER_NUMBER[data.tier] })}</span>
                  <p>
                    {t("Download the card, then attach it to your post on X. The share action opens a prefilled post and never uploads the image for you.")}
                  </p>
                  <div className={styles.cardActions}>
                    <a
                      href={downloadUrl ?? undefined}
                      download={`rialo-arena-${data.tier.toLowerCase()}-${data.username}.png`}
                    >
                      {t("Download card")}
                    </a>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">{t("Share to X")}</a>
                    <button type="button" onClick={closeGenerator}>{t("Back to results")}</button>
                  </div>
                </div>
              ) : null}
              {mode === "error" ? (
                <div className={styles.errorPanel} role="alert">
                  <strong>{t("Card rendering paused.")}</strong>
                  <p>{t("Your result is safe. Try generating the card again.")}</p>
                  <button type="button" onClick={generateCard}>{t("Try again")}</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
