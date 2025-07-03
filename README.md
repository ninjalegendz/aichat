
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

This project uses Firebase for Authentication, Firestore, and Storage.

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
3.  Start in **Production mode** and click "Next".
4.  Choose a location and click "Enable".
5.  Go to the **Rules** tab for your Firestore database.
6.  **IMPORTANT:** Copy the contents of the `firestore.rules` file from this project and paste them into the rules editor. This will allow the app to read from and write to the database.
7.  Click "Publish".

**Storage:**

1.  Go to the **Storage** tab.
2.  Click "Get started".
3.  Follow the setup wizard, selecting **Production mode**.
4.  After the storage bucket is created, go to the **Rules** tab.
5.  **IMPORTANT:** Copy the contents of the `storage.rules` file from this project and paste them into the rules editor in the Firebase console. This is required to allow file uploads.
6.  Click "Publish".

### 4. Run the Development Server

You're all set! Run the development server to start the app.

```bash
npm run dev
```

The app will be available at [http://localhost:9002](http://localhost:9002).
The admin panel is at [http://localhost:9002/admin](http://localhost:9002/admin).
