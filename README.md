# PersonaX

Full-stack AI companion platform scaffold with modular architecture.

## Stack
- Frontend: Next.js + Tailwind
- Backend: Express + MongoDB + Socket.io
- AI: OpenAI Chat Completions API
- Shared contracts: `shared/`

## Implemented So Far
- Auth API: register/login with JWT
- Companion system: CRUD endpoints and UI
- Personality engine: prompt builder per companion
- Chat API: context-aware LLM response pipeline
- Improvement API: AI-generated self-improvement plans
- Game API: start/move session service scaffold
- Realtime layer: socket rooms/chat/move events

## Project Structure
- `frontend/` Next.js app
- `backend/` Express API + sockets
- `shared/` shared constants/types
- `config/` architecture docs

## Quick Start
1. Install dependencies
   - `cd personaX`
   - `npm install`
2. Configure backend
   - Copy `backend/.env.example` to `backend/.env`
   - Add MongoDB and OpenAI key
   - Add `OPENAI_IMAGE_MODEL=gpt-image-1` if you want the avatar generator to create real images
3. Configure frontend
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
4. Run both apps
   - `npm run dev`

## What You Need To Do Externally
1. Install Node.js LTS if it is not already on your machine.
2. Create or use a MongoDB database.
   - If you use local MongoDB, the service must be running.
   - If you use MongoDB Atlas, create a cluster, database user, and network access rule.
   - Put your connection string in `backend/.env` as `MONGODB_URI`.
3. Create an OpenAI API key and paste it into `backend/.env` as `OPENAI_API_KEY`.
4. Keep `frontend/.env.local` pointed at your backend URL.
5. If port 3000 is busy, use the port Next.js prints in the terminal.

## Companion Settings
- `relationshipType`: fixed role like girlfriend, boyfriend, friend, mother, father, brother, sister, gay friend, therapist, mentor, or partner.
- `auto companion mode`: lets PersonaX infer the companion style from saved memory and chat history.
- `moodModes`: multiple mood buttons can be active together, such as roast, flirty, angry, sweet, calm, focused, or playful.
- `tone`: auto, soft, aggressive, submissive, or neutral.

## Real Avatar Generation
1. Put your OpenAI API key in `backend/.env` as `OPENAI_API_KEY`.
2. Keep `OPENAI_IMAGE_MODEL=gpt-image-1` in `backend/.env`.
3. Create a custom companion from the UI.
4. The backend will automatically call the image generator after companion creation and store the resulting avatar on the companion.
5. If the image generator fails, the companion is still created, but only the fallback preview will show.

### Use NVIDIA For Images
1. Set `IMAGE_PROVIDER=nvidia` in `backend/.env`.
2. Set `NVIDIA_API_KEY` to your NVIDIA key.
3. Keep `NVIDIA_IMAGE_MODEL=black-forest-labs/flux.2-klein-4b`.
4. Restart backend after saving `.env`.
5. Create a custom companion and it will request image generation from NVIDIA.

## API Overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/companions`
- `POST /api/companions`
- `PUT /api/companions/:id`
- `DELETE /api/companions/:id`
- `POST /api/chat`
- `POST /api/improve`
- `POST /api/game/start`
- `POST /api/game/move`

## Next Build Steps
1. Persist and display full chat history in frontend.
2. Add voice pipeline (`STT -> LLM -> TTS`) endpoints.
3. Add WebRTC voice/video rooms and signaling server.
4. Add chess/sudoku engines with real rules and AI difficulty.
5. Add safety moderation pipeline with classifier + policy logs.
