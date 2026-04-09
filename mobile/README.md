# PersonaX Mobile (React Native)

This is the React Native conversion workspace for PersonaX using Expo.

## Run

1. Install dependencies:
   npm install
2. Start development server:
   npm start
3. Run Android:
   npm run android

## API base URL

Set `EXPO_PUBLIC_API_URL` if needed.

Examples:
- Android emulator to local backend: `http://10.0.2.2:5000/api`
- Real device on same Wi-Fi: `http://YOUR_PC_LAN_IP:5000/api`

## APK Submission

Use EAS Build for production APK:

1. `npm install -g eas-cli`
2. `eas login`
3. `eas build:configure`
4. `eas build -p android --profile preview`

This outputs an installable Android APK/AAB build.
