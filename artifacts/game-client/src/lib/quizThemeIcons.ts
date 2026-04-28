/** Original layout: PNGs next to other public assets, e.g. /bossy.png (Vite public/). */
function quizCategoryPng(stem: string): string {
  return `${import.meta.env.BASE_URL}${stem}.png`;
}

/** Union of theme keys from adepts-game, adepts-game-2, adepts-game-3. */
export const QUIZ_THEME_ICONS: Record<string, string> = {
  боссы: quizCategoryPng("bossy"),
  пасхалки: quizCategoryPng("pashalki"),
  "цитаты и фразы": quizCategoryPng("quotes"),
  "лор world of warcraft": quizCategoryPng("lor-wow"),
  "лор wow": quizCategoryPng("lor-wow2"),
  "лор адептов": quizCategoryPng("lor-adeptov-icon"),
  халява: quizCategoryPng("freebie"),
  локации: quizCategoryPng("locations"),
  профессии: quizCategoryPng("professions"),
  "всратый косплей": quizCategoryPng("cosplay"),
  "всратый касплей": quizCategoryPng("cosplay"),
  "дед прими таблетки": quizCategoryPng("ded-icon"),
  тактики: quizCategoryPng("tactics-icon"),
  треш: quizCategoryPng("trash-icon"),
  петомцы: quizCategoryPng("pets-icon"),
  "великие подвиги": quizCategoryPng("feats-icon"),
  наяборот: quizCategoryPng("nayaborot-icon"),
  абилки: quizCategoryPng("abilities-icon"),
  маунты: quizCategoryPng("mounts-icon"),
  "зацени look": quizCategoryPng("look-icon"),
  фракции: quizCategoryPng("factions-icon"),
  "события в wow": quizCategoryPng("events-icon"),
};

export function getQuizThemeIconUrl(theme: string): string | undefined {
  const k = theme.trim().toLowerCase();
  return QUIZ_THEME_ICONS[k];
}
