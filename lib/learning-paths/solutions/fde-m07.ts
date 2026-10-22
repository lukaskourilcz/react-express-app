/** Server-only reference solution and hidden assertions for FDE M05.
 * Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions cover what the visible set leaves open: a shelf state
 * the learner has never seen, a chunk with no readable text, two results on
 * the same score, a permitted set deeper than the window, an empty result
 * array, a blank query, the support threshold at its exact boundary, and the
 * crowded fixture read by the tenant who owns its top two rows — which shows
 * that the filter tracks the viewer rather than a hard-coded id.
 *
 * The three security assertions carry the `access-filter` criterion, which is
 * critical, so a cross-tenant or forbidden citation cannot be averaged away by
 * a correct answer everywhere else. */

import type { PathCodeSolution } from '../types';

export const FDE_M07_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m05-grounded-answer': {
    solution: [
      "const TOP_K = 3;",
      "const SUPPORT = 0.6;",
      "const CLEARANCE = 'kb-restricted';",
      '',
      'const answerFromResults = (query, results, viewer) => {',
      "  if (typeof query !== 'string' || query.trim() === '') return { answered: false, reason: 'no-query' };",
      '',
      "  if (!viewer || typeof viewer !== 'object' || Array.isArray(viewer) ||",
      "      typeof viewer.tenantId !== 'string' || viewer.tenantId.trim() === '') {",
      "    return { answered: false, reason: 'no-permitted-results' };",
      "  }",
      "  const list = Array.isArray(results) ? results : [];",
      "  const account = viewer && typeof viewer === 'object' ? viewer : {};",
      '  const clearances = Array.isArray(account.clearances) ? account.clearances : [];',
      '',
      '  const permitted = list.filter(result => {',
      "    if (!result || typeof result !== 'object') return false;",
      "    if (typeof result.id !== 'string' || result.id.trim() === '') return false;",
      "    if (typeof result.text !== 'string' || result.text.trim() === '') return false;",
      '    if (!Number.isFinite(result.score)) return false;',
      '    if (result.tenantId !== account.tenantId) return false;',
      "    if (result.visibility === 'published') return true;",
      "    if (result.visibility === 'restricted') return clearances.indexOf(CLEARANCE) !== -1;",
      '    return false;',
      '  });',
      '',
      "  if (permitted.length === 0) return { answered: false, reason: 'no-permitted-results' };",
      '',
      '  const ranked = permitted',
      '    .slice()',
      '    .sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))',
      '    .filter(result => result.score >= SUPPORT)',
      '    .slice(0, TOP_K);',
      '',
      "  if (ranked.length === 0) return { answered: false, reason: 'below-support-threshold' };",
      '',
      '  return {',
      '    answered: true,',
      '    citations: ranked.map(result => ({ sourceId: result.id, updatedAt: result.updatedAt })),',
      '    usedIds: ranked.map(result => result.id),',
      '  };',
      '};',
    ].join('\n'),
    hiddenTests: [
      {"call": "[undefined,null,{},[],{tenantId:''},{tenantId:'   '},{tenantId:null},{tenantId:42}].map(function(viewer){return answerFromResults('q',[{id:'X',visibility:'published',text:'x',score:1,updatedAt:'now'}],viewer);})", "expected": [{"answered": false, "reason": "no-permitted-results"}, {"answered": false, "reason": "no-permitted-results"}, {"answered": false, "reason": "no-permitted-results"}, {"answered": false, "reason": "no-permitted-results"}, {"answered": false, "reason": "no-permitted-results"}, {"answered": false, "reason": "no-permitted-results"}, {"answered": false, "reason": "no-permitted-results"}, {"answered": false, "reason": "no-permitted-results"}], "criterion": "access-filter"},
      {"call": "(function(){var rows=Object.freeze([Object.freeze({id:'B',tenantId:'TEN-4021',visibility:'published',text:'x',score:0.7,updatedAt:'v1'}),Object.freeze({id:'A',tenantId:'TEN-4021',visibility:'published',text:'x',score:0.9,updatedAt:'v2'})]);var viewer=Object.freeze({tenantId:'TEN-4021',clearances:Object.freeze([])});var out=answerFromResults('q',rows,viewer);return {out:out,unchanged:rows[0].id==='B'&&rows[1].id==='A'};})()", "expected": {"out": {"answered": true, "citations": [{"sourceId": "A", "updatedAt": "v2"}, {"sourceId": "B", "updatedAt": "v1"}], "usedIds": ["A", "B"]}, "unchanged": true}},
      {"call": "answerFromResults('q',[null,42,'bad',{id:'X',tenantId:'TEN-4021',visibility:'published',text:'x',score:Infinity,updatedAt:'x'},{id:'Y',tenantId:'TEN-4021',visibility:'published',text:'x',score:NaN,updatedAt:'x'}],{tenantId:'TEN-4021',clearances:'kb-restricted'})", "expected": {"answered": false, "reason": "no-permitted-results"}},
      {"call": "answerFromResults('q',[{id:'R',tenantId:'TEN-4021',visibility:'restricted',text:'x',score:1,updatedAt:'v'}],{tenantId:'TEN-4021',clearances:'kb-restricted'})", "expected": {"answered": false, "reason": "no-permitted-results"}, "criterion": "access-filter"},
      {"call": "(function(){var rows=[];for(var i=0;i<1000;i++)rows.push({id:'R'+('0000'+i).slice(-4),tenantId:'T',visibility:'published',text:'x',score:0.8,updatedAt:'v'});return answerFromResults('q',rows.reverse(),{tenantId:'T',clearances:[]});})()", "expected": {"answered": true, "citations": [{"sourceId": "R0000", "updatedAt": "v"}, {"sourceId": "R0001", "updatedAt": "v"}, {"sourceId": "R0002", "updatedAt": "v"}], "usedIds": ["R0000", "R0001", "R0002"]}},
      {"call": "answerFromResults('q',[{id:' A ',tenantId:'T',visibility:'published',text:'x',score:0.6,updatedAt:'v'}],{tenantId:'T',clearances:[]})", "expected": {"answered": true, "citations": [{"sourceId": " A ", "updatedAt": "v"}], "usedIds": [" A "]}},

      {
        call: "answerFromResults('return window for chilled goods', __set('unknownState'), __viewer('support'))",
        expected: {
          answered: true,
          citations: [{ sourceId: 'KB-118', updatedAt: '2026-03-18' }],
          usedIds: ['KB-118'],
        },
        criterion: 'access-filter',
      },
      {
        call: "answerFromResults('return window for chilled goods', __set('crowdedWindow'), __viewer('kestrel'))",
        expected: {
          answered: true,
          citations: [
            { sourceId: 'KB-901', updatedAt: '2026-04-01' },
            { sourceId: 'KB-902', updatedAt: '2026-03-29' },
          ],
          usedIds: ['KB-901', 'KB-902'],
        },
        criterion: 'access-filter',
      },
      {
        call: "answerFromResults('return window for chilled goods', __set('blankText'), __viewer('support'))",
        expected: {
          answered: true,
          citations: [{ sourceId: 'KB-118', updatedAt: '2026-03-18' }],
          usedIds: ['KB-118'],
        },
      },
      {
        call: "answerFromResults('what happens to damaged chilled goods', __set('tied'), __viewer('support'))",
        expected: {
          answered: true,
          citations: [
            { sourceId: 'KB-118', updatedAt: '2026-03-18' },
            { sourceId: 'KB-402', updatedAt: '2026-01-14' },
          ],
          usedIds: ['KB-118', 'KB-402'],
        },
      },
      {
        call: "answerFromResults('how do chilled returns work', __set('deep'), __viewer('support'))",
        expected: {
          answered: true,
          citations: [
            { sourceId: 'KB-118', updatedAt: '2026-03-18' },
            { sourceId: 'KB-204', updatedAt: '2026-02-02' },
            { sourceId: 'KB-311', updatedAt: '2026-04-01' },
          ],
          usedIds: ['KB-118', 'KB-204', 'KB-311'],
        },
      },
      {
        call: "answerFromResults('who collects a chilled return', __set('boundary'), __viewer('support'))",
        expected: {
          answered: true,
          citations: [{ sourceId: 'KB-204', updatedAt: '2026-02-02' }],
          usedIds: ['KB-204'],
        },
      },
      {
        call: "answerFromResults('anything at all', __set('empty'), __viewer('support'))",
        expected: { answered: false, reason: 'no-permitted-results' },
        criterion: 'abstains',
      },
      {
        call: "answerFromResults('   ', __set('plain'), __viewer('support'))",
        expected: { answered: false, reason: 'no-query' },
      },
    ],
  },
};
