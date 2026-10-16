import type { CodingTask } from '../../../shared/coding-catalog';

const mdn = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/';
const react = 'https://react.dev/';
const ts = 'https://www.typescriptlang.org/docs/handbook/2/';
type Link = [string,string,string];
/** Authored reading targets match the requirement introduced in each stage. */
const links:Record<string,Link[]> = {
 'js-evolving-calculator': [
  ['Addition and numeric operators','Sčítání a číselné operátory',mdn+'Guide/Expressions_and_operators#arithmetic_operators'],
  ['Operator precedence','Priorita operátorů',mdn+'Guide/Expressions_and_operators#operator_precedence'],
  ['Grouping and expression evaluation','Seskupování a vyhodnocování výrazů',mdn+'Guide/Expressions_and_operators#grouping_operator'],
  ['Own-property lookup','Vyhledání vlastní vlastnosti',mdn+'Reference/Global_Objects/Object/hasOwn'],
  ['Assignment semantics','Sémantika přiřazení',mdn+'Guide/Expressions_and_operators#assignment_operators'],
 ],
 'js-evolving-query': [
  ['Array filtering','Filtrování polí',mdn+'Reference/Global_Objects/Array/filter'],
  ['Stable array sorting','Stabilní řazení polí',mdn+'Reference/Global_Objects/Array/sort'],
  ['Mapping and projection','Mapování a projekce',mdn+'Reference/Global_Objects/Array/map'],
  ['Keyed aggregation with Map','Agregace podle klíčů s Map',mdn+'Reference/Global_Objects/Map'],
  ['One-to-many array transforms','Transformace pole jedna ku mnoha',mdn+'Reference/Global_Objects/Array/flatMap'],
 ],
 'js-evolving-events': [
  ['Closures and private state','Uzávěry a soukromý stav',mdn+'Guide/Closures'],
  ['Function identity in Set','Identita funkcí v Set',mdn+'Reference/Global_Objects/Set'],
  ['Isolating exceptions','Izolace výjimek',mdn+'Reference/Statements/try...catch'],
  ['Appending to a queue','Odebírání z FIFO fronty',mdn+'Reference/Global_Objects/Array/push'],
  ['Per-event history with Map','Historie událostí s Map',mdn+'Reference/Global_Objects/Map'],
 ],
 'js-evolving-graph': [
  ['Recursive functions','Rekurzivní funkce',mdn+'Guide/Functions#recursion'],
  ['Tracking visited nodes','Evidence navštívených uzlů',mdn+'Reference/Global_Objects/Set'],
  ['Selecting a ready layer','Výběr připravené vrstvy',mdn+'Reference/Global_Objects/Array/filter'],
  ['Memoizing node results','Ukládání výsledků uzlů',mdn+'Reference/Global_Objects/Map'],
  ['Affected-node membership','Členství ovlivněných uzlů',mdn+'Reference/Global_Objects/Set'],
 ],
 'ts-evolving-result': [
  ['Discriminated unions','Diskriminované uniony',ts+'narrowing.html#discriminated-unions'],
  ['Generic transformations','Generické transformace',ts+'generics.html'],
  ['Typed callback signatures','Typované podpisy callbacků',ts+'functions.html'],
  ['Narrowing success and error branches','Zužování větví úspěchu a chyby',ts+'narrowing.html'],
  ['Generic function composition','Kompozice generických funkcí',ts+'generics.html#generic-types'],
 ],
 'ts-evolving-store': [
  ['Generic state types','Generické typy stavu',ts+'generics.html'],
  ['Callback function types','Typy callbacků',ts+'functions.html'],
  ['Readonly history inputs','Readonly vstupy historie',ts+'objects.html#the-readonlyarray-type'],
  ['Inferring a selected type','Odvození vybraného typu',ts+'generics.html#working-with-generic-type-variables'],
  ['Typed transformation pipelines','Typované transformační pipeline',ts+'functions.html#generic-functions'],
 ],
 'ts-evolving-schema': [
  ['Unknown values and narrowing','Unknown hodnoty a zužování',ts+'narrowing.html'],
  ['Object type definitions','Definice objektových typů',ts+'objects.html'],
  ['Optional object properties','Volitelné objektové vlastnosti',ts+'objects.html#optional-properties'],
  ['Index signatures','Indexové podpisy',ts+'objects.html#index-signatures'],
  ['Tuple type contracts','Kontrakty typů tuple',ts+'objects.html#tuple-types'],
 ],
 'react-evolving-board': [
  ['Updating arrays in state','Změny polí ve stavu',react+'learn/updating-arrays-in-state'],
  ['Deriving filtered UI','Odvození filtrovaného UI',react+'learn/you-might-not-need-an-effect'],
  ['Reducer transitions','Přechody reduceru',react+'learn/extracting-state-logic-into-a-reducer'],
  ['Batching state changes','Seskupování změn stavu',react+'learn/queueing-a-series-of-state-updates'],
  ['Stable list identity','Stabilní identita seznamu',react+'learn/rendering-lists#keeping-list-items-in-order-with-key'],
 ],
 'react-evolving-catalog': [
  ['Controlled search fields','Řízené vyhledávací vstupy',react+'reference/react-dom/components/input'],
  ['Deriving sorted and paged results','Odvození seřazených a stránkovaných výsledků',react+'learn/you-might-not-need-an-effect'],
  ['Choosing state structure','Volba struktury stavu',react+'learn/choosing-the-state-structure'],
  ['Avoiding redundant state','Omezení nadbytečného stavu',react+'learn/choosing-the-state-structure#avoid-redundant-state'],
  ['Updating keyed cart state','Změny stavu košíku podle klíčů',react+'learn/updating-objects-in-state'],
 ],
 'react-evolving-form': [
  ['Controlled form inputs','Řízené formulářové vstupy',react+'reference/react-dom/components/input'],
  ['Preserving form state','Zachování stavu formuláře',react+'learn/preserving-and-resetting-state'],
  ['State as a submission snapshot','Stav jako snímek odeslání',react+'learn/state-as-a-snapshot'],
  ['Conditional UI branches','Podmíněné větve UI',react+'learn/conditional-rendering'],
  ['Explicit draft serialization','Explicitní serializace konceptu',mdn+'Reference/Global_Objects/JSON/parse'],
 ],
};

export function stageReferences(id:string,index:number):NonNullable<CodingTask['references']> {
 const [en,cs,url]=links[id][index];
 return [{title:{en,cs},url}];
}
