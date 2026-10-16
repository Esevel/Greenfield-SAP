# Admin Portal Prototype

A multi-page clickable admin dashboard prototype built with Vite, HTML, CSS, and vanilla JavaScript.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The prototype will open at `http://localhost:3000`

## Project Structure

```
/
├── index.html              # Central prototype directory
├── pages/                  # Individual screen HTML files
│   ├── dashboard.html
│   └── users/
│       ├── list.html
│       └── detail.html
├── styles/
│   ├── tokens.css          # Design system variables
│   ├── layout.css          # Sidebar, header, page structure
│   ├── components.css      # Buttons, forms, tables, etc.
│   └── main.css            # Import all styles
├── scripts/
│   ├── navigation.js       # Shared sidebar/header loading
│   ├── components.js       # Component behaviors
│   └── main.js
├── templates/
│   ├── sidebar.html        # Shared sidebar markup
│   └── header.html         # Shared header markup
└── docs/
    ├── SCREENS.md          # Screen inventory
    └── AGENTS.md           # Project conventions
```

## Available Screens

- **Home** (`/`) - Central prototype directory
- **Dashboard** (`/pages/dashboard.html`) - Main overview with stats and activity
- **User List** (`/pages/users/list.html`) - Searchable user directory with filters
- **User Detail** (`/pages/users/detail.html`) - Individual user profile and edit form

## Features

### UI Components Demonstrated
- ✅ Stats cards with trend indicators
- ✅ Data tables with hover states
- ✅ Search and filter controls
- ✅ Tabs for content organization
- ✅ Modal dialogs
- ✅ Dropdown menus
- ✅ Pagination controls
- ✅ Status badges
- ✅ Form inputs and validation states
- ✅ Breadcrumb navigation

### Layout Features
- Fixed left sidebar with navigation
- Fixed header with search and user menu
- Responsive content area
- Automatic breadcrumb generation
- Active navigation highlighting

## Architecture

### Shared Layout System
Each page loads shared sidebar and header templates via JavaScript fetch. This keeps markup DRY without requiring a build step or template engine.

### Design System
All visual styling uses CSS variables defined in `tokens.css`:
- Colors, spacing, typography
- Borders, shadows, transitions
- Globally restyable through variable changes

### Navigation
All links use absolute paths from project root (e.g., `/pages/dashboard.html`) to work reliably regardless of nesting level.

## Development

### Adding New Screens
1. Create HTML file in `/pages/[section]/`
2. Use the standard page template (see AGENTS.md)
3. Add link to `/templates/sidebar.html`
4. Update `/docs/SCREENS.md` inventory

### Modifying Styles
- Edit design tokens in `styles/tokens.css`
- Adjust layout in `styles/layout.css`
- Add/modify components in `styles/components.css`

### Adding Interactions
- Edit `scripts/components.js` for UI component behaviors
- Edit `scripts/navigation.js` for navigation-related features

## Project Conventions

See [`docs/AGENTS.md`](docs/AGENTS.md) for complete architecture documentation and coding conventions.

## Important Notes

This is a **prototype**, not a production application:
- No real authentication or authorization
- No API calls or data fetching
- No form validation or submission
- No state persistence
- Interactions are demonstrative only
- Data is static and hardcoded

## Technology Stack

- **Vite** - Development server
- **HTML** - Page structure
- **CSS** - Styling with design tokens
- **Vanilla JavaScript** - Lightweight interactions

No frameworks, TypeScript, or backend required.
