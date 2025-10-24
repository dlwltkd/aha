# Home Vision Mobile App (Expo)

This Expo project lives inside the main workspace under pp/. It is the React Native client for the smart-home fusion system.

## Prerequisites

- Node.js 18+
- npm 9+ (or Yarn / pnpm if you prefer)
- Expo CLI (
pm install -g expo-cli) optional but helpful

## Setup

`ash
cd app
npm install
`

### Running in development

`ash
npm start        # launches Expo Dev Tools
npm run android  # build & launch on Android device/emulator
npm run ios      # requires Xcode
npm run web      # Expo web preview
`

Configure default endpoints in pp.config.ts or update Constants.expoConfig.extra once the FastAPI gateway is available.

## Structure

`
app/
  App.tsx              # navigation + providers
  src/
    screens/           # Dashboard, Settings
    hooks/             # e.g., useWebSocket
    theme/             # React Native Paper theme
    services/          # shared configuration
  assets/              # icons, splash, etc.
`

Add additional screens/components under src/ as the Figma design expands.
