"use client";

import { useLayoutEffect, useRef, type SVGProps } from "react";
import { useI18n } from "@/app/_components/language-provider";

// Fit the rendered glyphs, not a character-count guess (CJK and joined scripts differ).
export function fitDiagramText(node: Pick<SVGTextElement, "removeAttribute" | "setAttribute" | "getComputedTextLength">, maxWidth: number) {
  node.removeAttribute("textLength");
  if (node.getComputedTextLength() > maxWidth) {
    node.setAttribute("textLength", String(maxWidth));
  }
}

type DiagramTextProps = SVGProps<SVGTextElement> & { maxWidth?: number };

export function DiagramText({ children, maxWidth = 150, textAnchor = "start", ...props }: DiagramTextProps) {
  const { locale, direction } = useI18n();
  const ref = useRef<SVGTextElement>(null);

  useLayoutEffect(() => {
    let active = true;
    const fit = () => {
      if (active && ref.current) fitDiagramText(ref.current, maxWidth);
    };
    fit();
    void document.fonts.ready.then(fit);
    return () => { active = false; };
  }, [children, maxWidth, locale]);

  // Keep the annotation's geometric anchor while allowing RTL glyph ordering.
  const anchor = direction === "rtl"
    ? textAnchor === "start" ? "end" : textAnchor === "end" ? "start" : textAnchor
    : textAnchor;

  return (
    <text {...props} ref={ref} direction={direction} textAnchor={anchor} lengthAdjust="spacingAndGlyphs">
      {children}
    </text>
  );
}
