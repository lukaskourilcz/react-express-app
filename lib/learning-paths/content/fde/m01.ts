/** M01 — Customer discovery.
 *
 * The first module of the FDE path, and the one every later module quotes
 * back: who does the work today, what it costs them, and what this project
 * has agreed not to do. Two lessons, one four-question check, one written
 * scope brief.
 *
 * Nothing here is machine-gradable beyond the check. The scope brief is an
 * artifact: the server confirms every required field is present and inside
 * its length cap, records the submission as self-reviewed, and says plainly
 * that a character count cannot judge a baseline.
 *
 * Marlbrook Systems, its ticket volumes, its shadowing clock and its
 * transcript are fixtures written for this module. No customer data, no live
 * system, no vendor account. */

import type { ModuleSource } from '../../types';

export const FDE_M01: ModuleSource = {
  id: 'fde-v1-m01',
  title: 'Customer discovery',
  outcomes: [
    'Find the operator whose hands are on the work, watch one real item end to end, and name everyone who can refuse the project.',
    'Separate the mechanism a customer asked for from the job they are trying to do, and say which requirements are solutions in disguise.',
    'Write a baseline as a number with a population, a window and a method someone else can repeat, and a success condition with a date beside it.',
    'Write the exclusions down as non-goals, because an exclusion nobody wrote down is not one.',
  ],
  competencies: ['discovery'],
  dependsOn: [],
  estimatedMinutes: 125,
  lessons: [
    {
      id: 'fde-v1-m01-l1',
      title: 'The workflow and who is in it',
      summary:
        'Find the operator, watch the work as it happens today, separate the stated request from the job to be done, and name the people who can veto the result.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'NIST AI Risk Management Framework',
          url: 'https://www.nist.gov/itl/ai-risk-management-framework',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'OWASP Top 10 for Large Language Model Applications',
          url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'The request usually arrives as a solution. “Add AI to support” names a technology and a department, and it tells you nothing about what anyone is currently unable to do. Your first week is spent turning that sentence back into the problem it came from.',
        },
        {
          kind: 'prose',
          body:
            'Start by finding the operator: the person whose hands are on the work every day. They are rarely the person who wrote you the email. The sponsor pays for the project and can cancel it; the operator decides whether the result gets used, by using it or quietly not using it. NIST’s AI Risk Management Framework puts this under its Map function — establish the context and the people affected before you build, not after.',
        },
        {
          kind: 'table',
          caption: 'Four positions around one project, and what it costs you to leave each one out of discovery.',
          headers: ['Role', 'What they control', 'What their absence costs you'],
          rows: [
            ['Sponsor', 'The budget, and whether the project continues at all', 'You build something nobody has agreed to pay to run'],
            ['Operator', 'Whether the result is used, every day, in practice', 'You speed up a step that was never the expensive one'],
            ['Gatekeeper', 'Permission for the system to touch data, money or customers', 'A refusal arrives after the build, when changing course is most expensive'],
            ['Recipient', 'Nothing. They receive the output and live with it', 'A change that helps the desk and makes the customer’s day worse'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Then watch the work. An interview gives you the job someone wishes they had; shadowing gives you the job they have. Ask to sit with one agent while they handle three real items, keep a clock running, and write down every system they open. Ask nothing until they finish.',
        },
        {
          kind: 'trace',
          caption: 'One ticket at Marlbrook Systems, start to finish, with the clock running. Step through it before reading what it showed.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                note: 'The ticket arrives at 09:12. It is the seven steps below, in order, and nothing has been touched yet.',
                counter: { label: 'Minutes elapsed', value: 0 },
              },
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The agent reads the ticket. It says the export is broken. There is no account number, no error text and no timestamp.',
                counter: { label: 'Minutes elapsed', value: 1 },
              },
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'active' },
                ],
                note: 'The agent searches the CRM by the sender’s email domain. Three accounts share it. She picks the one with an open contract and hopes.',
                counter: { label: 'Minutes elapsed', value: 6 },
              },
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'active' },
                ],
                note: 'Entitlement lives in a second system with its own login. She opens it and confirms the account’s plan includes scheduled exports.',
                counter: { label: 'Minutes elapsed', value: 11 },
              },
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'active' },
                ],
                note: 'She reproduces the export on a staging tenant and sees the same failure, which tells her the customer is not doing anything wrong.',
                counter: { label: 'Minutes elapsed', value: 15 },
              },
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'active' },
                ],
                note: 'A knowledge-base search for “scheduled export” returns the answer as the second hit. She has seen this article before.',
                counter: { label: 'Minutes elapsed', value: 16 },
              },
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'active' },
                ],
                note: 'She drafts the reply from the article. One paragraph, most of it pasted, two sentences of her own.',
                counter: { label: 'Minutes elapsed', value: 18 },
              },
              {
                cells: ['Read ticket', 'Find account', 'Check plan', 'Reproduce', 'Search KB', 'Draft reply', 'Send'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'settled' },
                  { index: 6, role: 'active' },
                ],
                note: 'The reply goes out at 09:31. Nineteen minutes, of which ten went to working out which customer this was and what they had paid for.',
                counter: { label: 'Minutes elapsed', value: 19 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'The sponsor’s theory was that agents retype the same answers. Drafting took two minutes. Ten of the nineteen went to identity: which account, and what does their plan include. The knowledge-base search that the sponsor wanted replaced took one minute and worked.\n\nThat changes what you propose. A link between the CRM and the entitlement system removes most of the cost here, needs no model, and can be tested against the same clock. Deterministic code is a legitimate answer to a question that arrived with the word AI in it, and this one is the cheapest thing on the table.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'The clock above is a fixture written for this module, not a recording of a real support desk. Real shadowing gives you three tickets that disagree with each other and one agent who is faster than everyone else. Write down the messy version, including how many items you actually watched, because the number of observations is part of the claim.',
        },
        {
          kind: 'prose',
          body:
            'The second thing discovery separates is the mechanism from the job. A stated request names a thing to build. The job is what the person is trying to accomplish, under conditions they may not have mentioned. You get from one to the other by asking what they would be able to do afterwards that they cannot do now, and refusing to accept a restatement of the mechanism as the answer.',
        },
        {
          kind: 'code',
          language: 'text',
          code: `Sponsor: "We want the AI to write the answers. The agents keep typing
          the same things over and over."

You:     "Take me through the last one you saw."

Sponsor: "A customer asked why their export stopped. We had answered that
          two weeks earlier for somebody else."

You:     "Who found the earlier answer?"

Agent:   "I did. That part is quick, it is in the knowledge base. What
          takes the time is working out which account is asking and
          whether their plan even includes scheduled exports."`,
          caption: 'A fixture transcript. The sponsor describes a mechanism; the agent, asked one level down, describes the job.',
        },
        {
          kind: 'prose',
          body:
            'Some of what arrives labelled “requirement” is a solution somebody already picked. The test is whether you can state why it is needed without naming the thing that does it. “The assistant must summarise the thread” fails that test: summarising is the mechanism. Ask what the summary would let the agent do, and you get “see the account history without opening three tabs”, which a summariser answers and a link on the ticket also answers, for less.',
        },
        {
          kind: 'table',
          caption: 'Three stated requirements from the Marlbrook discovery week, the question that opened each one, and what came back.',
          headers: ['What they asked for', 'The question that unpacks it', 'What turned out to be needed'],
          rows: [
            [
              '“Summarise the ticket thread”',
              '“What would you be able to do that you cannot do now?”',
              'See the account history without opening three tabs',
            ],
            [
              '“It should learn from our past replies”',
              '“Which past reply would you have wanted last Tuesday?”',
              'Search the knowledge base by symptom instead of by product name',
            ],
            [
              '“Make it fast”',
              '“Fast enough for what, and measured from when to when?”',
              'A suggestion on screen before the agent has finished reading the ticket',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'The last discovery job is finding the people who can say no. At Marlbrook that list is the support lead, whose team has to adopt the thing; the security reviewer, who has to approve a system reading customer ticket content; the data owner for the CRM; and the finance controller, if anything the assistant proposes ever moves money. None of them attended the kickoff. Ask one question in week one: who has to say yes before this touches a customer, and write the names down.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'An unnamed veto holder is the most expensive thing discovery can miss, because the refusal arrives after the build. The security reviewer will ask what happens when a knowledge-base article or a customer message contains an instruction aimed at the assistant. Read the OWASP list for LLM applications before that meeting so you arrive with the answer rather than a promise to look into it.',
        },
        {
          kind: 'prose',
          body:
            'What leaves the discovery week is three things: the workflow as you watched it, the list of people in it with what each one controls, and the questions you could not answer. The third list is not a failure. Written down, it is the agenda for the next conversation; left out, it becomes an assumption nobody remembers making.',
        },
      ],
    },
    {
      id: 'fde-v1-m01-l2',
      title: 'Baseline and scope',
      summary:
        'Measure what the work costs today before proposing anything, write the success condition as a number with a date, and write the non-goals down.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'Google SRE Book — Service Level Objectives',
          url: 'https://sre.google/sre-book/service-level-objectives/',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'NIST AI Risk Management Framework',
          url: 'https://www.nist.gov/itl/ai-risk-management-framework',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'You cannot claim an improvement without a number from before. Everyone knows this and almost nobody does it, because taking the measurement is unglamorous work that happens in the week when the customer wants to see a prototype. Take it anyway. It is the only thing that will let you argue about the result later without both sides guessing.',
        },
        {
          kind: 'prose',
          body:
            'A usable baseline carries four parts: a quantity, the population it covers, the window it was taken over, and a method someone else can repeat. Drop the population and you cannot tell whether the number moved or the mix of tickets changed. Drop the method and the person who re-measures after launch will measure something else and report a win.\n\nThe SRE book’s chapter on service level objectives makes the same split for running systems: the indicator is what you measure, the objective is the value you are aiming at, and they are two different sentences. A discovery baseline is the indicator, taken once, before anyone has touched anything.',
        },
        {
          kind: 'table',
          caption: 'Four things people offer as baselines. Only one of them is one.',
          headers: ['Proposed baseline', 'Can someone else reproduce it?', 'What to write instead'],
          rows: [
            [
              'Support is slow',
              'No. No quantity, no population, no window.',
              'Median minutes from ticket creation to first agent reply, tier-1 export tickets, August, from the ticket export',
            ],
            [
              'Agents spend most of their day on repeat questions',
              'No. “Most” is a feeling, and nobody has agreed what counts as a repeat.',
              'Share of August tickets whose resolution cites a knowledge-base article, counted from the same export',
            ],
            [
              'We handle about 400 tickets a month',
              'Yes, and it says nothing about the pain you were asked to fix.',
              'Keep it as context, and measure the cost of the specific step you intend to move',
            ],
            [
              'Handle time will drop by 40 percent',
              'That is the target. There is nothing yet for it to be 40 percent of.',
              'Write the starting number first, then put the target beside it with a date',
            ],
          ],
        },
        {
          kind: 'code',
          language: 'json',
          code: `{
  "metric": "minutes_from_ticket_created_to_first_agent_reply",
  "population": "tier-1 tickets tagged 'export', auto-closed duplicates removed",
  "window": "2026-08-01 to 2026-08-31",
  "observations": 412,
  "median": 19,
  "p90": 47,
  "method": "ticket system CSV export, created_at to first_public_comment_at",
  "repeatable_by": "support lead, same export, same filter, any month",
  "taken_on": "2026-09-04"
}`,
          caption: 'The Marlbrook baseline written as a record. The numbers are fixtures; the shape is what a real one needs.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Write the method down at the moment you take the measurement, not afterwards. The person who repeats it in four months will be someone else, possibly the support lead you handed the project to, and “the same way we did it before” is not a method. NIST’s Measure function asks the same of AI systems: the measurement has to be documented well enough that a different person gets the same answer.',
        },
        {
          kind: 'prose',
          body:
            'The success condition is the baseline’s partner: a number, measured the same way, with a date. “Faster triage” is a mood. “Median time to first reply on tier-1 export tickets falls from 19 minutes to 12, measured from the same export, by 31 March” is a sentence you can be wrong about, which is what makes it worth writing. Agree it with the sponsor and the operator together, because they will otherwise be measuring different things.',
        },
        {
          kind: 'prose',
          body:
            'Say which slice the number covers, and what you will report next to it. One median can improve while a whole ticket type gets worse, and an average across all tickets will hide that for as long as the volumes hold. Quality also has to be reported separately from cost and from how long the thing takes: a change that halves handle time and doubles the number of replies an agent has to correct has not succeeded, and a single blended figure will not tell you which happened.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The scope brief at the end of this module is recorded as self-reviewed. The server checks that every required field is filled in and inside its length cap, and that is all a character count can establish. It cannot tell whether your baseline can be re-measured, whether your five questions would change anything, or whether your non-goals are the ones that needed writing down. Those you judge yourself, against the rubric.',
        },
        {
          kind: 'prose',
          body:
            'Non-goals are the cheapest thing in a scope document and the one people skip. An exclusion nobody wrote down is not an exclusion: it is a thing the customer still expects, and you will find out in week six when they ask where it is. Writing it down costs a line and buys you a sentence to point at.',
        },
        {
          kind: 'trace',
          caption: 'Six candidates from the Marlbrook discovery week, sorted into scope and non-goals one at a time.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['Suggest reply', 'Resolve account', 'Auto-send', 'Rewrite KB', 'Route to tier', 'Refunds'],
                note: 'Six things came out of the discovery week. None is decided, and all six are in the sponsor’s head as “the project”.',
                counter: { label: 'Still undecided', value: 6 },
              },
              {
                cells: ['Suggest reply', 'Resolve account', 'Auto-send', 'Rewrite KB', 'Route to tier', 'Refunds'],
                marks: [{ index: 1, role: 'settled' }],
                note: 'Resolving the account from the sender address goes in scope. The shadowing clock says it costs ten minutes a ticket, and a lookup across the CRM and the entitlement system does it without a model.',
                counter: { label: 'Still undecided', value: 5 },
              },
              {
                cells: ['Suggest reply', 'Resolve account', 'Auto-send', 'Rewrite KB', 'Route to tier', 'Refunds'],
                marks: [
                  { index: 1, role: 'settled' },
                  { index: 4, role: 'settled' },
                ],
                note: 'Routing to the right tier goes in scope. The rules are already written on the support lead’s whiteboard, so this is deterministic code with a test per rule.',
                counter: { label: 'Still undecided', value: 4 },
              },
              {
                cells: ['Suggest reply', 'Resolve account', 'Auto-send', 'Rewrite KB', 'Route to tier', 'Refunds'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 4, role: 'settled' },
                ],
                note: 'Drafting a suggested reply from a knowledge-base article goes in scope, with an agent pressing send. This is the one place a model earns its keep, and it is the smallest of the three.',
                counter: { label: 'Still undecided', value: 3 },
              },
              {
                cells: ['Suggest reply', 'Resolve account', 'Auto-send', 'Rewrite KB', 'Route to tier', 'Refunds'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'excluded' },
                  { index: 4, role: 'settled' },
                ],
                note: 'Sending without an agent is a non-goal for this phase. The support lead will not accept it, and nobody has agreed who answers for a wrong reply.',
                counter: { label: 'Still undecided', value: 2 },
              },
              {
                cells: ['Suggest reply', 'Resolve account', 'Auto-send', 'Rewrite KB', 'Route to tier', 'Refunds'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'excluded' },
                  { index: 3, role: 'excluded' },
                  { index: 4, role: 'settled' },
                ],
                note: 'Rewriting the knowledge base is a non-goal. It is real work with its own owner and its own schedule, and folding it in here would move the date without anyone deciding to.',
                counter: { label: 'Still undecided', value: 1 },
              },
              {
                cells: ['Suggest reply', 'Resolve account', 'Auto-send', 'Rewrite KB', 'Route to tier', 'Refunds'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'excluded' },
                  { index: 3, role: 'excluded' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'excluded' },
                ],
                note: 'Refunds are a non-goal. Money moves, the finance controller has not been in a single meeting, and no approval path exists. Three in scope, three written down as out.',
                counter: { label: 'Still undecided', value: 0 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'A non-goal that only says “out of scope” invites the same argument again next month. Give each one a reason and, where you can, the condition that would put it back in. That turns a refusal into a schedule, and it lets the sponsor see that you excluded the thing for a reason rather than to make your quarter easier.',
        },
        {
          kind: 'table',
          caption: 'The three Marlbrook non-goals, each with the reason and the condition that would reopen it.',
          headers: ['Non-goal for this phase', 'Why it is out', 'What would put it back in'],
          rows: [
            [
              'Sending a reply without an agent approving it',
              'The support lead will not accept it, and nobody has agreed who answers for a wrong reply',
              'A quarter of measured suggestion acceptance above a level the support lead agrees to, and a named owner for wrong replies',
            ],
            [
              'Rewriting the knowledge base',
              'A content project with a different owner and a different schedule',
              'A content owner with allocated time, tracked as its own piece of work',
            ],
            [
              'Anything that issues a refund',
              'It moves money and there is no approval path',
              'Finance names an approver and an amount limit, in writing',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'Risks belong on the same page, written as things that could happen rather than as categories. “Security risk” tells the reader nothing. “The security reviewer has not seen the design, and reading customer ticket content may need an approval we have not asked for; we find out on 20 September” tells them who, what and when. Add the discovery risks you carry from lesson one: a veto holder nobody has named, and a baseline you cannot repeat.',
        },
        {
          kind: 'prose',
          body:
            'The output of all of this is one page. The workflow as you watched it, five questions you still need answered, one baseline, what is in, what is out, the risks and the acceptance condition. It fits on a page because a scope that needs ten pages has not been decided yet, and because the support lead will read a page.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'fde-v1-m01-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: the workflow and who is in it',
      summary: 'The operator, the shadowing clock, the mechanism against the job, and the people who can refuse the result.',
      competencies: ['discovery'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m01-l1',
    },
    {
      id: 'fde-v1-m01-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: baseline and scope',
      summary: 'What a baseline has to carry, the success condition as a number with a date, and non-goals with the reason attached.',
      competencies: ['discovery'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m01-l2',
    },
    {
      id: 'fde-v1-m01-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Discovery decisions',
      summary: 'Four bounded decisions: the first question to ask, which baseline is measurable, which requirement is a solution, and whose absence stops the build.',
      competencies: ['discovery'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m01-q1',
          prompt:
            'The VP of Customer Operations at Marlbrook says: “The assistant should handle the routine tickets.” Nobody has defined routine. You have one hour with the support team this week. Which question do you ask first?',
          options: [
            '“Show me the last twenty tickets you would call routine, and let me watch you work three of them.”',
            '“What percentage of tickets should the assistant handle without an agent?”',
            '“Which model would you like us to use for this?”',
            '“Can you write down the wording the assistant should use for the common cases?”',
          ],
          correct: 0,
          explanation:
            'The word routine is doing all the work in that sentence and nobody has attached it to anything observable. Asking for the tickets turns it into a set you can count, and watching three of them gives you the step timings you will need for a baseline. The percentage question asks the sponsor to invent a target before anyone has measured the starting point, so you get a number with nothing behind it and an argument later about whether you hit it. The model question picks a mechanism before the problem exists, and nothing in the request implies a model is needed at all. Asking for wording assumes the expensive part is composing text, which is exactly the assumption the shadowing session is there to test.',
          competencies: ['discovery'],
        },
        {
          id: 'fde-v1-m01-q2',
          prompt: 'Which of these can serve as the baseline for the Marlbrook support project?',
          options: [
            'Median minutes from ticket creation to first agent reply, tier-1 export tickets, August, 412 tickets, taken from the ticket system export.',
            'The agents say that roughly half of their day goes to answering the same questions again.',
            'Support is costing too much for a team of four.',
            'Handle time will fall by 40 percent once the assistant is live.',
          ],
          correct: 0,
          explanation:
            'The first option carries all four parts a baseline needs: a quantity, the population it covers, the window it was taken over, and a method a different person can repeat next quarter. The agents’ estimate has no defined population and no method, and “the same questions” has never been defined, so re-measuring it after launch would measure something else. “Costing too much” has no quantity at all. The last one is the target, not the starting point; it is the sentence that goes beside the baseline once the baseline exists, and on its own there is nothing for the 40 percent to be 40 percent of.',
          competencies: ['discovery'],
        },
        {
          id: 'fde-v1-m01-q3',
          prompt: 'Four lines arrived on the Marlbrook requirements list. Which one is a solution somebody already picked, rather than a requirement?',
          options: [
            'The assistant must summarise the whole ticket thread before the agent reads it.',
            'No message reaches a customer without a person approving it.',
            'An agent must be able to check where a suggested answer came from.',
            'Median time to first reply on tier-1 export tickets falls to 12 minutes by 31 March.',
          ],
          correct: 0,
          explanation:
            'Summarising is a mechanism. State it without naming the thing that does the work and it becomes “the agent needs the account history without opening three tabs”, which a summariser answers, and which a link to the account timeline on the ticket also answers for a fraction of the cost. The approval line is a constraint on the outcome and says nothing about how the approval is built. Checking where an answer came from is a capability the agent needs, satisfied by a citation, a link or a panel. The last one is the success condition: a number, a population and a date, with the implementation left open.',
          competencies: ['discovery'],
        },
        {
          id: 'fde-v1-m01-q4',
          prompt:
            'Marlbrook discovery has met the VP of Customer Operations, two support agents and the platform engineer who owns the ticket API. Whose continued absence is most likely to stop the project after it is built?',
          options: [
            'The reviewer who must approve a system reading customer ticket content. Nobody has checked whether that review exists.',
            'A third support agent, so the shadowing covers more than two people.',
            'The frontend engineer who will build the approval screen.',
            'The sales engineer at the model provider you are considering.',
          ],
          correct: 0,
          explanation:
            'That reviewer holds a veto and can use it at the end, when the build is finished and changing the data flow is most expensive. The other three cost you time or accuracy, not the project. A third agent would improve the sample your baseline rests on and is worth doing, but a thin sample is a measurement you can widen rather than a refusal. The frontend engineer is a scheduling question and can join in the build phase. The provider’s sales engineer holds nothing: no part of this scope requires a particular vendor, and the cheapest item in it, resolving the account, needs no model at all.',
          competencies: ['discovery'],
        },
      ],
    },
    {
      id: 'fde-v1-m01-scope-brief',
      kind: 'artifact',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'One-page scope: “add AI to support”',
      summary:
        'Turn a one-line request into a scope with a workflow, five questions, a baseline, non-goals, risks and an acceptance condition. Recorded as self-reviewed.',
      competencies: ['discovery'],
      estimatedMinutes: 60,
      artifact: {
        brief:
          'Marlbrook Systems sells warehouse software to mid-sized distributors. Its VP of Customer Operations has sent one line: “Add AI to support.” Four agents handle roughly 400 tickets a month. The shadowing session in lesson one is the only measurement anyone has taken, and it covered a single ticket.\n\nWrite the one page that comes out of a discovery week. Seven fields, all required: the workflow as it runs today, five questions you would ask before writing any code, the baseline, what is in scope for this phase, what is not, the risks, and the condition that would let everyone agree this worked.\n\nThe company, the volumes, the clock and the transcript are fixtures written for this module. There is no live system to query and no customer to interview, so where you would have to ask someone, write the question down rather than inventing the answer.\n\nThis submission is recorded as self-reviewed. The automated check confirms that each required field is present and inside its length limit, and that is the whole of what it establishes — it cannot judge whether your baseline is measurable, whether your questions would change anything, or whether you excluded the right things. Read your own answer against the problem framing and communication rows of the path rubric, then revise it before you move on.',
        fields: [
          {
            id: 'workflow',
            label: 'The workflow today',
            help:
              'Describe the ticket workflow as it runs now, step by step, with the person doing each step named by role and a time attached wherever lesson one gave you one. Say which steps you watched and which you were told about. The length check counts characters; it cannot tell whether this is the workflow the desk actually runs.',
            kind: 'long-text',
            required: true,
            maxLength: 2000,
          },
          {
            id: 'stakeholder-questions',
            label: 'Five questions to ask',
            help:
              'Five questions, one per line, that you would ask before writing any code. Each should have a named person who could answer it, and each should change what you build depending on the answer. At least one should find somebody who can refuse the project. Nothing automated can tell whether a question is a good one, so this is recorded for your own review.',
            kind: 'list',
            required: true,
            maxLength: 1200,
          },
          {
            id: 'baseline',
            label: 'Baseline',
            help:
              'One measurement of what the work costs today: the quantity, the population it covers, the window it was taken over, and how a different person would take it again. A target is not a baseline. The check only confirms this box is non-empty and inside 400 characters — whether the number can be re-measured is yours to judge.',
            kind: 'short-text',
            required: true,
            maxLength: 400,
          },
          {
            id: 'in-scope',
            label: 'In scope for this phase',
            help:
              'One line per thing this project will deliver, each small enough that you could demonstrate it. Where deterministic code covers a line, say so; where a model earns its place, say why. Presence is checked automatically, the choices are not.',
            kind: 'list',
            required: true,
            maxLength: 1200,
          },
          {
            id: 'non-goals',
            label: 'Non-goals',
            help:
              'One line per thing this project will not do in this phase, each with the reason and, where you can give one, the condition that would put it back in. An exclusion you did not write down is not an exclusion. The check counts lines and cannot judge whether you excluded the right things.',
            kind: 'list',
            required: true,
            maxLength: 1200,
          },
          {
            id: 'risks',
            label: 'Risks',
            help:
              'What could go wrong, who would notice it, and what you would do. Cover at least the three discovery risks: a veto holder nobody has named, a baseline you cannot repeat, and a data source the security review may refuse. Recorded as self-reviewed; no automated check reads this for coverage.',
            kind: 'long-text',
            required: true,
            maxLength: 2000,
          },
          {
            id: 'acceptance',
            label: 'Acceptance condition',
            help:
              'The condition that would let the sponsor, the support lead and you agree this worked: a number, measured the same way as the baseline, with a date. Say which slice it covers and what you would report beside it, since one median can improve while a ticket type gets worse. The check confirms the field is filled; the rest is your own review against the rubric.',
            kind: 'long-text',
            required: true,
            maxLength: 1500,
          },
        ],
        rubricDimensions: ['problem-framing', 'communication'],
      },
    },
  ],
  requires: [
    { activityId: 'fde-v1-m01-checks', state: 'verified_pass' },
    { activityId: 'fde-v1-m01-scope-brief', state: 'self_reviewed' },
  ],
};
