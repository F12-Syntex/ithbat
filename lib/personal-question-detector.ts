/**
 * Detects whether a query appears to be a personal question seeking a fatwa
 * rather than a general research question.
 */

const PERSONAL_PATTERNS_EN = [
  /\b(should i|can i|am i allowed|is it ok for me|is it permissible for me)\b/i,
  /\b(i want to|i need to|i am|i'm|i have been|i did|i was)\b/i,
  /\b(my (husband|wife|spouse|father|mother|brother|sister|son|daughter|family|situation|case|problem))\b/i,
  /\b(what should i do|what do i do|help me|advise me|give me a fatwa)\b/i,
  /\b(in my case|in my situation|for my|is it halal for me|is it haram for me)\b/i,
  /\b(i committed|i broke|i missed|i forgot to|i accidentally)\b/i,
];

const PERSONAL_PATTERNS_AR = [
  /\b(هل يجوز لي|هل أستطيع|ماذا أفعل|ما حكم أن أ)\b/,
  /\b(أنا|زوجي|زوجتي|والدي|والدتي|عائلتي|حالتي|مشكلتي)\b/,
  /\b(أريد أن|أحتاج|ساعدوني|أفتوني|أعطوني فتوى)\b/,
  /\b(في حالتي|بالنسبة لي|نسيت أن|ارتكبت)\b/,
];

const PERSONAL_PATTERNS_UR = [
  /\b(کیا میں|مجھے|میری|میرا|میرے)\b/,
  /\b(مجھے بتائیں|مدد کریں|فتویٰ دیں)\b/,
];

const PERSONAL_PATTERNS_FR = [
  /\b(est-ce que je peux|dois-je|puis-je|est-il permis pour moi)\b/i,
  /\b(mon mari|ma femme|ma famille|ma situation|mon cas)\b/i,
  /\b(je veux|j'ai besoin|aidez-moi|donnez-moi une fatwa)\b/i,
  /\b(j'ai oublié|j'ai commis|j'ai raté)\b/i,
];

const PERSONAL_PATTERNS_JA = [
  /私は|私の|自分の|自分が/,
  /してもいいですか|すべきですか|どうすれば/,
];

const PERSONAL_PATTERNS_ZH = [
  /我可以|我应该|我能|我的|对我来说/,
  /帮我|给我|我犯了|我忘了/,
];

const ALL_PATTERNS: Record<string, RegExp[]> = {
  en: PERSONAL_PATTERNS_EN,
  ar: PERSONAL_PATTERNS_AR,
  ur: PERSONAL_PATTERNS_UR,
  fr: PERSONAL_PATTERNS_FR,
  ja: PERSONAL_PATTERNS_JA,
  zh: PERSONAL_PATTERNS_ZH,
};

export function isPersonalQuestion(query: string, language = "en"): boolean {
  const patterns = [
    ...(ALL_PATTERNS[language] || []),
    // Always check English patterns too (users may type in English regardless of UI lang)
    ...(language !== "en" ? PERSONAL_PATTERNS_EN : []),
  ];

  return patterns.some((pattern) => pattern.test(query));
}
