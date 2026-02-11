const EDITION_MAP: Record<string, { eng: string; ara: string }> = {
  bukhari: { eng: "eng-bukhari", ara: "ara-bukhari" },
  muslim: { eng: "eng-muslim", ara: "ara-muslim" },
  abudawud: { eng: "eng-abudawud", ara: "ara-abudawud" },
  tirmidhi: { eng: "eng-tirmidhi", ara: "ara-tirmidhi" },
  nasai: { eng: "eng-nasai", ara: "ara-nasai" },
  ibnmajah: { eng: "eng-ibnmajah", ara: "ara-ibnmajah" },
  malik: { eng: "eng-malik", ara: "ara-malik" },
  nawawi: { eng: "eng-nawawi", ara: "ara-nawawi" },
  qudsi: { eng: "eng-qudsi", ara: "ara-qudsi" },
};

export interface HadithResult {
  english: string;
  arabic: string;
  collection: string;
  number: number;
}

const BASE_URL =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

async function fetchEdition(
  edition: string,
  number: number,
): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/${edition}/${number}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const hadith = json.hadiths?.[0];
    if (!hadith?.text) return null;
    return hadith.text;
  } catch {
    return null;
  }
}

export async function fetchHadith(
  collection: string,
  number: number,
): Promise<HadithResult | null> {
  const editions = EDITION_MAP[collection];
  if (!editions) return null;

  const [english, arabic] = await Promise.all([
    fetchEdition(editions.eng, number),
    fetchEdition(editions.ara, number),
  ]);

  if (!english && !arabic) return null;

  return {
    english: english || "",
    arabic: arabic || "",
    collection,
    number,
  };
}
