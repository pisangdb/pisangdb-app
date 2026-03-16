# Google OAuth Setup Guide for PisangDB

This guide walks you through setting up Google OAuth 2.0 for PisangDB authentication.

## Prerequisites

- A Google Account (gmail or Google Workspace)
- Access to Google Cloud Console (console.cloud.google.com)

## Step-by-Step Setup

### Step 1: Go to Google Cloud Console

1. Open [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. Click the project dropdown in the top-left corner
4. Click "New Project"
5. Enter a project name (e.g., "PisangDB")
6. Click "Create"

### Step 2: Configure OAuth Consent Screen

1. After project creation, go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (for allowing any Google user to sign in)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: PisangDB
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On "Scopes" page, click "Add or remove scopes"
7. Select these scopes:
   - `.../auth/userinfo.email` (Read your email address)
   - `.../auth/userinfo.profile` (See your personal info)
8. Click "Save and Continue"
9. On "Test users" page, you can add your Gmail as a test user (optional for development)
10. Click "Save and Continue"
11. Review and click "Back to Dashboard"

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "Create Credentials" > **OAuth client ID**
3. Select **Web application** as the application type
4. Enter a name (e.g., "PisangDB Web App")

### Step 4: Configure Redirect URIs

1. Under **Authorized redirect URIs**, click "Add URI"
2. Add your development redirect URI:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
3. For production, add:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
4. Click "Create"

### Step 5: Get Your Credentials

1. A dialog will show your **Client ID** and **Client Secret**
2. Copy these values - you'll need them for environment variables

## Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth (optional - leave empty to disable)
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Base URL (required for OAuth redirects)
BASE_URL=http://localhost:3000
```

For production:
```bash
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
BASE_URL=https://yourdomain.com
```

## Verify Setup

After configuring the environment variables:

1. Restart your development server
2. Go to the login page
3. You should see a "Continue with Google" button
4. Click it - you should be redirected to Google for authentication

## Troubleshooting

### "Invalid client ID" error
- Verify `GOOGLE_CLIENT_ID` is correct
- Make sure the OAuth consent screen is fully configured

### "redirect_uri_mismatch" error
- Verify `GOOGLE_REDIRECT_URI` exactly matches what's in Google Cloud Console
- Include the exact protocol (http vs https)

### Button not showing
- Make sure `GOOGLE_CLIENT_ID` is set in your `.env`
- Restart the development server after changing env vars

## Security Notes

- Keep `GOOGLE_CLIENT_SECRET` confidential - never commit it to git
- The secret is only used server-side for code exchange
- Access tokens are NOT stored - only used temporarily to get user info
