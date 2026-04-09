# Auto Companion Chat & Audio Integration Guide

## What Was Added

✅ **Text Chat** - Send messages to your auto companion and get AI responses  
✅ **Voice Chat** - Record audio messages and the companion transcribes + replies with text-to-speech  
✅ **Audio Playback** - Click 🔊 button on any companion response to hear it spoken aloud  

---

## How to Use It

### **Step 1: Access the Home Tab**
- You're already on the Home tab by default when you open the app
- If not, click the **Home** button in the left sidebar

### **Step 2: Auto Companion is Auto-Created**
- When you first open the app, an automatic "Auto Companion" is created for you
- You'll see it listed in the **Companions** panel (left side of Home tab)
- The companion name will be something like "Echo" or an auto-generated name

### **Step 3: Select Your Companion**
- Click on the companion in the **Companions** list (left panel)
- It will highlight in blue showing it's selected
- The companion status appears in the sidebar: "Selected: [Companion Name]"

### **Step 4: Start Chatting**

#### **Text Chat:**
1. Type a message in the input box at the bottom of ChatPanel (right side)
2. Click **Send** button or press Enter
3. The companion will respond with an AI-generated reply
4. Your message appears on the right (blue), the companion's reply on the left (white)

#### **Voice Chat:**
1. Click the **🎤 Voice Message** button (bottom of ChatPanel)
2. Your browser will ask for microphone permission - **Allow it**
3. Speak your message clearly
4. The timer shows recording duration (e.g., "Recording... 0:05")
5. Click **Stop Recording** when done
6. The audio is sent to the backend, transcribed using OpenAI Whisper
7. Your transcribed text appears in the chat
8. The companion's response is shown with a 🔊 button
9. Click 🔊 to hear the response spoken aloud (uses browser text-to-speech)

### **Step 5: Hear Companion Responses**
- After any chat (text or voice), click the **🔊** button next to the companion's response
- The text will be spoken in your browser's default voice
- You can click it multiple times to replay

---

## Browser Requirements

| Feature | Requirements |
|---------|--------------|
| **Text Chat** | Any modern browser |
| **Voice Recording** | Chrome, Edge, Firefox, Safari 14.1+ (HTTPS for production, HTTP for localhost) |
| **Audio Playback** | All modern browsers (Web Speech API) |

### ⚠️ Microphone Permission
- First time you try **Voice Message**, the browser asks for microphone access
- Click **Allow** to grant permission
- Permission is saved for future use

---

## Tips for Best Results

### **Voice Messages:**
- Speak clearly and naturally
- Shorter sentences work better than long rambles
- Background noise is okay; the AI is robust
- Wait for "Stop Recording" confirmation before typing

### **Text Messages:**
- Be specific about what you want
- The companion learns from chat history
- Previous messages influence future responses

### **Audio Playback:**
- Desktop speakers recommended for better sound
- You can adjust system volume before clicking 🔊
- Speech playback is handled entirely by your browser

---

## Troubleshooting

### **"Microphone access denied"**
- Check browser settings: Settings → Privacy → Microphone
- Make sure the site is allowed to access the microphone
- For localhost: Most browsers allow without HTTPS

### **Voice transcription fails**
- Check that audio was actually recorded
- Try a shorter, clearer message
- Ensure the backend is running on `http://localhost:5000`

### **Text-to-speech not working**
- Verify your browser supports Web Speech API (most modern browsers do)
- Check system volume is not muted
- Try a different browser if issues persist

### **Chat shows "Select a companion"**
- Make sure you've clicked on a companion in the left panel
- The companion should highlight in blue when selected

### **Auto companion not appearing**
- Refresh the page (F5)
- Check the browser console for errors (F12 → Console)
- Restart the app if needed

---

## API Endpoints (For Reference)

| Endpoint | Purpose | Input |
|----------|---------|-------|
| `POST /api/chat` | Send text message | `{ companionId, message }` |
| `POST /api/audio/voice-chat` | Send voice message | Audio file (multipart) |
| `POST /api/audio/speak` | Get speech metadata | `{ text }` |

---

## What's Next

After you get comfortable with chat:
- **Game Zone**: Play games with your companion
- **Socialize**: Meet other users or play anonymously
- **Self Improvement**: Ask the companion for personal growth plans
- **Settings**: Control privacy, memory, voice behavior

---

## Need Help?

- Check the browser console for error messages: Press `F12` → **Console**
- Ensure backend is running: Visit `http://localhost:5000/health` (should show green ✅)
- Ensure frontend is running: Your browser should show http://localhost:3004
- Restart both services if audio/chat stops working

