/**
 * TrustConnect Profanity & Conduct Filter
 * Covers: English, Nigerian Pidgin, Yoruba, Igbo, Hausa insults.
 * Uses word-boundary matching to avoid false positives on normal words.
 */

export const BLOCKED_TERMS: string[] = [
  // ── English profanity ─────────────────────────────────────────
  'fuck', 'fvck',
  'shit', 'bullshit', 'dipshit', 'shithead',
  'ass', 'asshole', 'jackass', 'dumbass', 'fatass', 'smartass',
  'bitch', 'son of a bitch',
  'bastard',
  'cunt', 'dick', 'cock', 'pussy', 'prick',
  'motherfucker', 'mf',
  'wanker', 'twat', 'slut', 'whore',
  'retard', 'moron', 'imbecile', 'dumbass',
  'idiot', 'stupid', 'dumb', 'fool',
  'scammer', 'fraudster', 'thief', 'cheat',
  'useless', 'worthless', 'rubbish', 'trash',
  'loser', 'jerk', 'creep', 'pervert',

  // ── Nigerian Pidgin ──────────────────────────────────────────
  'mumu', 'mumun',
  'werey', 'were',
  'craze', 'dey craze',
  'yeye', 'nonsense',
  'agbaya',
  'ewu',
  'agbero', 'area boy',
  'toothless',
  'gbagaun',

  // ── Yoruba insults ───────────────────────────────────────────
  'oloshi', 'ode', 'olosho',
  'ashawo', 'ashewo', 'asewo',
  'oloriburuku', 'oshi', 'omo ale',
  'yi iro', 'jati jati', 'apaadi',
  'ori e', 'ori buruku', 'elenu',
  'ode buruku', 'latitu', 'omo oshi',

  // ── Igbo insults ─────────────────────────────────────────────
  'nzuzu', 'nzuzu gi', 'anuofia',
  'onye ara', 'onye oshi', 'ihe nzuzu',
  'onye ashawo', 'efulefu', 'ogbanje',

  // ── Hausa insults ────────────────────────────────────────────
  'banza', 'wawa', 'iska',
  'karuwai', 'karuwa', 'haramzada',
  'jahili', 'mahaukaci',

  // ── Sexual harassment / explicit solicitation ─────────────────
  'send nudes', 'naked picture', 'sex for',
];

/**
 * Returns true if the text contains a blocked term.
 * Multi-word phrases: substring match.
 * Single words: word-boundary regex to avoid false positives.
 */
export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some(term => {
    try {
      if (term.includes(' ')) {
        return lower.includes(term.toLowerCase());
      }
      const regex = new RegExp(
        `(?:^|[\\s,.!?;:'"\\-])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,.!?;:'"\\-])`,
        'i'
      );
      return regex.test(` ${lower} `);
    } catch {
      return lower.includes(term.toLowerCase());
    }
  });
}
