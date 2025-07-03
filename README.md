
# ShopAssist AI

This is an AI-powered customer support chat application built with Next.js, Genkit, and Firebase.

## Getting Started

Follow these steps to get the application running locally.

### 1. Install Dependencies

First, install the required packages:

```bash
npm install
```

### 2. Configure Firebase

This project uses Firebase for Authentication and Firestore.

1.  **Create a Firebase Project:** If you don't have one already, create a new project at the [Firebase Console](https://console.firebase.google.com/).
2.  **Create a Web App:** Inside your project, create a new Web App.
3.  **Copy Credentials:** Copy the `firebaseConfig` object provided.
4.  **Paste into `src/lib/firebase.ts`:** Replace the placeholder configuration in `src/lib/firebase.ts` with your own project's credentials.

### 3. Set up Firebase Services

**Authentication:**

1.  Go to the **Authentication** tab in the Firebase Console.
2.  Click "Get started".
3.  Enable the **Email/Password** sign-in provider.
4.  Create a demo user for the admin panel:
    *   **Email:** `admin@example.com`
    *   **Password:** `password`

**Firestore Database:**

1.  Go to the **Firestore Database** tab.
2.  Click "Create database".
3.  Start in **Test mode** and click "Next". This will allow open access for development. For production, you should use "Production mode" and secure your data.
4.  Choose a location and click "Enable".

### 4. Run the Development Server

You're all set! Run the development server to start the app.

```bash
npm run dev
```

The app will be available at [http://localhost:9002](http://localhost:9002).
The admin panel is at [http://localhost:9002/admin](http://localhost:9002/admin).

### 5. Deploy to Firebase

This application is configured for deployment to Firebase Hosting.

1.  **Install Firebase CLI:** If you haven't already, install the Firebase command-line tools globally:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

3.  **Set Firebase Project:** Open the `.firebaserc` file and replace `"shopassist-ai-app"` with your actual Firebase Project ID.

4.  **Configure Google Cloud:** In your Google Cloud project (which is linked to your Firebase project):
    *   **Enable APIs:** Ensure the following APIs are enabled in the Google Cloud Console:
        *   Cloud Build API (usually enabled by default)
        *   Cloud Run Admin API
        *   Vertex AI API
    *   **Grant Permissions:** Your app's backend will run on Cloud Functions. You need to give its service account permission to use Genkit's AI features.
        1.  Go to the IAM page in the Google Cloud Console.
        2.  Find the service account with the name `PROJECT_ID@appspot.gserviceaccount.com` (the default App Engine service account).
        3.  Grant this service account the **Vertex AI User** role. This allows it to make calls to the Gemini model.

5.  **Deploy:** Run the deployment command from your project's root directory:
    ```bash
    firebase deploy --only hosting
    ```

Firebase will automatically build your Next.js application, package it into a Cloud Function, and deploy it to Firebase Hosting.
