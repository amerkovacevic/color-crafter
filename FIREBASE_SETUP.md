# Firebase Setup Guide

This guide will help you set up Firebase Authentication and Firestore for the Color Crafter app.

## Prerequisites

- A Firebase account (free tier is sufficient)
- Firebase CLI installed (optional, for deploying rules)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard (enable Google Analytics if desired)

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Click on **Google** and enable it
3. Add your project's support email
4. Save your authorized domains if needed

## Step 3: Create Firestore Database

1. Go to **Firestore Database** in your Firebase console
2. Click **Create database**
3. Choose **Start in test mode** (we'll update rules in step 5)
4. Select a location for your database (choose the closest to your users)
5. Click **Enable**

## Step 4: Get Your Firebase Configuration

1. Go to **Project Settings** (gear icon next to Project Overview)
2. Scroll down to **Your apps** section
3. Click the web icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "Color Crafter Web")
5. Copy the Firebase configuration object

## Step 5: Configure Environment Variables

1. Create a `.env` file in the root of your project
2. Add the following variables with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Replace the placeholder values with your actual Firebase configuration values.

## Step 6: Deploy Firestore Security Rules

### Option A: Using Firebase Console (Recommended for beginners)

1. Go to **Firestore Database** → **Rules** tab
2. Copy the contents of `firestore.rules` file
3. Paste it into the rules editor
4. Click **Publish**

### Option B: Using Firebase CLI

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize (if not done): `firebase init firestore`
4. Deploy rules: `firebase deploy --only firestore:rules`

## Step 7: Create Firestore Index (Required)

The app queries palettes by `userId` and orders by `createdAt`. Firestore requires a composite index for this query.

**Note:** This app uses the collection name `colorCrafter_palettes` to avoid conflicts with other apps in the same Firebase project.

### Option A: Deploy Index via Firebase CLI (Recommended)

The project includes a `firestore.indexes.json` file that defines the required index. Deploy it with:

```bash
firebase deploy --only firestore:indexes
```

This will automatically create the index in your Firebase project. Wait 2-5 minutes for it to build.

### Option B: Automatic Link from Console

When you first use the app and try to load palettes, Firestore will show an error with a link to create the index. Click that link and create the index.

### Option C: Manual Creation

1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index**
3. Set:
   - Collection ID: `colorCrafter_palettes`
   - Fields to index:
     - `userId` (Ascending)
     - `createdAt` (Descending)
4. Click **Create**
5. Wait 2-5 minutes for the index to build (status will change from "Building" to "Enabled")

## Step 8: Test the Setup

1. Start your development server: `npm run dev`
2. Click "Sign in with Google" in the app
3. Create a palette and click "Save palette"
4. Verify the palette appears in "Your library" section

## Troubleshooting

### "Firebase is not configured" error
- Check that your `.env` file exists and has all required variables
- Ensure variable names start with `VITE_`
- Restart your dev server after creating/updating `.env`

### "Missing or insufficient permissions" error
- Verify Firestore rules are deployed (check Rules tab in Firebase Console)
- Ensure you're authenticated (check Authentication tab)

### Query error about missing index
- Create the composite index as described in Step 7
- Wait a few minutes for the index to build

### Authentication not working
- Verify Google sign-in is enabled in Firebase Console
- Check that your domain is authorized (for production)

## Security Notes

- Never commit your `.env` file to version control
- The Firestore rules ensure users can only access their own palettes
- All authentication is handled securely by Firebase
- The app uses the `colorCrafter_palettes` collection to ensure rules don't affect other apps in the same Firebase project

