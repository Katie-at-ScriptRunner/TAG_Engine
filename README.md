# TAG Engine — Ask Ada 🏷️

> **⚠️ Backup:** If the Adaptaworks platform is unavailable, a static version of the project is hosted on GitHub Pages at: `[YOUR GITHUB PAGES LINK HERE]`

> 📊 **Pitch Deck:** https://docs.google.com/presentation/d/1pHkd2PxV8Y05y5kfK6L9GZicdfEsNTAwR27Sa5h4fxI/edit?usp=sharing
> 🎥 **Pitch Video:** [Watch the presentation]([VIDEO LINK HERE])

A hackathon project by Team TAG · Adaptavist Hack Day 2026

---

## What Is It?

**TAG Engine** is an AI-powered product discovery assistant built on the Tag Engine — a translation layer that maps plain-language workflow problems directly to the right product in the Adaptavist portfolio.

You type a messy, real-world problem. Ada gives you the right product recommendation, a plain-English explanation of why it fits, and the next steps to get moving.

No Slack escalation. No hunting across docs. No needing to already know the answer.

Named for Ada Lovelace — the first computer programmer.

---

## The Problem It Solves

Navigating the Adaptavist portfolio requires context that most people don't have, and shouldn't need to have.

* Customers don't know which products will solve their problems
* Internal teams don't know whether we can do what the customer is asking
* Some teams may not understand the customer question - so Ada can help understand this
* Teams may not know when to bring in other colleauges to get the most out of the customer interactions
* Sales teams and Channel Partners can't possibly remember everything about every single product
* Channel Partners sell so many products - how do they know what Adaptavist does?

The result: underutilised products, missed cross-sell opportunities, and a portfolio that looks more complex than it needs to be.

---

## How It Works

Ada follows a simple four-step flow:

1. **Describe** — The user types their problem in plain language and picks their context (Jira or Confluence, Cloud or Data Center)
2. **Clarify** — Ada asks follow-up questions if the request is ambiguous before recommending anything
3. **Recommend** — A plain-English summary of the best-fit Adaptavist product and how it addresses the problem
4. **Act** — Step-by-step setup guides; for ScriptRunner, ready-to-use scripts are surfaced directly

Output is WCAG-accessible, with an overview-first structure and detail available on demand.

---

## The Repo

```
tag-engine/
├── README.md
├── src/
│   ├── ada/               # Core conversational agent logic
│   ├── knowledge/         # Structured product knowledge base (ScriptRunner, Kolekti)
│   ├── guardrails/        # DC vs Cloud filtering and fit-gap flagging
│   └── ui/                # Chat interface (Ask Ada front end)
├── prompts/               # System prompts and tool-call definitions
└── docs/                  # Internal pitch deck and one-pager
```

The POC is deliberately scoped to two products to prove the model end-to-end:

- **ScriptRunner** — automation and scripting for Jira and Confluence
- **Kolekti** — content and productivity tooling

Each product has a structured knowledge layer: what it solves, who it's for, and explicit good-fit and bad-fit cases. If Ada can't find a strong match, she flags it as a potential feature request or points to the native Jira/Confluence equivalent — rather than hallucinating a recommendation.

---

## Technical Challenges

### Adaptaworks Platform Instability

The biggest blocker of the day was the Adaptaworks vibe coding environment going down partway through the build. What looked like a straightforward tool issue turned into several hours of troubleshooting — diagnosing the failure, working around it, and eventually getting the platform back into a usable state.

While this was happening, the team stayed coordinated: we communicated clearly about the situation, developed a pack-up plan in case we needed to pivot the build entirely, and kept parallel work moving where possible. The experience validated one of the lessons captured in the deck — **tool-call sequencing and platform stability matter far more in a time-boxed hackathon than in a normal sprint**, because there's no buffer.

### Tool-Call Sequencing

Ada's reliability depends on strict ordering: every tool call must return a result before the next one fires. Getting this right took iteration. Letting calls run concurrently or out of sequence produced unstable, inconsistent recommendations — one of the less obvious constraints of building on LLM tool-use in a day.

### Data Fragmentation

Roadmaps and the service catalogue are spread across too many sources to aggregate reliably in a single day. Rather than try to ingest live data and risk accuracy, we grounded the POC in a hand-structured knowledge layer per product. Connecting to live data is the primary V2 unlock.

---

## Try It Out

The best way to demo Ada is to throw a real, messy customer problem at her — not a clean textbook scenario. Here are some prompts to get started, grouped by the product they're likely to surface.

### ScriptRunner for Jira

These are the kinds of problems that are genuinely painful to solve with native Jira automation alone:

> *"Every time a bug is marked as Critical, I need it to automatically get assigned to the on-call engineer, have its priority set to Highest, and trigger a notification to the #incidents Slack channel — but only during business hours."*

> *"We have a parent epic with 40 child stories. Whenever all the children are Done, the epic should automatically close. Right now someone has to do it manually every sprint and it always gets missed."*

> *"Our team leads need a weekly digest of all unresolved tickets assigned to their team that haven't been updated in more than 5 days — sent to them automatically, not something they have to remember to pull."*

> *"When a ticket is moved from 'In Progress' back to 'To Do', I want it to post a comment asking the assignee to leave a reason, and notify the project manager."*

### ScriptRunner for Confluence

> *"We create a new Confluence space for every client project, but we always have to manually copy the same template pages across and update them with the project name and date. It takes ages and people always forget a page."*

> *"I want to automatically archive Confluence pages that haven't been viewed or edited in over 6 months — but only in specific spaces, not globally."*

> *"Our project retrospective pages need to be created automatically at the end of each sprint, pre-filled with the sprint name, dates, and a link back to the Jira board."*

### ScriptRunner Connect

> *"We use Salesforce for CRM and Jira for delivery. When a deal moves to 'Closed Won' in Salesforce, we need a new Jira project to be created automatically with the right template, named after the account."*

> *"Our support tickets come in via Zendesk, but engineering works in Jira. Right now someone manually copies bug reports across. We need them to sync automatically, including status updates going both ways."*

> *"When a GitHub pull request is merged into main, I want the linked Jira ticket to move to 'In Review' and get a comment added with the PR link and the author's name."*

### Mosaic

> *"Our project managers spend every Monday morning manually building a resource allocation spreadsheet from Jira — who's working on what, how many story points, which projects are over capacity. We need that to just exist automatically."*

> *"I can't get a clear picture of which teams are blocked across all my active projects at once. I want a single view that shows me where things are stuck without having to click into every board."*

> *"We're struggling to forecast whether we'll hit our Q3 delivery targets. I need to see velocity trends and remaining scope in one place to have that conversation with leadership."*

### Edge Cases Worth Testing

These are great for checking Ada's guardrails — she should flag a gap rather than force a recommendation:

> *"We just want to send a reminder email to a user 3 days before a due date." (native Jira automation may be the right answer)*

> *"We're still on Data Center and want to know if this works the same way on Cloud."*

> *"We don't use Jira or Confluence — we're on Linear and Notion. Can any of your products help?"*

---

## Artefact Suggestions

Once Ada gives a recommendation, here are some follow-on prompts to explore what she can generate — useful for demoing the depth of the tool beyond the initial recommendation:

**Solution overview to share with a customer or stakeholder:**
> *"Can you create a solution overview I can share with the customer explaining how ScriptRunner solves this?"*

**Workflow diagram:**
> *"What does the end-to-end workflow look like? Can you map it out step by step?"*

**Ready-to-use script:**
> *"Can you write the ScriptRunner script for this?"*

**Discovery questions for a sales conversation:**
> *"What are the 3–5 questions I should ask in a discovery call to qualify this opportunity?"*

**Cross-sell angle:**
> *"Are there any other Adaptavist products that typically pair well with this recommendation?"*

**Migration framing:**
> *"The customer is currently on Data Center. How would this work differently on Cloud, and what's the migration story?"*

---

## Future Features

These are the directions we'd take Ada given more time:

**Unified Product Roadmaps**
Aggregate every TAG product roadmap in one place, pulling real-time data from existing docs rather than requiring anyone to maintain a separate source of truth.

**External-Facing Ada**
A customer-safe version of Ada — scrubbed of internal data — that channel partners and non-technical buyers can access directly via the website, a support widget, or a customer portal. Targets the 60%+ of B2B buyers who prefer to self-serve before speaking to sales.

**Service Catalogue Connector**
An API integration into the Adaptavist service catalogue so Ada can recommend services alongside products — and stay current automatically as the catalogue changes.

**Expanded Product Coverage**
The POC covers two products. V2 would extend the knowledge layer across the full portfolio, with a clear contribution workflow so product teams can keep their own entries current.

**DC-to-Cloud Migration Playbooks**
As Atlassian accelerates the Server/DC-to-Cloud transition, Ada could surface explicit migration mapping — showing Cloud equivalents for legacy setups and surfacing the right conversation for the CSM to have.

**CRM Integration**
Log Ada's recommendations directly into the CRM so cross-sell conversations are captured without adding manual steps for the rep.

---

## What Success Looks Like

- 40% reduction in basic "which product solves this?" Slack escalations
- 30% faster new starter ramp to call confidence
- 20–30% increase in CSM-initiated cross-sell conversations logged in CRM
- A live, single source of truth for the portfolio — not a stale wiki

---

*Built at Adaptavist Hack Day. Ask Ada.*
