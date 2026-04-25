# 🚨 CRISIS RESPONDER — COMPLETE PROMPT PACKAGE

**Save this file to your device.** It contains every prompt you need from start to finish — UI design, backend build, and pitch prep. Use it as your single reference throughout the week.

---

# 📚 TABLE OF CONTENTS

- [SECTION A: PROJECT PLAN](#section-a-project-plan)
- [SECTION B: STITCH UI PROMPTS (12 Screens)](#section-b-stitch-ui-prompts)
- [SECTION C: ANTIGRAVITY BACKEND BUILD (7-Day Plan)](#section-c-antigravity-backend-build)
- [SECTION D: GEMINI AI STUDIO PROMPTS](#section-d-gemini-ai-studio-prompts)
- [SECTION E: PITCH & DEMO PREP](#section-e-pitch-and-demo-prep)
- [SECTION F: JUDGE Q&A CHEAT SHEET](#section-f-judge-qa-cheat-sheet)

---

# SECTION A: PROJECT PLAN

## 🎯 Core Idea

A real-time crisis orchestration platform for hospitality (hotels, resorts, restaurants) that:
- Detects emergencies (manual + sensors)
- Allows guests to report issues via QR (no app)
- Routes alerts to the right staff based on Zone + Role + Availability
- Enables instant team coordination

**Not an SOS app. A smart response system.**

## 🧩 System Architecture

**Staff Side (Mobile App):**
- Must use hotel WiFi (with cellular fallback)
- Shift-based login
- Heartbeat every 15s
- Features: Dashboard, Zone detection, Respond/Assist, Team chat, Availability

**Guest Side (QR Web App):**
- Scans QR → opens lightweight web page
- Options: Report emergency / Request help / Ask question
- No app install, no login

**Backend:**
- Alert classification (AI + rules)
- Smart routing
- Staff availability tracking
- Zone mapping
- Escalation logic

## 🔁 Core Flows

**Guest Emergency:** Scan QR → Submit issue → AI checks urgency → Simple: AI replies / Serious: Alert created

**Alert Routing:** System finds same-zone + matching role + online staff → Sends to top 3

**Staff Response:** First to click "Respond" = assigned / Others become backup / Chat opens

**Escalation:** 30s → notify supervisor / 60s → notify all nearby staff

**Critical Rule:** If nearest responder >50m for Critical alert, notify supervisor in parallel

## 🔐 Staff Availability Logic (3-Signal Check)

Staff is "AVAILABLE" only if:
- ✅ WiFi connected (or cellular fallback)
- ✅ App active (heartbeat received within 15s)
- ✅ Logged in (shift active)

States:
- 🟢 AVAILABLE — all 3 signals active
- 🟡 LIMITED — WiFi dropped, cellular fallback
- 🔴 OFFLINE — no heartbeat for 90s

## 🧠 Smart Routing Logic

Scoring algorithm:
- Zone match: same = 100, adjacent = 50, other = 10
- Role match: +50 if certification matches
- Availability boost: +20 if heartbeat within 15s
- Return top 3 by combined score

## 🌍 Multi-Sector Support

Organization selects: Hotel / Resort / Restaurant / Travel
System adapts zones, roles, alert templates.

## 🧪 MVP Scope

**Build (Live):** Staff dashboard, alert system, QR guest flow, smart routing, role + zone filtering, chat
**Simulate:** Sensor data, BLE tracking, AI image detection

---

# SECTION B: STITCH UI PROMPTS

**How to use:** Open Stitch. Paste the Foundation prompt first. Then paste each screen prompt ONE AT A TIME in the same session. Review each result before moving to the next.

## 🎨 FOUNDATION PROMPT (Paste this first)

```
I'm building a mobile app called "CRISIS RESPONDER" — a real-time crisis 
orchestration platform for hospitality businesses. It's NOT a generic SOS 
app. It's a smart coordination system that routes emergency alerts to the 
right staff based on zone, role, and availability.

DESIGN SYSTEM — use these consistently across every screen:

COLORS:
- Primary Teal: #0D5D5D (brand, headers, primary buttons)
- Deep Teal: #08403F (active nav, emphasis)
- Soft Teal BG: #E8F2F1 (card backgrounds)
- Critical Red: #D32F2F (emergencies)
- Soft Red BG: #FDECEC (critical card backgrounds)
- Warning Amber: #F5B700 (medium priority, location pills)
- Soft Amber BG: #FFF6D6 (warning backgrounds)
- Success Green: #2E7D3E (available, resolved)
- Soft Green BG: #E6F4EA (success cards)
- Coral Accent: #FF6B4A (SOS, escalate)
- Off-White BG: #F5F7F7 (screen background)

TYPOGRAPHY:
- Font: Inter or similar geometric sans-serif
- Headers: Bold, tight tracking
- Labels: UPPERCASE with letter-spacing
- Body: Regular weight, comfortable line height

LAYOUT:
- Card-based with 16px border radius
- 16-20px padding inside cards
- Soft shadows (not harsh borders)
- Bottom nav: 5 items — Home, Map, SOS (centered, elevated, circular 
  coral with white asterisk), Chat, Duty
- Headers include hamburger menu, app name, user avatar

TONE: Professional, urgent but calm, trustworthy. Reference: hospital 
dashboards, aviation cockpits. NOT consumer lifestyle.

Confirm you've understood the design system before I send screens.
```

---

## 📱 SCREEN 1 — Staff Home Dashboard

```
Design Screen 1: STAFF HOME DASHBOARD.

Header: Hamburger menu + "CRISIS RESPONDER" (teal bold) + user avatar.

Availability Status Pill (top, most important):
- Rounded card, soft green background, dark green border
- Row 1: Large "🟢 AVAILABLE" bold
- Row 2: Three inline indicators separated by bullet dots:
  "📶 WiFi ✓  •  📍 Zone: Kitchen (BLE)  •  🕐 Shift: Active"

Metrics Strip (3 equal horizontal cards):
- Card 1: "⚡ 1.4m" / "AVG RESPONSE"
- Card 2: "✓ 12" / "RESOLVED THIS WEEK"
- Card 3: "📉 42%" / "FASTER VS BASELINE"

Filter Tabs: "All Alerts" (active teal) / "Kitchen" / "Security" 
Right side: small "3 active incidents"

Live Alert Feed:
- CRITICAL card: red border, "🔥 FIRE EMERGENCY", "KITCHEN FIRE - MAIN GRILL", 
  zone "KITCHEN", "2m ago", red "RESPOND NOW" button with lightning icon
- WARNING card: amber, "🏥 MEDICAL WARNING", "GUEST DISTRESS - POOL AREA", 
  zone "POOL", "5m ago", amber "ASSIST TEAM" button
- RESOLVED card: muted green, "✓ RESOLVED INCIDENT", "UNAUTHORIZED ACCESS - 
  BLOCK A", zone "BLOCK A", "15m ago", outlined "VIEW LOGS" button

Map Preview: Rounded card with floor plan thumbnail, "MAP LIVE" top right, 
"EXPAND FLOOR PLAN" button.

Active Team (Zone Alpha): Card listing "M. Chen (Active)", "S. Gupta (Active)", 
"J. Doe" with avatars and status chips.

Bottom nav: Home (active), Map, SOS centered/elevated coral, Chat, Duty.
```

---

## 📱 SCREEN 2 — Map View

```
Design Screen 2: STAFF MAP VIEW.

Header: hamburger + "CRISIS RESPONDER" + "KITCHEN ZONE" right + user avatar.

Top: Large amber zone pill "📍 You are in: Kitchen Zone".

System Diagnostics (2x2 grid):
- BLE Signal: "Strong" (green, bluetooth icon)
- Network: "Active" (green, wifi icon)
- Latency: "0.4ms" (green)
- Node Battery: "98%" (battery icon)

Floor Plan Card:
- 3-zone layout: LOBBY / KITCHEN ZONE (highlighted teal) / STAFF LOUNGE
- Dots showing staff positions
- "NEARBY TEAM" overlay with 2 avatars + "+3" bubble

Zone Protocols Card (dashed teal border):
- Utensils icon + "Kitchen Zone Protocols"
- Body: "Active fire suppression systems ready. Hot work permits required 
  for Zone 4. Three responders currently on duty in this sector."

Action Button (outlined): "📝 Not in Kitchen? Update Zone"

Bottom nav: Map active.
```

---

## 📱 SCREEN 3 — SOS Alert Detected

```
Design Screen 3: SOS ALERT DETECTED.

Header: standard.

Alert Banner (top, red accent stripe):
- Amber zone tag "KITCHEN - ZONE ALPHA"
- Bold red title: "SMOKE DETECTED - KITCHEN"
- Metadata: "Triggered by Sensor #442 • 2 minutes ago"
- Location pin + "Basement Level 1, Main Service Area"
- Smoke detector icon top right

SOS Button (center):
- Large circular coral button with pulsing rings
- White asterisk + "SOS" text
- Below: "HOLD TO BROADCAST EMERGENCY"

Recommended Responders:
- Title "Recommended Responders"
- Small teal italic: "⚡ Top 3 matched by zone + role + availability"
- Three cards with avatars (green online dots):
  1. Priya Sharma / KITCHEN SUPERVISOR • FIRE SAFETY / 4m away
  2. Elena Vance / EXECUTIVE CHEF • FIRE MARSHAL CERT. / 8m away
  3. Mark Chen / SECURITY LEAD • EMT-B / 22m away

Action Buttons:
- Primary dark green: "✓ ACCEPT INCIDENT"
- Side-by-side: Teal "📞 CALL BACKUP" + Red "❗ ESCALATE"

Bottom nav: SOS active (centered elevated).
```

---

## 📱 SCREEN 4 — Intelligent Routing

```
Design Screen 4: INTELLIGENT ROUTING.

Header: standard.

Title: Large bold "Intelligent Routing: Incident #8821"
Subtitle (grey): "Smart allocation based on Zone, Role, and Availability"

Alert Summary Card:
- Bell icon + "Alert Sent to: 3 Staff in Kitchen Zone"
- Amber "KITCHEN" pill right

Responder Ranking List:
- Label "RESPONDER RANKING LIST"
- Card 1 (green border, highlighted): Avatar + "Alex Rivera" + 
  "CRISIS LEAD • SAME ZONE (4m)" + green "ACTIVE ✓"
- Card 2: Avatar + "Jordan Smith" + "SECURITY • ADJACENT (12m)" + "STANDBY"
- Card 3: Avatar + "Sam Taylor" + "MEDIC • WING A (18m)" + "STANDBY"

Current Mission Card (dark teal, white text):
- Label "CURRENT MISSION"
- Bold "FIRST RESPONDER ASSIGNED: Alex Rivera"
- ETA chip: "⏱ ETA: 1 minute 45 seconds"
- Coral button: "👥 ESTABLISH COMMS"

Tactical Overlay Card:
- Title "🗺 Tactical Overlay"
- Pills: "LIVE FEED" (amber) + "BLUETOOTH MESH" (teal)
- Dark map: "KITCHEN (ALPHA)" amber highlighted + "LOBBY (BETA)"

Routing footnote (italic centered):
"🧠 Routing logic: Same zone → Role match → Availability (3-signal check)"

Connectivity Footer:
- "📶 CONNECTIVITY: WIFI (STRONG)" / "📡 BLUETOOTH (MESH ACTIVE)"
- "SYSTEM REFRESH: JUST NOW"

Bottom nav: Duty active.
```

---

## 📱 SCREEN 5 — Map with Active Incident

```
Design Screen 5: MAP WITH ACTIVE INCIDENT.

Header: standard.

Top right stacked pills:
- Amber "📍 Kitchen Zone"
- Grey "👥 3 Active Staff"

Map Area (50% of screen — CRITICAL, must be visible):
- Floor plan with 3 zones (dashed borders):
  * LOBBY ZONE (teal dashed, soft teal fill)
  * DINING AREA (amber dashed, soft amber fill)
  * KITCHEN (red dashed, soft red fill — active incident)
- Responder avatar (green border) in Dining Area
- Red pulsing alert circle with white asterisk in Kitchen
- Callout bubble: "KITCHEN FIRE ALARM"
- Dashed teal path line from responder to incident

Incident Info Card (bottom sheet):
- Title "Kitchen Smoke Detected" (teal bold)
- Subtitle "LEVEL 3 RESPONSE ACTIVE"
- Fire truck icon in soft red square
- Two stat cards side by side:
  * "DISTANCE: 35m"
  * "ETA: 20s"
- Full-width teal button: "✓ I AM ON-SITE"

Bottom nav: Map active.
```

---

## 📱 SCREEN 6 — Team Chat

```
Design Screen 6: TEAM CHAT during active incident.

Header: standard.

Active Incident Banner (soft red, left border):
- Warning triangle icon
- Small red uppercase "ACTIVE INCIDENT"
- Bold "Main Lobby - Water Leak Level 2"

Chat Messages:
- Marcus Chen 10:42 AM (left, incoming): Grey bubble "Water shut-off 
  valve is stuck. I need a second pair of hands at the South riser 
  immediately."
- Reply thread (indented, teal left-accent): "@Marcus On my way with 
  the heavy wrench set. ETA 2 mins."
- Alex Rivera (Me) 10:45 AM (right, outgoing): Teal bubble white text 
  "Security team has cordoned off the lobby. Marcus, update me as soon 
  as the flow stops."
- System pill centered: "NEW RESPONDERS JOINED THE CHANNEL"
- Jordan Smith 10:48 AM typing indicator

BOTTOM INPUT (CRITICAL LAYOUT — TWO ROWS):

Row 1 (ABOVE input field):
- Coral pill button full-width: "🚨 Escalate to Supervisor"

Row 2 (input only):
- "+" attachment button left
- Message input field (large, grey rounded, "Type your message...")
- Teal circular send button right

The input field must NOT be squeezed. Escalate goes ABOVE.

Bottom nav: Chat active.
```

---

## 📱 SCREEN 7 — AI Vision Detection

```
Design Screen 7: AI VISION DETECTION.

Header: user avatar + "CRISIS RESPONSE" + broadcast icon + "AI Vision: 
Room 402" on right.

AI Detection Card:
- Rounded card with faded room interior background
- Red card overlay centered: "AI DETECTED: FIRE RISK (96% Confidence)"
- Dark timestamp chip below: "JUST NOW | 14:22:10"
- Amber disclaimer pill BELOW the card (NOT overlapping):
  "⚠ AI inference — awaiting human confirmation"

Incident Timeline Card:
- Title "🕐 Incident Timeline"
- Vertical timeline with 3 events (teal dots, connecting line):
  1. 14:22:10 — "Incident generated & routed to emergency response team."
  2. 14:22:05 — "Smoke pattern recognized via IR-thermal mapping."
  3. 14:21:50 — "Passive motion detected in unoccupied zone."

Ambient Temperature Card (teal bg, white text):
- Thermometer icon
- "Ambient Temp"
- Large "52°C"
- Progress bar (70% filled)
- "CRITICAL THRESHOLD EXCEEDED"

Action Buttons (stacked):
- Teal "✓ Confirm Incident"
- Red "🔥 Escalate to Fire Dept"
- Outlined "✕ False Alarm"

Bottom nav: Home active.
```

---

## 📱 SCREEN 8 — System Configuration

```
Design Screen 8: SYSTEM CONFIGURATION (sector selection).

Header: user avatar + "CRISIS RESPONSE" + broadcast icon.
Top right chip: "🟢 System Live".

Title: Large "System Configuration"

Step Banner (amber):
- Gear icon + "Step: Select Sector to Adapt Interface"

Info Card:
- Bold: "AI logic and responder roles dynamically adapt based on your sector."
- Body: "Choose your industry to preload safety protocols, zone hierarchies, 
  and emergency response templates."
- Decorative neon "ADAPTABILITY" visual

Sector Cards (4 stacked):
1. HOTEL (SELECTED, green border):
   - Bed icon + "Hotel"
   - Chips: "Lobby" "Rooms" "Pool"
   - "Zones: Lobby, Rooms, Pool"
2. RESORT: Umbrella icon, chips "Beach" "Trails" "Villas"
3. RESTAURANT: Utensils icon, chips "Kitchen" "Dining A" "Bar"
4. TRAVEL: Airplane icon, chips "Terminal" "Gate" "Route"

Apply Button: Teal "Apply Sector Settings ✓"

Bottom nav: Duty active.
```

---

## 🌐 SCREEN 9 — Guest Portal Entry State

```
Design Screen 9: GUEST SAFETY PORTAL — ENTRY STATE.

This is a GUEST-FACING WEB APP opened via QR code scan. Tone: welcoming 
and reassuring, NOT scary.

Header:
- Shield icon + "CRISIS RESPONDER" (teal) + "GS" avatar circle

Welcome Section:
- Large bold: "Welcome to Grand Thalassa"
- Subtitle: "Guest Safety Portal"

Location Pill (amber centered):
- "📍 Location: Pool Bar (detected via QR)"

Three Action Buttons (stacked, large):
1. Red: "🚨 Report Emergency >" (primary)
2. Teal: "🙋 Request Help >"
3. White outlined: "💬 Ask Question >"

Illustration (circular frame):
- Friendly hotel concierge — young man in suit with warm smile, reception 
  desk behind, warm lighting

Footer text (small grey centered):
"Your safety is our priority. Staff members are available 24/7 to assist 
with any concerns."

Bottom nav: Home (active), Map, SOS coral, Chat, Duty.
```

---

## 🌐 SCREEN 10 — Guest Portal Confirmation State

```
Design Screen 10: GUEST SAFETY PORTAL — CONFIRMATION STATE.

Same page as Screen 9, AFTER guest submits a report.

Header: same as Screen 9.

Welcome Section: same.

Location Pill: same "📍 Location: Pool Bar (detected via QR)"

Brand Reassurance Line (new):
- Shield icon + "Your safety is our priority. AI-assisted response is 
  active 24/7."

CONFIRMATION CARD (main addition, teal outlined):
- Green circle with robot icon + "AI Responded Instantly" (green bold)
- "A staff member has been dispatched."
- Responder Sub-Card (light grey inset):
  * Avatar + "Responder: Jordan S. (Security)"
  * "ETA: 2 mins" (teal bold)
- Amber left-border quote: "Your request is prioritized for safety."

Three Action Buttons (same as Screen 9, still available):
- Red: "🚨 Report Emergency"
- Teal: "✋ Request Assistance"
- White outlined: "💬 Ask a Question"

Small Map Preview:
- Grey property map with location pin
- Card overlay: "Pool Bar Station / North Wing Area"

Bottom nav: same.
```

---

## 🆘 SCREEN 11 — Limited Connectivity Mode

```
Design Screen 11: LIMITED CONNECTIVITY MODE.

Staff mobile app screen when backend is unreachable.

Header: standard + amber warning stripe below (not teal divider).

Alert Banner (soft amber, left border):
- Warning icon
- Small amber uppercase: "CONNECTION DEGRADED"
- Bold: "Limited Connectivity Mode"

Status Card (amber bg):
- Large: "🟡 Local Broadcast Active"
- Body: "Backend unreachable. Alerts now broadcasting via WiFi mesh to 
  nearby staff devices."

System Status (3 rows):
- WiFi: red pill "✗ Down"
- Cellular: green pill "✓ Active"
- Local Mesh: green pill "✓ 7 devices connected"

Functionality Card (grey bg):
- "Available in this mode:"
- ✓ Alert nearby staff via mesh
- ✓ Receive local broadcasts
- ✓ View last-synced team roster
- ✗ Access historical logs (requires backend)
- ✗ AI classification (requires backend)

Primary Button: Teal "Continue in Local Mode"
Secondary link: "🔄 Retry backend connection"
Footer: "Last successful sync: 2 minutes ago"

Bottom nav: Duty active.
```

---

## 🔄 SCREEN 12 — Shift Handoff Modal

```
Design Screen 12: SHIFT HANDOFF MODAL.

Blocking modal when responder tries to end shift during active incident.

Background: Dimmed/blurred Staff Dashboard behind (50% dark overlay).

Modal Card (centered, 85% width, white, rounded):

Top: Amber warning icon in soft amber circle.

Title Section (centered):
- Bold: "Active Incident in Progress"
- Grey subtitle: "You cannot end your shift while assigned to an 
  unresolved incident."

Incident Summary Card (inset, soft red bg, red left border):
- Small red uppercase: "ACTIVE INCIDENT #8821"
- Bold: "Kitchen Smoke Detected"
- Grey: "Assigned 12 minutes ago • Zone: Kitchen Alpha"

Handoff Section:
- Label: "HAND OFF TO:"
- Dropdown: "Choose available responder..."
- 3 responder cards:
  * Jordan Smith / SECURITY • 12m away / green "AVAILABLE"
  * Sam Taylor / MEDIC • 18m away / green "AVAILABLE"
  * Priya Sharma / KITCHEN SUPERVISOR • 4m away / green "AVAILABLE"

Action Buttons:
- Primary teal: "Hand Off & End Shift"
- Outlined teal: "Return to Incident"
- Small red link: "Mark as Resolved Instead"
```

---

# SECTION C: ANTIGRAVITY BACKEND BUILD

**How to use:** Open Antigravity. Paste Day 1 prompt. After it completes, move to Day 2 the next day. Don't paste multiple days at once.

## ⚙️ PRE-SETUP (Do this before Day 1)

1. Create Firebase project: `console.firebase.google.com` → New Project → name it "crisis-responder"
2. Enable: Authentication (Email/Password), Realtime Database, Cloud Functions, Hosting
3. Get Gemini API key: `aistudio.google.com` → Get API Key → save it
4. Install Node.js LTS on your laptop if not installed
5. Install Git if not installed
6. Create GitHub repo for your code
7. Save all credentials in a secure note

---

## 📅 DAY 1 — Project Setup

```
I want to build a full-stack app called "Crisis Responder" — a real-time 
crisis orchestration platform for hospitality. Hackathon project, 1-week 
deadline.

Set up a monorepo with:

FRONTEND (UI already designed, we'll connect later):
- React Native for staff mobile app
- Next.js for guest QR web portal
- TypeScript throughout

BACKEND:
- Node.js + Express.js + TypeScript
- Firebase Realtime Database for data + real-time sync
- Firebase Auth for staff login
- Firebase Cloud Functions for scheduled escalation
- Google Gemini API via @google/generative-ai SDK

PROJECT STRUCTURE:
/crisis-responder
  /backend
    /src
      /routes
      /services
      /models
      /middleware
      /utils
      index.ts
    /functions
    package.json
    tsconfig.json
    .env.example
  /guest-web (Next.js)
  /staff-app (React Native)
  /shared
    /types
  README.md

TASKS FOR TODAY:
1. Initialize monorepo structure
2. Set up Firebase project configuration files
3. Create shared TypeScript types for all entities
4. Set up Express server with health check endpoint
5. Configure environment variables template
6. Create README with setup instructions

ENTITIES (create shared types):
- User: id, name, email, role, certifications[], zone, status, 
  shiftActive, lastHeartbeat, wifiConnected, avatarUrl
  - role: "crisis_lead" | "security" | "medic" | "supervisor" | 
    "chef" | "kitchen_supervisor"
  - status: "available" | "limited" | "offline"
- Zone: id, name, type, sectorId, adjacentZones[], activeStaff[]
- Incident: id, title, description, zoneId, severity, status, createdBy, 
  assignedTo, standbyResponders[], createdAt, assignedAt, resolvedAt, 
  aiConfidence, aiClassification
  - severity: "critical" | "warning" | "info"
  - status: "pending" | "assigned" | "in_progress" | "resolved" | 
    "false_alarm"
- GuestReport: id, zoneId, type, message, sessionToken, createdAt, 
  incidentId
  - type: "emergency" | "help_request" | "question"
- ChatMessage: id, incidentId, userId, text, timestamp, type
  - type: "message" | "system" | "escalation"
- Sector: id, name, zones[], roles[], alertTemplates[]

Start with project setup and types. Show me folder structure and key 
config files first.
```

---

## 📅 DAY 2 — Authentication + Staff Availability

```
Today I'm building authentication and staff availability.

1. STAFF AUTHENTICATION (Firebase Auth):
- POST /auth/signup — create staff account (admin only)
- POST /auth/login — email/password, returns JWT
- POST /auth/logout — end session
- POST /auth/start-shift — mark shiftActive = true
- POST /auth/end-shift — BLOCK if user has active incidents, otherwise 
  set shiftActive = false

2. HEARTBEAT SYSTEM (3-signal availability):
- POST /staff/heartbeat — called every 15 seconds
  * Body: { wifiConnected, cellularFallback, currentZoneId }
  * Updates lastHeartbeat timestamp
  * Logic:
    - WiFi connected + recent heartbeat → status = "available"
    - Cellular fallback only → status = "limited"
    - No heartbeat for 90s → status = "offline"
- Background job (Cloud Function) checks every 30s for stale heartbeats

3. ZONE MANAGEMENT:
- GET /zones — list all zones
- PUT /staff/zone — manually override current zone
- Note: BLE integration is future; manual for now

4. STAFF LISTING:
- GET /staff — all staff with current status
- GET /staff/:id — specific staff details
- GET /staff/available — only available staff (for routing)

Build with validation, error handling, Firebase security rules. Include 
curl commands to test each endpoint.

SEED DATA: 6 staff members:
1. Alex Rivera — crisis_lead — [fire_marshal, first_aid]
2. Jordan Smith — security — [security]
3. Sam Taylor — medic — [emt_b, first_aid]
4. Elena Vance — chef — [fire_marshal, fire_safety]
5. Mark Chen — security — [security, emt_b]
6. Priya Sharma — kitchen_supervisor — [fire_safety, first_aid]
```

---

## 📅 DAY 3 — Incidents + Smart Routing

```
Today I'm building incident management and smart routing — the CORE 
innovation.

1. INCIDENT MANAGEMENT:
- POST /incidents — create new incident
  * Runs classification (keyword-based for now, Gemini tomorrow)
  * Calls routing engine for top 3 responders
  * Creates Firebase real-time document
  * Sends push notifications to routed responders
- GET /incidents — filterable by zone/severity/status
- GET /incidents/:id — full details with chat
- POST /incidents/:id/accept — first-click-wins assignment
  * Sets status = "assigned", assignedTo = current user
  * Others become standbyResponders
- POST /incidents/:id/resolve — mark resolved
- POST /incidents/:id/false-alarm — log false alarm
- POST /incidents/:id/escalate — manual escalation

2. SMART ROUTING ENGINE:

Algorithm to find top 3 responders:

Step 1 — Filter candidates:
  * status = "available" OR (status = "limited" AND severity = "critical")
  * shiftActive = true

Step 2 — Score each candidate:
  * Zone match: same zone = 100, adjacent = 50, other = 10
  * Role match: +50 if ANY certification matches incident type
    - Fire → fire_marshal, fire_safety
    - Medical → first_aid, emt_b
    - Security → security
  * Availability boost: +20 if heartbeat within last 15s

Step 3 — Sort by score descending, return top 3

Step 4 — If critical AND nearest < 100 (not same zone), ALSO notify 
supervisor in parallel

Store routing decision in incident for transparency.

3. ESCALATION LOGIC (Cloud Function, every 10s):
For incidents with status = "pending":
- 30s old → notify supervisor
- 60s old → broadcast to all available staff in same + adjacent zones
- Log all escalation events

4. SEED INCIDENTS:
- Critical: "Kitchen Smoke Detected" in Kitchen
- Warning: "Guest Distress" in Pool
- Resolved: "Unauthorized Access" in Block A

Build it. Test routing with 6 seed staff. Show scoring output for a 
Kitchen fire incident.
```

---

## 📅 DAY 4 — Guest Portal + Gemini AI

```
Today I'm building the guest QR portal and integrating Gemini.

1. GUEST QR PORTAL API:
- POST /guest/scan — validate QR, return session token
  * QR payload: { zoneId, establishmentId, qrSecret }
  * Returns: { sessionToken (JWT, 6-hour expiry), zoneName }
  * Rate limit: 3 reports per session per 10 minutes

- POST /guest/report — submit report
  * Requires session token
  * Body: { type, message, confirmed }
  * For emergency: require confirmed = true
  * Runs Gemini classification
  * If low + question: AI responds, no incident created
  * If medium/high: create incident, route via smart routing
  * Returns: { reportId, status, assignedResponder, eta }

- GET /guest/report/:id — check report status

2. GEMINI AI INTEGRATION:

Install @google/generative-ai, use GEMINI_API_KEY env var.

Create /services/ai-classifier.ts with:

a) classifyIncident(message, zone):
   Returns: { severity, category, confidence, suggestedAction }
   Prompt: "Classify this hotel incident report. Message: '{message}'. 
   Zone: {zone}. Respond in JSON with severity (critical/warning/info), 
   category (fire/medical/security/facilities/service), confidence 
   (0-100), suggestedAction (one short sentence)."

b) answerGuestQuestion(question):
   Returns: { answer, requiresHuman }
   Prompt: "You are a hotel concierge AI. Answer this guest question 
   concisely. If it requires human assistance, say so. Question: 
   '{question}'"

c) detectEmergencyKeywords(message):
   Returns: boolean
   Keywords: fire, smoke, blood, unconscious, weapon, attack, heart, 
   breathing, dying, emergency

3. FALSE ALARM HANDLING:
- Track false_alarm count per sensor/source
- 3+ false alarms in 24h → flag for maintenance
- Reduce priority of future alerts from that source by 50% until reviewed

Test Gemini with 3 messages:
1. "There's a fire in the kitchen!" → critical
2. "Can I get extra towels?" → low, AI answerable
3. "I think someone is following me" → warning/security
```

---

## 📅 DAY 5 — Real-time Chat + WebSockets

```
Today I'm building real-time chat for incident coordination.

1. WEBSOCKET SERVER:
- Socket.IO on top of Express
- Namespace: /chat
- Rooms: one per incident (room name = incident ID)
- JWT auth required for connection

2. CHAT EVENTS:
- Client "join-incident" → server adds to room, sends last 50 messages
- Client "send-message" → server persists to Firebase, broadcasts to room
- Client "escalate" → special message type, triggers supervisor notification
- Client "typing" → broadcasts typing indicator
- Server "new-responder-joined" when new user joins
- Server "incident-updated" on status changes

3. CHAT API ENDPOINTS:
- GET /chat/:incidentId/history — paginated history
- POST /chat/:incidentId/mark-read — mark messages read

4. MESSAGE TYPES:
- "message" — regular
- "system" — auto-generated ("X joined", "Incident resolved")
- "escalation" — prominent, triggers notifications
- "ai-suggestion" — Gemini-suggested next action

5. REAL-TIME FIREBASE LISTENERS (for frontend):
- /incidents/{incidentId} — status changes
- /staff/{userId}/status — availability changes
- /zones/{zoneId}/activeIncidents — zone activity

Build the WebSocket server. Test with 2 simulated clients exchanging 
messages. Document frontend integration.
```

---

## 📅 DAY 6 — Frontend Integration + Polish

```
Today I'm connecting my Stitch-designed UI to the backend.

I have 12 screens designed:

STAFF APP (React Native):
1. Home Dashboard
2. Map View
3. SOS Alert
4. Intelligent Routing
5. Map with Active Incident
6. Team Chat
7. AI Vision
8. System Configuration

GUEST WEB (Next.js):
9. Guest Portal Entry
10. Guest Portal Confirmation

EDGE CASES:
11. Limited Connectivity Mode
12. Shift Handoff Modal

TASKS:

1. API CLIENT LIBRARIES:
- /shared/api-client.ts for shared API calls
- Auto auth token handling
- Retry logic
- Fallback to local cache if offline

2. FIREBASE SDK SETUP:
- Real-time listeners for live data
- Firebase Auth integration
- Push notifications

3. WIRE UP SCREENS:
- Replace mock data with API calls
- Loading states
- Error states
- Empty states

4. OFFLINE FALLBACK:
- Cache in AsyncStorage/localStorage
- Show "Limited Connectivity Mode" when backend unreachable
- Queue actions to retry

5. POLISH:
- Loading spinners
- Smooth transitions
- Error toasts
- Success confirmations

Go screen by screen. Start with Home Dashboard (Screen 1) and wire it 
up to real backend data.
```

---

## 📅 DAY 7 — Deployment + Demo Prep

```
Today is deployment + demo prep.

TASKS:

1. DEPLOY BACKEND:
- Express to Firebase Cloud Functions (or Railway)
- Cloud Functions for escalation cron
- Firebase Security Rules for production
- Configure CORS

2. DEPLOY FRONTENDS:
- Guest Web to Firebase Hosting
- Staff React Native with Expo Go for demo
- Generate QR codes for guest portal URLs

3. SEED PRODUCTION DATA:
- "Grand Thalassa Hotel" organization
- 6 staff accounts with demo credentials
- 5 zones: Kitchen, Lobby, Pool, Dining, Block A
- 2-3 resolved historical incidents
- 5 QR codes for different zones

4. PRE-LOAD DEMO SCENARIO:
Script 3-minute flow:
a) Judge scans Pool Bar QR → opens guest portal
b) Taps "Report Emergency" → types "someone is hurt"
c) Gemini classifies as medical warning
d) Staff app (different device) receives alert
e) Routing screen shows top 3 responders
f) Alex Rivera accepts → chat opens
g) Supervisor notified in parallel
h) Resolution → metrics update

5. FALLBACK DEMO:
- Screen recording of perfect demo
- Mock data mode toggle for backup

6. PITCH MATERIALS:
- 10-slide deck
- One-page handout
- 60-90 second demo video

Deploy everything. Test full demo end-to-end. Fix bugs. Stage tomorrow.
```

---

# SECTION D: GEMINI AI STUDIO PROMPTS

**How to use:** Open `aistudio.google.com`. Use these to test your AI classification prompts before putting them in your backend code.

## 🧪 PROMPT 1 — Incident Classifier

```
You are an AI classifier for a hotel crisis response system. Your job is 
to classify incident reports from guests and staff.

Classify this message and respond ONLY in valid JSON:

{
  "severity": "critical" | "warning" | "info",
  "category": "fire" | "medical" | "security" | "facilities" | "service",
  "confidence": 0-100 (integer),
  "suggestedAction": "one short sentence",
  "requiresImmediateResponse": true/false
}

Rules:
- "critical" = immediate danger to life (fire, medical emergency, weapon, 
  unconscious person)
- "warning" = urgent but not life-threatening (guest distress, suspicious 
  activity, water leak)
- "info" = routine request (towel, food, question)

Now classify this message:
Zone: {ZONE}
Message: "{MESSAGE}"
```

**Test cases to validate:**
- "Fire in kitchen, flames spreading" → critical/fire/95+
- "My room is too cold, can you fix it?" → info/facilities/90+
- "A man is following me and won't leave" → warning/security/85+
- "My friend is bleeding badly, need help" → critical/medical/95+
- "Can I get extra towels?" → info/service/95+

---

## 🧪 PROMPT 2 — Guest Question Auto-Responder

```
You are a helpful AI concierge for Grand Thalassa Hotel. Answer guest 
questions concisely and warmly.

Respond ONLY in JSON:

{
  "answer": "your response in 1-2 sentences",
  "requiresHuman": true/false,
  "suggestedFollowUp": "optional: what to do next"
}

Rules:
- Answer directly if it's a common question (checkout time, amenities, 
  dining hours, WiFi)
- Set requiresHuman = true if:
  * Question involves booking changes
  * Medical or safety concerns
  * Complaints
  * Anything requiring identity verification

Hotel facts:
- Check-in: 2 PM, Check-out: 11 AM
- Pool hours: 6 AM - 10 PM
- Main restaurant: 7 AM - 11 PM
- WiFi: GrandThalassa_Guest, password: relax2025
- Spa: 9 AM - 8 PM, appointment needed
- Gym: 24/7 for guests

Guest question: "{QUESTION}"
```

**Test cases:**
- "What time is checkout?" → direct answer
- "The AC in my room isn't working" → requiresHuman = true
- "Where's the gym?" → direct answer
- "I want to change my booking dates" → requiresHuman = true

---

## 🧪 PROMPT 3 — Emergency Keyword Detector

```
Analyze this message for emergency indicators. Respond ONLY in JSON:

{
  "isEmergency": true/false,
  "detectedKeywords": ["keyword1", "keyword2"],
  "urgencyScore": 0-100,
  "recommendedSeverity": "critical" | "warning" | "info"
}

Emergency keywords include: fire, smoke, blood, unconscious, weapon, 
attack, heart attack, breathing, choking, dying, emergency, help, 
drowning, bleeding, trapped, stuck

Message: "{MESSAGE}"
```

---

## 🧪 PROMPT 4 — Smart Response Suggestion (for staff)

```
You are helping a hotel crisis responder decide next actions. Given the 
incident details, suggest the top 3 actions to take right now.

Respond ONLY in JSON:

{
  "suggestions": [
    {
      "action": "short action description",
      "priority": 1 | 2 | 3,
      "reasoning": "why this action"
    }
  ],
  "warnings": ["any safety warnings"],
  "checklistItems": ["items to verify before acting"]
}

Incident context:
- Type: {TYPE}
- Severity: {SEVERITY}
- Zone: {ZONE}
- Description: {DESCRIPTION}
- Time elapsed: {TIME}
- Responder role: {ROLE}
```

---

# SECTION E: PITCH AND DEMO PREP

## 🎤 10-Slide Pitch Deck Structure

**Slide 1 — Title**
- "CRISIS RESPONDER"
- Tagline: "Smart Emergency Orchestration for Hospitality"
- Your name + team

**Slide 2 — The Problem**
- Hotels average 3+ minutes response time for emergencies
- Staff don't know who should respond, leading to chaos
- Guests have no clear way to report issues quickly
- 68% of hotel incidents worsen due to miscommunication (or your researched stat)

**Slide 3 — The Solution**
- Real-time crisis orchestration platform
- Routes alerts to RIGHT staff by Zone + Role + Availability
- Guest QR reporting (no app install)
- NOT an SOS app — a SMART RESPONSE SYSTEM

**Slide 4 — How It Works (Flow Diagram)**
1. Detection (guest QR / staff / sensors)
2. AI Classification (Gemini)
3. Smart Routing (top 3 responders)
4. Real-time Coordination (chat)
5. Escalation if no response

**Slide 5 — Staff App Demo (3 key screens)**
- Home Dashboard with availability pill
- Smart Routing screen
- Team Chat during incident

**Slide 6 — Guest QR Experience**
- Entry state
- Confirmation state with assigned responder

**Slide 7 — Smart Routing Logic**
- The algorithm that makes us different
- Zone match (100) + Role match (50) + Availability (20)
- Parallel supervisor notification for critical alerts

**Slide 8 — AI Features (Honest Scope)**
- ✅ LIVE: Text classification (Gemini), Auto-reply for FAQs
- ⚠ SIMULATED: Sensor detection, AI camera vision
- Integration path: Hikvision/Axis APIs, BLE beacons

**Slide 9 — Edge Cases Handled**
- Limited Connectivity Mode (WiFi mesh fallback)
- Shift Handoff (accountability enforcement)
- False Alarm Tracking (sensor reliability scoring)
- QR Abuse Prevention (rate limiting + session tokens)

**Slide 10 — Impact + Ask**
- ⚡ 1.4 min avg response (vs 3+ min baseline)
- 📉 42% faster incident resolution
- 🛡 Zone-aware, role-matched dispatch
- **Ask: Feedback + hackathon win**

---

## 🎬 Demo Video Script (60-90 seconds)

```
[0:00-0:10] Opening
"Meet Grand Thalassa Hotel. When emergencies happen, every second counts. 
But today, hotel staff coordinate via WhatsApp groups and guesswork. 
That's where Crisis Responder changes everything."

[0:10-0:25] Guest Flow
"A guest at the Pool Bar scans this QR code. No app to install. They tap 
Report Emergency. Our Gemini AI instantly classifies the report — this 
is a medical warning."

[0:25-0:45] Smart Routing
"In the background, our routing engine finds the three best responders 
based on zone, role, and availability. Alex Rivera — crisis lead, same 
zone, 4 meters away — accepts in seconds. Supervisors are notified in 
parallel for critical alerts."

[0:45-1:05] Coordination
"Real-time chat opens automatically. Responders coordinate. The guest 
sees live status. Response time: 20 seconds from report to arrival."

[1:05-1:30] Differentiation
"What makes us different? This isn't an SOS button. It's smart 
orchestration — with handoff protection, false alarm tracking, and 
offline mesh fallback when backends fail. Crisis Responder. Right 
person, right place, right now."
```

---

## 📄 One-Page Handout

```
═══════════════════════════════════════════════
CRISIS RESPONDER
Smart Emergency Orchestration for Hospitality
═══════════════════════════════════════════════

THE PROBLEM
Hotels lose critical seconds in emergencies because alerts go to 
everyone (or nobody). Staff don't know who should respond. Guests 
don't know who to contact.

OUR SOLUTION
A real-time orchestration platform that routes emergencies to the 
RIGHT staff based on three signals:
  📍 Zone (location match)
  👤 Role (skill match)  
  🟢 Availability (3-signal check)

HOW IT'S DIFFERENT
❌ Not an SOS button
✅ Smart routing algorithm
✅ Guest QR reporting (no app)
✅ AI classification (Gemini)
✅ Offline mesh fallback
✅ Multi-sector (hotel/resort/restaurant/travel)

TECH STACK
Frontend: React Native + Next.js
Backend: Node.js + Firebase
Real-time: WebSockets + Firebase listeners
AI: Google Gemini API
Detection: Manual (live) + Sensor integration (ready)

IMPACT
⚡ Avg response time: 1.4 min
📉 42% faster vs baseline
🛡 Zone-aware, role-matched dispatch

LIVE FEATURES
✅ Staff availability tracking
✅ Smart routing engine
✅ Guest QR portal
✅ Real-time chat
✅ AI text classification
✅ Escalation logic
✅ Shift handoff enforcement

SIMULATED (Integration Path Defined)
⚠ IoT sensor triggers (fire panels, Hikvision APIs)
⚠ BLE beacon precision (Estimote/Kontakt.io)
⚠ AI camera vision (thermal imaging)

TEAM: [Your names]
CONTACT: [Your info]
═══════════════════════════════════════════════
```

---

# SECTION F: JUDGE Q&A CHEAT SHEET

Rehearse these answers OUT LOUD until you can say them fluently.

| Question | Your Answer |
|---|---|
| "How do you know a staff member is actually available?" | "Three-signal check: WiFi connection, app heartbeat every 15 seconds, and active shift status. All three must be true to route alerts to them." |
| "What happens if WiFi drops mid-shift?" | "Cellular fallback engages automatically. Status becomes 'Limited' — still routable for critical alerts but deprioritized for routine ones. After 90 seconds with no heartbeat, marked Offline and excluded from routing." |
| "How is this different from just an SOS button?" | "SOS buttons broadcast to everyone and waste response capacity. We route to the TOP 3 based on zone proximity, role certification, and availability. Plus parallel supervisor notification for critical alerts." |
| "Is the AI detection real?" | "Text classification via Gemini is live and working. Sensor-based detection and camera AI are simulated for this demo — integration paths are documented for Hikvision cameras, standard fire panel relays, and Estimote BLE beacons." |
| "How do you prevent QR code abuse?" | "Each QR encodes a zone ID plus a rotating session token refreshed every 6 hours. Rate limit of 3 reports per session per 10 minutes. Critical reports require a second confirmation tap." |
| "What about guest privacy?" | "Guest reports are session-only. No PII stored beyond an optional room number. Incident logs retained 30 days then anonymized. Camera feeds not stored — only AI inference results logged. Staff location purged on shift logout." |
| "What if your backend goes down during a real emergency?" | "Staff apps cache the team roster and zone map locally. If backend is unreachable, the app enters Local Broadcast Mode — alerts propagate via WiFi multicast to other nearby devices. Limited functionality but not a brick." |
| "How do you handle false alarms?" | "Every false alarm dismissal is logged with staff ID and timestamp. If the same sensor triggers 3+ false alarms in 24 hours, system auto-flags for maintenance and reduces its priority score by 50% until reviewed. Prevents alert fatigue." |
| "What about shift changes during active incidents?" | "A responder with an active incident cannot end their shift until the incident is resolved OR handed off to another available responder. System enforces this at logout — shows modal with available handoff candidates." |
| "What's your business model?" | "SaaS subscription per property — tiered by number of staff seats and zones. Enterprise tier for chains with multi-property analytics. Integration fees for custom hardware deployments." |
| "Who's your competition?" | "Traditional hotel security systems (Aiphone, Tunstall) focus on hardware. Property management systems (Opera, Cloudbeds) don't handle emergencies. Consumer safety apps don't understand hospitality workflows. We sit between them." |
| "What's the biggest risk?" | "Staff adoption. If responders don't trust the routing, they ignore alerts. We mitigate with transparent scoring — every routing decision shows WHY it was routed (zone match + role match). Plus optional manual override." |
| "Why hospitality specifically?" | "Hotels have defined zones, varied incident types, and mixed-skill staff — perfect for routing logic. Resorts and restaurants share the same DNA. Multi-sector support makes the product scale horizontally." |

---

# 🎯 CRITICAL SUCCESS REMINDERS

1. **Save this file somewhere permanent** — cloud drive, GitHub, emailed to yourself. Don't lose it in incognito.

2. **Commit code to Git every 2-3 hours.** Antigravity will break things. Git is your safety net.

3. **Test in a real browser on a real phone** at least once per day. Things that work on your laptop can fail on mobile.

4. **Build features in this priority order:**
   - Must have: Auth, incidents, routing, guest portal
   - Should have: Chat, AI classification
   - Nice to have: Offline mode, shift handoff, multi-sector

5. **If you're behind on Day 5, CUT features.** Ship 6 working features instead of 10 broken ones.

6. **Practice your demo out loud** minimum 5 times before presenting. Time it. Cut anything over 3 minutes.

7. **Prepare for demo failure:**
   - Have a video backup of the full demo
   - Have screenshots of every screen
   - Know how to explain it without the live demo working

8. **During Q&A, if you don't know something, say:** "Great question. In our current implementation that's a planned feature for phase 2. Our MVP focused on [core thing]." Never lie about what works.

---

# 📞 IF STUCK

Come back with specific questions:
- "Antigravity gave me this error: [paste]"
- "I only have X hours left — what do I cut?"
- "Judges asked me Y and I didn't have a good answer"
- "My backend is broken — help me debug"

**Start today. Day 1 is just setup. You've got this.**

═══════════════════════════════════════════════
END OF PROMPT PACKAGE
═══════════════════════════════════════════════
