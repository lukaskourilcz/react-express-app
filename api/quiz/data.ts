export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: 'react' | 'typescript' | 'git';
}

export const questions: Question[] = [
  // REACT - useState
  {
    id: '1',
    question: 'What does useState return?',
    options: ['A single value', 'An array with value and setter', 'An object with value and setter', 'A promise'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '2',
    question: 'What happens when you call the setter function from useState?',
    options: ['Nothing', 'Component re-renders', 'Page refreshes', 'State updates without re-render'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '3',
    question: 'How do you update state based on previous state?',
    options: ['setState(state + 1)', 'setState(prev => prev + 1)', 'setState(this.state + 1)', 'state++'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '4',
    question: 'What is the initial value parameter in useState used for?',
    options: ['Default value on every render', 'Initial value only on first render', 'Fallback value', 'Validation'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '5',
    question: 'Can useState hold objects?',
    options: ['No, only primitives', 'Yes, but they are immutable', 'Yes, any value type', 'Only arrays'],
    correctAnswer: 2,
    category: 'react',
  },

  // REACT - useEffect
  {
    id: '6',
    question: 'When does useEffect run by default?',
    options: ['Only on mount', 'After every render', 'Before every render', 'Only on unmount'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '7',
    question: 'What does an empty dependency array in useEffect do?',
    options: ['Runs on every render', 'Runs only on mount', 'Runs only on unmount', 'Disables the effect'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '8',
    question: 'What does the return function in useEffect do?',
    options: ['Returns a value', 'Cleanup function', 'Error handler', 'Nothing'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '9',
    question: 'When is the cleanup function in useEffect called?',
    options: ['Before the effect runs and on unmount', 'Only on mount', 'Only when dependencies change', 'Never automatically'],
    correctAnswer: 0,
    category: 'react',
  },
  {
    id: '10',
    question: 'What happens if you omit the dependency array in useEffect?',
    options: ['Effect never runs', 'Effect runs once', 'Effect runs after every render', 'Compilation error'],
    correctAnswer: 2,
    category: 'react',
  },

  // REACT - useCallback
  {
    id: '11',
    question: 'What is the purpose of useCallback?',
    options: ['To call functions', 'To memoize callback functions', 'To create callbacks', 'To handle async operations'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '12',
    question: 'When should you use useCallback?',
    options: ['For all functions', 'When passing callbacks to optimized child components', 'Never', 'Only for async functions'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '13',
    question: 'What does useCallback return?',
    options: ['The result of the callback', 'A memoized version of the callback', 'A new function every time', 'A promise'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '14',
    question: 'What is the second argument to useCallback?',
    options: ['The callback function', 'The return value', 'Dependency array', 'Options object'],
    correctAnswer: 2,
    category: 'react',
  },
  {
    id: '15',
    question: 'useCallback(fn, deps) is equivalent to which useMemo call?',
    options: ['useMemo(fn, deps)', 'useMemo(() => fn, deps)', 'useMemo(fn(), deps)', 'useMemo(() => fn(), deps)'],
    correctAnswer: 1,
    category: 'react',
  },

  // REACT - useMemo
  {
    id: '16',
    question: 'What is the purpose of useMemo?',
    options: ['To memorize values', 'To memoize expensive calculations', 'To create memos', 'To store data permanently'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '17',
    question: 'When does useMemo recompute its value?',
    options: ['Every render', 'Never', 'When dependencies change', 'Only on mount'],
    correctAnswer: 2,
    category: 'react',
  },
  {
    id: '18',
    question: 'What does useMemo return?',
    options: ['A function', 'The memoized value', 'A ref object', 'A setter function'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '19',
    question: 'Should you use useMemo for all computed values?',
    options: ['Yes, always', 'No, only for expensive computations', 'Only for objects', 'Only for arrays'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '20',
    question: 'What happens if useMemo dependencies are empty []?',
    options: ['Value computed every render', 'Value computed once on mount', 'Value is undefined', 'Error is thrown'],
    correctAnswer: 1,
    category: 'react',
  },

  // REACT - useRef
  {
    id: '21',
    question: 'What does useRef return?',
    options: ['A mutable ref object', 'A DOM element', 'A state value', 'A callback function'],
    correctAnswer: 0,
    category: 'react',
  },
  {
    id: '22',
    question: 'Does changing useRef.current trigger a re-render?',
    options: ['Yes', 'No', 'Only if connected to state', 'Only on mount'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '23',
    question: 'What property holds the value in a ref object?',
    options: ['value', 'current', 'ref', 'data'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '24',
    question: 'What is a common use case for useRef?',
    options: ['Managing form state', 'Accessing DOM elements', 'Fetching data', 'Routing'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '25',
    question: 'How do you attach a ref to a DOM element?',
    options: ['ref={myRef.current}', 'ref={myRef}', 'useRef={myRef}', 'current={myRef}'],
    correctAnswer: 1,
    category: 'react',
  },

  // REACT - React Router
  {
    id: '26',
    question: 'Which hook returns the current URL location in React Router?',
    options: ['useHistory', 'useLocation', 'useRoute', 'useURL'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '27',
    question: 'What hook is used for programmatic navigation in React Router v6?',
    options: ['useHistory', 'useNavigate', 'useRouter', 'useRedirect'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '28',
    question: 'How do you access URL parameters in React Router?',
    options: ['useQuery', 'useParams', 'useURLParams', 'useSearch'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '29',
    question: 'What component is used to define routes in React Router v6?',
    options: ['Switch', 'Routes', 'Router', 'Route'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '30',
    question: 'How do you create a link in React Router?',
    options: ['<a href="/">', '<Link to="/">', '<Route to="/">', '<Navigate to="/">'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '31',
    question: 'What does the Outlet component do in React Router?',
    options: ['Creates a new route', 'Renders child routes', 'Redirects users', 'Handles 404 errors'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '32',
    question: 'How do you handle 404 pages in React Router v6?',
    options: ['<Route notFound>', '<Route path="*">', '<Route 404>', '<NotFound>'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '33',
    question: 'What hook gives you access to search/query parameters?',
    options: ['useParams', 'useSearchParams', 'useQuery', 'useLocation'],
    correctAnswer: 1,
    category: 'react',
  },

  // REACT - React Hook Form
  {
    id: '34',
    question: 'What hook is the main entry point for React Hook Form?',
    options: ['useForm', 'useFormState', 'useController', 'useWatch'],
    correctAnswer: 0,
    category: 'react',
  },
  {
    id: '35',
    question: 'How do you register an input with React Hook Form?',
    options: ['register prop', 'name prop only', 'ref prop', '{...register("fieldName")}'],
    correctAnswer: 3,
    category: 'react',
  },
  {
    id: '36',
    question: 'What function handles form submission in React Hook Form?',
    options: ['onSubmit', 'handleSubmit', 'submit', 'processForm'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '37',
    question: 'How do you access form errors in React Hook Form?',
    options: ['errors object from useForm', 'formState.errors', 'getErrors()', 'useErrors()'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '38',
    question: 'What does the watch function do in React Hook Form?',
    options: ['Validates inputs', 'Watches for form submission', 'Subscribes to input changes', 'Resets the form'],
    correctAnswer: 2,
    category: 'react',
  },
  {
    id: '39',
    question: 'How do you set default values in React Hook Form?',
    options: ['defaultValue prop', 'defaultValues in useForm', 'initial prop', 'value prop'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '40',
    question: 'What does reset() do in React Hook Form?',
    options: ['Clears errors only', 'Resets form to default values', 'Submits the form', 'Validates all fields'],
    correctAnswer: 1,
    category: 'react',
  },

  // REACT - General
  {
    id: '41',
    question: 'What is the purpose of React.memo?',
    options: ['To memoize values', 'To prevent unnecessary re-renders of components', 'To create memos', 'To store data'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '42',
    question: 'What is a controlled component in React?',
    options: ['A component with refs', 'A component whose value is controlled by React state', 'A class component', 'A pure component'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '43',
    question: 'What is the virtual DOM?',
    options: ['A copy of the real DOM in memory', 'A browser feature', 'A JavaScript engine', 'A CSS framework'],
    correctAnswer: 0,
    category: 'react',
  },
  {
    id: '44',
    question: 'What is the purpose of keys in React lists?',
    options: ['Styling', 'Help React identify which items changed', 'Security', 'Performance only'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '45',
    question: 'What hook would you use to access context?',
    options: ['useState', 'useContext', 'useReducer', 'useRef'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '46',
    question: 'What is prop drilling?',
    options: ['A performance technique', 'Passing props through multiple levels', 'A testing method', 'A build process'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '47',
    question: 'What is the StrictMode component used for?',
    options: ['Production optimization', 'Highlighting potential problems', 'Security', 'Styling'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '48',
    question: 'What is a React Fragment used for?',
    options: ['Breaking components', 'Grouping elements without adding extra DOM nodes', 'Creating partial renders', 'Code splitting'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '49',
    question: 'What is the difference between state and props?',
    options: ['No difference', 'State is mutable, props are read-only', 'Props are mutable, state is read-only', 'Both are immutable'],
    correctAnswer: 1,
    category: 'react',
  },
  {
    id: '50',
    question: 'What does lifting state up mean?',
    options: ['Moving state to a higher component', 'Increasing state value', 'Optimizing state', 'Removing state'],
    correctAnswer: 0,
    category: 'react',
  },

  // TYPESCRIPT
  {
    id: '51',
    question: 'How do you define an optional property in TypeScript?',
    options: ['property?: type', 'property: type?', 'optional property: type', 'property: type | undefined'],
    correctAnswer: 0,
    category: 'typescript',
  },
  {
    id: '52',
    question: 'What is the correct way to define a typed array?',
    options: ['Array<string>', 'string[]', 'Both A and B', 'string{}'],
    correctAnswer: 2,
    category: 'typescript',
  },
  {
    id: '53',
    question: 'What does the "as" keyword do?',
    options: ['Creates an alias', 'Type assertion', 'Type declaration', 'Creates a new type'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '54',
    question: 'What is an interface in TypeScript?',
    options: ['A class', 'A contract that defines object shape', 'A function', 'A module'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '55',
    question: 'How do you define a union type?',
    options: ['type A && B', 'type A | B', 'type A + B', 'type A & B'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '56',
    question: 'What is the "never" type used for?',
    options: ['Variables never used', 'Functions that never return', 'Optional parameters', 'Nullable types'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '57',
    question: 'What is the difference between interface and type?',
    options: ['No difference', 'Interfaces can be extended, types cannot', 'Types are more flexible, interfaces can be merged', 'Types are older'],
    correctAnswer: 2,
    category: 'typescript',
  },
  {
    id: '58',
    question: 'What does the readonly modifier do?',
    options: ['Makes property optional', 'Prevents property modification', 'Makes property private', 'Makes property static'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '59',
    question: 'What is a generic in TypeScript?',
    options: ['A general type', 'A type parameter that allows reusable components', 'A basic type', 'An any type'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '60',
    question: 'How do you type a function that returns nothing?',
    options: ['null', 'undefined', 'void', 'never'],
    correctAnswer: 2,
    category: 'typescript',
  },
  {
    id: '61',
    question: 'What is the unknown type?',
    options: ['Same as any', 'A type-safe any', 'An error type', 'A null type'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '62',
    question: 'What is an intersection type?',
    options: ['A | B', 'A & B', 'A + B', 'A - B'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '63',
    question: 'What does Partial<T> do?',
    options: ['Makes all properties required', 'Makes all properties optional', 'Removes all properties', 'Adds new properties'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '64',
    question: 'What does Required<T> do?',
    options: ['Makes all properties optional', 'Makes all properties required', 'Removes all properties', 'Validates properties'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '65',
    question: 'What does Pick<T, K> do?',
    options: ['Removes properties K from T', 'Creates a type with only properties K from T', 'Adds properties K to T', 'Validates K in T'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '66',
    question: 'What does Omit<T, K> do?',
    options: ['Creates a type with only K', 'Creates a type without properties K', 'Adds K to T', 'Validates T'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '67',
    question: 'How do you type an object with dynamic keys?',
    options: ['{ key: value }', '{ [key: string]: value }', '{ any: value }', '{ dynamic: value }'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '68',
    question: 'What is a type guard?',
    options: ['A security feature', 'A way to narrow types', 'A type validator', 'A compiler option'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '69',
    question: 'What does the "keyof" operator return?',
    options: ['All values of an object', 'All keys of a type as a union', 'The first key', 'A boolean'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '70',
    question: 'What is a tuple in TypeScript?',
    options: ['A dynamic array', 'A fixed-length array with specific types', 'An object', 'A map'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '71',
    question: 'How do you make a property non-nullable?',
    options: ['property!', 'NonNullable<property>', 'property!!', 'Required<property>'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '72',
    question: 'What is the typeof operator used for in TypeScript?',
    options: ['Runtime type checking only', 'Getting the type of a variable', 'Creating new types', 'Both B and C'],
    correctAnswer: 3,
    category: 'typescript',
  },
  {
    id: '73',
    question: 'What does Record<K, V> create?',
    options: ['An array', 'An object type with keys K and values V', 'A tuple', 'A map'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '74',
    question: 'What is the ReturnType<T> utility type?',
    options: ['Returns function parameters', 'Returns the return type of a function', 'Returns void', 'Returns never'],
    correctAnswer: 1,
    category: 'typescript',
  },
  {
    id: '75',
    question: 'What is a discriminated union?',
    options: ['A union with no common properties', 'A union with a common literal property', 'An intersection type', 'A generic type'],
    correctAnswer: 1,
    category: 'typescript',
  },

  // GIT
  {
    id: '76',
    question: 'What does git init do?',
    options: ['Clones a repository', 'Creates a new Git repository', 'Initializes a branch', 'Starts git daemon'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '77',
    question: 'What does git clone do?',
    options: ['Creates a new branch', 'Copies a repository', 'Merges branches', 'Deletes a repository'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '78',
    question: 'What does git add do?',
    options: ['Commits changes', 'Stages changes for commit', 'Pushes changes', 'Creates a branch'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '79',
    question: 'What does git commit -m do?',
    options: ['Merges branches', 'Creates a commit with a message', 'Pushes to remote', 'Creates a branch'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '80',
    question: 'What does git push do?',
    options: ['Downloads changes', 'Uploads local commits to remote', 'Creates a branch', 'Merges branches'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '81',
    question: 'What does git pull do?',
    options: ['Uploads changes', 'Fetches and merges remote changes', 'Creates a branch', 'Deletes a branch'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '82',
    question: 'What is the difference between git fetch and git pull?',
    options: ['No difference', 'Fetch downloads without merging, pull downloads and merges', 'Pull downloads without merging', 'Fetch uploads changes'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '83',
    question: 'What does git merge do?',
    options: ['Splits a branch', 'Combines branches', 'Deletes a branch', 'Creates a branch'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '84',
    question: 'What does git rebase do?',
    options: ['Deletes commits', 'Moves commits to a new base', 'Merges branches', 'Creates a branch'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '85',
    question: 'What is the main difference between merge and rebase?',
    options: ['No difference', 'Merge creates a merge commit, rebase rewrites history', 'Rebase creates a merge commit', 'Merge rewrites history'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '86',
    question: 'What does git branch do without arguments?',
    options: ['Creates a branch', 'Lists branches', 'Deletes a branch', 'Switches branch'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '87',
    question: 'How do you create and switch to a new branch?',
    options: ['git branch new', 'git checkout -b new', 'git switch new', 'Both B and C'],
    correctAnswer: 3,
    category: 'git',
  },
  {
    id: '88',
    question: 'What does git stash do?',
    options: ['Deletes changes', 'Temporarily saves changes', 'Commits changes', 'Pushes changes'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '89',
    question: 'How do you apply stashed changes?',
    options: ['git stash apply', 'git stash pop', 'Both A and B', 'git stash get'],
    correctAnswer: 2,
    category: 'git',
  },
  {
    id: '90',
    question: 'What does git reset --hard do?',
    options: ['Soft reset', 'Discards all changes and resets to specified commit', 'Creates a commit', 'Merges branches'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '91',
    question: 'What does git reset --soft do?',
    options: ['Discards all changes', 'Moves HEAD but keeps changes staged', 'Creates a branch', 'Deletes commits'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '92',
    question: 'What does git revert do?',
    options: ['Deletes a commit', 'Creates a new commit that undoes changes', 'Resets to previous state', 'Merges branches'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '93',
    question: 'What is HEAD in Git?',
    options: ['The first commit', 'A pointer to the current commit', 'The remote repository', 'A branch name'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '94',
    question: 'What does git log show?',
    options: ['Staged files', 'Commit history', 'Remote branches', 'Stashed changes'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '95',
    question: 'What does git status show?',
    options: ['Commit history', 'Working tree status', 'Remote URL', 'Branch list'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '96',
    question: 'What does git diff show?',
    options: ['Commit history', 'Changes between commits or working tree', 'Branch differences', 'Remote status'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '97',
    question: 'How do you delete a local branch?',
    options: ['git branch -d branchname', 'git delete branchname', 'git remove branchname', 'git branch --delete-remote'],
    correctAnswer: 0,
    category: 'git',
  },
  {
    id: '98',
    question: 'How do you delete a remote branch?',
    options: ['git branch -d origin/branch', 'git push origin --delete branch', 'git delete remote branch', 'git remote delete branch'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '99',
    question: 'What is a Git conflict?',
    options: ['A bug in Git', 'When changes in different branches affect the same lines', 'A network error', 'A permission issue'],
    correctAnswer: 1,
    category: 'git',
  },
  {
    id: '100',
    question: 'What does git cherry-pick do?',
    options: ['Deletes a commit', 'Applies a specific commit to current branch', 'Creates a branch', 'Merges all commits'],
    correctAnswer: 1,
    category: 'git',
  },
];

// Fisher-Yates shuffle algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Simple signing for session data (in production, use proper JWT)
const SECRET = process.env.SESSION_SECRET || 'quiz-secret-key-change-in-production';

export function encodeSession(data: { questionId: string; correctAnswer: number }[]): string {
  const payload = JSON.stringify(data);
  const encoded = Buffer.from(payload).toString('base64');
  const signature = Buffer.from(SECRET + encoded).toString('base64').slice(0, 16);
  return `${encoded}.${signature}`;
}

export function decodeSession(token: string): { questionId: string; correctAnswer: number }[] | null {
  try {
    const [encoded, signature] = token.split('.');
    const expectedSig = Buffer.from(SECRET + encoded).toString('base64').slice(0, 16);
    if (signature !== expectedSig) return null;
    const payload = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
