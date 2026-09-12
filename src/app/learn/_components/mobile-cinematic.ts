import { gsap } from "gsap";

type MobileTravel = {
  element: string;
  path: string;
  start?: number;
  end?: number;
};

type MobileCinematicOptions = {
  world: string;
  phases: string;
  draw?: string;
  reveal?: string;
  travel?: MobileTravel[];
  horizontalCamera?: boolean;
};

export const mobileCinematicQuery =
  "(max-width: 1100px) and (prefers-reduced-motion: no-preference)";

export function createMobileCinematic(
  root: HTMLElement,
  options: MobileCinematicOptions,
) {
  const animations: gsap.core.Animation[] = [];
  const world = root.querySelector<HTMLElement>(options.world);
  const phases = Array.from(root.querySelectorAll<HTMLElement>(options.phases));
  const phaseDeck = phases[0]?.parentElement;
  const drawables = options.draw
    ? Array.from(root.querySelectorAll<SVGPathElement>(options.draw))
    : [];
  const revealItems = options.reveal
    ? Array.from(root.querySelectorAll<SVGElement>(options.reveal))
    : [];

  phases.forEach((phase) => {
    animations.push(
      gsap.fromTo(
        phase,
        { opacity: 0.42, y: 24 },
        {
          opacity: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: phase,
            start: "top 90%",
            end: "top 62%",
            scrub: 0.32,
            invalidateOnRefresh: true,
          },
        },
      ),
    );
  });

  if (world) {
    animations.push(
      gsap.fromTo(
        world,
        { yPercent: 3, scale: 0.965, opacity: 0.7 },
        {
          yPercent: -3,
          scale: 1.025,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: world,
            start: "top 92%",
            end: "bottom 18%",
            scrub: 0.48,
            invalidateOnRefresh: true,
          },
        },
      ),
    );
  }

  if (drawables.length > 0) {
    drawables.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    });

    animations.push(
      gsap.to(drawables, {
        strokeDashoffset: 0,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: world ?? root,
          start: "top 88%",
          endTrigger: world ?? root,
          end: "bottom 16%",
          scrub: 0.45,
          invalidateOnRefresh: true,
        },
      }),
    );
  }

  if (revealItems.length > 0) {
    animations.push(
      gsap.fromTo(
        revealItems,
        { opacity: 0.24, scale: 0.94, transformOrigin: "center" },
        {
          opacity: 1,
          scale: 1,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: {
            trigger: world ?? root,
            start: "top 84%",
            endTrigger: world ?? root,
            end: "bottom 18%",
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        },
      ),
    );
  }

  options.travel?.forEach((travel, index) => {
    const element = root.querySelector<SVGElement>(travel.element);
    const path = root.querySelector<SVGPathElement>(travel.path);
    if (!element || !path) return;

    animations.push(
      gsap.fromTo(
        element,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          ease: "none",
          motionPath: {
            path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: false,
            start: travel.start ?? 0,
            end: travel.end ?? 1,
          },
          scrollTrigger: {
            trigger: world ?? root,
            start: `top ${88 - index * 3}%`,
            endTrigger: world ?? root,
            end: `bottom ${18 - index * 2}%`,
            scrub: 0.38,
            invalidateOnRefresh: true,
          },
        },
      ),
    );
  });

  if (options.horizontalCamera && world && phaseDeck) {
    animations.push(
      gsap.to(world, {
        scrollLeft: () => Math.max(0, world.scrollWidth - world.clientWidth),
        ease: "none",
        scrollTrigger: {
          trigger: world,
          start: "top 76%",
          endTrigger: world,
          end: "bottom 18%",
          scrub: 0.42,
          invalidateOnRefresh: true,
        },
      }),
    );
  }

  return () => {
    animations.forEach((animation) => {
      animation.scrollTrigger?.kill();
      animation.kill();
    });
  };
}
