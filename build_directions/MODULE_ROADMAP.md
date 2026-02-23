\# Kelly Grappe for Secretary of State  

\# Campaign Operations Platform – Module Roadmap



\*\*Document Status:\*\* Living Roadmap  

\*\*Purpose:\*\* Define the next 12 modules in priority order  

\*\*Version:\*\* 1.0  

\*\*Last Updated:\*\* (Update as we go)



---



\# Roadmap Philosophy



Modules are:



\- Self-contained

\- Schema-driven

\- Action-based

\- Expandable

\- Compatible with the Universal Submit API



Each module must:

1\. Have a clear campaign purpose

2\. Generate structured data

3\. Produce measurable outcomes

4\. Fit within the long-term CRM model



---



\# Phase 1 Modules (Immediate Build – Intake Engine)



These modules require:

\- No authentication

\- Google Sheet logging

\- Email notification

\- Optional Google Calendar integration



---



\## MODULE\_001\_EVENT\_REQUEST

\*\*Priority:\*\* 1  

\*\*Purpose:\*\* Invite Kelly to public or private events  

\*\*Outputs:\*\* Calendar event + follow-up task (future)  

\*\*Status:\*\* In Development  



Why First:

\- Drives visibility

\- Generates community relationships

\- Creates host-to-volunteer pipeline



---



\## MODULE\_002\_VOLUNTEER\_SIGNUP

\*\*Priority:\*\* 2  

\*\*Purpose:\*\* Capture new volunteers  

\*\*Outputs:\*\* Volunteer interest record  

\*\*Actions:\*\*

\- Email staff

\- Log to Sheet

\- Tag by interest (future CRM use)



Fields:

\- Contact info

\- County/City

\- Areas of interest (Canvass, Phones, Events, Data, Social, Fundraising)

\- Availability

\- Notes



Strategic Value:

Feeds entire campaign infrastructure.



---



\## MODULE\_003\_HOST\_HOUSE\_MEETUP

\*\*Priority:\*\* 3  

\*\*Purpose:\*\* Encourage grassroots gatherings  

\*\*Outputs:\*\* Event request + potential fundraiser pipeline  



Strategic Value:

Scalable local influence builder.



---



\## MODULE\_004\_YARD\_SIGN\_REQUEST

\*\*Priority:\*\* 4  

\*\*Purpose:\*\* Distribute yard signs  

\*\*Outputs:\*\* Address + quantity + routing record  



Future Expansion:

\- Delivery task assignment

\- Turf-level heatmap



---



\## MODULE\_005\_ISSUE\_REPORT

\*\*Priority:\*\* 5  

\*\*Purpose:\*\* Capture Secretary of State–related concerns  

\*\*Outputs:\*\* Categorized issue log  



Strategic Value:

Policy insight + messaging intelligence.



---



\# Phase 2 Modules (Operational Growth – CRM Core Required)



These modules benefit from:

\- Authentication

\- Task tracking

\- Role permissions



---



\## MODULE\_006\_EVENT\_CONFIRMATION\_WORKFLOW

\*\*Priority:\*\* 6  

\*\*Purpose:\*\* Staff-only event approval + status management  

\*\*Outputs:\*\* Pipeline movement (Requested → Confirmed)  



Requires:

\- Auth

\- CRM event table

\- Status transitions



---



\## MODULE\_007\_VOLUNTEER\_ASSIGNMENT

\*\*Priority:\*\* 7  

\*\*Purpose:\*\* Assign volunteers to tasks or shifts  

\*\*Outputs:\*\* Task objects + shift records  



Strategic Value:

Transforms signups into action.



---



\## MODULE\_008\_SHIFT\_CHECKIN

\*\*Priority:\*\* 8  

\*\*Purpose:\*\* Volunteer attendance tracking  

\*\*Outputs:\*\* Shift log + hours  



Future:

Volunteer leaderboards and retention analytics.



---



\## MODULE\_009\_TASK\_MANAGER

\*\*Priority:\*\* 9  

\*\*Purpose:\*\* Internal campaign task system  

\*\*Outputs:\*\* Assignable tasks with due dates  



Strategic Value:

Reduces chaos. Replaces ad-hoc messaging.



---



\# Phase 3 Modules (Field Operations Expansion)



---



\## MODULE\_010\_CANVASS\_LOGGER

\*\*Priority:\*\* 10  

\*\*Purpose:\*\* Log door-knocking results  

\*\*Outputs:\*\* Interaction records  



Fields:

\- Support level

\- Issue notes

\- Follow-up required

\- Volunteer interest

\- Yard sign interest



Future:

Turf maps + performance analytics.



---



\## MODULE\_011\_PHONE\_BANK\_LOGGER

\*\*Priority:\*\* 11  

\*\*Purpose:\*\* Log phone conversations  

\*\*Outputs:\*\* Interaction records  



Strategic Value:

Scales persuasion + turnout.



---



\## MODULE\_012\_TEXT\_OUTREACH\_TRACKER

\*\*Priority:\*\* 12  

\*\*Purpose:\*\* Track text message outreach  

\*\*Outputs:\*\* Message metrics + follow-up tasks  



Future:

Automation rules + segmentation engine.



---



\# Expansion Candidates (Future Modules)



These are not immediate but align with long-term CRM goals:



\- Donation Intake Tracker

\- Fundraising Event Ticketing

\- Host Committee Builder

\- Media Inquiry Intake

\- Data Entry Portal

\- Volunteer Training Tracker

\- Captain Hierarchy Manager

\- Turf Management Tool

\- Petition Signature Collection

\- Election Day Poll Worker Signup



---



\# Priority Summary Table



| Module ID | Name | Priority | Phase |

|------------|-------|----------|--------|

| 001 | Event Request | 1 | Phase 1 |

| 002 | Volunteer Signup | 2 | Phase 1 |

| 003 | Host House Meetup | 3 | Phase 1 |

| 004 | Yard Sign Request | 4 | Phase 1 |

| 005 | Issue Report | 5 | Phase 1 |

| 006 | Event Confirmation Workflow | 6 | Phase 2 |

| 007 | Volunteer Assignment | 7 | Phase 2 |

| 008 | Shift Check-In | 8 | Phase 2 |

| 009 | Task Manager | 9 | Phase 2 |

| 010 | Canvass Logger | 10 | Phase 3 |

| 011 | Phone Bank Logger | 11 | Phase 3 |

| 012 | Text Outreach Tracker | 12 | Phase 3 |



---



\# Strategic Build Order



Phase 1 Focus:

\- Build 001–005 rapidly

\- Validate adoption

\- Refine submission patterns



Phase 2 Focus:

\- Introduce Supabase

\- Add authentication

\- Convert submissions into CRM objects



Phase 3 Focus:

\- Field power tools

\- Volunteer scaling

\- Automation



---



\# Design Rule



Every new module must:



1\. Register in moduleRegistry

2\. Have schema.json

3\. Have copy.md

4\. Define actions.json

5\. Submit through Universal API

6\. Produce measurable outputs



No exceptions.



---



\# Change Log



(Track module additions, reordering, or removals here.)

