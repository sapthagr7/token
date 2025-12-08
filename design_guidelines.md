# Design Guidelines: Off-Chain RWA Tokenization Platform

## Design Approach
**Selected System: Carbon Design System** (IBM's enterprise design system)
**Rationale**: This is a data-heavy, compliance-focused financial platform requiring clarity, trust, and efficient information hierarchy. Carbon excels at complex data tables, form-heavy workflows, and role-based interfaces.

**Key Principles**:
- Data clarity over decoration
- Scannable information architecture
- Trust through structured, professional layouts
- Clear visual hierarchy for compliance statuses

---

## Typography System

**Font Stack**: IBM Plex Sans (via Google Fonts)

**Hierarchy**:
- **Display Headers** (H1): 2.5rem (40px), font-semibold - Page titles, asset names
- **Section Headers** (H2): 1.875rem (30px), font-semibold - Dashboard sections, table headers
- **Subsection** (H3): 1.5rem (24px), font-medium - Card titles, form sections
- **Body Large**: 1.125rem (18px), font-normal - Primary content, table cells
- **Body**: 1rem (16px), font-normal - Form labels, descriptions
- **Small/Caption**: 0.875rem (14px), font-normal - Metadata, timestamps, helper text
- **Data/Numeric**: 1rem, font-mono - Token amounts, prices, transaction IDs

---

## Layout System

**Container Widths**:
- Dashboard/App pages: `max-w-7xl mx-auto px-8`
- Auth pages: `max-w-md mx-auto px-4`
- Wide tables: `max-w-full px-8`

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Component padding: `p-6` or `p-8`
- Section margins: `mb-8` or `mb-12`
- Form field spacing: `space-y-4`
- Card gaps: `gap-6`
- Table cell padding: `px-4 py-2`

**Grid Layouts**:
- Dashboard cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Admin user list: Single column table with full width
- Marketplace orders: `grid grid-cols-1 lg:grid-cols-2 gap-8` (orders list + order form)

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with platform logo (left), navigation links (center), user menu with KYC badge (right)
- Height: `h-16`, items spaced with `gap-8`
- Sticky positioning on scroll

**Side Navigation** (Admin only):
- Collapsible sidebar (`w-64`) with icon + label navigation
- Section dividers between user management, asset management, compliance tools

### Data Display

**Status Badges**:
- Small, rounded pills for KYC status, order status, account freeze state
- Size: `px-3 py-1 text-sm rounded-full font-medium`
- Variants: Success (APPROVED), Warning (PENDING), Danger (REJECTED/FROZEN)

**Data Tables**:
- Striped rows for readability
- Fixed header row with sorting indicators
- Action column (right-aligned) with icon buttons
- Row height: `h-12`, cell padding: `px-4 py-2`
- Hover state on rows
- Pagination controls at bottom

**Cards**:
- Asset cards: `rounded-lg border shadow-sm p-6`
- Portfolio cards: Include asset thumbnail, token amount, current value, action buttons
- Stat cards: Large number display with label and trend indicator
- Card grid spacing: `gap-6`

**Forms**:
- Vertical form layout with `space-y-6`
- Label above input: `mb-2 text-sm font-medium`
- Input height: `h-12`, full width
- Multi-step forms: Progress indicator at top (stepper component)
- Required field indicators

### Dashboards

**Investor Dashboard**:
- Hero section with portfolio summary (3-4 stat cards showing total value, assets owned, active orders)
- "My Tokens" section: Grid of owned asset cards
- "Active Orders" section: Compact table of pending buy/sell orders
- Quick actions: "Browse Marketplace", "View Portfolio Details"

**Admin Dashboard**:
- KYC Queue section: List of pending KYC approvals with quick approve/reject actions
- System stats: Total users, assets, token supply, transfers (stat cards grid)
- Recent activity feed: Audit log preview (table)
- Quick actions: "Create Asset", "Manage Users", "View Full Audit"

### Marketplace

**Order Book Layout**:
- Two-column layout: Left = active sell orders (table), Right = place order form
- Order cards showing: Asset name, seller, token amount, price per token, total price, "Buy" button
- Filters: Asset type dropdown, price range slider

### Compliance Indicators

**KYC Status Display**:
- Prominent badge in user profile header
- Inline status in user tables with icon + text
- Verification progress bar for PENDING status

**Freeze Warning**:
- Full-width alert banner when account frozen (cannot be dismissed)
- Disabled state on all transaction buttons when frozen

**Audit Trail**:
- Timeline-style display with timestamp, action type, parties involved, token amount
- Filterable by date range, action type, user
- Export button for compliance reporting

---

## Images

**Usage**: Minimal imagery; this is a data-centric application

**Where to Include**:
- **Auth Pages**: Abstract geometric pattern background (low opacity) suggesting security/structure
- **Asset Cards**: Placeholder thumbnail for each asset type (building icon for real estate, commodity icons, document for loans)
- **Empty States**: Illustration when portfolio is empty or no marketplace orders

**No Hero Image**: This is an application, not a marketing site. Focus on immediate data display.

---

## Responsive Behavior

**Mobile** (<768px):
- Stack all multi-column layouts to single column
- Collapsible sidebar becomes hamburger menu
- Tables convert to stacked card view
- Reduce padding to `p-4`

**Tablet** (768px-1024px):
- Two-column grids where appropriate
- Maintain table layout with horizontal scroll if needed

**Desktop** (>1024px):
- Full multi-column layouts
- Fixed sidebar for admin navigation
- Expanded data tables with all columns visible