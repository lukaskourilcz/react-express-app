// Loop and array-method tasks for the TypeScript track (authored for devShark).
// English is the source of truth; Czech copy lives in typescript-loops.cs.ts.

import type { CodingTaskSource } from '../types';

export const TYPESCRIPT_LOOP_TASKS: CodingTaskSource[] = [
  {
    id: "ts-inferred-total",
    track: "typescript",
    topic: "typescript",
    level: 2,
    tier: 1,
    focus: ["annotations", "for-of"],
    title: "Inferred total",
    prompt: "Write `totalLength(words: string[]): number`, adding up the length of every word. Start the running total at `0` without a type annotation and let the compiler infer `number` from that starting value, then add each length in a `for-of` loop. `totalLength([\"hi\", \"there\"])` gives 7, and an empty list gives 0.",
    starter: `const totalLength = (words: string[]): number => {

};

// Scratch pad — change this and press Run.
console.log(totalLength(["hi", "there"]));
`,
    skeleton: `const totalLength = (words: string[]): number => {
  let total = /* starting value, no annotation */;

  for (const word of words) {
    // add the length of word to total
  }

  return total;
};`,
    hints: [
      "A variable initialised with a number is a number from then on, so the loop can add to it without any annotation.",
    ],
    approach: [
      "Declare the running total with let and a starting value of 0, and leave the type to the compiler.",
      "Walk the words with for-of and add the length of each one to the total.",
      "Return the total; the declared return type and the inferred type of the total agree, so nothing else is needed.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    tests: [
      { call: "totalLength([\"hi\", \"there\"])", expected: 7 },
      { call: "totalLength([\"a\", \"b\", \"c\"])", expected: 3 },
      { call: "totalLength([\"four\"])", expected: 4, label: "a single word" },
      { call: "totalLength([])", expected: 0, label: "empty input", edge: true },
      { call: "totalLength([\"\", \"\"])", expected: 0, label: "empty words add nothing", edge: true },
    ],
    typeTests: [
      { code: "const __total: number = totalLength([\"hi\"]);", label: "gives back a number" },
      { code: "const __text: string = totalLength([\"hi\"]);", label: "the total is not text", rejects: true },
      { code: "totalLength([1, 2]);", label: "numbers have no length to add", rejects: true },
    ],
  },
  {
    id: "ts-take-turns",
    track: "typescript",
    topic: "typescript",
    level: 4,
    tier: 1,
    focus: ["push", "shift", "while"],
    title: "Take turns",
    prompt: "Write `takeTurns(waiting: string[], turns: number): string[]`, serving people from a queue in a round robin: the person at the front is served, then goes to the back, until `turns` people have been served. Copy the list first so the caller's array stays as it was. `takeTurns([\"ada\", \"bo\"], 3)` gives `[\"ada\", \"bo\", \"ada\"]`, and an empty queue gives an empty list however many turns are asked for.",
    starter: `const takeTurns = (waiting: string[], turns: number): string[] => {

};

// Scratch pad — change this and press Run.
console.log(takeTurns(["ada", "bo"], 3));
`,
    skeleton: `const takeTurns = (waiting: string[], turns: number): string[] => {
  const queue = [...waiting];
  const served: string[] = [];

  while (/* fewer served than turns */) {
    const next = queue.shift();
    // stop when next is undefined, otherwise record it and send it to the back
  }

  return served;
};`,
    hints: [
      "shift on a string[] hands back string | undefined, and the compiler makes you deal with the undefined before the value goes anywhere.",
    ],
    approach: [
      "Copy the waiting list into a typed queue with spread, and start an empty string[] for the people served.",
      "Loop while fewer people have been served than there are turns: shift the front of the queue, and stop when there is nobody there.",
      "Record the person, then push the same person onto the back of the queue so they come round again.",
    ],
    verify: "tests",
    estimatedMinutes: 6,
    tests: [
      { call: "takeTurns([\"ada\", \"bo\"], 3)", expected: ["ada", "bo", "ada"] },
      { call: "takeTurns([\"ada\", \"bo\", \"cy\"], 2)", expected: ["ada", "bo"] },
      { call: "takeTurns([\"ada\"], 3)", expected: ["ada", "ada", "ada"], label: "one person keeps being served", edge: true },
      { call: "takeTurns([], 5)", expected: [], label: "an empty queue serves nobody", edge: true },
      { call: "takeTurns([\"ada\", \"bo\"], 0)", expected: [], label: "zero turns", edge: true },
    ],
    typeTests: [
      { code: "const __served: string[] = takeTurns([\"ada\", \"bo\"], 3);", label: "gives back a list of names" },
      { code: "takeTurns([1, 2], 3);", label: "the queue holds strings", rejects: true },
      { code: "takeTurns([\"ada\"], \"3\");", label: "the number of turns is a number", rejects: true },
    ],
  },
  {
    id: "ts-pad-a-readonly-list",
    track: "typescript",
    topic: "typescript",
    level: 4,
    tier: 2,
    focus: ["readonly", "spread", "push"],
    title: "Pad a readonly list",
    prompt: "Write `padScores(scores: readonly number[], size: number): number[]`, returning a copy of the scores with zeros added at the end until it holds `size` values. The parameter is readonly, so `push` is not available on it and the copy has to be made with spread first. `padScores([7, 9], 4)` gives `[7, 9, 0, 0]`, and a list already at or beyond the size comes back as a plain copy.",
    starter: `const padScores = (scores: readonly number[], size: number): number[] => {

};

// Scratch pad — change this and press Run.
console.log(padScores([7, 9], 4));
`,
    skeleton: `const padScores = (scores: readonly number[], size: number): number[] => {
  const padded = [/* copy of scores */];

  while (/* padded is shorter than size */) {
    // push a zero
  }

  return padded;
};`,
    hints: [
      "The compiler removes every mutating method from a readonly array, so the only array you can push onto is the one you build yourself.",
    ],
    approach: [
      "Spread the readonly array into a new, ordinary number[]; the copy has push even though the original does not.",
      "Loop while the copy is shorter than the requested size and push a zero each time.",
      "Return the copy; when the original was already long enough the loop never runs and the copy is unchanged.",
    ],
    verify: "tests",
    estimatedMinutes: 6,
    tests: [
      { call: "padScores([7, 9], 4)", expected: [7, 9, 0, 0] },
      { call: "padScores([1], 2)", expected: [1, 0] },
      { call: "padScores([1, 2, 3], 2)", expected: [1, 2, 3], label: "already long enough", edge: true },
      { call: "padScores([], 3)", expected: [0, 0, 0], label: "empty input", edge: true },
      { call: "padScores([], 0)", expected: [], label: "nothing to pad", edge: true },
    ],
    typeTests: [
      { code: "const __padded: number[] = padScores([1], 3);", label: "gives back an ordinary array" },
      { code: "padScores([1, 2] as readonly number[], 3);", label: "a readonly array is accepted" },
      { code: "([1, 2] as readonly number[]).push(3);", label: "push does not exist on a readonly array", rejects: true },
      { code: "padScores([\"1\"], 3);", label: "the scores are numbers", rejects: true },
    ],
  },
  {
    id: "ts-lowest-and-highest",
    track: "typescript",
    topic: "typescript",
    level: 4,
    tier: 1,
    focus: ["tuples", "for"],
    title: "Lowest and highest",
    prompt: "Write `minMax(values: number[]): [number, number]`, returning the smallest and the largest value as a tuple, found in a single `for` loop over the list. `minMax([3, 1, 2])` gives `[1, 3]`, a single value is both ends, and an empty list gives `[0, 0]`.",
    starter: `const minMax = (values: number[]): [number, number] => {

};

// Scratch pad — change this and press Run.
console.log(minMax([3, 1, 2]));
`,
    skeleton: `const minMax = (values: number[]): [number, number] => {
  if (values.length === 0) return [0, 0];
  let low = /* first value */;
  let high = /* first value */;

  for (let i = 1; i < values.length; i += 1) {
    // replace low or high when values[i] beats it
  }

  return [low, high];
};`,
    hints: [
      "Start both ends at the first value rather than at zero, or a list of negative numbers reports a maximum it never held.",
    ],
    approach: [
      "Answer the empty list first, because nothing below works without a first value.",
      "Seed both the lowest and the highest with the first value, then loop from the second index to the end.",
      "Compare each value with both ends and replace whichever it beats, then return the two as a tuple.",
    ],
    verify: "tests",
    estimatedMinutes: 6,
    tests: [
      { call: "minMax([3, 1, 2])", expected: [1, 3] },
      { call: "minMax([10, 4, 8, 4])", expected: [4, 10] },
      { call: "minMax([5])", expected: [5, 5], label: "one value is both ends", edge: true },
      { call: "minMax([-2, -8, -1])", expected: [-8, -1], label: "all negative", edge: true },
      { call: "minMax([])", expected: [0, 0], label: "empty input", edge: true },
    ],
    typeTests: [
      { code: "const __range: [number, number] = minMax([1, 2]);", label: "gives back exactly two numbers" },
      { code: "const __low: number = minMax([1, 2])[0];", label: "each position holds a number" },
      { code: "const __three: [number, number, number] = minMax([1]);", label: "two, not three", rejects: true },
      { code: "minMax([\"1\", \"2\"]);", label: "the values are numbers", rejects: true },
    ],
  },
  {
    id: "ts-total-expenses",
    track: "typescript",
    topic: "typescript",
    level: 5,
    tier: 2,
    focus: ["for-in", "keyof", "objects"],
    title: "Total expenses",
    prompt: "Declare an interface named `Expenses` with `rent`, `food` and `travel`, all numbers, then write `totalExpenses(expenses: Expenses): number` adding the three up with a `for-in` loop. The loop variable is a plain `string`, so index the object with it as `keyof Expenses`. `totalExpenses({ rent: 800, food: 250, travel: 50 })` gives 1100.",
    starter: `interface Expenses {
  rent: number;
  food: number;
  travel: number;
}

const totalExpenses = (expenses: Expenses): number => {

};

// Scratch pad — change this and press Run.
console.log(totalExpenses({ rent: 800, food: 250, travel: 50 }));
`,
    skeleton: `interface Expenses {
  rent: number;
  food: number;
  travel: number;
}

const totalExpenses = (expenses: Expenses): number => {
  let total = 0;

  for (const key in expenses) {
    // add expenses[key as keyof Expenses]
  }

  return total;
};`,
    hints: [
      "A for-in key is a string as far as the compiler knows, and a string is not proof that the property exists, until you assert it is one of the interface's keys.",
    ],
    approach: [
      "Write the interface with its three numeric properties, and start a running total at zero.",
      "Loop over the object with for-in; the loop variable is typed string, and the compiler refuses to index the object with it.",
      "Assert the key as keyof Expenses inside the loop, add the value it reads, and return the total.",
    ],
    verify: "tests",
    estimatedMinutes: 7,
    tests: [
      { call: "totalExpenses({ rent: 800, food: 250, travel: 50 })", expected: 1100 },
      { call: "totalExpenses({ rent: 1, food: 2, travel: 3 })", expected: 6 },
      { call: "totalExpenses({ rent: 0, food: 0, travel: 0 })", expected: 0, label: "all zero", edge: true },
      { call: "totalExpenses({ rent: 100, food: -20, travel: 0 })", expected: 80, label: "a refund subtracts", edge: true },
      { call: "totalExpenses({ rent: 1.5, food: 2.5, travel: 0 })", expected: 4, label: "decimals", edge: true },
    ],
    typeTests: [
      { code: "const __total: number = totalExpenses({ rent: 1, food: 2, travel: 3 });", label: "gives back a number" },
      { code: "const __key: keyof Expenses = \"rent\";", label: "keyof names one of the three properties" },
      { code: "totalExpenses({ rent: 1, food: 2 });", label: "every property is required", rejects: true },
      { code: "totalExpenses({ rent: \"800\", food: 0, travel: 0 });", label: "the amounts are numbers", rejects: true },
    ],
  },
  {
    id: "ts-path-length",
    track: "typescript",
    topic: "typescript",
    level: 10,
    tier: 2,
    focus: ["annotations", "for", "objects"],
    title: "Path length",
    prompt: "Declare a type alias named `Point` for an object with numeric `x` and `y`, then write `pathLength(points: Point[]): number` adding up the straight-line distance between each point and the next with a `for` loop. `pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])` gives 5, and fewer than two points gives 0.",
    starter: `type Point = { x: number; y: number };

const pathLength = (points: Point[]): number => {

};

// Scratch pad — change this and press Run.
console.log(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }]));
`,
    skeleton: `type Point = { x: number; y: number };

const pathLength = (points: Point[]): number => {
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    // add the distance from points[i - 1] to points[i]
  }

  return total;
};`,
    hints: [
      "Each step of the loop needs the current point and the one before it, so start the index at 1 rather than 0.",
    ],
    approach: [
      "Write the alias above the function and use it as the element type of the parameter.",
      "Loop from index 1 to the end, so every pass has a previous point to compare with.",
      "Add the distance from the previous point to the current one, from the differences in x and y, and return the total.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    tests: [
      { call: "pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])", expected: 5 },
      { call: "pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])", expected: 11 },
      { call: "pathLength([{ x: 2, y: 2 }])", expected: 0, label: "a single point", edge: true },
      { call: "pathLength([])", expected: 0, label: "empty input", edge: true },
      { call: "pathLength([{ x: 1, y: 1 }, { x: 1, y: 1 }])", expected: 0, label: "the same point twice", edge: true },
      { call: "pathLength([{ x: -3, y: -4 }, { x: 0, y: 0 }])", expected: 5, label: "negative coordinates", edge: true },
    ],
    typeTests: [
      { code: "const __point: Point = { x: 1, y: 2 };", label: "Point is a type you can name" },
      { code: "const __length: number = pathLength([{ x: 0, y: 0 }]);", label: "gives back a number" },
      { code: "pathLength([{ x: 0 }]);", label: "a point needs both coordinates", rejects: true },
      { code: "pathLength([[0, 0], [3, 4]]);", label: "a pair of numbers is not a Point", rejects: true },
    ],
  },
  {
    id: "ts-mixed-total",
    track: "typescript",
    topic: "typescript",
    level: 11,
    tier: 2,
    focus: ["narrowing", "unions", "for-of"],
    title: "Mixed total",
    prompt: "Write `mixedTotal(values: (string | number)[]): number`, walking the list with `for-of` and adding each number as it is and each string as its length. Reading `.length` needs the value narrowed to a string first. `mixedTotal([1, \"abc\", 2])` gives 6, and an empty list gives 0.",
    starter: `const mixedTotal = (values: (string | number)[]): number => {

};

// Scratch pad — change this and press Run.
console.log(mixedTotal([1, "abc", 2]));
`,
    skeleton: `const mixedTotal = (values: (string | number)[]): number => {
  let total = 0;

  for (const value of values) {
    if (typeof value === "string") {
      // add the length
    } else {
      // add the number
    }
  }

  return total;
};`,
    hints: [
      "Inside the loop the value is still the whole union, and a typeof check is what splits it into the two cases.",
    ],
    approach: [
      "Start a total at zero and loop over the values with for-of.",
      "Check typeof inside the loop: in the string branch the compiler lets you read length, in the other branch the value is already a number.",
      "Add the right amount in each branch and return the total.",
    ],
    verify: "tests",
    estimatedMinutes: 7,
    tests: [
      { call: "mixedTotal([1, \"abc\", 2])", expected: 6 },
      { call: "mixedTotal([\"a\", \"bb\"])", expected: 3 },
      { call: "mixedTotal([])", expected: 0, label: "empty input", edge: true },
      { call: "mixedTotal([\"\"])", expected: 0, label: "an empty string adds nothing", edge: true },
      { call: "mixedTotal([-1, \"ab\"])", expected: 1, label: "a negative number", edge: true },
      { call: "mixedTotal([2.5, \"x\"])", expected: 3.5, label: "decimals" },
    ],
    typeTests: [
      { code: "const __total: number = mixedTotal([1, \"a\"]);", label: "gives back a number" },
      { code: "const __empty: number = mixedTotal([]);", label: "an empty list is allowed" },
      { code: "mixedTotal([true]);", label: "a boolean is not part of the union", rejects: true },
      { code: "const __text: string = mixedTotal([1]);", label: "the total is not text", rejects: true },
    ],
  },
  {
    id: "ts-only-the-files",
    track: "typescript",
    topic: "typescript",
    level: 12,
    tier: 2,
    focus: ["type-guards", "filter", "unions"],
    title: "Only the files",
    prompt: "Declare interfaces `FileEntry` (`kind: \"file\"`, a `name` and a numeric `size`) and `FolderEntry` (`kind: \"folder\"` and a `name`), plus the union `type Entry = FileEntry | FolderEntry`. Write `isFile(entry: Entry): entry is FileEntry`, then use it in `onlyFiles(entries: Entry[]): FileEntry[]` to keep the files in their original order. `onlyFiles([{ kind: \"file\", name: \"a.txt\", size: 3 }, { kind: \"folder\", name: \"src\" }])` gives just the file.",
    starter: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => {

};

const onlyFiles = (entries: Entry[]): FileEntry[] => {

};

// Scratch pad — change this and press Run.
console.log(onlyFiles([{ kind: "file", name: "a.txt", size: 3 }, { kind: "folder", name: "src" }]));
`,
    skeleton: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => /* check the kind */;

const onlyFiles = (entries: Entry[]): FileEntry[] => {
  // filter with the guard
};`,
    hints: [
      "The predicate's return type is what lets filter hand back FileEntry[] instead of the union you started with.",
    ],
    approach: [
      "Declare the two interfaces and the union, each entry tagged by its kind.",
      "Write the guard as a boolean check on kind, with entry is FileEntry as its return type.",
      "Pass the guard to filter; the overload that takes a predicate narrows the element type of the result.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    tests: [
      {
        call: "onlyFiles([{ kind: \"file\", name: \"a.txt\", size: 3 }, { kind: \"folder\", name: \"src\" }])",
        expected: [{ kind: "file", name: "a.txt", size: 3 }],
      },
      {
        call: "onlyFiles([{ kind: \"folder\", name: \"src\" }, { kind: \"file\", name: \"b.ts\", size: 1 }, { kind: \"file\", name: \"c.ts\", size: 2 }])",
        expected: [{ kind: "file", name: "b.ts", size: 1 }, { kind: "file", name: "c.ts", size: 2 }],
      },
      { call: "onlyFiles([{ kind: \"folder\", name: \"src\" }])", expected: [], label: "folders only", edge: true },
      { call: "onlyFiles([])", expected: [], label: "empty input", edge: true },
      {
        call: "onlyFiles([{ kind: \"file\", name: \"empty\", size: 0 }])",
        expected: [{ kind: "file", name: "empty", size: 0 }],
        label: "an empty file is still a file",
        edge: true,
      },
    ],
    typeTests: [
      { code: "const __files: FileEntry[] = onlyFiles([{ kind: \"folder\", name: \"src\" }]);", label: "gives back files only" },
      {
        code: "const __size: number = [{ kind: \"file\", name: \"a\", size: 1 } as Entry].filter(isFile)[0].size;",
        label: "the predicate narrows whatever it filters",
      },
      { code: "const __folders: FolderEntry[] = onlyFiles([]);", label: "files come back, not folders", rejects: true },
      { code: "isFile({ name: \"a\" });", label: "something without a kind is not an Entry", rejects: true },
    ],
  },
  {
    id: "ts-count-a-status",
    track: "typescript",
    topic: "typescript",
    level: 13,
    tier: 2,
    focus: ["literal-types", "reduce"],
    title: "Count a status",
    prompt: "Declare a string enum `Status` with `Todo = \"todo\"`, `Doing = \"doing\"` and `Done = \"done\"`, then write `countStatus(items: Status[], wanted: Status): number` counting with `reduce` how many items equal the wanted member. `countStatus([Status.Done, Status.Todo, Status.Done], Status.Done)` gives 2, and an empty list gives 0.",
    starter: `enum Status {
  Todo = "todo",
  Doing = "doing",
  Done = "done",
}

const countStatus = (items: Status[], wanted: Status): number => {

};

// Scratch pad — change this and press Run.
console.log(countStatus([Status.Done, Status.Todo, Status.Done], Status.Done));
`,
    skeleton: `enum Status {
  Todo = "todo",
  Doing = "doing",
  Done = "done",
}

const countStatus = (items: Status[], wanted: Status): number =>
  items.reduce((count, item) => {
    return /* count plus one on a match, otherwise count */;
  }, 0);`,
    hints: [
      "The accumulator is a plain number that starts at zero, and each step either adds one or hands it on unchanged.",
    ],
    approach: [
      "Declare the enum with its three string members above the function.",
      "Reduce the list with a numeric accumulator that starts at zero.",
      "In each step compare the item with the wanted member and return the count plus one on a match, or the count as it is.",
    ],
    verify: "tests",
    estimatedMinutes: 6,
    tests: [
      { call: "countStatus([Status.Done, Status.Todo, Status.Done], Status.Done)", expected: 2 },
      { call: "countStatus([Status.Todo, Status.Doing], Status.Todo)", expected: 1 },
      { call: "countStatus([Status.Todo, Status.Doing], Status.Done)", expected: 0, label: "nothing matches", edge: true },
      { call: "countStatus([], Status.Done)", expected: 0, label: "empty input", edge: true },
      {
        call: "countStatus([Status.Doing, Status.Doing, Status.Doing], Status.Doing)",
        expected: 3,
        label: "every item matches",
        edge: true,
      },
    ],
    typeTests: [
      { code: "const __count: number = countStatus([Status.Todo], Status.Todo);", label: "gives back a number" },
      { code: "const __status: Status = Status.Doing;", label: "Status is a type you can name" },
      { code: "countStatus([\"done\"], Status.Done);", label: "a plain string is not a member of the enum", rejects: true },
      { code: "countStatus([Status.Done], \"done\");", label: "the wanted status is a member too", rejects: true },
    ],
  },
  {
    id: "ts-chunk-a-list",
    track: "typescript",
    topic: "typescript",
    level: 14,
    tier: 2,
    focus: ["generics", "for", "slice"],
    title: "Chunk a list",
    prompt: "Write `chunk<T>(items: T[], size: number): T[][]`, splitting a list into groups of `size` items with a `for` loop that steps by `size` and slices out each group; the last group holds whatever is left. `chunk([1, 2, 3, 4, 5], 2)` gives `[[1, 2], [3, 4], [5]]`, and an empty list gives an empty list. The size is always at least 1.",
    starter: `const chunk = <T>(items: T[], size: number): T[][] => {

};

// Scratch pad — change this and press Run.
console.log(chunk([1, 2, 3, 4, 5], 2));
`,
    skeleton: `const chunk = <T>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    // push the slice from start to start + size
  }

  return groups;
};`,
    hints: [
      "The loop counter is a start index, and moving it by the group size each pass means every group begins where the previous one ended.",
    ],
    approach: [
      "One type parameter describes the element, and the result is an array of arrays of that element.",
      "Loop with a start index that begins at zero and grows by the group size.",
      "Slice from the start index to the start plus the size and push that group; slice stops at the end of the list on its own.",
    ],
    verify: "tests",
    estimatedMinutes: 7,
    tests: [
      { call: "chunk([1, 2, 3, 4, 5], 2)", expected: [[1, 2], [3, 4], [5]] },
      { call: "chunk([\"a\", \"b\", \"c\"], 3)", expected: [["a", "b", "c"]] },
      { call: "chunk([], 2)", expected: [], label: "empty input", edge: true },
      { call: "chunk([1, 2], 5)", expected: [[1, 2]], label: "a size larger than the list", edge: true },
      { call: "chunk([1, 2, 3], 1)", expected: [[1], [2], [3]], label: "groups of one", edge: true },
    ],
    typeTests: [
      { code: "const __groups: number[][] = chunk([1, 2, 3], 2);", label: "numbers in, groups of numbers out" },
      { code: "const __words: string[][] = chunk([\"a\"], 1);", label: "strings in, groups of strings out" },
      { code: "const __flat: number[] = chunk([1], 1);", label: "the result is nested one level", rejects: true },
      { code: "chunk([1], \"2\");", label: "the size is a number", rejects: true },
    ],
  },
  {
    id: "ts-zip-two-lists",
    track: "typescript",
    topic: "typescript",
    level: 14,
    tier: 2,
    focus: ["generics", "tuples", "for"],
    title: "Zip two lists",
    prompt: "Write `zip<A, B>(left: A[], right: B[]): [A, B][]`, pairing the items at the same index into tuples with a `for` loop and stopping at the shorter list. `zip([1, 2], [\"a\", \"b\"])` gives `[[1, \"a\"], [2, \"b\"]]`, and when either list is empty the result is empty.",
    starter: `const zip = <A, B>(left: A[], right: B[]): [A, B][] => {

};

// Scratch pad — change this and press Run.
console.log(zip([1, 2], ["a", "b"]));
`,
    skeleton: `const zip = <A, B>(left: A[], right: B[]): [A, B][] => {
  const pairs: [A, B][] = [];
  const count = /* the shorter length */;

  for (let i = 0; i < count; i += 1) {
    // push the tuple of left[i] and right[i]
  }

  return pairs;
};`,
    hints: [
      "Two type parameters keep the two lists independent, and the tuple type in the result fixes which one comes first.",
    ],
    approach: [
      "Loop up to the shorter length, so no index runs past the end of either list.",
      "Build a tuple from the two items at the current index and push it onto a result typed as [A, B][].",
      "Return the result; with two type parameters the caller gets back whatever pair of types they passed in.",
    ],
    verify: "tests",
    estimatedMinutes: 7,
    tests: [
      { call: "zip([1, 2], [\"a\", \"b\"])", expected: [[1, "a"], [2, "b"]] },
      { call: "zip([\"x\", \"y\"], [true, false])", expected: [["x", true], ["y", false]] },
      { call: "zip([1, 2, 3], [\"a\"])", expected: [[1, "a"]], label: "the shorter list wins", edge: true },
      { call: "zip([], [\"a\"])", expected: [], label: "one empty list", edge: true },
      { call: "zip([1], [null])", expected: [[1, null]], label: "null is a value like any other", edge: true },
    ],
    typeTests: [
      { code: "const __pairs: [number, string][] = zip([1], [\"a\"]);", label: "gives back tuples in the same order" },
      { code: "const __first: number = zip([1], [\"a\"])[0][0];", label: "the first position keeps the left type" },
      { code: "const __swapped: [string, number][] = zip([1], [\"a\"]);", label: "the order in the tuple is fixed", rejects: true },
      { code: "zip([1]);", label: "both lists are required", rejects: true },
    ],
  },
  {
    id: "ts-group-by-key",
    track: "typescript",
    topic: "typescript",
    level: 15,
    tier: 3,
    focus: ["constraints", "record", "for-of"],
    title: "Group by key",
    prompt: "Write `groupBy<T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Record<K, T[]>`, collecting every item under the key the callback gives it, with a `for-of` loop. The constraint keeps the key something an object can be indexed by. `groupBy([1, 2, 3, 4], n => n % 2 === 0 ? \"even\" : \"odd\")` gives `{ odd: [1, 3], even: [2, 4] }`, and an empty list gives an empty object.",
    starter: `const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Record<K, T[]> => {

};

// Scratch pad — change this and press Run.
console.log(groupBy([1, 2, 3, 4], n => n % 2 === 0 ? "even" : "odd"));
`,
    skeleton: `const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Record<K, T[]> => {
  const groups = {} as Record<K, T[]>;

  for (const item of items) {
    const key = keyOf(item);
    // create the group on first sight, then push the item onto it
  }

  return groups;
};`,
    hints: [
      "PropertyKey is the union of everything that can name a property, and constraining K to it is what makes Record<K, ...> legal.",
    ],
    approach: [
      "Start with an empty object asserted to the return type, because the compiler cannot see that the keys will be filled in.",
      "Loop over the items, ask the callback for each item's key, and create an empty group the first time a key appears.",
      "Push the item onto its group and return the object; the keys of the result are exactly the values the callback can return.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "groupBy([1, 2, 3, 4], n => n % 2 === 0 ? \"even\" : \"odd\")", expected: { odd: [1, 3], even: [2, 4] } },
      {
        call: "groupBy([\"apple\", \"avocado\", \"banana\"], w => w[0])",
        expected: { a: ["apple", "avocado"], b: ["banana"] },
      },
      { call: "groupBy([], n => n)", expected: {}, label: "empty input", edge: true },
      { call: "groupBy([3, 3], n => n)", expected: { 3: [3, 3] }, label: "a numeric key", edge: true },
      {
        call: "groupBy([{ t: \"a\" }, { t: \"b\" }, { t: \"a\" }], o => o.t)",
        expected: { a: [{ t: "a" }, { t: "a" }], b: [{ t: "b" }] },
        label: "whole items land in the groups",
      },
    ],
    typeTests: [
      {
        code: "const __parity: Record<\"even\" | \"odd\", number[]> = groupBy([1, 2], n => n % 2 === 0 ? \"even\" : \"odd\");",
        label: "the keys are the values the callback returns",
      },
      { code: "const __lengths: Record<number, string[]> = groupBy([\"a\"], w => w.length);", label: "a number can be a key too" },
      { code: "groupBy([1], n => [n]);", label: "an array cannot be a key", rejects: true },
      {
        code: "const __wrong: Record<string, string[]> = groupBy([1], n => String(n));",
        label: "the groups hold the items, not the keys",
        rejects: true,
      },
    ],
  },
  {
    id: "ts-write-reduce",
    track: "typescript",
    topic: "typescript",
    level: 15,
    tier: 3,
    focus: ["generics", "for", "reduce"],
    title: "Write reduce by hand",
    prompt: "Write `myReduce<T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U`, folding a list into one value with a plain `for` loop instead of calling `reduce`. The accumulator starts as `initial` and is replaced by what `step` returns for every item. `myReduce([1, 2, 3], (acc, n) => acc + n, 0)` gives 6, and an empty list gives back `initial` untouched.",
    starter: `const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {

};

// Scratch pad — change this and press Run.
console.log(myReduce([1, 2, 3], (acc, n) => acc + n, 0));
`,
    skeleton: `const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {
  let acc = initial;

  for (let i = 0; i < items.length; i += 1) {
    // replace acc with step(acc, items[i])
  }

  return acc;
};`,
    hints: [
      "The item type and the accumulator type are different type parameters, because a sum of numbers can just as well be built into a string.",
    ],
    approach: [
      "Keep a variable typed as the accumulator, starting from the initial value.",
      "Loop by index over the items, call the step with the current accumulator and item, and store what comes back.",
      "Return the accumulator after the loop; with no items it is still the initial value.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    tests: [
      { call: "myReduce([1, 2, 3], (acc, n) => acc + n, 0)", expected: 6 },
      { call: "myReduce([\"a\", \"b\"], (acc, s) => acc + s, \"\")", expected: "ab" },
      { call: "myReduce([], (acc, n) => acc + n, 10)", expected: 10, label: "empty input returns the initial value", edge: true },
      {
        call: "myReduce([1, 2], (acc, n) => [...acc, n * 2], [])",
        expected: [2, 4],
        label: "the accumulator can be a different type",
        edge: true,
      },
      { call: "myReduce([3], (acc, n) => acc * n, 2)", expected: 6, label: "a single item", edge: true },
    ],
    typeTests: [
      { code: "const __sum: number = myReduce([1, 2], (acc, n) => acc + n, 0);", label: "numbers fold into a number" },
      { code: "const __text: string = myReduce([1, 2], (acc, n) => acc + n, \"\");", label: "the initial value decides the result type" },
      { code: "const __wrong: string = myReduce([1], (acc, n) => acc + n, 0);", label: "a numeric fold does not give a string", rejects: true },
      { code: "myReduce([1], (acc: string, n: number) => acc, 0);", label: "the step and the initial value have to agree", rejects: true },
    ],
  },
  {
    id: "ts-pluck-all",
    track: "typescript",
    topic: "typescript",
    level: 17,
    tier: 3,
    focus: ["keyof", "map"],
    title: "Pluck all the keys",
    prompt: "Write `pluckAll<T, K extends keyof T>(items: T[], keys: K[]): T[K][][]`, returning one row per item with the values of the requested keys in the order asked, built with `map` inside `map`. The indexed access type `T[K]` is whatever those properties hold. `pluckAll([{ id: 1, name: \"a\" }], [\"id\", \"name\"])` gives `[[1, \"a\"]]`.",
    starter: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] => {

};

// Scratch pad — change this and press Run.
console.log(pluckAll([{ id: 1, name: "a" }, { id: 2, name: "b" }], ["id", "name"]));
`,
    skeleton: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] =>
  items.map(item =>
    keys.map(key => {
      return /* the property key of item */;
    }),
  );`,
    hints: [
      "Constraining the key to keyof T is what lets the compiler read T[K] and know the type of every value you pluck.",
    ],
    approach: [
      "Map over the items to produce one row each.",
      "Inside, map over the keys and read that property from the current item.",
      "The return type is one indexed access, T[K], wrapped in two arrays: values in a row, rows in the result.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    tests: [
      { call: "pluckAll([{ id: 1, name: \"a\" }, { id: 2, name: \"b\" }], [\"id\", \"name\"])", expected: [[1, "a"], [2, "b"]] },
      { call: "pluckAll([{ id: 1, name: \"a\" }], [\"name\"])", expected: [["a"]] },
      { call: "pluckAll([], [\"id\"])", expected: [], label: "empty input", edge: true },
      { call: "pluckAll([{ id: 1 }], [])", expected: [[]], label: "no keys gives empty rows", edge: true },
      { call: "pluckAll([{ id: 1, name: \"a\" }], [\"name\", \"id\"])", expected: [["a", 1]], label: "the key order is kept", edge: true },
    ],
    typeTests: [
      {
        code: "const __rows: (number | string)[][] = pluckAll([{ id: 1, name: \"a\" }], [\"id\", \"name\"]);",
        label: "the values are a union of what the keys hold",
      },
      { code: "const __ids: number[][] = pluckAll([{ id: 1, name: \"a\" }], [\"id\"]);", label: "one numeric key gives numeric rows" },
      { code: "pluckAll([{ id: 1 }], [\"missing\"]);", label: "a key that is not there is refused", rejects: true },
      { code: "const __flat: number[] = pluckAll([{ id: 1 }], [\"id\"]);", label: "rows come back, not a flat list", rejects: true },
    ],
  },
  {
    id: "ts-apply-patches-in-order",
    track: "typescript",
    topic: "typescript",
    level: 18,
    tier: 3,
    focus: ["utility-types", "for-of", "spread"],
    title: "Apply patches in order",
    prompt: "Declare an interface named `Profile` with a `name` string, an `age` number and a `city` string, then write `applyPatches(profile: Profile, patches: Partial<Profile>[]): Profile`, applying every patch in order and building a new object each time, so the profile handed in is never changed. `applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ age: 37 }, { city: \"Paris\" }])` gives `{ name: \"Ada\", age: 37, city: \"Paris\" }`.",
    starter: `interface Profile {
  name: string;
  age: number;
  city: string;
}

const applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile => {

};

// Scratch pad — change this and press Run.
console.log(applyPatches({ name: "Ada", age: 36, city: "London" }, [{ age: 37 }, { city: "Paris" }]));
`,
    skeleton: `interface Profile {
  name: string;
  age: number;
  city: string;
}

const applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile => {
  let current = profile;

  for (const patch of patches) {
    // replace current with a new object: current first, then the patch
  }

  return current;
};`,
    hints: [
      "Partial<Profile> lets a patch carry any subset of the properties, and spreading it after the current object is what makes the later patch win.",
    ],
    approach: [
      "Keep a variable holding the current profile, starting from the one passed in.",
      "Loop over the patches with for-of and replace the current profile with a new object spread from the current one, then from the patch.",
      "Return the current profile; when there are no patches it is the original object, and the original is never mutated.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    tests: [
      {
        call: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ age: 37 }])",
        expected: { name: "Ada", age: 37, city: "London" },
      },
      {
        call: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ city: \"Paris\" }, { city: \"Rome\", age: 40 }])",
        expected: { name: "Ada", age: 40, city: "Rome" },
      },
      {
        call: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [])",
        expected: { name: "Ada", age: 36, city: "London" },
        label: "no patches",
        edge: true,
      },
      {
        call: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{}])",
        expected: { name: "Ada", age: 36, city: "London" },
        label: "an empty patch changes nothing",
        edge: true,
      },
      {
        call: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ age: 0 }])",
        expected: { name: "Ada", age: 0, city: "London" },
        label: "zero still overwrites",
        edge: true,
      },
    ],
    typeTests: [
      {
        code: "const __next: Profile = applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ age: 37 }]);",
        label: "gives back a complete profile",
      },
      { code: "const __patch: Partial<Profile> = { city: \"Rome\" };", label: "a patch may carry any subset" },
      {
        code: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ age: \"37\" }]);",
        label: "a patch still has to have the right types",
        rejects: true,
      },
      { code: "applyPatches({ name: \"Ada\", age: 36 }, []);", label: "the starting profile is complete", rejects: true },
    ],
  },
  {
    id: "ts-score-by-player",
    track: "typescript",
    topic: "typescript",
    level: 20,
    tier: 2,
    focus: ["record", "for-of", "objects"],
    title: "Score by player",
    prompt: "Declare an interface named `Round` with a `player` string and a `points` number, then write `scoreByPlayer(rounds: Round[]): Record<string, number>` adding up the points of every player with a `for-of` loop. A player seen for the first time has no entry yet, so treat the missing value as 0. `scoreByPlayer([{ player: \"ada\", points: 3 }, { player: \"bo\", points: 1 }, { player: \"ada\", points: 2 }])` gives `{ ada: 5, bo: 1 }`.",
    starter: `interface Round {
  player: string;
  points: number;
}

const scoreByPlayer = (rounds: Round[]): Record<string, number> => {

};

// Scratch pad — change this and press Run.
console.log(scoreByPlayer([{ player: "ada", points: 3 }, { player: "bo", points: 1 }, { player: "ada", points: 2 }]));
`,
    skeleton: `interface Round {
  player: string;
  points: number;
}

const scoreByPlayer = (rounds: Round[]): Record<string, number> => {
  const totals: Record<string, number> = {};

  for (const round of rounds) {
    // read the total so far, treating a missing one as 0, and store it plus the points
  }

  return totals;
};`,
    hints: [
      "Reading a key that is not in a Record<string, number> yet gives undefined at runtime, so fall back to zero before adding.",
    ],
    approach: [
      "Start an empty object typed as Record<string, number>.",
      "Loop over the rounds with for-of, read the current total under the player's name, and treat a missing total as zero.",
      "Store the total plus the round's points under that name and return the object.",
    ],
    verify: "tests",
    estimatedMinutes: 7,
    tests: [
      {
        call: "scoreByPlayer([{ player: \"ada\", points: 3 }, { player: \"bo\", points: 1 }, { player: \"ada\", points: 2 }])",
        expected: { ada: 5, bo: 1 },
      },
      { call: "scoreByPlayer([{ player: \"cy\", points: 4 }])", expected: { cy: 4 } },
      { call: "scoreByPlayer([])", expected: {}, label: "empty input", edge: true },
      { call: "scoreByPlayer([{ player: \"bo\", points: 0 }])", expected: { bo: 0 }, label: "zero points still creates an entry", edge: true },
      {
        call: "scoreByPlayer([{ player: \"ada\", points: 5 }, { player: \"ada\", points: -2 }])",
        expected: { ada: 3 },
        label: "negative points subtract",
        edge: true,
      },
    ],
    typeTests: [
      {
        code: "const __totals: Record<string, number> = scoreByPlayer([{ player: \"ada\", points: 1 }]);",
        label: "gives back a lookup of numbers",
      },
      { code: "const __ada: number = scoreByPlayer([])[\"ada\"];", label: "any name can be looked up" },
      { code: "scoreByPlayer([{ player: \"ada\" }]);", label: "a round needs its points", rejects: true },
      { code: "const __names: Record<string, string> = scoreByPlayer([]);", label: "the values are numbers, not strings", rejects: true },
    ],
  },
  {
    id: "ts-freeze-a-copy",
    track: "typescript",
    topic: "typescript",
    level: 21,
    tier: 3,
    focus: ["readonly", "for-of", "objects"],
    title: "Freeze a copy",
    prompt: "Declare a mapped type `Frozen<T>` that keeps every property of `T` with its type but marks it `readonly`, then write `freezeCopy<T extends object>(source: T): Frozen<T>` building a fresh object from `Object.entries` in a `for-of` loop and freezing it with `Object.freeze` before returning it. `freezeCopy({ a: 1 })` gives an object equal to `{ a: 1 }` that is not the same object, and assigning to its `a` is a compile error.",
    starter: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

const freezeCopy = <T extends object>(source: T): Frozen<T> => {

};

// Scratch pad — change this and press Run.
console.log(freezeCopy({ a: 1, b: "x" }));
`,
    skeleton: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

const freezeCopy = <T extends object>(source: T): Frozen<T> => {
  const copy = {} as { [K in keyof T]: T[K] };

  for (const [key, value] of Object.entries(source)) {
    // store value under key as keyof T
  }

  return Object.freeze(copy);
};`,
    hints: [
      "A mapped type walks keyof T and can put a modifier in front of every property it produces; the loop does the same job at runtime, one entry at a time.",
    ],
    approach: [
      "Write the mapped type with readonly in front of the key expression and T[K] as the value type.",
      "Create an empty object asserted to the mutable shape, and copy every entry from Object.entries into it inside a for-of loop.",
      "Freeze the copy and return it; the mutable shape is assignable to the readonly one, so the return type checks.",
    ],
    verify: "tests",
    estimatedMinutes: 9,
    tests: [
      { call: "freezeCopy({ a: 1, b: \"x\" })", expected: { a: 1, b: "x" } },
      { call: "Object.isFrozen(freezeCopy({ a: 1 }))", expected: true, label: "the copy is frozen" },
      {
        call: "(() => { const source = { a: 1 }; return freezeCopy(source) !== source; })()",
        expected: true,
        label: "a different object comes back",
        edge: true,
      },
      { call: "freezeCopy({})", expected: {}, label: "empty input", edge: true },
      { call: "freezeCopy({ list: [1, 2] })", expected: { list: [1, 2] }, label: "a nested value comes along", edge: true },
    ],
    typeTests: [
      { code: "const __copy: Frozen<{ a: number }> = freezeCopy({ a: 1 });", label: "gives back the frozen shape" },
      { code: "const __a: number = freezeCopy({ a: 1 }).a;", label: "every property keeps its type" },
      { code: "freezeCopy({ a: 1 }).a = 2;", label: "a frozen property cannot be assigned", rejects: true },
      { code: "freezeCopy(5);", label: "only objects can be frozen", rejects: true },
    ],
  },
  {
    id: "ts-values-of-a-type",
    track: "typescript",
    topic: "typescript",
    level: 22,
    tier: 3,
    focus: ["generics", "filter"],
    title: "Values of a type",
    prompt: "Declare `type TypeName = \"string\" | \"number\" | \"boolean\"` and a conditional type `OfType<N extends TypeName>` that resolves to `string`, `number` or `boolean` for the matching name. Then write `ofType<N extends TypeName>(values: unknown[], name: N): OfType<N>[]`, keeping the values whose `typeof` equals the name, in their original order, with `filter` and a type predicate. `ofType([1, \"a\", 2, true], \"number\")` gives `[1, 2]`.",
    starter: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] => {

};

// Scratch pad — change this and press Run.
console.log(ofType([1, "a", 2, true], "number"));
`,
    skeleton: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] =>
  values.filter((value): value is OfType<N> => {
    return /* typeof value compared with name */;
  });`,
    hints: [
      "A conditional type is a chain of extends checks that picks one type per name, and the predicate on the filter callback is where the runtime result gets that type.",
    ],
    approach: [
      "Write the conditional type as a chain: if N extends the string name give string, if the number name give number, otherwise boolean.",
      "Filter the values with a callback whose return type is a predicate on OfType<N>.",
      "Compare typeof value with the name inside the callback; the predicate does the narrowing and the filter returns the narrowed array.",
    ],
    verify: "tests",
    estimatedMinutes: 9,
    tests: [
      { call: "ofType([1, \"a\", 2, true], \"number\")", expected: [1, 2] },
      { call: "ofType([1, \"a\"], \"string\")", expected: ["a"] },
      { call: "ofType([true, false, 0], \"boolean\")", expected: [true, false] },
      { call: "ofType([], \"number\")", expected: [], label: "empty input", edge: true },
      { call: "ofType([null, undefined, \"x\"], \"string\")", expected: ["x"], label: "null and undefined match nothing", edge: true },
      { call: "ofType([\"1\", 1], \"number\")", expected: [1], label: "a numeric string is still a string", edge: true },
    ],
    typeTests: [
      { code: "const __numbers: number[] = ofType([1, \"a\"], \"number\");", label: "the name decides the element type" },
      { code: "const __words: string[] = ofType([1, \"a\"], \"string\");", label: "and it changes with the name" },
      { code: "const __wrong: string[] = ofType([1], \"number\");", label: "numbers do not come back as strings", rejects: true },
      { code: "ofType([1], \"object\");", label: "only the three names are allowed", rejects: true },
    ],
  },
  {
    id: "ts-memoized-run",
    track: "typescript",
    topic: "typescript",
    level: 23,
    tier: 3,
    focus: ["generics", "map-set", "for-of"],
    title: "Memoized run",
    prompt: "Declare `type Output<F> = F extends (arg: number) => infer R ? R : never`, pulling the return type out of a function type with `infer`, then write `runMemoized<F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[]`. Loop over the inputs with a `Map` as a cache, so an input seen before reuses the stored result instead of calling `fn` again, and return the results in input order. `runMemoized(n => n * 2, [1, 1, 2])` gives `[2, 2, 4]` and calls `fn` twice.",
    starter: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {

};

// Scratch pad — change this and press Run.
console.log(runMemoized(n => n * 2, [1, 1, 2]));
`,
    skeleton: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {
  const cache = new Map<number, Output<F>>();
  const results: Output<F>[] = [];

  for (const input of inputs) {
    // fill the cache when the input is new, then push the cached value
  }

  return results;
};`,
    hints: [
      "infer names the part of the type you want to capture, and the conditional resolves to it whenever F matches the function shape.",
    ],
    approach: [
      "Write the conditional type with infer R in the return position of the function type and R as the true branch.",
      "Create a Map from number to Output<F> and an empty results array, then loop over the inputs with for-of.",
      "When the cache has no entry for the input, call fn and store the result under it; then push the cached value onto the results.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "runMemoized(n => n * 2, [1, 1, 2])", expected: [2, 2, 4] },
      { call: "runMemoized(n => \"#\" + n, [3, 4])", expected: ["#3", "#4"] },
      {
        call: "(() => { let calls = 0; runMemoized(n => { calls += 1; return n; }, [1, 1, 2, 1]); return calls; })()",
        expected: 2,
        label: "a repeated input is computed once",
        edge: true,
      },
      { call: "runMemoized(n => n, [])", expected: [], label: "empty input", edge: true },
      { call: "runMemoized(n => n > 0, [-1, 1])", expected: [false, true], label: "any return type works" },
    ],
    typeTests: [
      { code: "const __doubles: number[] = runMemoized((n: number) => n * 2, [1]);", label: "the result type follows the function" },
      { code: "const __labels: string[] = runMemoized((n: number) => \"#\" + n, [1]);", label: "a string-returning function gives strings" },
      { code: "const __output: Output<(n: number) => boolean> = true;", label: "Output extracts the return type on its own" },
      { code: "const __wrong: string[] = runMemoized((n: number) => n * 2, [1]);", label: "numbers do not come back as strings", rejects: true },
    ],
  },
  {
    id: "ts-tag-every-id",
    track: "typescript",
    topic: "typescript",
    level: 24,
    tier: 3,
    focus: ["literal-types", "strings", "for-of"],
    title: "Tag every id",
    prompt: "Declare a template literal type `Tag<P extends string>` for strings shaped `${P}-${number}`, then write `tagAll<P extends string>(prefix: P, ids: number[]): Tag<P>[]` building one tag per id in a `for-of` loop with a template string. `tagAll(\"user\", [1, 2])` gives `[\"user-1\", \"user-2\"]`, and no ids gives an empty list.",
    starter: `type Tag<P extends string> = \`\${P}-\${number}\`;

const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => {

};

// Scratch pad — change this and press Run.
console.log(tagAll("user", [1, 2]));
`,
    skeleton: `type Tag<P extends string> = \`\${P}-\${number}\`;

const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => {
  const tags: Tag<P>[] = [];

  for (const id of ids) {
    // push a template string of the prefix, a dash and the id
  }

  return tags;
};`,
    hints: [
      "A template string built from a P and a number gets the template literal type when the place it goes to expects one, so type the result array before pushing into it.",
    ],
    approach: [
      "Write the alias with the prefix parameter and number inside the template literal type.",
      "Start an empty array typed Tag<P>[] and loop over the ids with for-of.",
      "Push a template string of the prefix, a dash and the id; the typed array is what makes the compiler keep the literal type.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    tests: [
      { call: "tagAll(\"user\", [1, 2])", expected: ["user-1", "user-2"] },
      { call: "tagAll(\"order\", [7])", expected: ["order-7"] },
      { call: "tagAll(\"x\", [])", expected: [], label: "no ids", edge: true },
      { call: "tagAll(\"a\", [10, 0])", expected: ["a-10", "a-0"], label: "zero and two digits", edge: true },
      { call: "tagAll(\"\", [1])", expected: ["-1"], label: "an empty prefix", edge: true },
    ],
    typeTests: [
      { code: "const __users: `user-${number}`[] = tagAll(\"user\", [1]);", label: "the prefix ends up in the type" },
      { code: "const __one: `user-${number}` = tagAll(\"user\", [1])[0];", label: "each tag is one template literal" },
      { code: "const __orders: `order-${number}`[] = tagAll(\"user\", [1]);", label: "a different prefix is a different type", rejects: true },
      { code: "tagAll(5, [1]);", label: "the prefix is a string", rejects: true },
    ],
  },
  {
    id: "ts-pair-with-a-sum",
    track: "typescript",
    topic: "typescript",
    level: 25,
    tier: 3,
    focus: ["two-pointer", "while", "tuples"],
    title: "Pair with a sum",
    prompt: "Write `pairWithSum(sorted: readonly number[], target: number): [number, number] | null`, finding two values in an ascending list that add up to the target with two pointers: one at each end, moved inward in a `while` loop depending on whether the current sum is too small or too large. Return the pair as a tuple, or `null` when there is none. `pairWithSum([1, 2, 3, 4, 6], 6)` gives `[2, 4]`.",
    starter: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {

};

// Scratch pad — change this and press Run.
console.log(pairWithSum([1, 2, 3, 4, 6], 6));
`,
    skeleton: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {
  let left = 0;
  let right = sorted.length - 1;

  while (left < right) {
    const sum = sorted[left] + sorted[right];
    // return the pair on a match, otherwise move left up or right down
  }

  return null;
};`,
    hints: [
      "The list is sorted, so a sum that is too small can only be fixed by moving the left pointer up, and one that is too large by moving the right pointer down.",
    ],
    approach: [
      "Put one index at the start and one at the end, and loop while the left index is below the right.",
      "Add the two values: on a match return them as a tuple, on a sum below the target move the left index up, otherwise move the right index down.",
      "When the pointers meet there was no pair, so return null; the return type says the caller has to handle that.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    tests: [
      { call: "pairWithSum([1, 2, 3, 4, 6], 6)", expected: [2, 4] },
      { call: "pairWithSum([1, 3, 5], 8)", expected: [3, 5] },
      { call: "pairWithSum([1, 2], 10)", expected: null, label: "no pair adds up", edge: true },
      { call: "pairWithSum([], 0)", expected: null, label: "empty input", edge: true },
      { call: "pairWithSum([-3, 0, 3], 0)", expected: [-3, 3], label: "negative values", edge: true },
      { call: "pairWithSum([2, 2], 4)", expected: [2, 2], label: "two equal values" },
    ],
    typeTests: [
      { code: "const __pair: [number, number] | null = pairWithSum([1, 2], 3);", label: "gives back a pair or null" },
      { code: "pairWithSum([1, 2] as readonly number[], 3);", label: "a readonly list is accepted" },
      { code: "const __sure: [number, number] = pairWithSum([1, 2], 3);", label: "the null case cannot be ignored", rejects: true },
      { code: "pairWithSum([\"1\"], 3);", label: "the values are numbers", rejects: true },
    ],
  },
  {
    id: "ts-binary-search",
    track: "typescript",
    topic: "typescript",
    level: 25,
    tier: 3,
    focus: ["while", "readonly"],
    title: "Binary search",
    prompt: "Write `binarySearch(sorted: readonly number[], target: number): number`, returning the index of the target in an ascending list or -1 when it is absent, by halving the search range in a `while` loop: compare the middle value, then continue in the left or the right half. `binarySearch([1, 3, 5, 7], 5)` gives 2, and an empty list gives -1.",
    starter: `const binarySearch = (sorted: readonly number[], target: number): number => {

};

// Scratch pad — change this and press Run.
console.log(binarySearch([1, 3, 5, 7], 5));
`,
    skeleton: `const binarySearch = (sorted: readonly number[], target: number): number => {
  let low = 0;
  let high = sorted.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    // return middle on a match, otherwise move low or high past it
  }

  return -1;
};`,
    hints: [
      "Keep a low and a high index that bound the values still worth looking at, and stop once the low index passes the high one.",
    ],
    approach: [
      "Start low at 0 and high at the last index, and loop while low is at most high.",
      "Take the middle index with integer division; on a match return it.",
      "A middle value below the target moves low past the middle, one above moves high before it; when the loop ends, return -1.",
    ],
    verify: "tests",
    estimatedMinutes: 9,
    tests: [
      { call: "binarySearch([1, 3, 5, 7], 5)", expected: 2 },
      { call: "binarySearch([1, 3, 5, 7], 1)", expected: 0 },
      { call: "binarySearch([1, 3, 5, 7], 4)", expected: -1, label: "a value that is not there", edge: true },
      { call: "binarySearch([], 1)", expected: -1, label: "empty input", edge: true },
      { call: "binarySearch([9], 9)", expected: 0, label: "a single value", edge: true },
      { call: "binarySearch([1, 3, 5, 7, 9], 9)", expected: 4, label: "the last value" },
    ],
    typeTests: [
      { code: "const __at: number = binarySearch([1, 3], 3);", label: "gives back an index" },
      { code: "binarySearch([1, 2] as readonly number[], 2);", label: "a readonly list is accepted" },
      { code: "binarySearch([\"a\"], \"a\");", label: "the values are numbers", rejects: true },
      { code: "const __found: boolean = binarySearch([1], 1);", label: "an index comes back, not a boolean", rejects: true },
    ],
  },
];
