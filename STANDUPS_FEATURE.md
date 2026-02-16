# Council Standups Feature

## Summary
Added a third tab "Standups" to Mission Control's CouncilView that enables real-time group chat discussions with AI council members.

## What Was Built

### Frontend (CouncilView.tsx)
✅ Added "Standups" tab to existing Boardroom/Execution tabs
✅ Topic input area with "Start Standup" button
✅ Real-time chat stream interface with:
   - Member avatars (emoji in colored circles)
   - Member name + title in accent colors
   - Message text with subtle background tint
   - Timestamps
   - Auto-scroll to bottom
   - Typing indicator (3 bouncing dots)
✅ Jamie interject input (CEO can type messages at any point)
✅ Action items panel (right sidebar):
   - Shows assigned member emoji
   - Description with checkbox
   - "Send to Approvals" button
✅ Dark theme matching rest of app (#1a1a1a)
✅ Member colors:
   - Elon (CTO): Blue #3b82f6
   - Marcus (COO): Green #22c55e
   - Gary (CMO): Orange #f97316
   - Cuban (CRO): Purple #a855f7
   - Mozzie (Chief of Staff): Purple #8b5cf6
   - Jamie (CEO): Gold #d4af37

### Backend (electron/main.js)
✅ Added `council-standup` IPC handler
✅ Conversation flow (8 rounds default):
   1. Mozzie introduces topic
   2-5. Each member responds (Gary→Elon→Marcus→Cuban)
   6-7. Cross-talk (Elon+Marcus, Gary+Cuban)
   8. Mozzie summarizes and extracts action items
✅ Each member called with openclaw agent using soul file + conversation history
✅ Action item extraction from Mozzie's summary (regex parsing)
✅ Returns messages array and actionItems array

### IPC Integration
✅ Added `councilStandup` to preload.js
✅ Added TypeScript types to types/electron.d.ts:
   - CouncilStandupMessage
   - CouncilStandupActionItem
   - CouncilStandupResult

## How It Works

1. User enters a standup topic and clicks "Start Standup"
2. Frontend calls `councilStandup` IPC handler with topic and member IDs
3. Backend runs 8-round conversation:
   - Mozzie intro
   - 4 initial responses (all members)
   - 2 cross-talk rounds (members respond to each other)
   - Mozzie summary with action items
4. Frontend displays messages one-by-one with typing indicators (2-3s delay)
5. Messages auto-scroll to bottom as they appear
6. Action items populate right panel as Mozzie's summary completes
7. User can click "Send to Approvals" to push action items to approvals/queue.json

## Visual Design
- Chat bubbles with 5% opacity background tint matching member color
- Typing indicator: three bouncing dots with member name/color
- Auto-scroll with smooth behavior
- Jamie's messages styled differently (gold accent, right-aligned visual treatment)
- Action items in collapsible panel with checkboxes
- Animations: fadeIn for messages, pulse for typing dots

## Member Soul Files Used
- `/Users/mozzie/clawd/council/members/cto-elon.md`
- `/Users/mozzie/clawd/council/members/coo-marcus.md`
- `/Users/mozzie/clawd/council/members/cmo-gary.md`
- `/Users/mozzie/clawd/council/members/cro-cuban.md`

## Future Enhancements
- Real streaming (WebSocket/Server-Sent Events) instead of simulated delays
- Member selection dropdown (currently all 4 + Mozzie)
- Configurable rounds
- Save standup transcript to file
- React to messages (emoji reactions)
- Thread replies
- Voice notes integration
