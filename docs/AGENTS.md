# Project Conventions and Constraints

This document defines the architecture, conventions, and constraints for the Admin Portal prototype. **Follow these rules when generating or modifying any code in this project.**

---

## Project Overview

**Purpose:** Multi-page clickable admin dashboard prototype  
**Goal:** 40-80 screens demonstrating UI patterns and navigation  
**Not included:** Real APIs, authentication, databases, or data persistence

---

## Technology Stack

### Required
- **Vite** for local development server
- **HTML** for individual pages
- **Plain CSS** for styling (design tokens, layout, components)
- **Vanilla JavaScript** for lightweight interactions

### Prohibited
- ❌ React, Next.js, Vue, Angular, or any UI framework
- ❌ shadcn/ui or large component libraries
- ❌ TypeScript
- ❌ Backend or database
- ❌ Build tools beyond Vite
- ❌ Unnecessary npm packages

---

## Architecture Principles

### File Structure
```
/
├── index.html                  # Central prototype directory
├── pages/                      # Individual screen HTML files
│   ├── dashboard.html
│   └── [section]/
│       ├── list.html
│       └── detail.html
├── styles/
│   ├── tokens.css              # Design system variables
│   ├── layout.css              # Sidebar, header, page structure
│   ├── components.css          # Buttons, forms, tables, etc.
│   └── main.css                # Import all styles
├── scripts/
│   ├── navigation.js           # Shared sidebar/header loading
│   ├── components.js           # Component behaviors (tabs, modals, etc.)
│   └── main.js
├── templates/
│   ├── sidebar.html            # Shared sidebar markup
│   └── header.html             # Shared header markup
├── assets/                     # Images, icons
├── docs/
│   ├── SCREENS.md              # Screen inventory
│   └── AGENTS.md               # This file
├── package.json
└── vite.config.js
```

### Shared Layout Approach
- Sidebar and header markup live in `/templates/`
- Each page loads templates via JavaScript fetch
- Navigation is initialized after templates load
- All pages use absolute paths from project root (e.g., `/pages/dashboard.html`)

---

## HTML Page Template

Every screen must follow this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Page Title] - Admin Portal</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <div class="app-container">
    <div id="sidebar-container"></div>
    
    <main class="main-content">
      <div id="header-container"></div>
      
      <div class="page-content">
        <div class="page-header">
          <h1 class="page-title">[Page Title]</h1>
          <p class="page-description">[Brief description]</p>
        </div>
        
        <!-- Page content here -->
      </div>
    </main>
  </div>
  
  <script src="/scripts/navigation.js"></script>
  <script src="/scripts/components.js"></script>
  <script src="/scripts/main.js"></script>
</body>
</html>
```

**Critical requirements:**
- Include `#sidebar-container` and `#header-container` for template injection
- Use absolute paths (starting with `/`) for all CSS, JS, and navigation links
- Load scripts in order: navigation.js, components.js, main.js
- Use `.app-container` → `.main-content` → `.page-content` layout structure

---

## CSS Conventions

### Design Tokens
All design values must use CSS variables from `tokens.css`:
- Colors: `var(--color-primary)`, `var(--color-text-primary)`, etc.
- Spacing: `var(--space-sm)`, `var(--space-md)`, `var(--space-lg)`, etc.
- Typography: `var(--font-size-base)`, `var(--font-weight-semibold)`, etc.
- Borders: `var(--border-radius-md)`, `var(--border-width)`
- Shadows: `var(--shadow-sm)`, `var(--shadow-md)`

**Never use hardcoded values.** This ensures consistent, globally restyable design.

### Component Classes
Use existing component classes from `components.css`:
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`
- Forms: `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`
- Cards: `.card`, `.card-header`, `.card-title`, `.card-body`
- Tables: `.table-container`, `.table`
- Badges: `.badge`, `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`
- Tabs: `.tabs`, `.tab-button`, `.tab-content`
- Modals: `.modal-overlay`, `.modal`, `.modal-header`, `.modal-body`, `.modal-footer`
- Dropdowns: `.dropdown`, `.dropdown-toggle`, `.dropdown-menu`
- Pagination: `.pagination`, `.pagination-button`

**Do not create new component styles unless absolutely necessary.**

---

## JavaScript Conventions

### Navigation (`navigation.js`)
- Loads sidebar and header templates via fetch
- Highlights active navigation item
- Generates breadcrumbs from URL path
- Initializes dropdown menus

### Components (`components.js`)
- Tab switching
- Modal open/close
- Pagination clicks
- Other lightweight interactions

**Rules:**
- Keep JavaScript minimal and declarative
- Use data attributes for component triggers (e.g., `data-modal-open`, `data-tab`)
- Do not implement real business logic
- Use `console.log` for demo actions instead of real API calls

---

## Navigation & Links

### Rules
1. **Always use absolute paths** starting with `/`
   - ✅ `/pages/dashboard.html`
   - ❌ `../dashboard.html` or `pages/dashboard.html`
2. All navigation links go in `/templates/sidebar.html`
3. Active state is managed automatically by `navigation.js`
4. Use `data-page` attribute for section-based active highlighting

### Adding New Screens
1. Create HTML file in `/pages/[section]/`
2. Add link to `/templates/sidebar.html`
3. Update `/docs/SCREENS.md` inventory
4. Update `/index.html` if it's a primary screen

---

## Design Guidelines

### Visual Style
- Clean, understated admin aesthetic
- Neutral background (`--color-background: #f5f5f5`)
- White content surfaces (`--color-surface: #ffffff`)
- Single accent color (`--color-primary: #3b82f6`)
- Subtle borders and shadows
- Consistent spacing and typography

### Layout
- Fixed-width left sidebar (240px)
- Fixed-height top header (64px)
- Breadcrumbs in header
- Page title and description at top of content

### States
- Hover states on all interactive elements
- Active state on current navigation item
- Disabled state for unavailable actions
- Focus states for form inputs

---

## Working Rules

### When Editing Code
1. **Read before writing:** Always read existing files before modifying
2. **Stay consistent:** Match existing patterns and conventions
3. **Keep it simple:** Do not create abstractions more complex than the problem
4. **Use believable data:** Mock data should look realistic
5. **No unnecessary rewrites:** If it works, don't change it

### When Adding Features
1. **Check existing components first:** Reuse before creating new
2. **Update documentation:** Add entries to SCREENS.md
3. **Test navigation:** Ensure links work from nested directories
4. **Keep interactions lightweight:** Prototype-level only

### When Creating New Screens
1. Follow the HTML page template exactly
2. Use existing CSS classes
3. Add realistic mock data
4. Include all three JavaScript files
5. Use absolute paths for all links

---

## Development Commands

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # Build for production (optional)
npm run preview   # Preview production build
```

---

## Known Limitations

This is a **prototype**, not a production application:
- No real authentication or authorization
- No API calls or data fetching
- No form validation or submission
- No state persistence
- Interactions are demonstrative only
- Data is static and hardcoded

---

## Summary Checklist

When working on this project, ensure:
- ✅ Using HTML, CSS, and vanilla JavaScript only
- ✅ Following the standard HTML page template
- ✅ Using absolute paths for all links and resources
- ✅ Reusing existing CSS component classes
- ✅ Loading templates via navigation.js
- ✅ Keeping JavaScript lightweight and declarative
- ✅ Using CSS variables for all design values
- ✅ Adding new screens to SCREENS.md
- ✅ Testing navigation from multiple entry points
- ❌ Not adding frameworks, TypeScript, or unnecessary dependencies
- ❌ Not implementing real business logic or APIs
- ❌ Not creating new CSS component patterns without justification
