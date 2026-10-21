import type { CodingTask } from '../../../shared/coding-catalog';

const mdn = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/';
const react = 'https://react.dev/';
const ts = 'https://www.typescriptlang.org/docs/handbook/2/';
type Link = [string,string];
/** Authored reading targets match the requirement introduced in each stage. */
const links:Record<string,Link[]> = {
 'js-evolving-calculator': [
  ['Addition and numeric operators',mdn+'Guide/Expressions_and_operators#arithmetic_operators'],
  ['Operator precedence',mdn+'Guide/Expressions_and_operators#operator_precedence'],
  ['Grouping and expression evaluation',mdn+'Guide/Expressions_and_operators#grouping_operator'],
  ['Own-property lookup',mdn+'Reference/Global_Objects/Object/hasOwn'],
  ['Assignment semantics',mdn+'Guide/Expressions_and_operators#assignment_operators'],
 ],
 'js-evolving-query': [
  ['Array filtering',mdn+'Reference/Global_Objects/Array/filter'],
  ['Stable array sorting',mdn+'Reference/Global_Objects/Array/sort'],
  ['Mapping and projection',mdn+'Reference/Global_Objects/Array/map'],
  ['Keyed aggregation with Map',mdn+'Reference/Global_Objects/Map'],
  ['One-to-many array transforms',mdn+'Reference/Global_Objects/Array/flatMap'],
 ],
 'js-evolving-events': [
  ['Closures and private state',mdn+'Guide/Closures'],
  ['Function identity in Set',mdn+'Reference/Global_Objects/Set'],
  ['Isolating exceptions',mdn+'Reference/Statements/try...catch'],
  ['Appending to a queue',mdn+'Reference/Global_Objects/Array/push'],
  ['Per-event history with Map',mdn+'Reference/Global_Objects/Map'],
 ],
 'js-evolving-graph': [
  ['Recursive functions',mdn+'Guide/Functions#recursion'],
  ['Tracking visited nodes',mdn+'Reference/Global_Objects/Set'],
  ['Selecting a ready layer',mdn+'Reference/Global_Objects/Array/filter'],
  ['Memoizing node results',mdn+'Reference/Global_Objects/Map'],
  ['Affected-node membership',mdn+'Reference/Global_Objects/Set'],
 ],
 'ts-evolving-result': [
  ['Discriminated unions',ts+'narrowing.html#discriminated-unions'],
  ['Generic transformations',ts+'generics.html'],
  ['Typed callback signatures',ts+'functions.html'],
  ['Narrowing success and error branches',ts+'narrowing.html'],
  ['Generic function composition',ts+'generics.html#generic-types'],
 ],
 'ts-evolving-store': [
  ['Generic state types',ts+'generics.html'],
  ['Callback function types',ts+'functions.html'],
  ['Readonly history inputs',ts+'objects.html#the-readonlyarray-type'],
  ['Inferring a selected type',ts+'generics.html#working-with-generic-type-variables'],
  ['Typed transformation pipelines',ts+'functions.html#generic-functions'],
 ],
 'ts-evolving-schema': [
  ['Unknown values and narrowing',ts+'narrowing.html'],
  ['Object type definitions',ts+'objects.html'],
  ['Optional object properties',ts+'objects.html#optional-properties'],
  ['Index signatures',ts+'objects.html#index-signatures'],
  ['Tuple type contracts',ts+'objects.html#tuple-types'],
 ],
 'react-evolving-board': [
  ['Updating arrays in state',react+'learn/updating-arrays-in-state'],
  ['Deriving filtered UI',react+'learn/you-might-not-need-an-effect'],
  ['Reducer transitions',react+'learn/extracting-state-logic-into-a-reducer'],
  ['Batching state changes',react+'learn/queueing-a-series-of-state-updates'],
  ['Stable list identity',react+'learn/rendering-lists#keeping-list-items-in-order-with-key'],
 ],
 'react-evolving-catalog': [
  ['Controlled search fields',react+'reference/react-dom/components/input'],
  ['Deriving sorted and paged results',react+'learn/you-might-not-need-an-effect'],
  ['Choosing state structure',react+'learn/choosing-the-state-structure'],
  ['Avoiding redundant state',react+'learn/choosing-the-state-structure#avoid-redundant-state'],
  ['Updating keyed cart state',react+'learn/updating-objects-in-state'],
 ],
 'react-evolving-form': [
  ['Controlled form inputs',react+'reference/react-dom/components/input'],
  ['Preserving form state',react+'learn/preserving-and-resetting-state'],
  ['State as a submission snapshot',react+'learn/state-as-a-snapshot'],
  ['Conditional UI branches',react+'learn/conditional-rendering'],
  ['Explicit draft serialization',mdn+'Reference/Global_Objects/JSON/parse'],
 ],
};

export function stageReferences(id:string,index:number):NonNullable<CodingTask['references']> {
 const [title,url]=links[id][index];
 return [{title,url}];
}
