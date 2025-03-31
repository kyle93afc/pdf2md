# PDF to Markdown Converter with AI OCR

This application leverages AI to convert uploaded PDF files into Markdown format, with support for user accounts and subscriptions. It uses Mistral AI for Optical Character Recognition (OCR) and Firebase for storage and authentication.

## Features

- **PDF Upload:** Securely upload PDF files via a drag-and-drop interface (`FileUpload.tsx`).
- **AI-Powered OCR:** Extracts text content from PDFs using the Mistral AI API (`MistralOCRProcessor.tsx`, `src/app/api/mistral/`).
- **Markdown Conversion:** Transforms extracted text into Markdown.
- **Markdown Preview:** Displays the generated Markdown with styling potentially optimized for Obsidian (`ObsidianMarkdownPreview.tsx`).
- **User Authentication:** Sign in using Google via Firebase Authentication (`SignInWithGoogle.tsx`, `src/lib/firebase/`, `src/lib/contexts/AuthContext.tsx`).
- **File Storage:** Uploaded PDFs are stored in Firebase Storage (`src/lib/storage-helpers.ts`).
- **Subscription Tiers:** Offers different usage tiers managed via Stripe (`src/app/subscription/`, `src/components/SubscriptionTiers.tsx`, `src/app/api/stripe/`, `src/lib/stripe/`).

## Technologies Used

- **Frontend:** React, Next.js 14 (App Router), TailwindCSS
- **Backend:** Next.js API Routes
- **Authentication:** Firebase Authentication
- **Storage:** Firebase Storage
- **OCR/AI:** Mistral AI (via API route)
- **Payments:** Stripe
- **UI Components:** Likely shadcn/ui (in `src/components/ui/`)

*(Note: The project also includes template code for OpenAI, Anthropic, Replicate, and Deepgram APIs, which may not be currently used.)*

## Project Structure

The core application code resides in the `/src` directory:

- `src/app`: Main page routes (`page.tsx`), layout (`layout.tsx`), subscription page (`subscription/`), and API endpoints (`api/`).
    - `src/app/api`: Handlers for Mistral, Stripe, and potentially other services.
- `src/components`: Reusable React components like `FileUpload`, `MistralOCRProcessor`, `ObsidianMarkdownPreview`, `Header`, `SubscriptionTiers`, `SignInWithGoogle`, and base UI elements (`ui/`).
- `src/lib`: Core logic, helpers, hooks, and contexts.
    - `firebase/`: Firebase configuration and utilities (`firebase.ts`, `firebaseUtils.ts`).
    - `contexts/`: React contexts (e.g., `AuthContext.tsx`).
    - `hooks/`: Custom React hooks (e.g., `useAuth.ts`).
    - `stripe/`: Stripe configuration and helpers.
    - `storage-helpers.ts`: Functions for interacting with Firebase Storage.
    - `utils.ts`: General utility functions.
- `src/actions`: Server Actions (if used).
- `src/config`: Configuration files.
- `src/types`: TypeScript type definitions.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory. You will need to add configuration keys for:
    - Firebase (copy from your Firebase project settings)
    - Mistral AI (API key)
    - Stripe (API keys - public and secret)

    ```plaintext
    # .env.local Example

    # Firebase
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=...

    # Mistral AI
    MISTRAL_API_KEY=...

    # Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
    STRIPE_SECRET_KEY=...
    STRIPE_WEBHOOK_SECRET=... # Optional, for handling webhook events
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.