/** A public topic guide, written in English. */
export interface TopicLandingDefinition {
  slug: string;
  subject: 'webdev';
  category: string;
  title: string;
  description: string;
  misconception: string;
  explanation?: string;
  example?: string;
  reference?: string;
  practice: Array<[string, string]>;
}

export const TOPIC_LANDINGS: TopicLandingDefinition[] = [
  {
    "explanation": "Each call to makeCounter creates a separate count binding, so calling the returned function twice produces 1 and then 2, while another counter starts at 1; this is useful when a callback needs to keep access to state without placing that state in a global variable.",
    "example": "function makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst next = makeCounter();\nnext(); // 1\nnext(); // 2",
    "reference": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures",
    "slug": "javascript-closures",
    "subject": "webdev",
    "category": "javascript",
    "title": "JavaScript closures, clearly explained",
    "description": "A closure is a function together with access to lexical variables from the scope where it was created, even after that outer function returns.",
    "misconception": "Closures retain access to bindings; they do not freeze a copy of every value.",
    "practice": [
      [
        "Can a closure outlive its outer call?",
        "Yes."
      ],
      [
        "Are closures only for private state?",
        "No."
      ],
      [
        "What scope do they capture?",
        "The lexical scope where the function was created."
      ]
    ]
  },
  {
    "explanation": "A union describes several possible values, while the typeof check gives TypeScript evidence about the value in this branch; checking a tag on an object works in the same way, but casting untrusted JSON with as only changes what the compiler assumes and cannot replace runtime validation.",
    "example": "function label(value: string | number) {\n  if (typeof value === \"string\") {\n    return value.trim();\n  }\n  return value.toFixed(2);\n}",
    "reference": "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
    "slug": "typescript-narrowing",
    "subject": "webdev",
    "category": "typescript",
    "title": "TypeScript narrowing fundamentals",
    "description": "Runtime checks such as typeof, in, discriminants and predicates refine a broad static type inside a controlled branch.",
    "misconception": "A type assertion does not validate data at runtime.",
    "practice": [
      [
        "Which operator narrows primitives?",
        "typeof"
      ],
      [
        "What identifies a discriminated union member?",
        "A shared literal tag."
      ],
      [
        "Does `as` validate input?",
        "No."
      ]
    ]
  },
  {
    "explanation": "Call useState at the top level of your component, then derive values such as a filtered list during rendering; when you need to subscribe to a browser event or keep another external system in sync, use an effect with cleanup so the subscription does not survive beyond the component that owns it.",
    "example": "function Search({ items }) {\n  const [query, setQuery] = useState(\"\");\n  const visible = items.filter(item => item.includes(query));\n  return <>\n    <input aria-label=\"Search\" value={query}\n      onChange={e => setQuery(e.target.value)} />\n    <p>{visible.join(\", \")}</p>\n  </>;\n}",
    "reference": "https://react.dev/learn/you-might-not-need-an-effect",
    "slug": "react-hooks",
    "subject": "webdev",
    "category": "react",
    "title": "React Hooks mental model",
    "description": "Hooks expose stateful React features. Their call order stays stable, while effects synchronize React with systems outside rendering.",
    "misconception": "Derived values usually belong in render, not in an effect.",
    "practice": [
      [
        "Why not call Hooks conditionally?",
        "React associates Hook state by call order."
      ],
      [
        "What belongs in an effect?",
        "External synchronization."
      ],
      [
        "Does useMemo guarantee correctness?",
        "No."
      ]
    ]
  },
  {
    "explanation": "In this query, every learner remains in the result even if they have no passed attempt, because the status condition belongs to ON; putting a.status = 'passed' in WHERE instead would discard the rows whose right-hand values are NULL, and multiple matching attempts can still produce several rows for one learner.",
    "example": "SELECT l.id, a.id AS attempt_id\nFROM learners AS l\nLEFT JOIN attempts AS a\n  ON a.learner_id = l.id\n  AND a.status = 'passed';",
    "reference": "https://www.postgresql.org/docs/current/queries-table-expressions.html",
    "slug": "sql-joins",
    "subject": "webdev",
    "category": "databases",
    "title": "SQL joins without guesswork",
    "description": "A join combines related rows. INNER JOIN keeps matches; LEFT JOIN also keeps every row from the left side.",
    "misconception": "A right-table filter in WHERE can accidentally remove unmatched LEFT JOIN rows.",
    "practice": [
      [
        "Which join preserves every left row?",
        "LEFT JOIN"
      ],
      [
        "Where is the relationship expressed?",
        "The ON clause."
      ],
      [
        "Can joins multiply rows?",
        "Yes."
      ]
    ]
  },
  {
    "explanation": "On a local feature branch, fetch the latest main and rebase your unpublished commits onto it, resolving each conflict before continuing; if the result is not what you intended, abort the operation, and coordinate before rewriting any history that another developer has already based work on.",
    "example": "git fetch origin\ngit rebase origin/main\n# After resolving a conflict:\ngit add path/to/resolved-file\ngit rebase --continue\n# To return to the state before this rebase:\ngit rebase --abort",
    "reference": "https://git-scm.com/docs/git-rebase",
    "slug": "git-rebase",
    "subject": "webdev",
    "category": "git",
    "title": "Git rebasing safely",
    "description": "Rebase replays commits onto a new base and rewrites their identities, producing a linear history.",
    "misconception": "Rebase does more than move a pointer: replayed commits receive new hashes.",
    "practice": [
      [
        "What does rebase rewrite?",
        "Commit history."
      ],
      [
        "When is it safest?",
        "On unpublished commits."
      ],
      [
        "How do you cancel it?",
        "git rebase --abort"
      ]
    ]
  }
];
