---
title: "Using Claude Code: The Unreasonable Effectiveness of HTML"
source: "https://x.com/trq212/status/2052809885763747935"
author:
  - "[[@trq212]]"
published: 2026-05-09
created: 2026-05-09
description: "Markdown has become the dominant file format used by agents to communicate with us. It’s simple, portable, has some rich text capability and..."
tags:
  - "clippings"
---
![Image](https://pbs.twimg.com/media/HHz_ftzaIAAwkQs?format=jpg&name=large)

Markdown has become the dominant file format used by agents to communicate with us. It’s simple, portable, has some rich text capability and is easy for you to edit. Claude has even gotten surprisingly good at using ASCII to make diagrams inside of markdown files.

But as agents have become more and more powerful, I have felt that markdown has become a restricting format. I find it difficult to read a markdown file of more than a hundred lines. I want richer visualizations, color and diagrams and I want to be able to share them easily.

I'm also increasingly not editing these files myself, but using them as specs, reference files, brainstorming outputs, etc. When I do make edits, I’m usually prompting Claude to edit them, which removes one of markdown’s largest benefits.

I’ve started preferring HTML as an output format instead of Markdown and increasingly see this being used by others on the Claude Code team, this is why.

(if you want to start with some examples, you can see a bunch here: [https://thariqs.github.io/html-effectiveness](https://thariqs.github.io/html-effectiveness/), just be sure to come back and read more about why)

# Why HTML?

## Information Density

![Image](https://pbs.twimg.com/media/HHz_q48aAAAaCfW?format=jpg&name=large)

HTML can convey much richer information compared to markdown. It can of course do simple document structure like headers and formatting, but it can also represent all sorts of other information such as:

- Tabular data using tables
- Design data with CSS
- Illustrations with SVG
- Code snippets with script tags
- Interactions using HTML elements with javascript + CSS
- Workflows using SVG and HTML
- Spatial data using absolute positions and canvases
- Images using image tags

I would go so far as to say that there is almost no set of information that Claude can read that you cannot fairly efficiently represent with HTML. This makes it a highly efficient way for the model to communicate in-depth information to you and for you to revie wit.

I’ve found that in the absence of being able to do this, the model may do more inefficient things in markdown like ASCII diagrams or, my favorite, estimating colors with unicode characters like in this screenshot from Claude Code.

![Image](https://pbs.twimg.com/media/HH0CDc6a8AAy1bv?format=png&name=large)

Claude Code trying to show color in markdown

## Visual Clarity & Ease of Reading

![Image](https://pbs.twimg.com/media/HH0AgqJbcAAaEcZ?format=jpg&name=large)

As Claude is able to do more complex work, it is also writing larger and larger specs and plans. In practice, I've found I tend to not actually read more than a 100-line markdown file, and I certainly am not able to get anyone else in my organization to read it.

But HTML documents are much easier to read, Claude can organize the structure visually to be ideal to navigate with tabs, illustrations, links, etc. It can even be mobile responsive so you can read it differently based on your form factor.

## Ease of Sharing

Markdown files are fairly hard to share since most browsers do not render them natively well. You often have to add them as attachments to emails or messages.

With HTML, as long as you upload the file (for example to S3), you can share the link easily. Your colleagues can open it wherever they wish and easily reference it.

The chance of someone actually reading your spec, report or PR writeup is much much higher if it’s in HTML.

## Two-way Interaction

![Image](https://pbs.twimg.com/media/HH0Ao0tbYAAOF9e?format=jpg&name=large)

HTML can allow you to interact with the document, for example you might want to ask it to add sliders or knobs to adjust a design or allow you to tweak different options in the algorithm to see what happens. You can also ask it to let you copy these changes into a prompt to paste back into Claude Code. Read more about my playgrounds post to see examples of this two way interaction: [https://x.com/trq212/status/2017024445244924382](https://x.com/trq212/status/2017024445244924382)

**Data Ingestion**

Why use Claude Code to make HTML files instead of ClaudeAI or Claude Design for example? One of the biggest reasons is all the context Claude Code can ingest. For example, when writing this article, I asked Claude Code to read through my code folder and find all the HTML files I’ve generated, group and categorize them and then make an HTML file with all diagrams representing each type. The diagrams you see in this article are a direct result of that.

Besides the file system, Claude Code can find additional context using your MCPs (like Slack, Linear, etc.), your web browser (with Claude in Chrome), your git history, etc.

## It’s Joyful

Making HTML documents with Claude is just more fun and makes me feel more involved and invested in the creation, and that by itself is enough.

## How to Get Started

I’m a little bit afraid that people will read this article and turn it into a /html skill or something. While there might be some value in that, I want to emphasize that you don’t need to do much to get Claude to do this. You can just ask it to “make a HTML file” or “make a HTML artifact”.

The trick is knowing what you want the artifact to do and how you might use it. You may over time make a skill, but for now I’d suggest just prompting from scratch to get a hang of how to use it in different cases.

# Use Cases

To make this more concrete, I’ve made many different HTML files for different use cases. You can view all of them here: [https://thariqs.github.io/html-effectiveness/](https://thariqs.github.io/html-effectiveness/) but here’s an overview.

## Specs, Planning & Exploration

HTML is a rich canvas for Claude to dive into a problem. When I start working on a problem instead of a simple markdown plan I expect to make a web of HTML files. For example, I might start with asking Claude Code to brainstorm and create some explorations of different options. I would then ask it to expand more into one, maybe make mockups or code snippets. Finally, when I feel good I’ll ask it to write an implementation plan. When I’m happy with the plan I’ll create a new session and pass in all of these files for it to implement.

When verifying I’ll also ask the verification agent to read in the files and it will have much broader context on what is needed.

![Image](https://pbs.twimg.com/media/HH0BFWLbMAEk_7T?format=jpg&name=large)

**Example Prompts:**

- I'm not sure what direction to take the onboarding screen. Generate 6 distinctly different approaches — vary layout, tone, and density — and lay them out as a single HTML file in a grid so I can compare them side by side. Label each with the tradeoff it's making.
- Create a thorough implementation plan in a HTML file, be sure to make some mockups, show data flow and add important code snippets I might want to review. Make it easy to read and digest.

**Use Cases:**

- Exploring other ways to implement something in code
- Exploring multiple visual designs

## Code Review & Understanding

Code can be difficult to read in a Markdown file. But with HTML we can render diffs, annotations, flowcharts, modules, etc. Use this to understand code that the agent has written, to get code review or to explain a PR to someone reviewing your code. I find this often works better than the default Github diff view, and I attach a HTML code explainer to every PR I make now.

![Image](https://pbs.twimg.com/media/HH0BRSQbMAAuuof?format=png&name=large)

**Example prompt:**

Help me review this PR by creating an HTML artifact that describes it. I'm not very familiar with the streaming/backpressure logic so focus on that. Render the actual diff with inline margin annotations, color-code findings by severity and whatever else might be needed to convey the concept well.

**Use Cases:**

- Creating a PR
- Reviewing a PR
- Understanding a topic in Code

## Design & Prototypes

Claude Design is based on HTML because HTML is incredibly expressive at design, even if your end surface is not HTML. Claude can sketch out a design in HTML and then write it in your language of choice, be it React, Swift, etc.

You can also prototype interactions, such as animations, actions, etc. Consider asking Claude to make sliders, knobs, etc. to tune in exactly what you’re looking for.

![Image](https://pbs.twimg.com/media/HH0BXqjboAAHGsw?format=jpg&name=large)

**Example prompt:**

I want to prototype a new checkout button, when clicked it does a play animation and then turns purple quickly. Create a HTML file with several sliders and options for me to try different options on this animation, give me a copy button to copy the parameters that worked well.

**Use this for:**

- Creating design system artifacts
- Adjusting components
- Visualizing component libraries
- Prototyping Joyful Animations

## Reports, Research & Learning

Claude Code is incredibly good at synthesizing information across multiple data sources and converting it into a report for readability. You can prompt Claude to search your Slack, your codebase, git history, the internet, etc. and use it to generate extremely readable reports for yourself, for leadership, for your team, etc.

You could assemble this in the form of a long HTML document, an interactive explainer or even a slideshow/deck. Ask Claude to use SVG for diagrams to help visualize it. For example, for my posts on prompt caching, I asked Claude to prepare an in-depth research file in HTML for me to read on all of our changes to prompt caching after reading the git history.

![Image](https://pbs.twimg.com/media/HH0Bp86bUAAJDyZ?format=jpg&name=large)

**Example prompt:** I don't understand how our rate limiter actually works. Read the relevant code and produce a single HTML explainer page: a diagram of the token-bucket flow, the 3–4 key code snippets annotated, and a "gotchas" section at the bottom. Optimize it for someone reading it once.

**Use this for:**

- Summarize how a feature works
- Explain a concept to me
- Weekly status reports to your boss
- Incident reports to your leadership
- SVG illustrations, flowcharts, technical diagrams, etc

# Custom Editing Interfaces

Sometimes it’s hard to describe what you want purely in a text box. In this case, I'll ask Claude to build me a throwaway editor for the exact thing I'm working on. Not a product, or a reusable tool, but a single HTML file, purpose-built for this one piece of data.

The trick is always to end with an export: a "copy as JSON" or "copy as prompt" button that turns whatever I did in the UI back into something I can paste into Claude Code.

![Image](https://pbs.twimg.com/media/HH0FbKebUAAsRPr?format=jpg&name=large)

**Example prompts:**

- I need to reprioritize these 30 Linear tickets. Make me an HTML file with each ticket as a draggable card across Now / Next / Later / Cut columns. Pre-sort them by your best guess. Add a "copy as markdown" button that exports the final ordering with a one-line rationale per bucket.
- Here's our feature flag config. Build a form-based editor for it, group flags by area, show dependencies between them, warn me if I enable a flag whose prerequisite is off. Add a "copy diff" button that gives me just the changed keys.
- I'm tuning this system prompt. Make a side-by-side editor: editable prompt on the left with the variable slots highlighted, three sample inputs on the right that re-render the filled template live. Add a character/token counter and a copy button.

**Use this for:**

- Reordering, triaging, or bucketing anything (tickets, test cases, feedback)
- Editing structured config (feature flags, env vars, JSON/YAML with constraints)
- Tuning prompts, templates, or copy with live preview
- Curating datasets, approve/reject rows, tag examples, export the selection
- Annotating a document, transcript, or diff and exporting the annotations
- Picking values that are painful to express in text: colors, easing curves, crop regions, cron schedules, regexes.

## Frequently Asked Questions

I’ve been telling many people about how I’ve switched to HTML and I’ve seen a few repeated questions.

**Isn’t it less token efficient?** While markdown often uses fewer tokens, I’ve found that the added expressiveness of HTML and the much higher likelihood of me reading it means I get overall better output. With the 1MM context window in Opus 4.7, the increased token usage is not really noticeable in the context window.

**When do you use markdown for now?** I have honestly stopped using markdown altogether for almost everything, but I’m probably far on the HTML maximalist side of things.

**How do I view the HTML file?** I tend just open it in a browser locally (you can ask Claude to open it), or upload to S3 if you want a shareable link.

**Doesn't this take longer to generate than markdown?** This does take longer! HTML can take 2-4x longer than Markdown, but I've found the results are worth it.

**What about version control?** This is honestly one of the biggest downsides of HTML, HTML diffs are noisy and hard to review compared to Markdown.

**How do I get Claude to match my taste / not make it ugly?** The frontend design plugin helps Claude make good HTML files. But to match your own companies style, you can create a single design system HTML file by pointing Claude at your codebase. You can then use that design system file as a reference for other html files.

## Stay in the Loop

All of the above is to say that I think the real reason I use HTML is that I feel much more in the loop with Claude. I had begun to fear that because I had stopped reading plans in depth I would simply have to leave Claude to make its choices.

But I am happy to say instead that I feel more in the loop than ever before when using HTML. I hope you do too.