import assert from 'node:assert/strict';
import { FETCH_STUB_SOURCE } from '../shared/coding-react-support';

export async function codingFetchContracts(): Promise<void> {
  // Evaluate the actual shared source with a private global, without replacing
  // this process's fetch or making any network requests.
  const realm: { fetch?: (url: string) => Promise<{ json(): Promise<unknown> }> } = {};
  new Function('globalThis', 'URLSearchParams', FETCH_STUB_SOURCE)(realm, URLSearchParams);
  const body = async (url: string) => (await realm.fetch!(url)).json();
  const ids = async (url: string) => (await body(url) as { id: number }[]).map(item => item.id);
  assert.deepEqual(await ids('/api/posts?_page=1&_limit=5'), [1, 2, 3, 4, 5]);
  assert.deepEqual(await ids('/api/posts?_page=2&_limit=5'), [6, 7]);
  assert.deepEqual(await ids('/api/posts?_page=3&_limit=5'), []);
  assert.deepEqual(await ids('/api/posts?_page=2&_limit=2'), [3, 4]);
  assert.deepEqual(await ids('/api/posts?userId=2&_page=2&_limit=2'), [6, 7], 'filter before paging');
  assert.deepEqual(await ids('/api/comments?postId=1&_page=2&_limit=1'), [2]);
  assert.deepEqual(await ids('/api/posts?_limit=2'), [1, 2]);
  assert.deepEqual(await ids('/api/posts?_page=2'), [1, 2, 3, 4, 5, 6, 7], 'no page size keeps unpaged behavior');
  assert.deepEqual(await ids('/api/posts?_page=0&_limit=2'), [1, 2]);
  assert.deepEqual(await ids('/api/posts?_page=bad&_limit=2'), [1, 2]);
  assert.deepEqual(await ids('/api/posts?_page=2&_limit=0'), []);
  assert.deepEqual(await ids('/api/photos?page=2'), [4, 5, 6]);
  assert.deepEqual(await ids('/api/photos?page=3'), [7]);
  assert.deepEqual(await ids('/api/photos?page=4'), []);
  const nested = await body('https://dummyjson.com/products?_limit=2');
  assert.deepEqual(nested, { products: [
    { id: 1, title: 'Laptop', price: 900, category: 'tech' },
    { id: 2, title: 'Mug', price: 10, category: 'kitchen' },
  ], total: 2 }, 'preserve existing nested fixture shape');
  console.log('React fetch fixtures: page boundaries, filter order, unpaged/photos behavior and nested shape pass offline.');
}
