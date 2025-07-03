# Firebase Studio

This is a NextJS starter in Firebase Studio.

## Getting Started

To get started, take a look at `src/app/page.tsx`.

## Environment Variables

This project uses Firebase for authentication and database services. You need to configure your Firebase project credentials in an environment file.

1.  This project requires a file named `.env` in the root directory. I have created it for you with the necessary placeholder values.
2.  Replace the placeholder values in `.env` with your actual Firebase project credentials:

    ```
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
    ```

3.  You can find these values in your Firebase project settings under "Project settings" > "General" > "Your apps" > "SDK setup and configuration".
4.  After adding the credentials, you must restart your development server for the changes to take effect.
