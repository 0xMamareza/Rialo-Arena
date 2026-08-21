import Image from "next/image";

import styles from "../learn.module.css";

type RialoFieldBackgroundProps = {
  intensity?: "quiet" | "stage";
};

export function RialoFieldBackground({
  intensity = "quiet",
}: RialoFieldBackgroundProps) {
  return (
    <div
      className={`${styles.fieldBackground} ${
        intensity === "stage" ? styles.fieldBackgroundStage : ""
      }`}
      aria-hidden="true"
    >
      <Image
        className={styles.fieldSymbol}
        src="/brand/rialo/rialo-symbol-off-white.svg"
        alt=""
        width={303}
        height={331}
        loading="eager"
      />
      <div className={styles.fieldGrid} />
      <svg className={styles.fieldContours} viewBox="0 0 1200 800" preserveAspectRatio="none">
        <path d="M-90 586C104 426 228 682 412 531S734 287 910 425s245 42 382-64" />
        <path d="M-126 640C82 478 246 742 452 570s339-238 518-95 240 50 354-31" />
        <path d="M-38 517C156 376 244 590 403 468s343-271 514-115 254 7 355-86" />
      </svg>
      <svg className={styles.fieldNetwork} viewBox="0 0 1200 800" preserveAspectRatio="none">
        <path d="M104 186 289 302 477 178 694 349 910 225 1096 390" />
        <path d="m289 302 75 254 330-207 130 278" />
        <g>
          <circle cx="104" cy="186" r="3" />
          <circle cx="289" cy="302" r="4" />
          <circle cx="477" cy="178" r="3" />
          <circle cx="694" cy="349" r="4" />
          <circle cx="910" cy="225" r="3" />
          <circle cx="1096" cy="390" r="3" />
          <circle cx="364" cy="556" r="3" />
          <circle cx="824" cy="627" r="4" />
        </g>
      </svg>
      <div className={styles.fieldGrain} />
    </div>
  );
}
