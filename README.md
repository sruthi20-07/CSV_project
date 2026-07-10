# GrowEasy CRM AI-Powered CSV Importer

An intelligent, full-stack, production-ready CSV Lead Importer application for GrowEasy CRM. It leverages **Google Gemini 2.5 Flash** to automatically map unknown CSV structures, normalize messy fields (phone numbers, emails, dates), and import records following strict validation rules.

---

## 🚀 Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Typings:** TypeScript
- **Styling:** Tailwind CSS v4 & shadcn/ui
- **Table Handling:** TanStack Table (local search, pagination, sticky headers)
- **Local Parsing:** PapaParse (for zero-latency browser-side previews)
- **State Management:** Custom Wizard State Machine & Settings storage
- **Icons:** Lucide React
- **Notifications:** Sonner

### Backend
- **Runtime:** Node.js (Express with TypeScript compiler)
- **File Upload:** Multer (multipart storage)
- **CSV Stream:** csv-parser
- **Validation:** Zod schemas
- **Storage:** File-based JSON Database (persistent history, leads entries, and metrics charts)

### AI Model
- **Model:** Google Gemini 2.5 Flash
- **Features Used:** JSON Structured Output (`responseMimeType: "application/json"`) for exact schema matching.

---

## 📂 Project Structure

```bash
groweasy-ai-importer/
├── backend/                  # Express.js backend application
│   ├── data/                 # JSON DB and result directories
│   │   ├── db.json           # File-based database
│   │   └── results/          # Exported Success/Failed CSVs
│   ├── src/
│   │   ├── controllers/      # Route controllers (upload, process, history)
│   │   ├── middleware/       # Multer upload filters
│   │   ├── services/         # Gemini AI & local Database services
│   │   ├── utils/            # CSV parsing & Zod schemas
│   │   ├── types.ts          # Shared TypeScript interfaces
│   │   ├── routes.ts         # Router routing rules
│   │   └── index.ts          # Server entry point
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/                 # Next.js frontend application
    ├── app/                  # Pages and layouts
    │   ├── globals.css       # Tailwind CSS v4 directives
    │   └── page.tsx          # Main Page (binds Dashboard & Wizard steps)
    ├── components/
    │   ├── ui/               # Custom SVGs Charts, sonner & buttons
    │   ├── Dashboard.tsx     # Analytics KPIs & Logs Table
    │   ├── Header.tsx        # Top Nav & API settings modal
    │   ├── CSVUploadStep.tsx # Drag & Drop file dropzone
    │   ├── CSVPreviewStep.tsx# Client parsed preview table
    │   ├── MappingStep.tsx   # AI matching overrides & defaults
    │   ├── ProcessingStep.tsx# Live progress bar & batch status
    │   └── ResultsStep.tsx   # Success meters & download paths
    ├── tsconfig.json
    └── package.json
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Google Gemini API Key

### Backend Setup
1. Open a terminal and navigate to the backend:
   ```bash
   cd backend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` folder (or copy from template) and add your Gemini API Key:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```
   *The server runs at `http://localhost:5000`.*

### Frontend Setup
1. Open a new terminal and navigate to the frontend:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Next.js developer server:
   ```bash
   npm run dev
   ```
   *The client dashboard opens at `http://localhost:3000`.*

---

## 🗂️ Required CRM Schema & Processing Rules

The system expects the following CRM record structure:

| Field Name | Type | Description / Normalization Rules |
| :--- | :--- | :--- |
| `created_at` | Date (ISO) | Converted to ISO timestamp format. Defaults to current date. |
| `name` | String | Cleansed client full name. |
| `email` | String | Normalized to lowercase. Multiple emails: First email is saved, others go to `crm_note`. |
| `country_code` | String | Extracted dialing code (e.g. +91, 1). |
| `mobile_without_country_code` | String | Digits only. Multiple phone numbers: First goes here, others go to `crm_note`. |
| `company` | String | Company or firm name. |
| `city` / `state` / `country` | String | Geographical locations. |
| `lead_owner` | String | Defaults to fallback setting if unmapped. |
| `crm_status` | Enum | One of: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`. |
| `data_source` | Enum | One of: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`. |
| `possession_time` | String | Property possession timeline. |
| `description` | String | Additional messages. |
| `crm_note` | String | Captured secondary emails, secondary phone numbers, and unmapped columns. |

### Critical Validation Logic (Zod Rules)
- **Skip Constraint:** Any lead that does not contain an `email` AND does not contain a `mobile_without_country_code` is skipped.
- **Enums Verification:** Non-conforming values are mapped to fallbacks or fail verification.
- **Exporting Logs:** If rows fail validation or are skipped, they are output to `failed-*.csv` with a custom error diagnostics column explaining why.

---

## 🔮 AI Processing Configuration

To make development as simple as possible, the application supports two ways to supply the Gemini API Key:
1. **Server Environment:** Setting the `GEMINI_API_KEY` in `backend/.env`.
2. **Browser Storage (Client Override):** Click **Settings** in the top bar of the web app to save your API Key. It is stored securely in your browser's local storage and sent on each API call via the `x-gemini-key` request header.

---

## 📊 Dashboard & Charts

- **Import History:** Tracks dates, file names, file sizes, total entries, successful rows count, and failed rows count.
- **Interactive SVG Charts:** Includes a Line trend graph, status pie donut, and source distribution bar charts.
- **Mode Toggle:** Supports a responsive glassmorphic Dark and Light mode interface.

---

## 🚢 Cloud Deployment (Railway & Vercel)

This application is ready to deploy directly to the cloud.

### Backend (Deploy to Railway)
1. In your Railway Dashboard, create a **New Project** and connect your GitHub repository.
2. Select the repository and add the **Backend service**.
3. Go to the service's **Settings** tab:
   - Set **Root Directory** to `/backend`.
   - Railway will automatically read [railway.json](file:///c:/groweasy-ai-importer/backend/railway.json) to set build and start rules.
4. Go to the service's **Variables** tab and set the environment variables:
   - `PORT=5000`
   - `GEMINI_API_KEY=your_google_studio_key`
   - `GEMINI_MODEL=gemini-2.5-flash`
5. Click **Generate Domain** under the **Settings** tab to get your public API backend URL (e.g. `https://my-backend.up.railway.app`).

### Frontend (Deploy to Vercel)
1. In your Vercel Dashboard, create a **New Project** and import the same GitHub repository.
2. In the project setup panel:
   - Set the **Root Directory** to `frontend`.
   - The framework preset should be automatically detected as **Next.js**.
3. Under **Environment Variables**, add the public API backend URL variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://my-backend.up.railway.app` (your generated Railway domain)
4. Click **Deploy**. Vercel will build the frontend, and it will communicate securely with Railway using our Next.js API rewrites routing.

---

## 🏗️ Architecture Flow Diagram

```mermaid
graph TD
    subgraph Client [Browser Local Environment]
        UI[Dashboard & Wizard Steps]
        LS[(Local Storage)] -- Persist runs & charts metadata -- UI
        ClientCSV[Client-side CSV Compiler] -- Download Blobs -- UI
        
        UI -- 1. Parse CSV locally -- Papa[PapaParse]
        UI -- 2. Send Headers & Samples -- UploadRoute[POST /api/upload]
        UI -- 3. Loop Chunks of 50 -- ProcessRoute[POST /api/process]
    end

    subgraph Backend [Express Stateless API Server]
        UploadRoute --> Multer[File Upload]
        Multer --> Read[Read Headers & Samples]
        Read -- Delete Upload File Immediately -- Disk[Disk Cleaned]
        
        ProcessRoute --> AI_Norm[Gemini Data Normalization]
        AI_Norm --> ZodVal[Zod CRM Record Validation]
        ZodVal --> DupeCheck[Local Duplicate Screening]
    end

    Read --> Gemini[Gemini 2.5 Flash]
    AI_Norm --> Gemini
```

---

## 🧪 Testing Guidelines

Verify your code locally by executing both our standard unit checks and pipeline integration runners:
- **Unit Validation Checks:** Runs 10 testing cases asserting E.164 phone formats, email formatting, and skipped contact edge cases.
  ```bash
  cd backend
  npm run test
  ```
- **E2E Integration Runner:** Mock uploads, reads suggestions, and verifies processed batch ratios.
  ```bash
  cd backend
  npm run test:e2e
  ```

---

## 📁 Sample CSV Files

A pre-formatted testing file `groweasy_leads_sample.csv` is available to test immediately:
- **Headers:** `Full Name,Email Address,Phone Number,Company,City,CRM Status,Campaign Source,Possession Time,Notes`
- You can download this template dynamically by clicking **Download Sample CSV Template** directly on the CSV Upload screen in the web app.

---

## 📋 Known Assumptions & Heuristics
1. **Stateless Mandate:** No database connections are maintained. Aggregate history and imported metrics are persisted strictly within browser `localStorage` (history runs are truncated to protect local browser storage limits if they are larger than 2,000 records).
2. **Duplicate screening:** Checks duplicates against the client's past import history list passed in the request body. If `skipDuplicates` is enabled, matches are skipped; otherwise, warning headers are added to the record notes.
3. **Contact checks:** Leads require either an email address or phone number digits. Rows containing neither are skipped.


