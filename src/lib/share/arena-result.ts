export type ArenaTranslate = (
  source: string,
  params?: Record<string, string | number>,
) => string;

type ArenaResultShare = {
  arenaUrl: string;
  score: number;
  tier: string;
  locale?: string;
  t?: ArenaTranslate;
};

export function createArenaResultShareUrl({
  arenaUrl,
  score,
  tier,
  locale = "en",
  t = (source, params) => source.replace(/\{(\w+)\}/g, (match, key: string) => String(params?.[key] ?? match)),
}: ArenaResultShare) {
  const text = t("I scored {score}/{maximum} in Rialo Arena and reached {tier}. Test your @RialoHQ knowledge.", {
    score: locale === "en" ? String(score) : new Intl.NumberFormat(locale).format(score),
    maximum: new Intl.NumberFormat(locale, { useGrouping: false }).format(3000),
    tier: t(tier),
  });
  const query = new URLSearchParams({ text, url: arenaUrl });

  return `https://twitter.com/intent/tweet?${query.toString()}`;
}
