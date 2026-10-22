/** IP04: two readings and five optional self-reviewed reflection artifacts.
 * Links to the original M02 cases; no employer question or scoring key. */
import type { ModuleSource } from "../../types";
export const FDE_IP04: ModuleSource = {
  "id": "fde-v1-ip04",
  "title": "Interview practice: case bank and reflections",
  "optional": true,
  "shelf": "interview-prep",
  "outcomes": [
    "Rehearse a customer decision using the original M02 case bank.",
    "Write a traceable account without inventing experience or measurement."
  ],
  "competencies": [
    "discovery",
    "handoff",
    "operations",
    "evaluation"
  ],
  "dependsOn": [],
  "estimatedMinutes": 114,
  "lessons": [
    {
      "id": "fde-v1-ip04-l1",
      "title": "Use the case bank as a decision rehearsal",
      "summary": "Choose a case, expose the assumptions and compare the decision with the authored feedback.",
      "estimatedMinutes": 12,
      "sources": [
        {
          "label": "Google SRE Workbook: engagement and shared ownership",
          "url": "https://sre.google/workbook/engagement-model/",
          "reviewedOn": "2026-10-22"
        },
        {
          "label": "Google SRE Book: documented learning and follow-up",
          "url": "https://sre.google/sre-book/postmortem-culture/",
          "reviewedOn": "2026-10-22"
        }
      ],
      "sections": [
        {
          "kind": "callout",
          "tone": "note",
          "body": "These cases and prompts are original practice. They are not an employer’s interview questions, scoring key or hiring assessment. This interview-practice module is optional: its readings and reflections do not count toward guided completion. The linked M02 cases keep their existing grading and required-module completion rules. No live customer system, model or external service runs here."
        },
        {
          "kind": "prose",
          "body": "Choose a case below. Before answering, write the operator’s decision, the source authority, a repeatable baseline, the smallest useful delivery and the assumption that could change your plan. Read the authored feedback after a response. Each four-question case needs four correct answers at the 80% threshold; retry is available. This shelf links to the same M02 cases rather than creating a second bank or a second completion rule."
        },
        {
          "kind": "table",
          "caption": "The twelve decomposition cases",
          "headers": [
            "Case",
            "Practice focus"
          ],
          "rows": [
            [
              "[The dashboard nobody trusts](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-dashboard)",
              "A fictional operations desk uses a dashboard to choose which late shipments to investigate."
            ],
            [
              "[Synchronise two employee systems](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-employee-sync)",
              "A fictional company keeps payroll details in one service and office access in another."
            ],
            [
              "[Two weeks or two months](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-deadline)",
              "A fictional support team asks for ticket classification, knowledge search, automatic replies and reporting."
            ],
            [
              "[The requested feature conflicts with the workflow](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-wrong-feature)",
              "A fictional account team asks for automatic approval of refund requests."
            ],
            [
              "[Intermittent production API timeouts](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-timeouts)",
              "A fictional integration times out on roughly one request in a hundred."
            ],
            [
              "[A regulated customer considers model hosting](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-hosting)",
              "A fictional customer’s written data policy permits sensitive document processing only in an approved private network."
            ],
            [
              "[Duplicate invoice events](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-invoices)",
              "A fictional accounts team receives payment events from a provider."
            ],
            [
              "[Answers from a private knowledge base](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-knowledge)",
              "A fictional support desk wants faster answers from a knowledge base."
            ],
            [
              "[The pilot is fast but unused](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-adoption)",
              "A fictional operations pilot passes its offline checks and reduces a demonstrated lookup from ninety seconds to ten."
            ],
            [
              "[A tenfold traffic spike](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-surge)",
              "A fictional service handles fifty jobs a minute under a two-minute completion objective."
            ],
            [
              "[Two warehouses with intermittent connectivity](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-offline)",
              "A fictional inventory pilot spans two warehouses."
            ],
            [
              "[Turn repeated custom work into a product proposal](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-patterns)",
              "A fictional delivery team has integrated three customers’ ticket exports."
            ]
          ]
        },
        {
          "kind": "prose",
          "body": "Use the visible case rubric: clarify the operator and authority, define the baseline, bound the first slice and explain a tradeoff under the given constraints. A strong-sounding architecture name is not evidence. If a fact is missing, name the question you would ask; do not invent customer access, interviews or measurements."
        }
      ]
    },
    {
      "id": "fde-v1-ip04-l2",
      "title": "Write a story a reviewer can follow",
      "summary": "Separate context, responsibility, your actions, observed results and what you learned.",
      "estimatedMinutes": 12,
      "sources": [
        {
          "label": "Google SRE Workbook: engagement and shared ownership",
          "url": "https://sre.google/workbook/engagement-model/",
          "reviewedOn": "2026-10-22"
        },
        {
          "label": "Google SRE Book: documented learning and follow-up",
          "url": "https://sre.google/sre-book/postmortem-culture/",
          "reviewedOn": "2026-10-22"
        }
      ],
      "sections": [
        {
          "kind": "prose",
          "body": "Use your own experience with confidential details removed, or label the entire response as a fictional rehearsal based on a course case. Neither choice is independently verified here. Do not turn a practice fixture into a claim that you delivered it for a real employer. Distinguish the work you personally did from a team outcome and from what you would do next time. In fictional rehearsal, preserve supplied case facts, label added assumptions and describe proposed actions in conditional language. Do not invent a measured result or imply a proposed test has already run."
        },
        {
          "kind": "table",
          "caption": "A traceable reflection structure",
          "headers": [
            "Part",
            "What to record"
          ],
          "rows": [
            [
              "Situation",
              "The workflow, affected people and constraint; state which details are known, assumed or fictional."
            ],
            [
              "Task",
              "Your actual responsibility in an experience account, or the responsibility you would take in a fictional rehearsal."
            ],
            [
              "Action",
              "Actual steps from your experience, or clearly proposed rehearsal steps; include the alternative, evidence and reason for changing course."
            ],
            [
              "Result",
              "Observed results and measurement limits for experience; supplied fixture facts and clearly labeled expectations for rehearsal. Say when no measurement exists."
            ],
            [
              "Reflection",
              "What you would repeat or change, the actual or proposed follow-up owner and what evidence would test the lesson."
            ]
          ]
        },
        {
          "kind": "prose",
          "body": "The form checks required text and length caps. It cannot establish truth, ownership, judgment, safe operation or communication quality. Compare your account with the displayed rubric and revise it yourself. The prompts below are five separate self-reviewed artifacts; saving or submitting them grants no interview endorsement and changes no required path completion."
        }
      ]
    }
  ],
  "activities": [
    {
      "id": "fde-v1-ip04-l1-read",
      "kind": "lesson",
      "purpose": "exercise",
      "verification": "self_reviewed",
      "title": "Read: use the case bank as a decision rehearsal",
      "summary": "Choose a case, expose the assumptions and compare the decision with the authored feedback.",
      "competencies": [
        "discovery",
        "handoff"
      ],
      "estimatedMinutes": 12,
      "lessonId": "fde-v1-ip04-l1"
    },
    {
      "id": "fde-v1-ip04-l2-read",
      "kind": "lesson",
      "purpose": "exercise",
      "verification": "self_reviewed",
      "title": "Read: write a story a reviewer can follow",
      "summary": "Separate context, responsibility, your actions, observed results and what you learned.",
      "competencies": [
        "discovery",
        "handoff",
        "evaluation"
      ],
      "estimatedMinutes": 12,
      "lessonId": "fde-v1-ip04-l2"
    },
    {
      "id": "fde-v1-ip04-ambiguous",
      "kind": "artifact",
      "purpose": "exercise",
      "verification": "self_reviewed",
      "title": "An ambiguous request",
      "summary": "An optional structured reflection, recorded as self-reviewed. No independent interview or experience assessment.",
      "competencies": [
        "discovery",
        "handoff"
      ],
      "estimatedMinutes": 18,
      "artifact": {
        "brief": "Describe a time you turned a vague request into a bounded first delivery, or rehearse the dashboard case as explicitly fictional. Explain the operator decision, baseline method and exclusions. In a fictional rehearsal, propose the baseline test without claiming it ran. Use the five displayed fields and compare your answer with the visible rubric. The form enforces presence and caps, not the truth or quality of the story. This optional artifact does not count toward guided completion.",
        "fields": [
          {
            "id": "situation",
            "label": "Situation and evidence limits",
            "help": "Set the workflow, people and constraints. Label the account as your experience or fictional practice and distinguish known facts from assumptions. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          },
          {
            "id": "task",
            "label": "Your responsibility",
            "help": "For experience, name the decision or outcome you personally owned; for fictional rehearsal, name the role and responsibility you would take. Separate that role from the team’s work. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 800
          },
          {
            "id": "action",
            "label": "Actions and tradeoff",
            "help": "Explain actual steps from your experience or clearly proposed steps in a fictional rehearsal. Include the evidence and a credible alternative. Keep proposed actions distinct from work you performed. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1500
          },
          {
            "id": "result",
            "label": "Result and measurement",
            "help": "For experience, state observed outcomes and how you know them. For rehearsal, preserve supplied fixture facts and label untested outcomes as expectations. Identify estimates and missing measurements. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1200
          },
          {
            "id": "reflection",
            "label": "Reflection and follow-up",
            "help": "Name what you would keep or change, an accountable follow-up and the evidence that would test your conclusion. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          }
        ],
        "rubricDimensions": [
          "problem-framing",
          "communication"
        ]
      }
    },
    {
      "id": "fde-v1-ip04-push-back",
      "kind": "artifact",
      "purpose": "exercise",
      "verification": "self_reviewed",
      "title": "Push back with an alternative",
      "summary": "An optional structured reflection, recorded as self-reviewed. No independent interview or experience assessment.",
      "competencies": [
        "discovery",
        "handoff"
      ],
      "estimatedMinutes": 18,
      "artifact": {
        "brief": "Describe a feature request you challenged, or rehearse the wrong-feature case as explicitly fictional. Explain the workflow conflict, the evidence you sought and the alternative you offered without promising an unsupported outcome. Use the five displayed fields and compare your answer with the visible rubric. The form enforces presence and caps, not the truth or quality of the story. This optional artifact does not count toward guided completion.",
        "fields": [
          {
            "id": "situation",
            "label": "Situation and evidence limits",
            "help": "Set the workflow, people and constraints. Label the account as your experience or fictional practice and distinguish known facts from assumptions. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          },
          {
            "id": "task",
            "label": "Your responsibility",
            "help": "For experience, name the decision or outcome you personally owned; for fictional rehearsal, name the role and responsibility you would take. Separate that role from the team’s work. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 800
          },
          {
            "id": "action",
            "label": "Actions and tradeoff",
            "help": "Explain actual steps from your experience or clearly proposed steps in a fictional rehearsal. Include the evidence and a credible alternative. Keep proposed actions distinct from work you performed. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1500
          },
          {
            "id": "result",
            "label": "Result and measurement",
            "help": "For experience, state observed outcomes and how you know them. For rehearsal, preserve supplied fixture facts and label untested outcomes as expectations. Identify estimates and missing measurements. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1200
          },
          {
            "id": "reflection",
            "label": "Reflection and follow-up",
            "help": "Name what you would keep or change, an accountable follow-up and the evidence that would test your conclusion. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          }
        ],
        "rubricDimensions": [
          "problem-framing",
          "communication"
        ]
      }
    },
    {
      "id": "fde-v1-ip04-incident",
      "kind": "artifact",
      "purpose": "exercise",
      "verification": "self_reviewed",
      "title": "Own an incident and its limits",
      "summary": "An optional structured reflection, recorded as self-reviewed. No independent interview or experience assessment.",
      "competencies": [
        "operations",
        "handoff"
      ],
      "estimatedMinutes": 18,
      "artifact": {
        "brief": "Describe your role in an incident response, or rehearse the timeout case as explicitly fictional. Separate observed symptoms from a causal hypothesis, state the safe first action and name the effects a rollback could not undo. Include a recovery signal, an accountable role and how the remaining state would be reconciled. Use the five displayed fields and compare your answer with the visible rubric. The form enforces presence and caps, not the truth or quality of the story. This optional artifact does not count toward guided completion.",
        "fields": [
          {
            "id": "situation",
            "label": "Situation and evidence limits",
            "help": "Set the workflow, people and constraints. Label the account as your experience or fictional practice and distinguish known facts from assumptions. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          },
          {
            "id": "task",
            "label": "Your responsibility",
            "help": "For experience, name the decision or outcome you personally owned; for fictional rehearsal, name the role and responsibility you would take. Separate that role from the team’s work. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 800
          },
          {
            "id": "action",
            "label": "Actions and tradeoff",
            "help": "Explain actual steps from your experience or clearly proposed steps in a fictional rehearsal. Include the evidence and a credible alternative. Keep proposed actions distinct from work you performed. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1500
          },
          {
            "id": "result",
            "label": "Result and measurement",
            "help": "For experience, state observed outcomes and how you know them. For rehearsal, preserve supplied fixture facts and label untested outcomes as expectations. Identify estimates and missing measurements. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1200
          },
          {
            "id": "reflection",
            "label": "Reflection and follow-up",
            "help": "Name what you would keep or change, an accountable follow-up and the evidence that would test your conclusion. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          }
        ],
        "rubricDimensions": [
          "operability",
          "communication"
        ]
      }
    },
    {
      "id": "fde-v1-ip04-changed-plan",
      "kind": "artifact",
      "purpose": "exercise",
      "verification": "self_reviewed",
      "title": "Change your plan when evidence changes",
      "summary": "An optional structured reflection, recorded as self-reviewed. No independent interview or experience assessment.",
      "competencies": [
        "evaluation",
        "discovery",
        "handoff"
      ],
      "estimatedMinutes": 18,
      "artifact": {
        "brief": "Describe an evaluation or test that changed your technical recommendation, or rehearse how a proposed test could change your recommendation, labeled explicitly fictional and untested. State the original assumption, the counterevidence, the rejected alternative and what remained unknown. In rehearsal, label possible counterevidence as hypothetical. Use the five displayed fields and compare your answer with the visible rubric. The form enforces presence and caps, not the truth or quality of the story. This optional artifact does not count toward guided completion.",
        "fields": [
          {
            "id": "situation",
            "label": "Situation and evidence limits",
            "help": "Set the workflow, people and constraints. Label the account as your experience or fictional practice and distinguish known facts from assumptions. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          },
          {
            "id": "task",
            "label": "Your responsibility",
            "help": "For experience, name the decision or outcome you personally owned; for fictional rehearsal, name the role and responsibility you would take. Separate that role from the team’s work. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 800
          },
          {
            "id": "action",
            "label": "Actions and tradeoff",
            "help": "Explain actual steps from your experience or clearly proposed steps in a fictional rehearsal. Include the evidence and a credible alternative. Keep proposed actions distinct from work you performed. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1500
          },
          {
            "id": "result",
            "label": "Result and measurement",
            "help": "For experience, state observed outcomes and how you know them. For rehearsal, preserve supplied fixture facts and label untested outcomes as expectations. Identify estimates and missing measurements. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1200
          },
          {
            "id": "reflection",
            "label": "Reflection and follow-up",
            "help": "Name what you would keep or change, an accountable follow-up and the evidence that would test your conclusion. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          }
        ],
        "rubricDimensions": [
          "technical-correctness",
          "communication"
        ]
      }
    },
    {
      "id": "fde-v1-ip04-handoff",
      "kind": "artifact",
      "purpose": "exercise",
      "verification": "self_reviewed",
      "title": "Leave a reusable handoff",
      "summary": "An optional structured reflection, recorded as self-reviewed. No independent interview or experience assessment.",
      "competencies": [
        "handoff",
        "operations"
      ],
      "estimatedMinutes": 18,
      "artifact": {
        "brief": "Describe knowledge or code you made reusable, or rehearse the repeated-custom-work case linked above as explicitly fictional. Separate the invariant from the local adapter and explain how the next owner could verify or revise your work. Use the five displayed fields and compare your answer with the visible rubric. The form enforces presence and caps, not the truth or quality of the story. This optional artifact does not count toward guided completion.",
        "fields": [
          {
            "id": "situation",
            "label": "Situation and evidence limits",
            "help": "Set the workflow, people and constraints. Label the account as your experience or fictional practice and distinguish known facts from assumptions. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          },
          {
            "id": "task",
            "label": "Your responsibility",
            "help": "For experience, name the decision or outcome you personally owned; for fictional rehearsal, name the role and responsibility you would take. Separate that role from the team’s work. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 800
          },
          {
            "id": "action",
            "label": "Actions and tradeoff",
            "help": "Explain actual steps from your experience or clearly proposed steps in a fictional rehearsal. Include the evidence and a credible alternative. Keep proposed actions distinct from work you performed. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1500
          },
          {
            "id": "result",
            "label": "Result and measurement",
            "help": "For experience, state observed outcomes and how you know them. For rehearsal, preserve supplied fixture facts and label untested outcomes as expectations. Identify estimates and missing measurements. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1200
          },
          {
            "id": "reflection",
            "label": "Reflection and follow-up",
            "help": "Name the next owner, a signal that tests compatibility, and how you would stop unsafe reuse or reconcile effects if it fails. State what you would keep or change. Automated checks enforce required text and length only; review the substance and truth of this account yourself.",
            "kind": "long-text",
            "required": true,
            "maxLength": 1000
          }
        ],
        "rubricDimensions": [
          "operability",
          "communication"
        ]
      }
    }
  ],
  "requires": []
};
