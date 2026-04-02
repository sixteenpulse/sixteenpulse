# 16Pulse — Full Project Context for AI Assistance

> Feed this file to Gemini (or any AI) at the start of a session so it understands the entire codebase without needing to re-explore it.

---

## 1. What Is 16Pulse?

16Pulse is a **multi-tenant booking CRM dashboard** for small service businesses (salons, studios, consultants, etc.). It wraps around Cal.id (Cal.com) — businesses connect their Cal.id API key and 16Pulse pulls all their bookings, shows analytics, lets them manage clients, and auto-syncs via webhooks.

**Live stack:**
- **Framework:** Next.js 15.1.0 (App Router, React 19)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Database:** PostgreSQL via Supabase (free tier, 500 MB limit)
- **ORM:** Prisma 6.x
- **Auth:** iron-session (encrypted cookie sessions, cookie name `crm_session`)
- **Passwords:** bcryptjs (10 rounds)
- **Scheduling API:** Cal.id API v2 (`calid_` prefix keys)
- **Deployment target:** Vercel (with cron jobs)
- **Fonts:** Inter (body, `--font-sans`) + DM Serif Display (page headings, `--font-serif`)

---

## 2. Repository Structure

```
e:\CAL ID APP\
├── prisma/
│   └── schema.prisma          ← DB schema (Tenant, User, CalConnection, Booking, Client)
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Root layout: Inter + DM Serif Display fonts
│   │   ├── globals.css         ← Tailwind v4 + custom cream/accent utilities
│   │   ├── not-found.tsx       ← 404 page
│   │   ├── error.tsx           ← Global error boundary
│   │   ├── login/page.tsx      ← Login form
│   │   ├── signup/page.tsx     ← Signup / create workspace
│   │   ├── (dashboard)/        ← Protected layout group (requires session)
│   │   │   ├── layout.tsx      ← Dashboard shell (Sidebar + Header + MobileNav + RealtimeSync)
│   │   │   ├── page.tsx        ← Today view (today's bookings)
│   │   │   ├── loading.tsx     ← Dashboard skeleton
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx    ← Bookings table (search, filter, paginate)
│   │   │   │   ├── loading.tsx ← Bookings skeleton
│   │   │   │   └── [id]/page.tsx ← Booking detail
│   │   │   ├── calendar/page.tsx   ← Calendar view (week/month/day)
│   │   │   ├── clients/page.tsx    ← Clients table
│   │   │   ├── insights/page.tsx   ← Revenue/stats dashboard
│   │   │   └── settings/page.tsx   ← Profile, Cal.id connection, event type filter
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── signup/route.ts
│   │       │   └── logout/route.ts
│   │       ├── bookings/
│   │       │   ├── route.ts         ← GET (list) + POST (create via Cal.id)
│   │       │   └── [id]/route.ts    ← GET + PATCH (status, amount) + DELETE
│   │       ├── clients/
│   │       │   ├── route.ts         ← GET + POST
│   │       │   └── [id]/route.ts    ← GET + PATCH + DELETE
│   │       ├── sync/route.ts        ← POST: pull all bookings from Cal.id API
│   │       ├── webhooks/cal/route.ts ← GET (ping) + POST (Cal.id webhook events)
│   │       ├── cleanup/route.ts     ← GET: delete old bookings (Vercel cron)
│   │       ├── connections/api-key/route.ts ← POST: save Cal.id API key
│   │       ├── event-types/route.ts ← GET event types from Cal.id
│   │       ├── event-types/[id]/route.ts
│   │       ├── live-bookings/route.ts ← GET: today's live bookings (SSE-friendly)
│   │       ├── export/bookings/route.ts ← GET: CSV export
│   │       ├── schedules/route.ts
│   │       ├── schedules/[id]/route.ts
│   │       └── tenant/route.ts      ← GET + PATCH tenant settings
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     ← Fixed left sidebar (desktop only)
│   │   │   ├── Header.tsx      ← Top bar (h-14, tenant name, logout)
│   │   │   └── MobileNav.tsx   ← Bottom tab bar (mobile)
│   │   ├── bookings/
│   │   │   ├── NewBookingModal.tsx      ← Modal to create a booking
│   │   │   ├── BookingRowActions.tsx    ← Three-dot menu in bookings table
│   │   │   ├── BookingDetailActions.tsx ← Complete/cancel/delete on detail page
│   │   │   ├── BookingLiveDetails.tsx   ← Live fields section on detail page
│   │   │   └── AmountCell.tsx           ← Inline amount editor in table
│   │   ├── calendar/
│   │   │   └── CalendarView.tsx ← Full calendar component (day/week/month)
│   │   ├── ui/
│   │   │   ├── SearchInput.tsx  ← URL-param search box
│   │   │   ├── ExportButton.tsx ← Download CSV
│   │   │   └── Pagination.tsx   ← Page controls
│   │   └── RealtimeSync.tsx     ← Auto-sync component (polls Cal.id on interval)
│   ├── lib/
│   │   ├── auth.ts            ← getSession() using iron-session
│   │   ├── session.ts         ← Session options + SessionData type
│   │   ├── prisma.ts          ← Prisma singleton (dev HMR safe)
│   │   ├── encryption.ts      ← AES-256-GCM encrypt/decrypt for API keys
│   │   ├── calcom-api.ts      ← CalComClient class + helpers
│   │   ├── event-filter.ts    ← getEventTypeFilter() helper
│   │   ├── booking-utils.ts   ← extractPhone(), extractLocation() from metadata
│   │   └── utils.ts           ← cn() (clsx + tailwind-merge)
│   └── middleware.ts          ← Edge middleware: redirect unauthenticated → /login
├── vercel.json                ← Cron: POST /api/cleanup every Sunday 3AM UTC
├── next.config.ts             ← serverExternalPackages, eslint.ignoreDuringBuilds
└── .env                       ← DATABASE_URL, DIRECT_URL, SESSION_SECRET, ENCRYPTION_KEY, CRON_SECRET
```

---

## 3. Database Schema

```prisma
model Tenant {
  id            String          @id @default(cuid())
  name          String
  slug          String          @unique
  logo_url      String?
  brand_name    String?
  primary_color String?
  created_at    DateTime        @default(now())
  users         User[]
  calConnections CalConnection[]
  bookings      Booking[]
  clients       Client[]
}

model User {
  id            String   @id @default(cuid())
  tenant_id     String
  name          String
  email         String   @unique
  password_hash String
  role          Role     @default(MEMBER)  // ADMIN | MEMBER
  created_at    DateTime @default(now())
}

model CalConnection {
  id             String           @id @default(cuid())
  tenant_id      String
  name           String
  cal_account_id String
  auth_type      AuthType         // API_KEY | OAUTH
  access_token   String           // AES-256-GCM encrypted
  refresh_token  String?
  status         ConnectionStatus // CONNECTED | DISCONNECTED | ERROR
  last_synced_at DateTime?
  metadata       Json?            // fieldLabelsMap cache, labelsLastFetched
  created_at     DateTime         @default(now())
  @@unique([tenant_id, cal_account_id])
}

model Booking {
  id                String        @id @default(cuid())
  tenant_id         String
  cal_connection_id String
  cal_booking_id    String        // numeric ID from Cal.id
  event_type_id     String
  event_type_name   String
  host_name         String
  host_email        String
  attendee_name     String
  attendee_email    String
  status            BookingStatus // SCHEDULED | CANCELLED | COMPLETED | RESCHEDULED | OTHER
  start_time        DateTime
  end_time          DateTime
  created_at        DateTime
  updated_at        DateTime
  amount            Float?        // manually set or auto from Cal.id paid price
  metadata          Json?         // uid, responses, attendees, location, eventType, paid, bookingFieldLabels
  inserted_at       DateTime      @default(now())
  updated_local_at  DateTime      @updatedAt
  @@unique([cal_connection_id, cal_booking_id])
}

model Client {
  id         String       @id @default(cuid())
  tenant_id  String
  name       String
  email      String
  phone      String?
  notes      String?
  tags       String[]     @default([])
  created_at DateTime     @default(now())
  updated_at DateTime     @updatedAt
  clientNotes ClientNote[]
  @@unique([tenant_id, email])
}

model ClientNote {
  id         String   @id @default(cuid())
  client_id  String
  content    String
  created_by String
  created_at DateTime @default(now())
}
```

---

## 4. Design System (Claude.ai-Inspired)

The UI was redesigned to match Claude.ai's warm, minimal aesthetic.

### Color Palette (defined in `@layer utilities` in `globals.css`)

| Class | Hex | Usage |
|---|---|---|
| `bg-cream` | `#f0ede6` | Page background |
| `bg-cream-dark` | `#ebe5db` | Sidebar, table `<thead>`, secondary areas |
| `bg-warm-white` | `#faf9f7` | Cards, tables, modals |
| `border-warm` | `#e4ddd4` | Default border on all cards/inputs |
| `border-warm-dark` | `#d6cfc5` | Hover border on cards |
| `bg-accent` | `#da7756` | Primary coral button, active nav icon |
| `text-accent` | `#da7756` | Active nav label, links |
| `hover:bg-accent-hover` | `#c4684a` | Pressed primary button |
| `bg-accent-light` | `#fdf4f1` | "Upcoming" status badge background |

### Typography
- **Body:** Inter, `font-sans`, `antialiased`
- **Page headings (h1):** `font-display text-2xl font-normal text-stone-900` — uses DM Serif Display via `--font-serif`
- **Table headers:** `font-medium text-[13px] text-stone-500` — sentence case, NO uppercase
- **Secondary text:** `text-stone-400`
- **Small labels:** `text-xs font-medium text-stone-400`

### Rules
- **No shadows** — `shadow-sm/md/lg/2xl` are not used anywhere
- **No backdrop-blur** — removed entirely
- **Rounded:** `rounded-lg` for inputs/buttons, `rounded-xl` for cards/modals, `rounded-md` for badges/tabs, `rounded-full` for avatars only
- **Transitions:** `transition-colors duration-150` on all interactive elements (links, buttons, table rows)
- **Focus rings:** `focus:ring-1 focus:ring-[#da7756]/30` (not ring-2)

### Status Badges
```tsx
SCHEDULED  → bg-accent-light text-accent      ("Upcoming")
COMPLETED  → bg-emerald-50 text-emerald-600   ("Completed")
CANCELLED  → bg-red-50 text-red-500           ("Cancelled")
RESCHEDULED → bg-amber-50 text-amber-600      ("Rescheduled")
```

---

## 5. Authentication Flow

1. **Signup** (`POST /api/auth/signup`): Creates `Tenant` + `ADMIN` `User` in a transaction. Sets iron-session cookie `crm_session`.
2. **Login** (`POST /api/auth/login`): Verifies bcrypt hash, sets session cookie.
3. **Logout** (`GET /api/auth/logout`): Destroys session, redirects to `/login`.
4. **Middleware** (`src/middleware.ts`): Edge function checks for `crm_session` cookie. Unauthenticated non-API requests → `/login`. Authenticated users on `/login` or `/signup` → `/`.
5. **Server-side auth check**: Every dashboard page and API route calls `getSession()` which uses `getIronSession()`. Returns `null` if cookie missing/invalid.

### Session Data Shape
```ts
interface SessionData {
  user?: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "MEMBER";
    tenant_id: string;
  };
}
```

---

## 6. Cal.id Integration

### Connection Setup
1. User enters their Cal.id API key (`calid_...`) in Settings
2. `POST /api/connections/api-key` encrypts the key with AES-256-GCM (`lib/encryption.ts`) and saves to `CalConnection`
3. `lib/calcom-api.ts` has `CalComClient` class that wraps Cal.id v2 API endpoints

### Sync Flow (`POST /api/sync`)
1. Takes `{ connectionId }` in body
2. Fetches all active + cancelled bookings from Cal.id
3. Maps Cal.id status → internal `BookingStatus` enum
4. Past "accepted" bookings are auto-marked `COMPLETED`
5. Upserts each booking using `@@unique([cal_connection_id, cal_booking_id])`
6. Uses **numeric booking ID** (not UID) as `cal_booking_id` — migrates old UID records automatically
7. Caches `fieldLabelsMap` in `CalConnection.metadata` (refreshes every 30 min in background)
8. Updates `last_synced_at`

### Webhook Flow (`POST /api/webhooks/cal`)
Handles these events: `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_REJECTED`, `BOOKING_RESCHEDULED`, `BOOKING_COMPLETED`, `BOOKING_NO_SHOW`, `BOOKING_PAYMENT_INITIATED`

Updates or creates the booking in Postgres. Returns `200` always (even on error) to prevent Cal.id retry loops.

### Amount Handling
- `amount` field on `Booking` is `Float?` (nullable)
- Set automatically if `booking.paid === true && eventType.price > 0` (price/100 for cents→dollars)
- Can be manually edited in the dashboard via `AmountCell` component
- Manual amounts are preserved during sync (only overwritten if Cal.id confirms payment)

---

## 7. Dashboard Pages

### Today (`/`)
- Server component — fetches today's bookings for `tenant_id`
- Filters by `getEventTypeFilter()` if the tenant has configured a filter
- Shows separate upcoming vs. past counts
- Each card links to `/bookings/[id]`
- Status badge: "Done" (green), "Pending" (beige), "Upcoming" (coral)

### Bookings (`/bookings`)
- Full sortable table with search (`?q=`), status filter tabs (`?status=`), pagination (20/page)
- `AmountCell` for inline amount editing (pencil icon → input → save)
- `BookingRowActions` three-dot menu: View Details, Mark Complete, Cancel, Delete
- `ExportButton` → `GET /api/export/bookings` → CSV download
- `NewBookingButton` opens `NewBookingModal`

### Booking Detail (`/bookings/[id]`)
- Shows all booking fields from `metadata` using `bookingFieldLabels` for human-readable labels
- `BookingDetailActions`: Complete, Cancel (with reason input), Delete (with confirmation)
- `BookingLiveDetails`: dynamic fields rendered from `metadata.responses`

### Calendar (`/calendar`)
- Client component with day/week/month views
- Fetches from `GET /api/bookings` (filtered)
- Navigation with prev/next/today buttons

### Clients (`/clients`)
- Table of deduplicated clients (name, email, phone, tags, notes)
- Can add/edit/delete clients
- Notes per client stored in `ClientNote`

### Insights (`/insights`)
- Revenue KPIs (total, this month, average)
- Booking counts by status
- Bar chart (weekly activity) — pure CSS, no recharts

### Settings (`/settings`)
- Profile: update name, email, business name
- Cal.id connection: connect/disconnect, last synced, manual sync button
- Event type filter: choose which event types to show in dashboard
- Danger zone: delete account

---

## 8. Key Library Files

### `src/lib/booking-utils.ts`
```ts
// Extracts phone from booking metadata.responses
export function extractPhone(metadata: any): string | null

// Extracts location from metadata (location field or responses.location.optionValue)
export function extractLocation(metadata: any): string | null
```

### `src/lib/event-filter.ts`
```ts
// Returns array of event type names to filter by, or null if no filter set
export async function getEventTypeFilter(tenantId: string): Promise<string[] | null>
```

### `src/lib/encryption.ts`
AES-256-GCM using `ENCRYPTION_KEY` env var (32-byte hex). Used to store Cal.id API keys encrypted at rest.

### `src/lib/calcom-api.ts`
```ts
class CalComClient {
  constructor(apiKey: string)  // calid_... key
  getBookings(opts?: { status?: string }): Promise<any[]>
  createBooking(opts): Promise<any>
  getEventTypes(): Promise<any[]>
  // ... etc
}
export async function fetchBookingFieldLabels(profileSlug, eventTypeSlug): Promise<{name, label}[]>
export async function discoverProfileSlug(client: CalComClient): Promise<string | null>
```

---

## 9. Auto-Cleanup (Vercel Cron)

**File:** `src/app/api/cleanup/route.ts`

```ts
// GET /api/cleanup
// Authorization: Bearer <CRON_SECRET>
// Deletes COMPLETED/CANCELLED bookings older than 90 days
```

**Schedule:** `vercel.json` → `"schedule": "0 3 * * 0"` (every Sunday 3AM UTC)

**Purpose:** Keep Supabase free tier (500 MB) clean. 50 clients × ~10 bookings/week × 90 days ≈ manageable.

---

## 10. Environment Variables

```env
DATABASE_URL="postgresql://..."      # Supabase pooler URL (for Prisma queries)
DIRECT_URL="postgresql://..."        # Supabase direct URL (for Prisma migrations)
SESSION_SECRET="..."                  # 32+ char secret for iron-session cookie encryption
ENCRYPTION_KEY="..."                  # 32-byte hex for AES-256-GCM (Cal.id key storage)
CRON_SECRET="..."                     # Bearer token for /api/cleanup
```

---

## 11. Known Issues / Constraints

### Supabase Free Tier Connection Pooling
- Connection limit: 1 (with pooler URL)
- Under heavy concurrent load (multiple Prisma queries at once), you may see:
  - `P2024: Timed out fetching a new connection from the connection pool`
  - `P1001: Can't reach database server`
- These are transient and self-resolve. Not a code bug.
- Fix if needed: upgrade Supabase tier, or use `pgbouncer` session mode.

### ESLint Flat Config Bug
- `eslint-config-next` with flat config format causes `nextVitals is not iterable` error
- Fixed by `eslint: { ignoreDuringBuilds: true }` in `next.config.ts`
- `npm run lint` still works separately

### Tailwind v4 Custom Classes Rule
- **CRITICAL**: In Tailwind v4, `@theme` tokens do NOT auto-generate utility classes
- ALL custom classes must be defined in `@layer utilities` in `globals.css`
- Custom colors use `@layer utilities { .bg-cream { background-color: #f0ede6; } }`
- One-off colors use arbitrary values: `bg-[#e4ddd4]`

---

## 12. Build Status

```
npx next build  →  ✓ All 26 routes compiled cleanly
Bundle: ~105 kB shared JS (no framer-motion, no recharts)
```

Routes:
- Static: `/`, `/bookings`, `/calendar`, `/clients`, `/insights`, `/login`, `/signup`, `/settings`
- Dynamic: `/bookings/[id]`
- API: 16 route handlers (all serverless functions)

---

## 13. Sidebar Navigation

```
Today       /            (LayoutDashboard icon)
Bookings    /bookings    (BookOpen icon)
Calendar    /calendar    (CalendarDays icon)
Clients     /clients     (Users icon)
Insights    /insights    (Activity icon)
Settings    /settings    (Settings icon)
```

Active state: `bg-warm-white text-accent` + `text-accent` icon (no border box)
Inactive state: `text-stone-500 hover:text-stone-900 hover:bg-[#ddd8ce]`

---

## 14. Multi-Tenancy Model

- Every `Booking`, `Client`, `CalConnection` belongs to a `Tenant`
- All queries are scoped by `tenant_id` from the session
- A user can only belong to one tenant
- First user to sign up for a business becomes `ADMIN`
- No cross-tenant data leakage (all Prisma queries use `where: { tenant_id }`)

---

## 15. How to Continue Development

When asking Gemini to work on this project:

1. **Reference this file** at the start of every session so it knows the architecture
2. **Tailwind v4 rule**: Any new custom color must go in `@layer utilities` in `globals.css`
3. **Design rule**: Match the warm cream aesthetic — no shadows, no backdrop-blur, `rounded-xl` for cards, `rounded-lg` for inputs, `font-display` for page h1 titles
4. **Auth pattern**: Server pages call `getSession()` → redirect if null. API routes call `getSession()` → return 401 if null
5. **Prisma pattern**: Always scope queries with `tenant_id: session.user.tenant_id`
6. **Cal.id sync**: Use `cal_booking_id = numericId` (not UID) as the unique key
7. **Build check**: Run `npx next build` after changes to confirm zero errors

---

*Generated: 2026-02-27 | Project: 16Pulse | Stack: Next.js 15 + Prisma + Supabase + Tailwind v4*
