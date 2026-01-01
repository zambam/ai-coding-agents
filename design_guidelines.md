# Design Guidelines: AI Coding Agents Platform

## Design Approach

**System:** Developer Tool Design Pattern (inspired by Linear + GitHub)
**Rationale:** This is a utility-focused developer tool where clarity, trust, and efficiency are paramount. Users need to understand agent capabilities, view metrics clearly, and interact with code outputs confidently.

## Core Design Principles

1. **Information Clarity:** Technical content (code, metrics, reasoning steps) must be immediately scannable
2. **Trust Through Transparency:** Every agent action shows reasoning, confidence scores, and validation status
3. **Functional Minimalism:** Remove decorative elements; every component serves user tasks
4. **Developer-Familiar Patterns:** Use conventions developers recognize from IDEs and dev tools

## Typography

**Font Stack:**
- Headings: Inter (600, 700 weights)
- Body: Inter (400, 500 weights)  
- Code: JetBrains Mono (400, 500 weights)

**Hierarchy:**
- Hero/Page Titles: text-4xl md:text-5xl font-bold
- Section Headers: text-2xl md:text-3xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base
- Captions/Metrics: text-sm
- Code Blocks: text-sm font-mono

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-24
- Card gaps: gap-6
- Inline spacing: space-x-4 or space-y-4

**Container Strategy:**
- Full-width sections with max-w-7xl centered content
- Code editors/outputs: max-w-full within container
- Documentation: max-w-4xl for readability
- Dashboard grids: Responsive columns (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

## Component Library

### Navigation
- Fixed top navbar with logo, main nav links, GitHub link
- Transparent background with backdrop blur on scroll
- Mobile: Hamburger menu with slide-out drawer

### Hero Section (Homepage)
- Clean, centered layout (no large background image)
- Prominent heading explaining the four agent personas
- Code snippet preview showing agent usage example
- CTA buttons: "Try Demo" (primary) + "View Docs" (secondary)
- Trust indicators: npm downloads, GitHub stars, version badge

### Agent Cards (Four Personas)
- 2x2 grid on desktop, stacked on mobile
- Each card contains:
  - Icon representing persona (use Heroicons)
  - Agent name as heading
  - Tagline in subdued text
  - 2-3 bullet points of key capabilities
  - "Learn More" link
- Hover: Subtle elevation change (shadow-md to shadow-lg)

### Interactive Playground
- Split-pane layout:
  - Left: Input area (agent selection dropdown, text area for prompt, configuration options)
  - Right: Output area (tabbed interface: Response, Reasoning Steps, Metrics)
- Sticky agent selector at top of input pane
- Code output in syntax-highlighted blocks
- Reasoning visualization as expandable accordion steps

### Metrics Dashboard
- 3-column grid for CLASSic metrics (Cost, Latency, Accuracy, Security, Stability)
- Each metric card shows:
  - Metric name with icon
  - Large numeric value
  - Trend indicator (up/down arrow with percentage)
  - Sparkline chart for historical data
- Response structure visualization using tree/nested list format

### Code Display Areas
- Dark editor theme for code blocks (GitHub Dark or similar)
- Syntax highlighting for TypeScript/JavaScript
- Copy button in top-right corner
- Line numbers for longer snippets
- Inline annotations for confidence scores

### Documentation Sections
- Left sidebar navigation (sticky)
- Main content area with max-w-4xl
- Table of contents for long pages
- Code examples in collapsible sections
- Info/warning callouts for important notes

### Footer
- Simple 3-column layout:
  - Column 1: Logo + tagline
  - Column 2: Quick links (Docs, Playground, GitHub)
  - Column 3: Social links + version info
- Minimal padding (py-12)

## Animations

**Extremely Minimal:**
- Hover states: Subtle scale (scale-105) or opacity change (opacity-80)
- Page transitions: None
- Metric updates: Smooth number counter animation
- Accordion expand/collapse: Simple height transition (duration-200)

## Accessibility

- All interactive elements keyboard navigable
- Focus states: Visible outline (ring-2 ring-offset-2)
- ARIA labels for icon-only buttons
- Contrast ratios meet WCAG AA standards
- Screen reader friendly metric announcements

## Images

**No large hero image.** This is a developer tool - focus on clarity and code examples over visual storytelling.

**Icon Strategy:**
- Use Heroicons for UI icons (outline style)
- Custom agent persona icons (simple, geometric representations):
  - Architect: Blueprint/Grid icon
  - Mechanic: Wrench/Tool icon
  - Code Ninja: Lightning/Code icon
  - Philosopher: Brain/Lightbulb icon

## Page-Specific Guidelines

**Landing Page:**
1. Hero with centered messaging
2. Four agent persona cards
3. "How It Works" section (3-step process with numbered icons)
4. Code example showcase
5. Metrics/reliability section highlighting CLASSic framework
6. CTA section ("Get Started" with npm install command)

**Playground Page:**
- Full-width layout (no max-width constraint)
- Persistent agent selector toolbar
- Split-pane with resizable divider
- Real-time validation feedback
- Results displayed in tabs

**Documentation:**
- Traditional docs layout with sidebar nav
- Breadcrumb navigation
- On-page TOC for long articles
- Inline code examples throughout
- Quick-start guide prominent in navbar

This design prioritizes developer trust through transparency, efficiency through familiar patterns, and usability through clear information hierarchy.