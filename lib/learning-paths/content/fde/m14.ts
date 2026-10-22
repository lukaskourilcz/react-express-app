/** M14 — Codify the pattern. Two readings, four scenario questions and one
 * self-reviewed feedback note. Customer A/B and all deployment observations
 * are fictional fixtures. No vendor account, external service or model runs. */
import type { ModuleSource } from '../../types';

const sources = [
  { label: 'Google SRE Workbook: engagement and shared ownership', url: 'https://sre.google/workbook/engagement-model/', reviewedOn: '2026-10-22' },
  { label: 'Google SRE Book: documented learning and follow-up actions', url: 'https://sre.google/sre-book/postmortem-culture/', reviewedOn: '2026-10-22' },
];

export const FDE_M14: ModuleSource = {
  id: 'fde-v1-m14', title: 'Codify the pattern',
  outcomes: [
    'Separate a reusable contract from the customer-specific adapter and its assumptions.',
    'Turn deployment observations into a bounded proposal Product and Engineering can evaluate.',
  ],
  competencies: ['handoff', 'operations', 'discovery'],
  dependsOn: ['fde-v1-m13'],
  estimatedMinutes: 72,
  lessons: [
    {
      id: 'fde-v1-m14-l1', title: 'Extract a contract, not a customer fork',
      summary: 'Find the invariant, name the extension points and keep security requirements outside customer overrides.',
      estimatedMinutes: 12, sources,
      sections: [
        { kind: 'prose', body: 'A deployment teaches you something about one environment. A reusable component needs a contract that survives another environment. Write down what must remain true, which inputs may vary, and which assumptions your evidence has not tested. A successful customer demo is evidence for that deployment; it does not establish a universal product default.' },
        { kind: 'callout', tone: 'note', body: 'Fixture: Customer A and Customer B are invented. Both import support records. A maps account_id to customerId and accepts UTC timestamps; B maps organization_ref to customerId and supplies an explicit offset. These are authored observations, not customer data or market research.' },
        { kind: 'prose', body: 'Authored extraction trial: both local adapters work on their own fixtures. A proposed shared parser copied from A accepts only timestamps ending in Z. It rejects B’s synthetic value 2026-10-21T09:00:00+02:00 as timestamp_format. The expected canonical instant is 2026-10-21T07:00:00Z. Preserve the explicit offset when reproducing that rejection; it is the property the proposed shared parser mishandles. This fixture supplies no measured production impact or customer savings.' },
        { kind: 'table', caption: 'Separate the reusable boundary from the adapter', headers: ['Keep invariant', 'Make explicit configuration', 'Check before reuse'], rows: [
          ['A record stays in its authenticated tenant.', 'The source field mapped to the canonical customer id.', 'A record from another tenant is rejected, even if its source id matches.'],
          ['Replaying an accepted source event has no second effect.', 'The documented source event-id field.', 'Two tenants may use the same event id without sharing state.'],
          ['Invalid records are reported instead of silently becoming valid.', 'The allowed source timestamp representation.', 'Malformed and ambiguous timestamps follow the stated rejection policy.'],
        ] },
        { kind: 'prose', body: 'Keep the reusable core small enough to explain and test. Put source-field mapping in an adapter with validated inputs. A customer flag that disables tenant checks is not an adapter: it weakens the shared contract. Preserve a source-shaped fixture and a canonical expected result, then add a counterexample the first deployment did not cover.' },
        { kind: 'prose', body: 'A useful extraction includes ownership and a way to change it. Name who maintains the core, how adapters declare compatibility, and how an incompatible record is surfaced. A shared package without an owner can move repeated work into a new maintenance queue rather than remove it.' },
      ],
    },
    {
      id: 'fde-v1-m14-l2', title: 'Write feedback that can change a product',
      summary: 'Connect an observed problem to evidence, alternatives, a proposed experiment and an accountable follow-up.',
      estimatedMinutes: 15, sources,
      sections: [
        { kind: 'prose', body: 'Send a decision someone can evaluate, not a request to reproduce your whole customer project. State the user problem first. Separate observations from interpretation: two deployments needing timestamp normalization is an observation; every future customer needing the same mapping is an untested conclusion.' },
        { kind: 'table', caption: 'A compact feedback note', headers: ['Part', 'What the reviewer needs'], rows: [
          ['Problem and scope', 'Which workflow failed, who was affected and which environments were actually observed.'],
          ['Evidence and limits', 'A sanitized fixture, the expected and observed behavior, impact measured on those cases, and a known counterexample.'],
          ['Proposal and alternatives', 'The smallest reusable boundary, what remains an adapter, and a credible option to defer or keep the work bespoke.'],
          ['Next decision', 'An owner, a bounded validation step, its success signal and the conditions that stop or reverse rollout. State what reversal cannot undo and how remaining records are reconciled.'],
        ] },
        { kind: 'prose', body: 'For the import fixture, propose a narrow normalization interface with two adapters and a rejected-record report. Compare it with leaving the adapters local. Measure repeated mapping effort and rejected-record handling on the stated fixtures; do not invent savings for customers you have not observed. A review can accept an experiment without committing a product roadmap or a delivery date.' },
        { kind: 'prose', body: 'Use the smallest authorized evidence that reproduces the problem. Replace customer records, identifiers and credentials with synthetic equivalents, while preserving the property being investigated. If the original issue depends on a particular timezone offset, keep that offset in the fixture; removing the failing property would make the example harmless but useless.' },
        { kind: 'prose', body: 'Close the loop after a decision. Record the owner, what was accepted, what stayed bespoke and what would justify revisiting it. Share the result with the customer-facing team using the same limits. The learning value comes from a traceable decision and follow-up, not from presenting every deployment workaround as a new platform feature.' },
        { kind: 'callout', tone: 'note', body: 'The sources describe collaboration, ownership and learning from documented incidents. This module applies those ideas to an original product-feedback exercise. Its rubric is devShark practice guidance, not an employer interview key.' },
      ],
    },
  ],
  activities: [
    { id: 'fde-v1-m14-l1-read', kind: 'lesson', purpose: 'exercise', verification: 'self_reviewed', title: 'Read: invariant and adapter', summary: 'Read the contract/adapter distinction before choosing a reusable boundary.', competencies: ['handoff', 'operations'], estimatedMinutes: 12, lessonId: 'fde-v1-m14-l1' },
    { id: 'fde-v1-m14-l2-read', kind: 'lesson', purpose: 'exercise', verification: 'self_reviewed', title: 'Read: evidence into feedback', summary: 'Read how to make the next product decision concrete and bounded.', competencies: ['handoff', 'discovery'], estimatedMinutes: 15, lessonId: 'fde-v1-m14-l2' },
    {
      id: 'fde-v1-m14-check', kind: 'check', purpose: 'exercise', verification: 'machine_verified', title: 'Choose what generalizes',
      summary: 'Four questions on the fictional import case. At an 80% threshold, all four must pass; retry is available.',
      competencies: ['handoff', 'operations', 'discovery'], estimatedMinutes: 10, passThreshold: 0.8,
      scenario: 'Fictional case: Two customer deployments import support records with different field names and timestamp formats. Each currently has a local adapter. Both must preserve tenant isolation and replay safety. The team has observed these two deployments only; a third source has not been evaluated. Product asks which shared capability is justified and what evidence it needs before investing.',
      questions: [
        {
          id: 'fde-v1-m14-q1', prompt: 'Which proposed boundary follows the reading’s contract/adapter distinction?',
          options: [
            'Keep tenant isolation and replay safety in the core; validate source-field mappings in adapters.',
            'Share each customer’s entire adapter as a template; let downstream teams revise its safety behavior.',
            'Move all differences into flags, including an option to skip tenant validation for trusted imports.',
            'Unify field names by rewriting source records before preserving their original identity and provenance.',
          ], correct: 0,
          explanation: 'The shared boundary keeps the safety invariants and permits explicit source mapping. A whole adapter template leaves safety behavior open to uncontrolled forks. Disabling tenant validation weakens the invariant. Rewriting before preserving identity and provenance can destroy the evidence needed for replay handling and investigation.',
          competencies: ['operations', 'handoff'],
        },
        {
          id: 'fde-v1-m14-q2', prompt: 'What is the strongest conclusion supported by the two observed deployments?',
          options: [
            'They justify testing a shared normalization boundary against those cases and a new counterexample.',
            'They establish that the same normalization policy should be the default for every future customer.',
            'They establish that source-specific adapters are unnecessary once a canonical record type exists.',
            'They justify an immediate platform rollout because two independent implementations already worked.',
          ], correct: 0,
          explanation: 'Two cases can motivate a bounded test; they do not establish a universal default. A canonical type does not eliminate source-specific semantics, so adapters may still be needed. Working local implementations also leave compatibility, ownership and rollout risks unresolved. A counterexample tests whether the proposed shared contract survives a different source.',
          competencies: ['discovery', 'handoff'],
        },
        {
          id: 'fde-v1-m14-q3', prompt: 'Which evidence package best lets Engineering reproduce the issue without depending on customer access?',
          options: [
            'A sanitized fixture preserving the failing timestamp property, expected output and observed rejection.',
            'A successful sample with timezone offsets removed, plus a note that the real records are confidential.',
            'A production database export restricted to engineers who already hold access to the shared repository.',
            'A screenshot of the dashboard and an estimated impact count, leaving the data transformation implicit.',
          ], correct: 0,
          explanation: 'The synthetic fixture keeps the failing property and gives a concrete comparison. Removing the offset removes the very condition under investigation. Repository access alone does not authorize copying a production export. A screenshot and impact estimate may add context but do not specify the transformation that Engineering must reproduce.',
          competencies: ['handoff', 'operations'],
        },
        {
          id: 'fde-v1-m14-q4', prompt: 'The third source needs a conflicting interpretation of an ambiguous date. What should the proposal do next?',
          options: [
            'Name the conflict, compare a source-specific extension with deferral, and assign a bounded validation step.',
            'Choose the interpretation used by the first customer so the shared interface keeps one global default.',
            'Accept both interpretations silently and let downstream reports identify any inconsistent records.',
            'Promise a delivery date for a universal parser, then settle the interpretation during implementation.',
          ], correct: 0,
          explanation: 'The conflict needs an explicit decision and testable next step. Choosing the first customer’s interpretation without checking the third repeats an unsupported generalization. Silent ambiguity moves the error into downstream work. Promising a universal parser before establishing the contract commits to a solution and date that the evidence does not support.',
          competencies: ['discovery', 'handoff'],
        },
      ],
    },
    {
      id: 'fde-v1-m14-pattern-note', kind: 'artifact', purpose: 'exercise', verification: 'self_reviewed', title: 'Write the pattern and product-feedback note',
      summary: 'Propose one reusable boundary, keep customer-specific work explicit and define the next decision.',
      competencies: ['handoff', 'operations', 'discovery'], estimatedMinutes: 35,
      artifact: {
        brief: 'Use the fictional import case from the readings. Write a note that another engineer and a product reviewer could evaluate. Include a counterexample and an option to defer. This is self-reviewed: automated checks confirm required fields and length limits, not the quality of your design or the truth of an impact estimate. Compare your work against the displayed rubric.',
        fields: [
          { id: 'problem', label: 'Observed problem and evidence', help: 'Name the workflow, the two observed environments and a sanitized reproduction of the extraction trial. Keep observations separate from estimates. Presence and length checks cannot verify this evidence.', kind: 'long-text', required: true, maxLength: 1400 },
          { id: 'invariant', label: 'Reusable contract', help: 'State the invariants every adapter must preserve and how violations are reported. Check their correctness yourself; the form checks required text and length.', kind: 'long-text', required: true, maxLength: 1200 },
          { id: 'bespoke', label: 'What stays source-specific', help: 'Name the mapping or policy differences and their validated extension points. The form checks presence and length, not adapter compatibility.', kind: 'long-text', required: true, maxLength: 1000 },
          { id: 'counterexample', label: 'Counterexample and limits', help: 'Describe a source that challenges the boundary and what remains unknown. Label any new example as hypothetical. Presence and length checks cannot validate your boundary.', kind: 'long-text', required: true, maxLength: 1000 },
          { id: 'proposal', label: 'Proposal and alternative', help: 'Compare a bounded shared capability with keeping the adapters local or deferring the work. The form checks presence and length; you assess the tradeoff.', kind: 'long-text', required: true, maxLength: 1200 },
          { id: 'decision', label: 'Owner, validation and stop condition', help: 'Name an accountable role, the next validation step, a measurable success signal and a stop or reversal condition. State what reversal cannot undo and how remaining records are reconciled. The form checks required text and length, not the recovery plan.', kind: 'long-text', required: true, maxLength: 1200 },
        ], rubricDimensions: ['technical-correctness', 'operability', 'communication'],
      },
    },
  ],
  requires: [
    { activityId: 'fde-v1-m14-check', state: 'verified_pass' },
    { activityId: 'fde-v1-m14-pattern-note', state: 'self_reviewed' },
  ],
};
