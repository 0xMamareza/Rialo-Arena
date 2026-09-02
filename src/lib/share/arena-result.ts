type ArenaResultShare = {
  arenaUrl: string;
  score: number;
  tier: string;
};

export function createArenaResultShareUrl({
  arenaUrl,
  score,
  tier,
}: ArenaResultShare) {
  const text = `I scored ${score}/3000 in Rialo Arena and reached ${tier}. Test your @RialoHQ knowledge.`;
  const query = new URLSearchParams({ text, url: arenaUrl });

  return `https://twitter.com/intent/tweet?${query.toString()}`;
}
