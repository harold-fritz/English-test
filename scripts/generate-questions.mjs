/**
 * Question pool generator.
 *
 * Produces, for every English level (B1..D1), a large pool (>= 600) of
 * multiple-choice questions with 5 options each. Every question carries the
 * correct answer index and a Spanish explanation of WHY that option is correct.
 *
 * The output is deterministic (seeded RNG) so the committed JSON is stable and
 * the automated tests are reproducible.
 *
 *   node scripts/generate-questions.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data", "questions");

/* ------------------------------------------------------------------ */
/* Deterministic RNG (mulberry32) so generation is reproducible.       */
/* ------------------------------------------------------------------ */
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN(pool, n, rng, exclude = new Set()) {
  const candidates = pool.filter((x) => !exclude.has(x));
  return shuffle(candidates, rng).slice(0, n);
}

/* ------------------------------------------------------------------ */
/* English conjugation helpers (regular forms).                        */
/* ------------------------------------------------------------------ */
const DOUBLE_ING_PAST = new Set([
  "run","stop","plan","swim","sit","get","put","cut","shop","win","hit","set",
  "jog","chat","drop","clap","grab","rub","beg","dig","tap","wrap","ban","nod",
  "pat","slip","spot","trip","knit","permit","commit","refer","prefer","occur",
]);

function thirdPerson(base) {
  if (base === "have") return "has";
  if (/(s|x|z|ch|sh|o)$/.test(base)) return base + "es";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies";
  return base + "s";
}

function ingForm(base) {
  if (base === "be") return "being";
  if (/ie$/.test(base)) return base.slice(0, -2) + "ying";
  if (/ee$/.test(base)) return base + "ing";
  if (/e$/.test(base)) return base.slice(0, -1) + "ing";
  if (DOUBLE_ING_PAST.has(base)) return base + base.slice(-1) + "ing";
  return base + "ing";
}

function regularPast(base) {
  if (/e$/.test(base)) return base + "d";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  if (DOUBLE_ING_PAST.has(base)) return base + base.slice(-1) + "ed";
  return base + "ed";
}

/* Verb table. Irregulars provide [past, pp]; regulars are computed. */
function verb(base, difficulty, irr) {
  const past = irr ? irr[0] : regularPast(base);
  const pp = irr ? irr[1] : past;
  return {
    base,
    difficulty,
    third: thirdPerson(base),
    ing: ingForm(base),
    past,
    pp,
  };
}

const VERBS = [
  // difficulty 1 — everyday verbs
  verb("work", 1), verb("play", 1), verb("watch", 1), verb("study", 1),
  verb("live", 1), verb("help", 1), verb("call", 1), verb("talk", 1),
  verb("look", 1), verb("use", 1), verb("try", 1), verb("ask", 1),
  verb("start", 1), verb("open", 1), verb("close", 1), verb("walk", 1),
  verb("clean", 1), verb("cook", 1), verb("want", 1), verb("need", 1),
  verb("like", 1), verb("learn", 1), verb("stay", 1), verb("visit", 1),
  verb("answer", 1), verb("finish", 1), verb("travel", 1), verb("carry", 1),
  verb("go", 1, ["went", "gone"]), verb("make", 1, ["made", "made"]),
  verb("take", 1, ["took", "taken"]), verb("get", 1, ["got", "gotten"]),
  verb("see", 1, ["saw", "seen"]), verb("come", 1, ["came", "come"]),
  verb("have", 1, ["had", "had"]), verb("do", 1, ["did", "done"]),
  verb("say", 1, ["said", "said"]), verb("give", 1, ["gave", "given"]),
  verb("run", 1, ["ran", "run"]), verb("eat", 1, ["ate", "eaten"]),
  verb("drink", 1, ["drank", "drunk"]), verb("read", 1, ["read", "read"]),
  verb("write", 1, ["wrote", "written"]), verb("sleep", 1, ["slept", "slept"]),
  verb("buy", 1, ["bought", "bought"]), verb("bring", 1, ["brought", "brought"]),
  verb("meet", 1, ["met", "met"]), verb("pay", 1, ["paid", "paid"]),
  verb("sit", 1, ["sat", "sat"]), verb("tell", 1, ["told", "told"]),

  // difficulty 2
  verb("find", 2, ["found", "found"]), verb("think", 2, ["thought", "thought"]),
  verb("feel", 2, ["felt", "felt"]), verb("keep", 2, ["kept", "kept"]),
  verb("hold", 2, ["held", "held"]), verb("hear", 2, ["heard", "heard"]),
  verb("speak", 2, ["spoke", "spoken"]), verb("lead", 2, ["led", "led"]),
  verb("grow", 2, ["grew", "grown"]), verb("lose", 2, ["lost", "lost"]),
  verb("fall", 2, ["fell", "fallen"]), verb("send", 2, ["sent", "sent"]),
  verb("build", 2, ["built", "built"]), verb("spend", 2, ["spent", "spent"]),
  verb("catch", 2, ["caught", "caught"]), verb("sell", 2, ["sold", "sold"]),
  verb("win", 2, ["won", "won"]), verb("drive", 2, ["drove", "driven"]),
  verb("ride", 2, ["rode", "ridden"]), verb("wear", 2, ["wore", "worn"]),
  verb("become", 2, ["became", "become"]), verb("leave", 2, ["left", "left"]),
  verb("understand", 2, ["understood", "understood"]),
  verb("teach", 2, ["taught", "taught"]), verb("stand", 2, ["stood", "stood"]),
  verb("forget", 2, ["forgot", "forgotten"]), verb("begin", 2, ["began", "begun"]),

  // difficulty 3
  verb("choose", 3, ["chose", "chosen"]), verb("rise", 3, ["rose", "risen"]),
  verb("throw", 3, ["threw", "thrown"]), verb("fly", 3, ["flew", "flown"]),
  verb("swim", 3, ["swam", "swum"]), verb("steal", 3, ["stole", "stolen"]),
  verb("freeze", 3, ["froze", "frozen"]), verb("sing", 3, ["sang", "sung"]),
  verb("ring", 3, ["rang", "rung"]), verb("shake", 3, ["shook", "shaken"]),
  verb("break", 3, ["broke", "broken"]), verb("draw", 3, ["drew", "drawn"]),
  verb("hang", 3, ["hung", "hung"]), verb("bite", 3, ["bit", "bitten"]),
  verb("blow", 3, ["blew", "blown"]), verb("hide", 3, ["hid", "hidden"]),
  verb("shine", 3, ["shone", "shone"]), verb("tear", 3, ["tore", "torn"]),
  verb("sweep", 3, ["swept", "swept"]), verb("dig", 3, ["dug", "dug"]),

  // difficulty 4
  verb("seek", 4, ["sought", "sought"]), verb("bind", 4, ["bound", "bound"]),
  verb("cling", 4, ["clung", "clung"]), verb("fling", 4, ["flung", "flung"]),
  verb("wring", 4, ["wrung", "wrung"]), verb("tread", 4, ["trod", "trodden"]),
  verb("swell", 4, ["swelled", "swollen"]), verb("forbid", 4, ["forbade", "forbidden"]),
  verb("undertake", 4, ["undertook", "undertaken"]),
  verb("withdraw", 4, ["withdrew", "withdrawn"]),
  verb("overcome", 4, ["overcame", "overcome"]),
  verb("foresee", 4, ["foresaw", "foreseen"]),
  verb("uphold", 4, ["upheld", "upheld"]), verb("weave", 4, ["wove", "woven"]),
  verb("thrust", 4, ["thrust", "thrust"]), verb("bend", 4, ["bent", "bent"]),
  verb("lend", 4, ["lent", "lent"]), verb("swear", 4, ["swore", "sworn"]),

  // difficulty 5 — literary / advanced irregulars
  verb("forsake", 5, ["forsook", "forsaken"]),
  verb("strive", 5, ["strove", "striven"]),
  verb("smite", 5, ["smote", "smitten"]), verb("slay", 5, ["slew", "slain"]),
  verb("beget", 5, ["begot", "begotten"]), verb("rend", 5, ["rent", "rent"]),
  verb("shear", 5, ["sheared", "shorn"]), verb("hew", 5, ["hewed", "hewn"]),
  verb("cleave", 5, ["clove", "cloven"]), verb("gird", 5, ["girt", "girt"]),
];

/* Adjectives with comparative/superlative type. */
function adj(word, es, type, irr) {
  let comp, sup;
  switch (type) {
    case "er": comp = word + "er"; sup = word + "est"; break;
    case "e": comp = word + "r"; sup = word + "st"; break;
    case "y": comp = word.slice(0, -1) + "ier"; sup = word.slice(0, -1) + "iest"; break;
    case "double": comp = word + word.slice(-1) + "er"; sup = word + word.slice(-1) + "est"; break;
    case "more": comp = "more " + word; sup = "most " + word; break;
    case "irr": comp = irr[0]; sup = irr[1]; break;
    default: throw new Error("bad adj type " + type);
  }
  return { word, es, comp, sup, difficulty: 1 };
}

const ADJECTIVES = [
  adj("small", "pequeño", "er"), adj("tall", "alto", "er"),
  adj("cheap", "barato", "er"), adj("cold", "frío", "er"),
  adj("old", "viejo", "er"), adj("young", "joven", "er"),
  adj("fast", "rápido", "er"), adj("slow", "lento", "er"),
  adj("strong", "fuerte", "er"), adj("weak", "débil", "er"),
  adj("high", "alto", "er"), adj("low", "bajo", "er"),
  adj("clean", "limpio", "er"), adj("bright", "brillante", "er"),
  adj("large", "grande", "e"), adj("nice", "agradable", "e"),
  adj("safe", "seguro", "e"), adj("close", "cercano", "e"),
  adj("wide", "ancho", "e"), adj("simple", "simple", "e"),
  adj("happy", "feliz", "y"), adj("easy", "fácil", "y"),
  adj("busy", "ocupado", "y"), adj("early", "temprano", "y"),
  adj("heavy", "pesado", "y"), adj("pretty", "bonito", "y"),
  adj("friendly", "amable", "y"), adj("lucky", "afortunado", "y"),
  adj("big", "grande", "double"), adj("hot", "caliente", "double"),
  adj("sad", "triste", "double"), adj("thin", "delgado", "double"),
  adj("fat", "gordo", "double"), adj("wet", "mojado", "double"),
  adj("expensive", "caro", "more"), adj("beautiful", "hermoso", "more"),
  adj("difficult", "difícil", "more"), adj("important", "importante", "more"),
  adj("interesting", "interesante", "more"), adj("comfortable", "cómodo", "more"),
  adj("careful", "cuidadoso", "more"), adj("modern", "moderno", "more"),
  adj("popular", "popular", "more"), adj("dangerous", "peligroso", "more"),
  adj("intelligent", "inteligente", "more"), adj("generous", "generoso", "more"),
  adj("good", "bueno", "irr", ["better", "best"]),
  adj("bad", "malo", "irr", ["worse", "worst"]),
  adj("far", "lejano", "irr", ["farther", "farthest"]),
];

/* ------------------------------------------------------------------ */
/* Vocabulary banks per level: { word, es, syn, ant }.                 */
/* es = Spanish gloss, syn = English synonym, ant = English antonym.   */
/* ------------------------------------------------------------------ */
const VOCAB = {
  B1: [
    { word: "happy", es: "feliz", syn: "glad", ant: "sad" },
    { word: "big", es: "grande", syn: "large", ant: "small" },
    { word: "fast", es: "rápido", syn: "quick", ant: "slow" },
    { word: "begin", es: "empezar", syn: "start", ant: "finish" },
    { word: "buy", es: "comprar", syn: "purchase", ant: "sell" },
    { word: "smart", es: "inteligente", syn: "clever", ant: "stupid" },
    { word: "easy", es: "fácil", syn: "simple", ant: "difficult" },
    { word: "rich", es: "rico", syn: "wealthy", ant: "poor" },
    { word: "correct", es: "correcto", syn: "right", ant: "wrong" },
    { word: "close", es: "cerrar", syn: "shut", ant: "open" },
    { word: "cheap", es: "barato", syn: "inexpensive", ant: "expensive" },
    { word: "strong", es: "fuerte", syn: "powerful", ant: "weak" },
    { word: "empty", es: "vacío", syn: "vacant", ant: "full" },
    { word: "dangerous", es: "peligroso", syn: "risky", ant: "safe" },
    { word: "beautiful", es: "hermoso", syn: "pretty", ant: "ugly" },
    { word: "tired", es: "cansado", syn: "sleepy", ant: "energetic" },
    { word: "angry", es: "enojado", syn: "mad", ant: "calm" },
    { word: "important", es: "importante", syn: "significant", ant: "trivial" },
    { word: "difficult", es: "difícil", syn: "hard", ant: "easy" },
    { word: "quiet", es: "silencioso", syn: "silent", ant: "noisy" },
    { word: "clean", es: "limpio", syn: "tidy", ant: "dirty" },
    { word: "brave", es: "valiente", syn: "courageous", ant: "cowardly" },
    { word: "answer", es: "responder", syn: "reply", ant: "ask" },
    { word: "keep", es: "guardar", syn: "retain", ant: "discard" },
    { word: "allow", es: "permitir", syn: "permit", ant: "forbid" },
    { word: "hate", es: "odiar", syn: "detest", ant: "love" },
    { word: "arrive", es: "llegar", syn: "reach", ant: "depart" },
    { word: "increase", es: "aumentar", syn: "grow", ant: "decrease" },
    { word: "remember", es: "recordar", syn: "recall", ant: "forget" },
    { word: "polite", es: "educado", syn: "courteous", ant: "rude" },
    { word: "famous", es: "famoso", syn: "renowned", ant: "unknown" },
    { word: "wet", es: "mojado", syn: "damp", ant: "dry" },
    { word: "loud", es: "ruidoso", syn: "noisy", ant: "quiet" },
    { word: "modern", es: "moderno", syn: "current", ant: "ancient" },
    { word: "wide", es: "ancho", syn: "broad", ant: "narrow" },
    { word: "true", es: "verdadero", syn: "accurate", ant: "false" },
    { word: "same", es: "mismo", syn: "identical", ant: "different" },
    { word: "healthy", es: "sano", syn: "fit", ant: "sick" },
    { word: "kind", es: "amable", syn: "nice", ant: "cruel" },
    { word: "enough", es: "suficiente", syn: "sufficient", ant: "insufficient" },
  ],
  B2: [
    { word: "achieve", es: "lograr", syn: "accomplish", ant: "fail" },
    { word: "reduce", es: "reducir", syn: "diminish", ant: "increase" },
    { word: "reliable", es: "confiable", syn: "dependable", ant: "unreliable" },
    { word: "obvious", es: "evidente", syn: "apparent", ant: "obscure" },
    { word: "reluctant", es: "reacio", syn: "unwilling", ant: "eager" },
    { word: "generous", es: "generoso", syn: "giving", ant: "stingy" },
    { word: "accurate", es: "preciso", syn: "precise", ant: "inaccurate" },
    { word: "confident", es: "seguro de sí mismo", syn: "assured", ant: "insecure" },
    { word: "genuine", es: "auténtico", syn: "authentic", ant: "fake" },
    { word: "complex", es: "complejo", syn: "complicated", ant: "simple" },
    { word: "reveal", es: "revelar", syn: "disclose", ant: "conceal" },
    { word: "praise", es: "elogiar", syn: "commend", ant: "criticize" },
    { word: "abundant", es: "abundante", syn: "plentiful", ant: "scarce" },
    { word: "flexible", es: "flexible", syn: "adaptable", ant: "rigid" },
    { word: "encourage", es: "animar", syn: "motivate", ant: "discourage" },
    { word: "temporary", es: "temporal", syn: "transient", ant: "permanent" },
    { word: "essential", es: "esencial", syn: "vital", ant: "optional" },
    { word: "vague", es: "vago", syn: "unclear", ant: "precise" },
    { word: "expand", es: "expandir", syn: "enlarge", ant: "shrink" },
    { word: "cautious", es: "cauteloso", syn: "careful", ant: "reckless" },
    { word: "sufficient", es: "suficiente", syn: "adequate", ant: "inadequate" },
    { word: "hostile", es: "hostil", syn: "aggressive", ant: "friendly" },
    { word: "permit", es: "permitir", syn: "authorize", ant: "prohibit" },
    { word: "gather", es: "reunir", syn: "collect", ant: "scatter" },
    { word: "fragile", es: "frágil", syn: "delicate", ant: "sturdy" },
    { word: "reject", es: "rechazar", syn: "decline", ant: "accept" },
    { word: "curious", es: "curioso", syn: "inquisitive", ant: "indifferent" },
    { word: "consistent", es: "consistente", syn: "steady", ant: "erratic" },
    { word: "prevent", es: "prevenir", syn: "avert", ant: "cause" },
    { word: "humble", es: "humilde", syn: "modest", ant: "arrogant" },
    { word: "obtain", es: "obtener", syn: "acquire", ant: "lose" },
    { word: "wealthy", es: "adinerado", syn: "affluent", ant: "impoverished" },
    { word: "silent", es: "silencioso", syn: "mute", ant: "vocal" },
    { word: "urgent", es: "urgente", syn: "pressing", ant: "trivial" },
    { word: "loyal", es: "leal", syn: "faithful", ant: "treacherous" },
    { word: "delay", es: "retrasar", syn: "postpone", ant: "advance" },
    { word: "sensible", es: "sensato", syn: "reasonable", ant: "foolish" },
    { word: "capable", es: "capaz", syn: "competent", ant: "incompetent" },
    { word: "improve", es: "mejorar", syn: "enhance", ant: "worsen" },
    { word: "external", es: "externo", syn: "outer", ant: "internal" },
  ],
  C1: [
    { word: "meticulous", es: "meticuloso", syn: "thorough", ant: "careless" },
    { word: "ambiguous", es: "ambiguo", syn: "equivocal", ant: "unambiguous" },
    { word: "diligent", es: "diligente", syn: "industrious", ant: "lazy" },
    { word: "candid", es: "franco", syn: "frank", ant: "evasive" },
    { word: "coherent", es: "coherente", syn: "logical", ant: "incoherent" },
    { word: "prudent", es: "prudente", syn: "judicious", ant: "rash" },
    { word: "resilient", es: "resiliente", syn: "tough", ant: "fragile" },
    { word: "scrutinize", es: "escudriñar", syn: "examine", ant: "ignore" },
    { word: "alleviate", es: "aliviar", syn: "ease", ant: "aggravate" },
    { word: "arbitrary", es: "arbitrario", syn: "random", ant: "deliberate" },
    { word: "benevolent", es: "benevolente", syn: "kind", ant: "malevolent" },
    { word: "concise", es: "conciso", syn: "succinct", ant: "verbose" },
    { word: "deteriorate", es: "deteriorarse", syn: "worsen", ant: "improve" },
    { word: "eloquent", es: "elocuente", syn: "articulate", ant: "inarticulate" },
    { word: "feasible", es: "factible", syn: "viable", ant: "impossible" },
    { word: "gregarious", es: "sociable", syn: "sociable", ant: "reclusive" },
    { word: "hinder", es: "obstaculizar", syn: "impede", ant: "facilitate" },
    { word: "impartial", es: "imparcial", syn: "unbiased", ant: "partial" },
    { word: "lucid", es: "lúcido", syn: "clear", ant: "confusing" },
    { word: "mitigate", es: "mitigar", syn: "lessen", ant: "intensify" },
    { word: "novel", es: "novedoso", syn: "original", ant: "conventional" },
    { word: "obsolete", es: "obsoleto", syn: "outdated", ant: "current" },
    { word: "plausible", es: "plausible", syn: "believable", ant: "implausible" },
    { word: "reciprocal", es: "recíproco", syn: "mutual", ant: "one-sided" },
    { word: "spontaneous", es: "espontáneo", syn: "impulsive", ant: "planned" },
    { word: "tentative", es: "tentativo", syn: "provisional", ant: "definite" },
    { word: "unprecedented", es: "sin precedentes", syn: "unparalleled", ant: "commonplace" },
    { word: "versatile", es: "versátil", syn: "adaptable", ant: "limited" },
    { word: "wary", es: "cauto", syn: "cautious", ant: "trusting" },
    { word: "zealous", es: "entusiasta", syn: "fervent", ant: "apathetic" },
    { word: "affluent", es: "próspero", syn: "prosperous", ant: "destitute" },
    { word: "brevity", es: "brevedad", syn: "conciseness", ant: "longevity" },
    { word: "compelling", es: "convincente", syn: "persuasive", ant: "unconvincing" },
    { word: "diverse", es: "diverso", syn: "varied", ant: "uniform" },
    { word: "endorse", es: "respaldar", syn: "support", ant: "oppose" },
    { word: "frugal", es: "frugal", syn: "thrifty", ant: "extravagant" },
    { word: "inevitable", es: "inevitable", syn: "unavoidable", ant: "avoidable" },
    { word: "profound", es: "profundo", syn: "deep", ant: "superficial" },
    { word: "reluctance", es: "renuencia", syn: "hesitation", ant: "eagerness" },
    { word: "tenacious", es: "tenaz", syn: "persistent", ant: "yielding" },
  ],
  C2: [
    { word: "ephemeral", es: "efímero", syn: "fleeting", ant: "enduring" },
    { word: "ubiquitous", es: "ubicuo", syn: "omnipresent", ant: "rare" },
    { word: "sagacious", es: "sagaz", syn: "shrewd", ant: "foolish" },
    { word: "obfuscate", es: "ofuscar", syn: "obscure", ant: "clarify" },
    { word: "pernicious", es: "pernicioso", syn: "harmful", ant: "beneficial" },
    { word: "quintessential", es: "por excelencia", syn: "archetypal", ant: "atypical" },
    { word: "recalcitrant", es: "recalcitrante", syn: "defiant", ant: "compliant" },
    { word: "surreptitious", es: "subrepticio", syn: "clandestine", ant: "overt" },
    { word: "taciturn", es: "taciturno", syn: "reticent", ant: "talkative" },
    { word: "vociferous", es: "vociferante", syn: "clamorous", ant: "silent" },
    { word: "assiduous", es: "asiduo", syn: "diligent", ant: "negligent" },
    { word: "capricious", es: "caprichoso", syn: "fickle", ant: "steadfast" },
    { word: "deleterious", es: "perjudicial", syn: "damaging", ant: "salutary" },
    { word: "esoteric", es: "esotérico", syn: "abstruse", ant: "accessible" },
    { word: "fastidious", es: "quisquilloso", syn: "meticulous", ant: "slovenly" },
    { word: "garrulous", es: "gárrulo", syn: "loquacious", ant: "laconic" },
    { word: "hackneyed", es: "trillado", syn: "trite", ant: "original" },
    { word: "iconoclast", es: "iconoclasta", syn: "rebel", ant: "conformist" },
    { word: "juxtapose", es: "yuxtaponer", syn: "contrast", ant: "separate" },
    { word: "laconic", es: "lacónico", syn: "terse", ant: "verbose" },
    { word: "magnanimous", es: "magnánimo", syn: "generous", ant: "vindictive" },
    { word: "nefarious", es: "nefando", syn: "wicked", ant: "virtuous" },
    { word: "obstinate", es: "obstinado", syn: "stubborn", ant: "amenable" },
    { word: "perfunctory", es: "superficial", syn: "cursory", ant: "thorough" },
    { word: "querulous", es: "quejumbroso", syn: "petulant", ant: "content" },
    { word: "reticent", es: "reticente", syn: "reserved", ant: "forthcoming" },
    { word: "spurious", es: "espurio", syn: "bogus", ant: "authentic" },
    { word: "trenchant", es: "incisivo", syn: "incisive", ant: "vague" },
    { word: "unctuous", es: "empalagoso", syn: "obsequious", ant: "sincere" },
    { word: "venerable", es: "venerable", syn: "esteemed", ant: "disreputable" },
    { word: "winsome", es: "encantador", syn: "charming", ant: "repellent" },
    { word: "abstruse", es: "abstruso", syn: "recondite", ant: "obvious" },
    { word: "belligerent", es: "beligerante", syn: "hostile", ant: "peaceable" },
    { word: "cogent", es: "convincente", syn: "compelling", ant: "weak" },
    { word: "dogmatic", es: "dogmático", syn: "opinionated", ant: "open-minded" },
    { word: "enervate", es: "debilitar", syn: "weaken", ant: "invigorate" },
    { word: "fortuitous", es: "fortuito", syn: "accidental", ant: "intentional" },
    { word: "gauche", es: "torpe", syn: "tactless", ant: "graceful" },
    { word: "harangue", es: "arenga", syn: "tirade", ant: "compliment" },
    { word: "impecunious", es: "sin dinero", syn: "penniless", ant: "wealthy" },
  ],
  D1: [
    { word: "perspicacious", es: "perspicaz", syn: "discerning", ant: "obtuse" },
    { word: "intransigent", es: "intransigente", syn: "uncompromising", ant: "flexible" },
    { word: "mellifluous", es: "melifluo", syn: "dulcet", ant: "cacophonous" },
    { word: "pusillanimous", es: "pusilánime", syn: "timid", ant: "valiant" },
    { word: "sycophant", es: "adulador", syn: "toady", ant: "critic" },
    { word: "truculent", es: "truculento", syn: "pugnacious", ant: "docile" },
    { word: "verisimilitude", es: "verosimilitud", syn: "plausibility", ant: "implausibility" },
    { word: "obsequious", es: "obsequioso", syn: "servile", ant: "domineering" },
    { word: "pellucid", es: "diáfano", syn: "transparent", ant: "opaque" },
    { word: "recondite", es: "recóndito", syn: "arcane", ant: "commonplace" },
    { word: "sanguine", es: "optimista", syn: "hopeful", ant: "despondent" },
    { word: "temerity", es: "temeridad", syn: "audacity", ant: "timidity" },
    { word: "ineffable", es: "inefable", syn: "indescribable", ant: "expressible" },
    { word: "jejune", es: "insípido", syn: "insipid", ant: "stimulating" },
    { word: "kaleidoscopic", es: "caleidoscópico", syn: "multifaceted", ant: "monotonous" },
    { word: "lugubrious", es: "lúgubre", syn: "mournful", ant: "cheerful" },
    { word: "maladroit", es: "torpe", syn: "clumsy", ant: "dexterous" },
    { word: "nugatory", es: "nulo", syn: "trifling", ant: "significant" },
    { word: "obstreperous", es: "ruidoso", syn: "unruly", ant: "docile" },
    { word: "propitious", es: "propicio", syn: "favorable", ant: "inauspicious" },
    { word: "quotidian", es: "cotidiano", syn: "everyday", ant: "extraordinary" },
    { word: "refractory", es: "refractario", syn: "obstinate", ant: "tractable" },
    { word: "sedulous", es: "diligente", syn: "assiduous", ant: "indolent" },
    { word: "turgid", es: "ampuloso", syn: "bombastic", ant: "concise" },
    { word: "umbrage", es: "resentimiento", syn: "offense", ant: "delight" },
    { word: "vituperate", es: "vituperar", syn: "berate", ant: "praise" },
    { word: "welter", es: "revoltijo", syn: "jumble", ant: "order" },
    { word: "xenophobia", es: "xenofobia", syn: "prejudice", ant: "tolerance" },
    { word: "zenith", es: "cenit", syn: "apex", ant: "nadir" },
    { word: "abnegation", es: "abnegación", syn: "self-denial", ant: "indulgence" },
    { word: "bellicose", es: "belicoso", syn: "warlike", ant: "irenic" },
    { word: "circumlocution", es: "circunloquio", syn: "verbosity", ant: "directness" },
    { word: "diaphanous", es: "diáfano", syn: "sheer", ant: "opaque" },
    { word: "effrontery", es: "descaro", syn: "impudence", ant: "diffidence" },
    { word: "fulminate", es: "fulminar", syn: "denounce", ant: "endorse" },
    { word: "grandiloquent", es: "grandilocuente", syn: "pompous", ant: "unpretentious" },
    { word: "hebetude", es: "letargo", syn: "lethargy", ant: "alertness" },
    { word: "inchoate", es: "incipiente", syn: "rudimentary", ant: "developed" },
    { word: "limpid", es: "límpido", syn: "lucid", ant: "murky" },
    { word: "munificent", es: "munífico", syn: "lavish", ant: "miserly" },
  ],
};

/* Generic English distractor pool (unrelated to any vocab answers). */
const GENERIC_EN = [
  "table", "window", "yellow", "garden", "morning", "bottle", "silver",
  "mountain", "river", "pencil", "orange", "corner", "planet", "market",
  "candle", "forest", "island", "engine", "ticket", "letter", "summer",
  "winter", "circle", "shadow", "picture", "machine", "camera", "guitar",
  "pocket", "jacket", "carpet", "basket", "napkin", "pillow", "ladder",
];

/* Phrasal-verb banks per level: { pv, es, en }. */
const PHRASALS = {
  B1: [
    { pv: "give up", es: "rendirse / dejar de hacer algo", en: "to stop trying" },
    { pv: "look after", es: "cuidar", en: "to take care of someone" },
    { pv: "find out", es: "averiguar", en: "to discover information" },
    { pv: "turn on", es: "encender", en: "to switch a device on" },
    { pv: "put on", es: "ponerse (ropa)", en: "to dress in clothes" },
    { pv: "get up", es: "levantarse", en: "to rise from bed" },
    { pv: "look for", es: "buscar", en: "to search for something" },
    { pv: "take off", es: "despegar / quitarse", en: "to leave the ground or remove clothing" },
    { pv: "come back", es: "regresar", en: "to return" },
    { pv: "wake up", es: "despertarse", en: "to stop sleeping" },
    { pv: "throw away", es: "tirar", en: "to discard in the rubbish" },
    { pv: "run out of", es: "quedarse sin", en: "to have no more of something" },
    { pv: "grow up", es: "crecer", en: "to become an adult" },
    { pv: "fill in", es: "rellenar", en: "to complete a form" },
    { pv: "get on", es: "subirse (a un transporte)", en: "to board a vehicle" },
  ],
  B2: [
    { pv: "carry out", es: "llevar a cabo", en: "to perform or conduct a task" },
    { pv: "put off", es: "posponer", en: "to postpone something" },
    { pv: "bring up", es: "mencionar / criar", en: "to raise a topic or a child" },
    { pv: "come across", es: "encontrarse con", en: "to find by chance" },
    { pv: "look up to", es: "admirar", en: "to admire and respect someone" },
    { pv: "get over", es: "superar", en: "to recover from something" },
    { pv: "point out", es: "señalar", en: "to indicate or mention" },
    { pv: "turn down", es: "rechazar", en: "to reject an offer" },
    { pv: "set up", es: "establecer", en: "to establish or arrange" },
    { pv: "break down", es: "averiarse", en: "to stop functioning" },
    { pv: "call off", es: "cancelar", en: "to cancel an event" },
    { pv: "make up", es: "inventar / reconciliarse", en: "to invent or to reconcile" },
    { pv: "figure out", es: "descifrar", en: "to understand after thinking" },
    { pv: "hold on", es: "esperar", en: "to wait for a short time" },
    { pv: "back up", es: "respaldar", en: "to support or make a copy" },
  ],
  C1: [
    { pv: "account for", es: "explicar / representar", en: "to explain or constitute" },
    { pv: "come up with", es: "idear", en: "to produce an idea or plan" },
    { pv: "cut back on", es: "reducir", en: "to reduce consumption of something" },
    { pv: "do away with", es: "abolir", en: "to abolish or get rid of" },
    { pv: "fall through", es: "fracasar", en: "to fail to happen" },
    { pv: "get around to", es: "encontrar tiempo para", en: "to finally do something delayed" },
    { pv: "iron out", es: "resolver", en: "to resolve difficulties" },
    { pv: "single out", es: "destacar / señalar", en: "to select from a group" },
    { pv: "stand for", es: "representar / tolerar", en: "to represent or to tolerate" },
    { pv: "weigh up", es: "sopesar", en: "to assess options carefully" },
    { pv: "branch out", es: "diversificarse", en: "to expand into new areas" },
    { pv: "dwell on", es: "insistir en", en: "to think or speak at length about" },
    { pv: "gloss over", es: "pasar por alto", en: "to avoid discussing fully" },
    { pv: "rope in", es: "involucrar", en: "to persuade someone to help" },
    { pv: "tide over", es: "sacar de un apuro", en: "to help through a difficult period" },
  ],
  C2: [
    { pv: "hark back to", es: "remontarse a", en: "to recall an earlier time" },
    { pv: "peter out", es: "disminuir gradualmente", en: "to fade to nothing" },
    { pv: "reel off", es: "recitar de corrido", en: "to say a list quickly and easily" },
    { pv: "square with", es: "cuadrar con", en: "to be consistent with" },
    { pv: "trump up", es: "inventar (cargos)", en: "to fabricate an accusation" },
    { pv: "wade through", es: "abrirse paso con dificultad", en: "to get through with effort" },
    { pv: "bandy about", es: "difundir sin cuidado", en: "to mention casually and often" },
    { pv: "chalk up", es: "atribuir / anotar", en: "to attribute or achieve" },
    { pv: "egg on", es: "incitar", en: "to urge someone to do something" },
    { pv: "flesh out", es: "desarrollar en detalle", en: "to add more detail" },
    { pv: "hem in", es: "acorralar", en: "to surround and restrict" },
    { pv: "keel over", es: "desplomarse", en: "to collapse suddenly" },
    { pv: "lord over", es: "dominar con arrogancia", en: "to behave superior toward" },
    { pv: "muscle in", es: "entrometerse por la fuerza", en: "to force one's way in" },
    { pv: "palm off", es: "endosar (algo no deseado)", en: "to dispose of by deceit" },
  ],
  D1: [
    { pv: "cast aspersions on", es: "difamar", en: "to make damaging insinuations" },
    { pv: "hold forth", es: "perorar", en: "to speak at length pompously" },
    { pv: "inveigh against", es: "arremeter contra", en: "to protest strongly against" },
    { pv: "lord it over", es: "avasallar", en: "to act in a superior way toward" },
    { pv: "make away with", es: "llevarse / robar", en: "to steal and escape" },
    { pv: "run roughshod over", es: "atropellar", en: "to disregard someone harshly" },
    { pv: "set great store by", es: "dar gran valor a", en: "to value highly" },
    { pv: "sugar-coat", es: "edulcorar", en: "to make more palatable than reality" },
    { pv: "take umbrage at", es: "ofenderse por", en: "to feel offended by" },
    { pv: "trot out", es: "sacar a relucir (lo de siempre)", en: "to repeat a tired argument" },
    { pv: "cotton on to", es: "caer en la cuenta de", en: "to begin to understand" },
    { pv: "ferret out", es: "desenterrar", en: "to discover by searching diligently" },
    { pv: "gad about", es: "callejear", en: "to roam in search of pleasure" },
    { pv: "hive off", es: "escindir", en: "to separate part of a business" },
    { pv: "winkle out", es: "sonsacar", en: "to extract with difficulty" },
  ],
};

/* Preposition items (shared, fundamental). */
const PREP_SET = ["in","on","at","since","for","by","during","from","to","of","with","about","under","over","into"];
const PREPOSITIONS = [
  { s: "The meeting is ___ Monday morning.", a: "on", why: "Usamos 'on' con días de la semana y fechas concretas." },
  { s: "She was born ___ 1998.", a: "in", why: "Usamos 'in' con años, meses, estaciones y siglos." },
  { s: "We usually have dinner ___ 8 o'clock.", a: "at", why: "Usamos 'at' con horas exactas del reloj." },
  { s: "I have lived here ___ 2010.", a: "since", why: "'since' indica el punto de inicio de una acción que continúa (desde)." },
  { s: "He has studied English ___ five years.", a: "for", why: "'for' indica la duración de un periodo de tiempo (durante)." },
  { s: "The book was written ___ a famous author.", a: "by", why: "En la voz pasiva, el agente se introduce con 'by'." },
  { s: "I fell asleep ___ the film.", a: "during", why: "'during' indica que algo ocurre dentro de un periodo o evento." },
  { s: "This present is ___ you.", a: "for", why: "'for' expresa el destinatario o beneficiario." },
  { s: "She is afraid ___ spiders.", a: "of", why: "El adjetivo 'afraid' se combina con la preposición 'of'." },
  { s: "Cut the paper ___ small pieces.", a: "into", why: "'into' expresa movimiento hacia el interior o transformación." },
  { s: "I agree ___ you on that point.", a: "with", why: "'agree with' + persona: estar de acuerdo con alguien." },
  { s: "They talked ___ the new project.", a: "about", why: "'talk about' significa hablar sobre un tema." },
  { s: "The cat is hiding ___ the table.", a: "under", why: "'under' indica posición debajo de algo." },
  { s: "We flew ___ Madrid to Rome.", a: "from", why: "'from' indica el origen o punto de partida." },
  { s: "The letter arrived ___ the morning.", a: "in", why: "Usamos 'in' con partes del día: in the morning/afternoon/evening." },
  { s: "Put your coat ___ the hook.", a: "on", why: "'on' indica contacto con una superficie." },
  { s: "I'll see you ___ the weekend.", a: "at", why: "En inglés británico usamos 'at the weekend'." },
  { s: "The plane flew ___ the clouds.", a: "over", why: "'over' indica posición o movimiento por encima de algo." },
  { s: "This is a photo ___ my family.", a: "of", why: "'of' expresa pertenencia o contenido." },
  { s: "She went ___ the shop to buy milk.", a: "to", why: "'to' expresa dirección o destino de un movimiento." },
  { s: "He knocked ___ the door.", a: "on", why: "La colocación fija es 'knock on the door'." },
  { s: "I'm good ___ mathematics.", a: "at", why: "'good at' + actividad: ser bueno en algo." },
  { s: "The train leaves ___ ten minutes.", a: "in", why: "'in + periodo' indica cuándo ocurrirá algo en el futuro." },
  { s: "We have been friends ___ childhood.", a: "since", why: "'since' marca el inicio: desde la infancia hasta ahora." },
  { s: "She apologized ___ being late.", a: "for", why: "'apologize for' + causa: disculparse por algo." },
];

/* Article a/an items. */
const ARTICLES = [
  { noun: "apple", a: "an" }, { noun: "hour", a: "an" }, { noun: "university", a: "a" },
  { noun: "umbrella", a: "an" }, { noun: "house", a: "a" }, { noun: "honest man", a: "an" },
  { noun: "European country", a: "a" }, { noun: "idea", a: "an" }, { noun: "car", a: "a" },
  { noun: "orange", a: "an" }, { noun: "one-way ticket", a: "a" }, { noun: "island", a: "an" },
  { noun: "dog", a: "a" }, { noun: "egg", a: "an" }, { noun: "uniform", a: "a" },
  { noun: "elephant", a: "an" }, { noun: "table", a: "a" }, { noun: "MP", a: "an" },
  { noun: "banana", a: "a" }, { noun: "old friend", a: "an" }, { noun: "unicorn", a: "a" },
  { noun: "office", a: "an" }, { noun: "book", a: "a" }, { noun: "umbrella stand", a: "an" },
];

/* Modal-verb items: { s, a, options, why }. */
const MODALS = [
  { s: "You ___ smoke here. It is strictly forbidden.", a: "mustn't", opts: ["mustn't","don't have to","needn't","could","might"], why: "'mustn't' expresa prohibición: no está permitido hacerlo." },
  { s: "It's optional; you ___ come if you don't want to.", a: "don't have to", opts: ["don't have to","mustn't","can't","shouldn't","couldn't"], why: "'don't have to' indica ausencia de obligación (no es necesario)." },
  { s: "She ___ speak three languages fluently.", a: "can", opts: ["can","must","should","ought","need"], why: "'can' expresa habilidad o capacidad." },
  { s: "You look tired. You ___ get some rest.", a: "should", opts: ["should","must not","can't","won't","daren't"], why: "'should' se usa para dar consejos o recomendaciones." },
  { s: "He ___ be at home; his car is in the driveway.", a: "must", opts: ["must","can't","needn't","shouldn't","won't"], why: "'must' expresa una deducción lógica casi segura (afirmativa)." },
  { s: "That ___ be true; it's impossible.", a: "can't", opts: ["can't","must","should","might","would"], why: "'can't' expresa una deducción negativa: es imposible que sea cierto." },
  { s: "When I was young, I ___ run very fast.", a: "could", opts: ["could","can","must","should","may"], why: "'could' expresa habilidad en el pasado." },
  { s: "___ I open the window, please?", a: "May", opts: ["May","Must","Should","Would","Ought"], why: "'May I...?' es una forma educada de pedir permiso." },
  { s: "We ___ hurry or we'll miss the train.", a: "must", opts: ["must","needn't","mustn't","don't have to","couldn't"], why: "'must' expresa una obligación o necesidad fuerte." },
  { s: "Take an umbrella; it ___ rain later.", a: "might", opts: ["might","must","can't","shouldn't","won't"], why: "'might' expresa posibilidad (quizá ocurra)." },
  { s: "You ___ have told me earlier! I was worried.", a: "should", opts: ["should","must","can","may","will"], why: "'should have + participio' critica algo que no se hizo en el pasado." },
  { s: "I ___ finish this report by tomorrow; it's due.", a: "have to", opts: ["have to","needn't","mustn't","would rather","used to"], why: "'have to' expresa una obligación externa." },
  { s: "___ you mind closing the door?", a: "Would", opts: ["Would","Should","Must","May","Can"], why: "'Would you mind...?' es una petición cortés." },
  { s: "You ___ worry; everything is under control.", a: "needn't", opts: ["needn't","mustn't","can't","shouldn't","won't"], why: "'needn't' indica que algo no es necesario." },
  { s: "He ___ have missed the bus; I saw him get on it.", a: "can't", opts: ["can't","must","should","ought to","had to"], why: "'can't have + participio' expresa certeza de que algo no ocurrió." },
];

/* Conditional items: { s, a, opts, why }. */
const CONDITIONALS = [
  { s: "If it ___ tomorrow, we will stay at home.", a: "rains", opts: ["rains","will rain","rained","is raining","would rain"], why: "Primer condicional: 'if' + presente simple, y la principal con 'will'." },
  { s: "If I ___ you, I would apologize.", a: "were", opts: ["were","am","will be","would be","had been"], why: "Segundo condicional: usamos 'were' para todas las personas en la hipótesis." },
  { s: "If she had studied, she ___ the exam.", a: "would have passed", opts: ["would have passed","would pass","will pass","passed","had passed"], why: "Tercer condicional: 'if' + pasado perfecto, principal con 'would have + participio'." },
  { s: "Water ___ if you heat it to 100°C.", a: "boils", opts: ["boils","will boil","would boil","boiled","is boiling"], why: "Condicional cero: para verdades generales usamos presente en ambas partes." },
  { s: "If I had more time, I ___ a new language.", a: "would learn", opts: ["would learn","will learn","learn","learned","would have learned"], why: "Segundo condicional: hipótesis presente/futura poco probable con 'would + infinitivo'." },
  { s: "We would have arrived on time if we ___ earlier.", a: "had left", opts: ["had left","left","have left","would leave","leave"], why: "Tercer condicional: la condición usa el pasado perfecto ('had left')." },
  { s: "If you ___ ice, it melts.", a: "heat", opts: ["heat","will heat","would heat","heated","are heating"], why: "Condicional cero: causa y efecto general con presente simple." },
  { s: "Unless you hurry, you ___ the bus.", a: "will miss", opts: ["will miss","miss","would miss","missed","have missed"], why: "'unless' = 'if not'; primer condicional con 'will' en la principal." },
  { s: "If I were rich, I ___ around the world.", a: "would travel", opts: ["would travel","will travel","travel","traveled","would have traveled"], why: "Segundo condicional: situación irreal presente con 'would + infinitivo'." },
  { s: "If they ___ harder, they would have won.", a: "had trained", opts: ["had trained","trained","have trained","would train","train"], why: "Tercer condicional: condición pasada irreal con pasado perfecto." },
  { s: "I will call you if I ___ any news.", a: "get", opts: ["get","will get","would get","got","have got"], why: "Primer condicional: tras 'if' se usa presente, nunca 'will'." },
  { s: "If he ___ how to swim, he wouldn't be afraid of the sea.", a: "knew", opts: ["knew","knows","will know","had known","would know"], why: "Segundo condicional: hipótesis presente irreal con pasado simple." },
];

/* ------------------------------------------------------------------ */
/* Question assembly.                                                  */
/* ------------------------------------------------------------------ */
let counter = 0;
function makeId(level) {
  counter += 1;
  return `${level}-${String(counter).padStart(5, "0")}`;
}

/**
 * Build a question, guaranteeing 5 unique options and a valid answer index.
 * fallbackPool provides extra distractors if the supplied ones collide.
 */
function assemble({ level, category, prompt, correct, distractors, fallbackPool, explanation }, rng) {
  const opts = [];
  const seen = new Set();
  const add = (o) => {
    const key = String(o).trim();
    if (!key || seen.has(key.toLowerCase()) || key === correct) return;
    seen.add(key.toLowerCase());
    opts.push(key);
  };
  for (const d of distractors) {
    if (opts.length >= 4) break;
    add(d);
  }
  const fb = shuffle(fallbackPool, rng);
  for (const d of fb) {
    if (opts.length >= 4) break;
    add(d);
  }
  if (opts.length < 4) return null; // not enough distractors -> skip
  const all = shuffle([correct, ...opts.slice(0, 4)], rng);
  return {
    id: makeId(level),
    level,
    category,
    question: prompt,
    options: all,
    answerIndex: all.indexOf(correct),
    explanation,
  };
}

const SUBJECTS_3RD = ["She", "He", "My sister", "The teacher", "My brother", "Anna", "The engineer", "Our neighbour"];
const SUBJECTS_PL = ["They", "We", "My friends", "The students", "The children", "Those workers"];
const OBJECTS = ["the report", "the lesson", "a new song", "the letter", "the project", "the message", "the exercise", "the plan", "the article", "the story"];

function buildForLevel(level, difficultyCap, rng) {
  const questions = [];
  const verbs = VERBS.filter((v) => v.difficulty <= difficultyCap);
  const adjs = ADJECTIVES;

  const push = (q) => { if (q) questions.push(q); };

  // ---- Tense generators (4 per verb) ----
  for (const v of verbs) {
    const subj = SUBJECTS_3RD[Math.floor(rng() * SUBJECTS_3RD.length)];
    const subjPl = SUBJECTS_PL[Math.floor(rng() * SUBJECTS_PL.length)];
    const obj = OBJECTS[Math.floor(rng() * OBJECTS.length)];

    // Present simple, 3rd person singular
    push(assemble({
      level, category: "grammar",
      prompt: `${subj} ___ ${obj} every day.`,
      correct: v.third,
      distractors: [v.base, v.ing, `is ${v.base}`, v.past],
      fallbackPool: [`are ${v.base}`, `${v.base}s`, `has ${v.pp}`, `did ${v.base}`],
      explanation: `Con un sujeto en tercera persona del singular (he/she/it) el verbo en presente simple lleva -s/-es: "${v.third}".`,
    }, rng));

    // Past simple
    push(assemble({
      level, category: "grammar",
      prompt: `Yesterday ${subjPl.toLowerCase() === "we" ? "we" : subjPl} ___ ${obj}.`,
      correct: v.past,
      distractors: [v.base, v.ing, v.third, `has ${v.pp}`, v.pp !== v.past ? v.pp : `did ${v.base}`],
      fallbackPool: [`was ${v.ing}`, `have ${v.pp}`, `${v.base}ed`],
      explanation: `El pasado simple de "${v.base}" es "${v.past}". La palabra "yesterday" indica una acción terminada en el pasado.`,
    }, rng));

    // Present perfect
    const auxPP = "has";
    push(assemble({
      level, category: "grammar",
      prompt: `${subj} ${auxPP} just ___ ${obj}.`,
      correct: v.pp,
      distractors: [v.base, v.past !== v.pp ? v.past : v.ing, v.ing, v.third],
      fallbackPool: [`been ${v.ing}`, v.past, `to ${v.base}`],
      explanation: `El present perfect se forma con has/have + participio pasado. El participio de "${v.base}" es "${v.pp}".`,
    }, rng));

    // Present continuous
    push(assemble({
      level, category: "grammar",
      prompt: `Look! ${subj} is ___ ${obj} right now.`,
      correct: v.ing,
      distractors: [v.base, v.past, v.third, v.pp !== v.base ? v.pp : `to ${v.base}`],
      fallbackPool: [`to ${v.base}`, v.past, `has ${v.pp}`],
      explanation: `El presente continuo (be + verbo-ing) describe una acción en progreso en este momento: "${v.ing}".`,
    }, rng));
  }

  // ---- Comparatives & superlatives ----
  for (const a of adjs) {
    push(assemble({
      level, category: "grammar",
      prompt: `My new phone is ___ than the old one.`,
      correct: a.comp,
      distractors: [a.word, a.sup, `more ${a.word}`, `${a.word}er`].filter((x) => x !== a.comp),
      fallbackPool: [`most ${a.word}`, `${a.word}est`, `so ${a.word}`],
      explanation: `El comparativo de "${a.word}" (${a.es}) es "${a.comp}". Usamos el comparativo con "than" para comparar dos elementos.`,
    }, rng));
    push(assemble({
      level, category: "grammar",
      prompt: `It is the ___ building in the whole city.`,
      correct: a.sup,
      distractors: [a.word, a.comp, `most ${a.word}`, `${a.word}est`].filter((x) => x !== a.sup),
      fallbackPool: [`more ${a.word}`, `${a.word}er`, `very ${a.word}`],
      explanation: `El superlativo de "${a.word}" (${a.es}) es "${a.sup}". Usamos "the" + superlativo para destacar un elemento sobre todos los demás.`,
    }, rng));
  }

  // ---- Prepositions ----
  for (const p of PREPOSITIONS) {
    push(assemble({
      level, category: "grammar",
      prompt: p.s,
      correct: p.a,
      distractors: pickN(PREP_SET, 6, rng, new Set([p.a])),
      fallbackPool: PREP_SET,
      explanation: p.why,
    }, rng));
  }

  // ---- Articles ----
  for (const it of ARTICLES) {
    const other = it.a === "a" ? "an" : "a";
    push(assemble({
      level, category: "grammar",
      prompt: `I need ___ ${it.noun}.`,
      correct: it.a,
      distractors: [other, "the", "some", "one"],
      fallbackPool: ["this", "any", "no"],
      explanation: `Se usa "${it.a}" antes de "${it.noun}". Regla: "an" precede a un sonido vocálico y "a" a un sonido consonántico (según el sonido, no la letra).`,
    }, rng));
  }

  // ---- Modals ----
  for (const m of MODALS) {
    push(assemble({
      level, category: "grammar",
      prompt: m.s,
      correct: m.a,
      distractors: m.opts.filter((o) => o !== m.a),
      fallbackPool: ["will", "would", "shall", "ought to"],
      explanation: m.why,
    }, rng));
  }

  // ---- Conditionals ----
  for (const c of CONDITIONALS) {
    push(assemble({
      level, category: "grammar",
      prompt: c.s,
      correct: c.a,
      distractors: c.opts.filter((o) => o !== c.a),
      fallbackPool: ["will do", "would do", "did", "does"],
      explanation: c.why,
    }, rng));
  }

  // ---- Vocabulary: synonym / antonym / definition ----
  const bank = VOCAB[level];
  const enDistractorPool = [...GENERIC_EN, ...bank.map((b) => b.word)];
  const esDistractorPool = bank.map((b) => b.es);
  for (const w of bank) {
    // Synonym
    push(assemble({
      level, category: "vocabulary",
      prompt: `Elige el SINÓNIMO de la palabra "${w.word}".`,
      correct: w.syn,
      distractors: pickN(enDistractorPool, 8, rng, new Set([w.syn, w.ant, w.word])),
      fallbackPool: GENERIC_EN,
      explanation: `"${w.word}" significa "${w.es}". Su sinónimo (palabra de significado equivalente) es "${w.syn}".`,
    }, rng));
    // Antonym
    push(assemble({
      level, category: "vocabulary",
      prompt: `Elige el ANTÓNIMO (opuesto) de la palabra "${w.word}".`,
      correct: w.ant,
      distractors: pickN(enDistractorPool, 8, rng, new Set([w.syn, w.ant, w.word])),
      fallbackPool: GENERIC_EN,
      explanation: `"${w.word}" significa "${w.es}". Su antónimo (palabra de significado opuesto) es "${w.ant}".`,
    }, rng));
    // Definition (Spanish meaning)
    push(assemble({
      level, category: "vocabulary",
      prompt: `¿Cuál es el significado en español de "${w.word}"?`,
      correct: w.es,
      distractors: pickN(esDistractorPool, 10, rng, new Set([w.es])),
      fallbackPool: esDistractorPool,
      explanation: `"${w.word}" se traduce como "${w.es}". (Sinónimo en inglés: "${w.syn}").`,
    }, rng));
  }

  // ---- Phrasal verbs ----
  const pvBank = PHRASALS[level];
  const pvMeaningPool = pvBank.map((p) => p.en);
  for (const p of pvBank) {
    push(assemble({
      level, category: "vocabulary",
      prompt: `¿Qué significa el phrasal verb "${p.pv}"?`,
      correct: p.en,
      distractors: pickN(pvMeaningPool, 8, rng, new Set([p.en])),
      fallbackPool: pvMeaningPool,
      explanation: `"${p.pv}" significa "${p.es}" (en inglés: ${p.en}).`,
    }, rng));
  }

  return questions;
}

/* ------------------------------------------------------------------ */
/* Level definitions and main build.                                   */
/* ------------------------------------------------------------------ */
const LEVELS = [
  { id: "B1", name: "B1 — Intermedio", cap: 2, seed: 101, color: "mint",
    description: "Nivel intermedio: gramática y vocabulario de uso cotidiano." },
  { id: "B2", name: "B2 — Intermedio alto", cap: 3, seed: 202, color: "sky",
    description: "Intermedio alto: tiempos verbales más complejos y vocabulario más rico." },
  { id: "C1", name: "C1 — Avanzado", cap: 4, seed: 303, color: "lavender",
    description: "Avanzado: matices gramaticales y vocabulario formal." },
  { id: "C2", name: "C2 — Dominio", cap: 5, seed: 404, color: "peach",
    description: "Dominio: vocabulario sofisticado, phrasal verbs e idiomática." },
  { id: "D1", name: "D1 — Maestría", cap: 5, seed: 505, color: "rose",
    description: "Maestría: léxico erudito y estructuras de gran precisión." },
];

mkdirSync(OUT_DIR, { recursive: true });

const manifest = [];
for (const lvl of LEVELS) {
  counter = 0;
  const rng = makeRng(lvl.seed);
  const qs = buildForLevel(lvl.id, lvl.cap, rng);

  // Integrity checks.
  for (const q of qs) {
    if (q.options.length !== 5) throw new Error(`${q.id}: expected 5 options, got ${q.options.length}`);
    if (new Set(q.options.map((o) => o.toLowerCase())).size !== 5) throw new Error(`${q.id}: duplicate options`);
    if (q.answerIndex < 0 || q.answerIndex > 4) throw new Error(`${q.id}: bad answerIndex`);
  }
  if (qs.length < 600) throw new Error(`Level ${lvl.id} produced only ${qs.length} questions (need >= 600)`);

  writeFileSync(join(OUT_DIR, `${lvl.id}.json`), JSON.stringify(qs, null, 0));
  manifest.push({
    id: lvl.id, name: lvl.name, description: lvl.description,
    color: lvl.color, count: qs.length,
  });
  console.log(`Level ${lvl.id}: ${qs.length} questions`);
}

writeFileSync(join(OUT_DIR, "levels.json"), JSON.stringify(manifest, null, 2));
console.log("Wrote manifest with", manifest.length, "levels to", OUT_DIR);

