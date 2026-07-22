// BEGIN VERBATIM GRAMPAN CODE
// Upstream: https://github.com/stephenturner/grampan
// Commit: 300cdab52a6451e3eee3dae62a5911333e6a3ee8
// Licence: Apache-2.0


// Each pattern: { id, name, description, find(text) -> [{ start, end, badge?, badgeTitle?, count? }] }
// Add new patterns to this array and they get a checkbox, per-pattern count, and highlighting for free.
// makeChainFinder builds a detector for "HEAD X, HEAD Y, ..." lists and counts the items;
// makeRegexFinder wraps a plain regex (must use the g flag).

const CHAIN_BODY = String.raw`[^,.;:!?\n\u2013\u2014\u2026]*`;
const CHAIN_SEP = String.raw`(?:\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+|\s*[;&\u2013\u2014]\s*(?:and\s+|or\s+)?|\s+-{1,2}\s+)`;
const CHAIN_SPLIT = new RegExp(CHAIN_SEP, 'i');

function makeChainFinder(head, headTest, itemLabel) {
  const item = head + CHAIN_BODY;
  const chain = new RegExp(String.raw`\b${item}(?:${CHAIN_SEP}${item})+`, 'gi');
  return function (text) {
    const found = [];
    for (const m of text.matchAll(chain)) {
      let end = m.index + m[0].length;
      while (end > m.index && /\s/.test(text[end - 1])) end -= 1;
      const count = m[0].split(CHAIN_SPLIT).filter(p => headTest.test(p.trim())).length;
      found.push({
        start: m.index,
        end,
        count,
        badge: String(count),
        badgeTitle: count + ' ' + itemLabel + (count === 1 ? '' : 's')
      });
    }
    return found;
  };
}

function makeRegexFinder(re) {
  return function (text) {
    const found = [];
    for (const m of text.matchAll(re)) {
      found.push({ start: m.index, end: m.index + m[0].length });
    }
    return found;
  };
}

// Like makeChainFinder, but for patterns whose items are found by re-counting
// a sub-regex inside each match (e.g. "Not X. Not Y." across sentence breaks).
function makeCountingFinder(re, countRe, itemLabel) {
  return function (text) {
    const found = [];
    for (const m of text.matchAll(re)) {
      let end = m.index + m[0].length;
      while (end > m.index && /\s/.test(text[end - 1])) end -= 1;
      const count = (m[0].match(countRe) || []).length;
      found.push({
        start: m.index,
        end,
        count,
        badge: String(count),
        badgeTitle: count + ' ' + itemLabel + (count === 1 ? '' : 's')
      });
    }
    return found;
  };
}

const patterns = [
  {
    id: 'no-chain',
    name: '“No X, no Y” chains',
    description: 'Two or more “no …” items in a row, e.g. “No fluff, no filler, no jargon.” The badge counts the “no” items.',
    find: makeChainFinder(String.raw`no[-\s]`, /^no[-\s]/i, '\u201cno\u201d item')
  },
  {
    id: 'whole',
    name: '“That’s the whole …”',
    description: '“That / this is the whole point, game, thing …”',
    find: makeRegexFinder(/\b(?:that|this)(?:['\u2019]s|\s+(?:is|was))\s+the\s+whole\b(?:\s+\w+)?/gi)
  },
  {
    id: 'did-not-chain',
    name: '“Did not X, did not Y” chains',
    description: 'Two or more “did not …” or “didn’t …” items in a row. The badge counts the items.',
    find: makeChainFinder(String.raw`(?:did\s+not|didn['\u2019]t)\s`, /^(?:did\s+not|didn['\u2019]t)\s/i, '\u201cdid not\u201d item')
  },
  {
    id: 'dont-verb-it',
    name: '“Don’t VERB it … VERB it”',
    description: '“Don’t call it X. Call it Y.” — a negated verb + “it”, then the same verb + “it” again.',
    find: makeRegexFinder(/\b(?:do\s+not|don['\u2019]t)\s+(?:just\s+|simply\s+|merely\s+)?(\w+)(?:\s+(?:of|about|at|on|for|with|to))?\s+it\b[^.!?\n]*?[.!?;,:\u2013\u2014]['"\u201d\u2019]*\s*(?:just\s+|simply\s+|merely\s+)?\1(?:\s+(?:of|about|at|on|for|with|to))?\s+it\b/gi)
  },
  {
    id: 'sit-with',
    name: '“Sit with that”',
    description: 'The reflective “sit with that / this / it (for a moment)”, plus “sit with the discomfort” and friends.',
    find: makeRegexFinder(/\bsit(?:s|ting)?\s+with\s+(?:that|this|it|(?:the|your)\s+(?:discomfort|feelings?|tension|weight|uncertainty|ambiguity|grief|silence|unease))\b(?:\s+for\s+a\s+\w+)?/gi)
  },
  {
    id: 'already-know',
    name: '“You already know”',
    description: '“You already know” — the answer, what to do, or standing alone before a full stop.',
    find: makeRegexFinder(/\byou\s+already\s+knows?\s+(?:the\s+answer|what|how|why|this|that|it|who|where)\b|\byou\s+already\s+knows?\b(?![ \t]+\w)/gi)
  },
  {
    id: 'is-the-entire',
    name: '“Is the entire …”',
    description: '“X is the entire point / game / business model.”',
    find: makeRegexFinder(/(?:\b(?:is|was|are|were)|['\u2019]s)\s+the\s+entire\b(?:\s+\w+)?/gi)
  },
  {
    id: 'the-entire-is',
    name: '“The entire … is”',
    description: '“The entire point / game / business model is …” — the flipped twin of “is the entire”.',
    find: makeRegexFinder(/\bthe\s+entire\s+[\w'\u2019-]+(?:\s+[\w'\u2019-]+){0,4}?\s+(?:is|was|are|were)\b/gi)
  },
  {
    id: 'is-real',
    name: '“Is real … and / not”',
    description: '“The X is real, and / not …”, including “is the real … and it”. Skips “real estate”, “real time”, and similar.',
    find: makeRegexFinder(/\bis\s+(?:(?:the|a)\s+real\b(?![\s-]+(?:estate|time|life|world|quick)\b)[^.!?\n]*?\b(?:and|not)\s+it\b|real\b(?![\s-]+(?:estate|time|life|world|quick)\b)[^.!?\n]*?\b(?:and|not)\b)/gi)
  },
  {
    id: 'punchline',
    name: '“The punchline is”',
    description: '“The punchline is …”, “the punchline:”, or “the punchline?”.',
    find: makeRegexFinder(/\bthe\s+punchline(?:\s+(?:is|was|being)\b|\s*[:?])/gi)
  },
  {
    id: 'worth-naming',
    name: '“Worth naming”',
    description: 'The therapist-voiced “that loss is real and it’s worth naming”, “it’s worth naming that …”, or a “Worth naming:” opener. Skips “naming names”.',
    find: makeRegexFinder(/(?:\b(?:is|are|was|were|feels?|felt|seems?|seemed)|['\u2019]s)\s+(?:\w+\s+){0,2}?worth\s+naming\b(?!\s+names\b)|\bworth\s+naming\s*:/gi)
  },
  {
    id: 'not-nothing',
    name: '\u201cThat\u2019s not nothing\u201d',
    description: '\u201cThat is not nothing\u201d / \u201cthat\u2019s not nothing\u201d, plus the \u201cthis / it / which is not nothing\u201d variants.',
    find: makeRegexFinder(/\b(?:that|this|it|which)(?:['\u2019]s|\s+(?:is|was))\s+not\s+nothing\b/gi)
  },
  {
    id: 'throat-clearing',
    name: 'Throat-clearing openers',
    description: '\u201cHere\u2019s the thing / kicker / deal / what / why\u201d, \u201cthe (uncomfortable) truth is\u201d, \u201cit turns out\u201d, \u201clet me be clear\u201d, \u201ccan we talk about\u201d.',
    find: makeRegexFinder(/\bhere['\u2019]s\s+(?:the\s+(?:thing|kicker|deal|problem|catch|rub|truth|part)|what|why|where|this|that)\b|\bthe\s+(?:uncomfortable\s+)?truth\s+is\b|\bit\s+turns\s+out\b|\blet\s+me\s+be\s+(?:clear|honest)\b|\bi['\u2019]ll\s+say\s+it\s+again\b|\bi['\u2019]m\s+going\s+to\s+be\s+honest\b|\bcan\s+we\s+talk\s+about\b/gi)
  },
  {
    id: 'emphasis-crutch',
    name: 'Emphasis crutches',
    description: '\u201cFull stop\u201d, \u201clet that sink in\u201d, \u201cmake no mistake\u201d, \u201cthis matters because\u201d, \u201cthat\u2019s it, that\u2019s the X\u201d.',
    find: makeRegexFinder(/\bfull\s+stop\b|\blet\s+that\s+sink\s+in\b|\bmake\s+no\s+mistake\b|\bthis\s+matters\s+because\b|\bhere['\u2019]s\s+why\s+(?:that|this|it)\s+matters\b|\bthat['\u2019]s\s+it[.,;:\u2013\u2014]\s*that['\u2019]s\s+the\b/gi)
  },
  {
    id: 'hand-holding',
    name: 'Pedagogical hand-holding',
    description: '\u201cLet\u2019s break this down / unpack / explore / dive in / delve\u201d, \u201cthink of it as / like\u201d, \u201cimagine a world where\u201d, \u201clet me walk you through\u201d.',
    find: makeRegexFinder(/\blet['\u2019]s\s+(?:break\s+(?:this|that|it)\s+down|unpack|explore|dive\s+in(?:to)?|delve)\b|\bthink\s+of\s+(?:it|this|them)\s+(?:as|like)\b|\bimagine\s+a\s+world\s+where\b|\blet\s+me\s+walk\s+you\s+through\b/gi)
  },
  {
    id: 'ai-vocab',
    name: 'AI vocabulary',
    description: 'delve, tapestry, landscape, nuanced, utilize, leverage, streamline, ecosystem, paradigm, synergy, robust, harness, game-changer. Some have honest uses; treat a match as a prompt, not a verdict.',
    find: makeRegexFinder(/\bdelv(?:e|es|ed|ing)\b|\btapestr(?:y|ies)\b|\blandscapes?\b|\bnuanced?\b|\butiliz(?:e|es|ed|ing|ation)\b|\bleverag(?:e|es|ed|ing)\b|\bstreamlin(?:e|es|ed|ing)\b|\becosystems?\b|\bparadigms?\b|\bsynerg(?:y|ies|istic)\b|\brobust(?:ly|ness)?\b|\bharness(?:es|ed|ing)?\b|\bgame[-\s]chang(?:er|ers|ing)\b/gi)
  },
  {
    id: 'serves-as',
    name: '\u201cServes as\u201d dodge',
    description: 'Pompous stand-ins for \u201cis\u201d: serves as, stands as, \u201cmarks a pivotal\u201d, \u201crepresents a significant\u201d.',
    find: makeRegexFinder(/\bserv(?:e|es|ed|ing)\s+as\b|\bstands?\s+as\b|\bstood\s+as\b|\bmarks\s+a\s+(?:pivotal|significant|crucial|major|key|turning)\b|\brepresents?\s+a\s+(?:pivotal|significant|fundamental|major|paradigm)\b/gi)
  },
  {
    id: 'filler',
    name: 'Filler transitions',
    description: '\u201cAt its core\u201d, \u201cit\u2019s worth noting\u201d, \u201cit bears mentioning\u201d, \u201cat the end of the day\u201d, \u201cwhen it comes to\u201d, \u201cin a world where\u201d, \u201cin today\u2019s X\u201d, \u201cthe reality is\u201d.',
    find: makeRegexFinder(/\bat\s+its\s+core\b|\b(?:it['\u2019]s|it\s+is|is)\s+worth\s+noting\b|\bit\s+bears\s+mentioning\b|\bat\s+the\s+end\s+of\s+the\s+day\b|\bwhen\s+it\s+comes\s+to\b|\bin\s+a\s+world\s+where\b|\bin\s+today['\u2019]s\s+\w+|\bthe\s+reality\s+is\b|\bit['\u2019]s\s+important\s+to\s+(?:note|remember|understand|recognize)\b/gi)
  },
  {
    id: 'magic-adverbs',
    name: 'Magic adverbs',
    description: 'Adverbs used to make mundane claims feel significant: quietly, deeply, fundamentally, inherently, inevitably, remarkably, arguably, genuinely, seamlessly, effortlessly, crucially, importantly, interestingly, notably.',
    find: makeRegexFinder(/\b(?:quietly|deeply|fundamentally|inherently|inevitably|remarkably|arguably|genuinely|seamlessly|effortlessly|crucially|importantly|interestingly|notably)\b/gi)
  },
  {
    id: 'negative-parallelism',
    name: 'Negative parallelism',
    description: '\u201cIt\u2019s not X. It\u2019s Y.\u201d, \u201cThe question isn\u2019t X, it\u2019s Y\u201d, \u201cnot because X but because Y\u201d, \u201cstops being X and starts being Y\u201d. The most commonly identified AI tell.',
    find: makeRegexFinder(/\b(?:isn['\u2019]t|aren['\u2019]t|wasn['\u2019]t|weren['\u2019]t|['\u2019]s\s+not|is\s+not|are\s+not|was\s+not)\s+(?:about\s+|just\s+|only\s+|merely\s+)?[\w'\u2019-]+(?:\s+[\w'\u2019-]+){0,6}?\s*[.,;:\u2013\u2014]+['"\u201d\u2019]*\s*(?:it|that|this|they)(?:['\u2019]s|['\u2019]re|\s+(?:is|are|was|were))\b|\bnot\s+because\s+[^.!?\n]{1,70}?\bbut\s+because\b|\bstops?\s+being\s+[^.!?\n]{1,60}?\bstarts?\s+(?:being|becoming)\b/gi)
  },
  {
    id: 'negative-listing',
    name: 'Negative listing',
    description: 'The dramatic countdown through negation: \u201cNot a bug. Not a feature. A fundamental design flaw.\u201d The badge counts the \u201cnot\u201d items.',
    find: makeCountingFinder(new RegExp(String.raw`\bnot\s+[^,.;:!?\n\u2013\u2014]{1,40}(?:[,.;:\u2013\u2014]+\s*(?:and\s+|or\s+|just\s+)?not\s+[^,.;:!?\n\u2013\u2014]{1,40})+`, 'gi'), /\bnot\b/gi, '\u201cnot\u201d item')
  },
  {
    id: 'not-just-but',
    name: '\u201cNot just X but Y\u201d',
    description: 'The additive hedge: \u201cnot just a trend, but a shift\u201d, \u201cnot only X but also Y\u201d.',
    find: makeRegexFinder(/(?:\bnot|n['\u2019]t)\s+(?:just|only|merely|simply)\s+[^.!?\n]{1,60}?\bbut\s+(?:also\s+)?[\w'\u2019-]+/gi)
  },
  {
    id: 'rhetorical-qa',
    name: 'Self-posed questions',
    description: '\u201cThe result? Devastating.\u201d Manufactured suspense: the kicker? the catch? the worst part?',
    find: makeRegexFinder(/\bthe\s+(?:result|kicker|catch|problem|answer|truth|irony|twist|lesson|takeaway|punchline|(?:best|worst|scary|crazy|wild|strange|weird)\s+part)\?/gi)
  },
  {
    id: 'vague-declaratives',
    name: 'Vague declaratives',
    description: 'Announcing importance without naming the thing: \u201cthe implications are significant\u201d, \u201cthe stakes are high\u201d, \u201cthe consequences are real\u201d, \u201cthe reasons are structural\u201d.',
    find: makeRegexFinder(/\bthe\s+implications\s+are\s+[\w-]+|\bthe\s+stakes\s+(?:are\s+[\w-]+|couldn['\u2019]t\s+be\s+higher)|\bthe\s+consequences\s+are\s+[\w-]+|\bthe\s+reasons\s+are\s+structural\b|\bthis\s+is\s+the\s+deepest\s+problem\b/gi)
  },
  {
    id: 'vague-attribution',
    name: 'Vague attributions',
    description: 'Unnamed authorities: \u201cexperts argue\u201d, \u201cindustry reports suggest\u201d, \u201cobservers have cited\u201d, \u201cseveral publications have noted\u201d. If you cannot name the source, you do not have one.',
    find: makeRegexFinder(/\bexperts\s+(?:argue|say|agree|suggest|believe|warn|caution)\b|\bobservers\s+have\s+(?:noted|cited|argued|suggested)\b|\bindustry\s+reports\s+suggest\b|\bseveral\s+publications\s+have\s+(?:noted|cited)\b|\banalysts\s+(?:say|believe|argue)\b/gi)
  },
  {
    id: 'stakes-inflation',
    name: 'Grandiose stakes',
    description: 'World-historical framing: \u201cfundamentally reshape\u201d, \u201cdefine the next era\u201d, \u201csomething entirely new\u201d, \u201creshape how we think about everything\u201d.',
    find: makeRegexFinder(/\bfundamentally\s+(?:reshap(?:e|es|ed|ing)|transform(?:s|ed|ing)?|chang(?:e|es|ed|ing))\b|\bdefine\s+the\s+next\s+era\b|\bsomething\s+entirely\s+new\b|\breshap(?:e|es|ed|ing)\s+how\s+we\s+think\s+about\b/gi)
  },
  {
    id: 'false-range',
    name: 'False ranges',
    description: '\u201cFrom X to Y to Z\u201d where there is no real spectrum: \u201cfrom problem-solving to scientific discovery to artistic expression\u201d.',
    find: makeRegexFinder(/\bfrom\s+[^,.;:!?\n]{1,45}?\s+to\s+[^,.;:!?\n]{1,45}?\s+to\s+[^,.;:!?\n]{1,45}/gi)
  },
  {
    id: 'participle-tail',
    name: 'Participle tails',
    description: 'Shallow significance tacked on with an -ing phrase: \u201chighlighting its enduring legacy\u201d, \u201cunderscoring its role as\u201d, \u201creflecting broader trends\u201d, \u201ccontributing to the region\u2019s rich cultural heritage\u201d.',
    find: makeRegexFinder(/\b(?:highlighting|underscoring|reflecting|showcasing|demonstrating|cementing|solidifying|signaling)\s+(?:its|their|the|a|an|broader)\b[^.!?\n]{0,60}|\bcontributing\s+to\s+the\b[^.!?\n]{0,60}/gi)
  },
  {
    id: 'despite-challenges',
    name: '\u201cDespite these challenges\u201d',
    description: 'Acknowledge-and-dismiss: \u201cdespite these challenges, the initiative continues to thrive\u201d, \u201cfaces challenges typical of\u201d.',
    find: makeRegexFinder(/\bdespite\s+(?:these|its|their|the)\s+(?:[\w-]+\s+){0,3}?challenges\b|\bfaces?\s+challenges\s+typical\s+of\b|\bchallenges\s+that\s+must\s+be\s+addressed\b/gi)
  },
  {
    id: 'signposted-conclusion',
    name: 'Signposted conclusions',
    description: '\u201cIn conclusion\u201d, \u201cto sum up\u201d, \u201cin summary\u201d, \u201cin closing\u201d. Competent writing does not need to announce that it is concluding.',
    find: makeRegexFinder(/\bin\s+conclusion\b|\bto\s+sum\s+up\b|\bin\s+summary\b|\bin\s+closing\b/gi)
  },
  {
    id: 'listicle',
    name: 'Listicle in a trench coat',
    description: 'Numbered prose: \u201cThe first wall is\u2026 The second wall is\u2026 The third takeaway is\u2026\u201d. Flags the ordinal sentences from \u201csecond\u201d on.',
    find: makeRegexFinder(/\bthe\s+(?:second|third|fourth|fifth)\s+[\w-]+\s+(?:is|was)\b/gi)
  },
  {
    id: 'invented-labels',
    name: 'Invented concept labels',
    description: 'Compound labels posing as established terms: \u201cthe supervision paradox\u201d, \u201cthe acceleration trap\u201d, \u201cworkload creep\u201d. Expect some false positives on real terms.',
    find: makeRegexFinder(/\bthe\s+[\w-]+\s+(?:paradox|trap|inversion)\b|\b(?:workload|scope|mission|feature|complexity|process|meeting)\s+creep\b/gi)
  },
  {
    id: 'meta-commentary',
    name: 'Meta-commentary',
    description: 'Self-referential asides: “Plot twist:”, “Spoiler:”, “Hint:”, “a feature, not a bug”, “dressed up as”, “that’s another post”, “as we’ll see”, “in this section, we’ll”.',
    find: makeRegexFinder(/\b(?:plot\s+twist|spoiler(?:\s+alert)?|hint)\s*:|\ba\s+feature,\s+not\s+a\s+bug\b|\bdressed\s+up\s+as\b|\bthat['’]s\s+(?:a\s+topic\s+for\s+)?another\s+post\b|\bas\s+we['’]ll\s+see\b|\bin\s+this\s+(?:section|post|essay|article),\s+(?:we['’]ll|i['’]ll)\b/gi)
  },
  {
    id: 'false-vulnerability',
    name: 'False vulnerability',
    description: 'Performative self-awareness: “and yes, I’m openly…”, “since we’re being honest”, “this is not a rant; it’s a diagnosis”.',
    find: makeRegexFinder(/\band\s+yes,\s+i['’]m\s+openly\b|\bsince\s+we['’]re\s+being\s+honest\b|\bnot\s+a\s+rant[;,.:]?\s*it['’]s\s+a\s+diagnosis\b/gi)
  },
  {
    id: 'truth-is-simple',
    name: '“The truth is simple”',
    description: 'Asserting clarity instead of demonstrating it: “the reality is simpler”, “history is unambiguous”, “the metrics are clear”, “the real story is”.',
    find: makeRegexFinder(/\bthe\s+reality\s+is\s+simpler\b|\bhistory\s+is\s+(?:unambiguous|clear)\b|\bthe\s+(?:metrics|examples|data)\s+(?:are|is)\s+clear\b|\bnone\s+of\s+them\s+is\s+the\s+real\s+story\b|\bthe\s+real\s+story\s+is\b/gi)
  },
  {
    id: 'telling-not-showing',
    name: 'Telling, not showing',
    description: 'Announcing difficulty or significance instead of demonstrating it: “this is genuinely hard”, “this is what leadership actually looks like”, “actually matters”.',
    find: makeRegexFinder(/\bthis\s+is\s+genuinely\s+hard\b|\bthis\s+is\s+what\s+[\w\s'’-]{1,30}?\s+(?:actually|really)\s+looks\s+like\b|\bactually\s+matters\b/gi)
  },
  {
    id: 'hidden-actor',
    name: 'Hidden actors',
    description: 'Passive constructions that hide who acted: “mistakes were made”, “it is widely believed that”, “the decision was reached”.',
    find: makeRegexFinder(/\bit\s+is\s+(?:widely\s+)?(?:believed|thought|said|understood|acknowledged|recognized|argued)\s+that\b|\bmistakes\s+were\s+made\b|\bthe\s+decision\s+was\s+(?:reached|made)\b/gi)
  },
  {
    id: 'anaphora',
    name: 'Anaphora abuse',
    description: 'The same two- or three-word sentence opener three or more times in a row: “They assume that… They assume that… They assume that…”',
    find: makeRegexFinder(/(?<=^|[.!?]\s)([A-Z][\w'’]*(?:\s+[\w'’]+){1,2})[^.!?\n]{0,80}[.!?]['"”’]*\s+\1\b[^.!?\n]{0,80}[.!?]['"”’]*\s+\1\b[^.!?\n]{0,80}[.!?]/gm)
  },
  {
    id: 'business-jargon',
    name: 'Business jargon',
    description: 'deep dive, double down, lean into, circle back, moving forward, on the same page, take a step back, navigate, unpack. Some have honest uses; treat a match as a prompt.',
    find: makeRegexFinder(/\bdeep\s+dive\b|\bdouble\s+down\b|\blean(?:s|ed|ing)?\s+into\b|\bcircle\s+back\b|\bmoving\s+forward\b|\bon\s+the\s+same\s+page\b|\btake\s+a\s+step\s+back\b|\bnavigat(?:e|es|ed|ing)\b|\bunpack(?:s|ed|ing)?\b/gi)
  },
  {
    id: 'em-dash',
    name: 'Em dashes',
    description: 'A human uses two or three per piece; AI uses twenty. Every em or en dash gets flagged so you can count them.',
    find: makeRegexFinder(/[\u2013\u2014]|\s--\s/g)
  },
  {
    id: 'arrows',
    name: 'Unicode arrows',
    description: 'The \u2192 arrow and friends. Real writers typing in a text editor produce -> or =>.',
    find: makeRegexFinder(/[\u2190\u2192\u21d2\u2794\u279c\u27a1]/g)
  },
  {
    id: 'bold-bullets',
    name: 'Bold-first bullets',
    description: 'Markdown list items that open with a bolded phrase: \u201c- **Security**: \u2026\u201d. Almost nobody formats lists this way by hand.',
    find: makeRegexFinder(/^[ \t]*(?:[-*\u2022]|\d+\.)\s+\*\*[^*\n]+\*\*/gm)
  },
  {
    id: 'emoji',
    name: 'Emoji',
    description: 'Decorative emoji in prose, a telltale sign of AI-generated docs and READMEs.',
    find: makeRegexFinder(/[\u2600-\u27bf\u2b50\u2b55\u{1f000}-\u{1faff}]/gu)
  }
];

// END VERBATIM GRAMPAN CODE

// Adapter code: retain every upstream detector and return only DOM-neutral offsets.
function findAllMatches(text, activePatterns) {
  return (activePatterns || patterns).flatMap((pattern) => pattern.find(text).map((match) => ({
    start: match.start,
    end: match.end,
    patternId: pattern.id
  })));
}

globalThis.GrampanEngine = { findAllMatches, patterns, makeRegexFinder };
