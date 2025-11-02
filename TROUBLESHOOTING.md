# Troubleshooting Firestore Errors

If you're unable to save palettes, follow these steps:

## 1. Check Browser Console

Open your browser's developer console (F12) and look for error messages. Common errors include:

- **Permission denied** - Firestore rules not deployed correctly
- **Missing index** - Composite index needs to be created
- **Firebase not configured** - Environment variables missing

## 2. Verify Firestore Rules are Deployed

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. Verify the rules include the `colorCrafter_palettes` collection rules
5. Click **Publish** if you see unsaved changes

## 3. Create the Required Firestore Index

The app requires a composite index for querying palettes. 

### Option A: Automatic (Easiest)
1. When you see the error in console, look for a link that says "Create Index"
2. Click that link - it will take you directly to the Firebase Console
3. Click **Create Index** and wait a few minutes for it to build

### Option B: Manual
1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index**
3. Set:
   - **Collection ID**: `colorCrafter_palettes`
   - **Fields to index**:
     - `userId` (Ascending)
     - `createdAt` (Descending)
4. Click **Create**
5. Wait 2-5 minutes for the index to build (status will change from "Building" to "Enabled")

## 4. Verify Environment Variables

Make sure your `.env` file exists and has all required variables:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**Important**: Restart your dev server after creating or modifying `.env`!

## 5. Check Authentication

1. Make sure you're signed in (you should see your name/email in the header)
2. Verify in Firebase Console → **Authentication** → **Users** that your account exists
3. Try signing out and signing back in

## 6. Common Error Messages and Solutions

### "Permission denied"
- **Solution**: Deploy Firestore rules (see step 2)
- Check that rules allow authenticated users to create documents in `colorCrafter_palettes`

### "Missing index" or "failed-precondition"
- **Solution**: Create the composite index (see step 3)
- This is the most common issue!

### "Firebase is not configured"
- **Solution**: Check your `.env` file and restart dev server

### "You need to be signed in"
- **Solution**: Sign in with Google using the button in the header

## 7. Test Firestore Connection

1. Open browser console (F12)
2. Go to **Network** tab
3. Try saving a palette
4. Look for requests to `firestore.googleapis.com`
5. Check if they're returning errors (status code 403 = permissions, 400 = bad request)

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify all steps above
3. Make sure your Firebase project is active (not on a free tier limit)
4. Try creating a test document directly in Firebase Console to verify Firestore is working

