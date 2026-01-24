# Chat Feature Implementation

## Overview
Implemented an intelligent chat feature for the jam session app that uses Google Gemini AI with tool calling to perform actions based on user requests.

## Components Created/Modified

### 1. Chat Router (`src/server/api/routers/chat.ts`)
- **New File**: Backend API router for handling chat messages
- Uses Google Gemini 2.5 Flash model with tool calling
- Implements three tools:
  - `edit_backing_track`: Modifies the Strudel code for the backing track
  - `show_scale`: Changes the key and modality to show specific scales on the fretboard
  - `add_chord`: Adds chords to the saved chords list
- Maintains conversation history for context
- Handles multi-turn conversations with tool execution

### 2. Root Router (`src/server/api/root.ts`)
- **Modified**: Added chat router to the main API router

### 3. Chat Panel Component (`src/app/jam/_components/chat-panel.tsx`)
- **Modified**: Enhanced to use the tRPC chat API
- Integrates with `useJamSession` context to:
  - Update Strudel code when backing track is edited
  - Change key/modality to display scales
  - Add chords to saved chords list
- Maintains conversation history for context
- Shows loading state during AI processing
- Handles errors gracefully

## How It Works

1. **User sends a message** in the chat panel
2. **Frontend calls** the `chat.sendMessage` tRPC mutation with:
   - User's message
   - Current session context (key, modality, strudel code, saved chords)
   - Conversation history
3. **Backend processes** the message:
   - Sends to Google Gemini with system instructions and tool definitions
   - Gemini analyzes the request and calls appropriate tools
   - Backend handles tool calls and returns results
4. **Frontend applies tool results**:
   - Calls context provider methods based on tool results
   - Updates UI state (strudel code, key/modality, saved chords)
   - Displays AI response to user

## Example Interactions

### Edit Backing Track
**User**: "Can you add a bassline?"
**AI**: Calls `edit_backing_track` tool with modified Strudel code
**Result**: New backing track with bassline is loaded

### Show Scale
**User**: "Show me the D minor scale"
**AI**: Calls `show_scale` tool with `{ key: "D", modality: "Minor" }`
**Result**: Fretboard diagram updates to show D minor scale

### Add Chord
**User**: "Save the Em7 chord"
**AI**: Calls `add_chord` tool with `{ chord: "Em7" }`
**Result**: Em7 is added to the saved chords list

## Future Enhancements

As noted in the requirements, the chat feature will later:
- Receive context about user's recordings
- Provide feedback on improvisation
- Suggest chords based on recorded playing patterns
- Analyze melodic contours and suggest harmonies

## Technical Details

- Uses Google Gemini 2.5 Flash for fast responses
- Implements retry logic (max 5 attempts) for tool calling
- Type-safe with full TypeScript support
- Maintains conversation context across multiple turns
- Integrates seamlessly with existing jam session state management
