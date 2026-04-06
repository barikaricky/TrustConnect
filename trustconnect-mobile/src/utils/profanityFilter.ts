/**
 * TrustConnect Profanity & Conduct Filter
 * Covers: English, Nigerian Pidgin, Yoruba, Igbo, Hausa insults.
 * Uses word-boundary matching to avoid false positives on normal words.
 */

const BLOCKED_TERMS: string[] = [
  // ── English profanity ─────────────────────────────────────────
  'fuck', 'fvck', 'f\\*ck', 'f\\*\\*k',
  'shit', 'sh1t', 'bullshit', 'dipshit', 'shithead',
  'ass', 'asshole', 'jackass', 'dumbass', 'fatass', 'smartass',
  'bitch', 'son of a bitch',
  'bastard','kill you', 'die', 'kill me', 'go die', 'go kill yourself', 'mother fucker', 'fucking ass',
  'cunt', 'dick', 'cock', 'pussy', 'prick',
  'motherfucker', 'motherf', 'mf',
  'wanker', 'twat', 'slut', 'whore',
  'retard', 'moron', 'imbecile', 'dumbass',
  'idiot', 'stupid', 'dumb', 'fool',
  'crap', 'damn',
  'scammer', 'scam', 'fraudster', 'thief', 'cheat',
  'useless', 'worthless', 'rubbish', 'trash',
  'loser', 'jerk', 'creep', 'pervert', 'predator',

  // ── Nigerian Pidgin ──────────────────────────────────────────
  'mumu',     // fool / idiot
  'mumun',    // fool (emphatic)
  'werey',    // mad person
  'were',     // mad / crazy
  'craze',    // crazy / mad (as insult)
  'dey craze',
  'yeye',     // nonsense / worthless
  'nonsense',
  'agbaya',   // useless adult who acts like child
  'ewu',      // goat / stupid (Pidgin/Yoruba)
  'agbero',   // tout / street thug
  'area boy', // street thug
  'toothless',// impotent / powerless (insult)
  'gbagaun',  // blunder / foolish mistake as insult

  // ── Yoruba insults ───────────────────────────────────────────
  'oloshi',       // useless / worthless
  'ode',          // fool / idiot
  'olosho',       // prostitute
  'ashawo',       // prostitute
  'ashewo',       // prostitute (alt spelling)
  'asewo',        // prostitute
  'oloriburuku',  // cursed / wretched head
  'oshi',         // rascal / rogue
  'omo ale',      // bastard / illegitimate child
  'yi iro',       // liar
  'jati jati',    // nonsense / useless
  'apaadi',       // hell / devilish (used as insult)
  'ori e',        // your head (derogatory)
  'ori buruku',   // bad / cursed head
  'elenu',        // loud-mouthed / gossip
  'ode buruku',   // terrible fool
  'latitu',       // prostitute (Yoruba slang)
  'omo oshi',     // child of a rogue

  // ── Igbo insults ─────────────────────────────────────────────
  'nzuzu',        // fool / idiot
  'nzuzu gi',     // your foolishness
  'anuofia',      // bush animal / uncivilised person
  'onye ara',     // mad person
  'onye oshi',    // thief
  'ihe nzuzu',    // foolish thing / idiot
  'onye ashawo',  // prostitute (Igbo)
  'efulefu',      // worthless person
  'ogbanje',      // troublesome / cursed child (used as insult)

  // ── Hausa insults ────────────────────────────────────────────
  'banza',        // worthless / good-for-nothing
  'wawa',         // fool / stupid
  'iska',         // rascal / fornicator / scoundrel
  'karuwai',      // prostitute (plural)
  'karuwa',       // prostitute
  'haramzada',    // bastard / scoundrel
  'jahili',       // ignorant person
  'mahaukaci',    // mad person
  'gwagwarmaya',  // troublemaker (used as insult)

  // ── Cross-language sexual harassment terms ───────────────────
  'send nudes',
  'naked picture',
  'sex for',
  'ashe',         // vulgar in Yoruba context
];

/**
 * Returns true if the text contains a blocked term.
 * Uses word-boundary regex to avoid matching substrings inside normal words.
 */
export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some(term => {
    try {
      // Multi-word terms: check simple inclusion; single words: use boundary
      if (term.includes(' ')) {
        return lower.includes(term.toLowerCase());
      }
      const regex = new RegExp(`(?:^|[\\s,.!?;:'"\\-])${term}(?:$|[\\s,.!?;:'"\\-])`, 'i');
      return regex.test(lower) || lower === term.toLowerCase();
    } catch {
      return lower.includes(term.toLowerCase());
    }
  });
}

export const PROFANITY_ALERT_TITLE = '⚠️ Inappropriate Language Detected';
export const PROFANITY_ALERT_BODY =
  'TrustConnect is a professional platform. Keep all communication respectful.\n\nMessages containing insults, threats or inappropriate language will not be sent.';
