/**
 * Breadth: which layers of the stack a developer actually works across.
 *
 * Deliberately evidence-based rather than a lookup. Many languages sit in more
 * than one layer — Python is backend and ML, Kotlin is backend and mobile — so
 * a single language alone never claims a layer. Evidence accumulates from
 * languages weighted by how much was written, plus repo topics and name hints,
 * and a layer only counts once it clears a threshold. This keeps one stray
 * Dockerfile from certifying somebody as an infrastructure engineer.
 */

export const LAYERS = [
  "infrastructure",
  "backend",
  "frontend",
  "mobile",
  "ml-data",
  "tooling",
] as const;

export type Layer = (typeof LAYERS)[number];

export const LAYER_LABELS: Record<Layer, string> = {
  infrastructure: "Infrastructure",
  backend: "Backend",
  frontend: "Frontend",
  mobile: "Mobile",
  "ml-data": "ML & data",
  tooling: "Tooling & systems",
};

/** Language → layers, with a weight for how strongly it implies each one. */
const LANGUAGE_LAYERS: Record<string, Partial<Record<Layer, number>>> = {
  // Infrastructure
  HCL: { infrastructure: 1 },
  Terraform: { infrastructure: 1 },
  Dockerfile: { infrastructure: 0.7 },
  Nix: { infrastructure: 0.9 },
  Puppet: { infrastructure: 1 },
  Jsonnet: { infrastructure: 0.8 },
  Smarty: { infrastructure: 0.3 },
  Shell: { infrastructure: 0.5, tooling: 0.5 },
  Makefile: { infrastructure: 0.3, tooling: 0.5 },
  PowerShell: { infrastructure: 0.5, tooling: 0.4 },

  // Backend
  Go: { backend: 1 },
  Rust: { backend: 0.7, tooling: 0.5 },
  Java: { backend: 0.8, mobile: 0.2 },
  Kotlin: { backend: 0.5, mobile: 0.6 },
  "C#": { backend: 0.8 },
  Ruby: { backend: 1 },
  PHP: { backend: 1 },
  Elixir: { backend: 1 },
  Erlang: { backend: 1 },
  Scala: { backend: 0.8, "ml-data": 0.3 },
  Clojure: { backend: 0.9 },
  Haskell: { backend: 0.6, tooling: 0.4 },
  Python: { backend: 0.6, "ml-data": 0.6 },
  SQL: { backend: 0.6, "ml-data": 0.4 },
  PLpgSQL: { backend: 0.8 },

  // Frontend
  TypeScript: { frontend: 0.7, backend: 0.4 },
  JavaScript: { frontend: 0.7, backend: 0.3 },
  CSS: { frontend: 1 },
  SCSS: { frontend: 1 },
  Less: { frontend: 1 },
  HTML: { frontend: 0.8 },
  Vue: { frontend: 1 },
  Svelte: { frontend: 1 },
  Astro: { frontend: 1 },
  MDX: { frontend: 0.4 },

  // Mobile
  Swift: { mobile: 1 },
  "Objective-C": { mobile: 1 },
  Dart: { mobile: 1 },

  // ML & data
  "Jupyter Notebook": { "ml-data": 1 },
  R: { "ml-data": 1 },
  Julia: { "ml-data": 1 },

  // Tooling & systems
  C: { tooling: 0.8 },
  "C++": { tooling: 0.8 },
  Zig: { tooling: 1 },
  Lua: { tooling: 0.8 },
  "Vim Script": { tooling: 1 },
  "Emacs Lisp": { tooling: 1 },
  Assembly: { tooling: 1 },
};

/** Repo topic / name keywords, which disambiguate the multi-layer languages. */
const KEYWORD_LAYERS: Record<string, Layer> = {
  terraform: "infrastructure",
  kubernetes: "infrastructure",
  k8s: "infrastructure",
  helm: "infrastructure",
  ansible: "infrastructure",
  docker: "infrastructure",
  infra: "infrastructure",
  devops: "infrastructure",
  pulumi: "infrastructure",
  deploy: "infrastructure",

  api: "backend",
  server: "backend",
  backend: "backend",
  service: "backend",
  microservice: "backend",
  graphql: "backend",
  grpc: "backend",
  database: "backend",

  frontend: "frontend",
  ui: "frontend",
  web: "frontend",
  react: "frontend",
  nextjs: "frontend",
  vue: "frontend",
  design: "frontend",
  dashboard: "frontend",

  ios: "mobile",
  android: "mobile",
  mobile: "mobile",
  flutter: "mobile",
  "react-native": "mobile",

  ml: "ml-data",
  "machine-learning": "ml-data",
  pytorch: "ml-data",
  tensorflow: "ml-data",
  llm: "ml-data",
  rag: "ml-data",
  embedding: "ml-data",
  etl: "ml-data",
  analytics: "ml-data",
  "data-pipeline": "ml-data",

  cli: "tooling",
  compiler: "tooling",
  parser: "tooling",
  sdk: "tooling",
  plugin: "tooling",
  lint: "tooling",
  codegen: "tooling",
};

/** Evidence a layer needs before it counts as genuinely worked in. */
const THRESHOLD = 1;

export type BreadthInput = {
  /** Language → adjusted bytes written. */
  languageBytes: Record<string, number>;
  /** One entry per repo: its topics plus its name, lowercased. */
  repoSignals: { keywords: string[]; primaryLanguage: string | null }[];
};

export type Breadth = {
  layers: Layer[];
  /** Raw evidence per layer, for debugging and for the bar widths. */
  evidence: Record<Layer, number>;
  score: number;
};

export function computeBreadth(input: BreadthInput): Breadth {
  const evidence = Object.fromEntries(LAYERS.map((l) => [l, 0])) as Record<Layer, number>;

  // Languages contribute in proportion to their share of everything written, so
  // a language that is 40% of the year counts far more than a 1% dabble.
  const totalBytes = Object.values(input.languageBytes).reduce((a, b) => a + b, 0);
  if (totalBytes > 0) {
    for (const [language, bytes] of Object.entries(input.languageBytes)) {
      const mapping = LANGUAGE_LAYERS[language];
      if (!mapping) continue;
      // sqrt keeps one dominant language from swamping every layer it touches.
      const share = Math.sqrt(bytes / totalBytes);
      for (const [layer, weight] of Object.entries(mapping)) {
        evidence[layer as Layer] += share * (weight as number) * 2.5;
      }
    }
  }

  // Topics and repo names are strong, specific signals — a repo tagged
  // "terraform" is infrastructure work regardless of its byte mix.
  for (const repo of input.repoSignals) {
    const seen = new Set<Layer>();
    for (const keyword of repo.keywords) {
      const layer = KEYWORD_LAYERS[keyword];
      if (layer) seen.add(layer);
    }
    for (const layer of seen) evidence[layer] += 0.5;
  }

  const layers = LAYERS.filter((layer) => evidence[layer] >= THRESHOLD);
  return { layers, evidence, score: layers.length };
}

/** Splits a repo name into keyword tokens: "acme/data-pipeline" -> [data, pipeline]. */
export function keywordsFromRepo(nameWithOwner: string, topics: string[]): string[] {
  const name = nameWithOwner.split("/").pop() ?? "";
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  // Keep hyphenated topics whole ("machine-learning") as well as split.
  return [...new Set([...tokens, ...topics.map((t) => t.toLowerCase())])];
}
