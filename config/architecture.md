# PersonaX Architecture Notes

## Agent Pipeline
- Perception: chat text, voice transcripts, gameplay actions, social events
- Memory: chat history + companion memory entries
- Reasoning: personality prompt + specialized service logic
- Action: chat responses, game moves, plan generation, socket events

## Modules
- frontend: Next.js UI client
- backend: API and socket server
- shared: reusable contracts and constants
