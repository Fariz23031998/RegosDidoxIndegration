# Didox Documents Viewer

A full-stack application for viewing documents from Didox API, built with React/TypeScript/Vite frontend and FastAPI backend.

## Features

- 🔐 Authentication with Didox API using E-IMZO
- 📄 View list of documents with filtering and pagination
- 🔍 View detailed document information
- 📥 Download documents as PDF
- 🎨 Modern, responsive UI with dark mode support

## Project Structure

```
.
├── backend/           # FastAPI backend
│   └── main.py       # Main API application
├── frontend/          # React/TypeScript/Vite frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── api/          # API client and services
│   │   └── types.ts      # TypeScript types
│   └── package.json
├── didox/             # Didox integration module
│   ├── login.py       # Authentication functions
│   └── eimzo.py       # E-IMZO integration
└── requirements.txt   # Python dependencies
```

## Prerequisites

- Python 3.8+
- Node.js 18+
- E-IMZO client installed and running
- Didox API credentials (TAX_ID)

## Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the root directory:
```env
DIDOX_BASE_URL=https://api-partners.didox.uz
ORIGIN=http://localhost:5173
TAX_ID=your_tax_id_here
```

3. Run the backend server:
```bash
cd backend
python main.py
```

Or using uvicorn directly:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## Frontend Setup

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Create a `.env` file in the frontend directory (optional):
```env
VITE_API_URL=http://localhost:8000
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

1. Start the backend server (port 8000)
2. Start the frontend development server (port 5173)
3. Open `http://localhost:5173` in your browser
4. The app will automatically authenticate with Didox using E-IMZO
5. Browse documents, filter by type/date, and view details

## API Endpoints

### Backend Endpoints

- `POST /api/auth/login` - Authenticate and get token
- `GET /api/documents` - Get list of documents (with filters)
- `GET /api/documents/{id}` - Get specific document details
- `GET /api/documents/{id}/download` - Download document PDF
- `GET /api/document-types` - Get available document types

### Query Parameters for `/api/documents`

- `document_type` - Filter by document type code
- `date_from` - Filter documents from date (YYYY-MM-DD)
- `date_to` - Filter documents to date (YYYY-MM-DD)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

## Document Types

The application supports the following Didox document types:

1. Счёт фактура (Invoice)
2. Счет-фактура (ФАРМ) (Invoice PHARM)
3. Гибридная счет-фактура (Hybrid Invoice)
4. ТТН (Waybill)
5. Акт (Act)
6. Доверенность (Power of Attorney)
7. Договор НК (Contract NK)
8. Произвольный документ (Custom Document)
9. Акт сверки (Reconciliation Act)
10. Акт приёма передачи (Acceptance Transfer Act)
11. Многосторонний произвольный документ (Multilateral Custom Document)
12. Протокол собрания учредителей (Founders Meeting Protocol)
13. Письмо НК (Letter NK)

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Development

The frontend uses Vite for fast development with hot module replacement.

## Troubleshooting

### Authentication Issues

- Ensure E-IMZO client is running
- Verify TAX_ID is correct in `.env`
- Check that ORIGIN matches your frontend URL

### CORS Issues

- Make sure backend CORS settings include your frontend URL
- Check that both servers are running on correct ports

### API Connection Issues

- Verify DIDOX_BASE_URL is correct
- Check network connectivity
- Review backend logs for detailed error messages

### API Endpoint Configuration

**Important**: The Didox API endpoints in `backend/main.py` may need to be adjusted based on your specific Didox API documentation. The current implementation uses common endpoint patterns:

- `/v1/integrators/documents` for listing documents
- `/v1/integrators/documents/{id}` for getting a document
- `/v1/integrators/documents/{id}/download` for downloading

If these don't match your Didox API, update the URLs in `backend/main.py`. The code includes fallback attempts to alternative endpoints.

## License

MIT
