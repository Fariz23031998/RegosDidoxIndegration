# Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.8+ installed (`python --version`)
- ✅ Node.js 18+ installed (`node --version`)
- ✅ E-IMZO client installed and running
- ✅ Your Didox TAX_ID ready

## Step-by-Step Setup

### 1. Backend Setup (Terminal 1)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env and add your TAX_ID
# DIDOX_BASE_URL=https://api-partners.didox.uz
# ORIGIN=http://localhost:5173
# TAX_ID=your_actual_tax_id_here

# Run backend (Windows)
run_backend.bat

# Or manually:
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend should be running at `http://localhost:8000`

### 2. Frontend Setup (Terminal 2)

```bash
# Install Node.js dependencies
cd frontend
npm install

# Run frontend (Windows)
cd ..
run_frontend.bat

# Or manually:
cd frontend
npm run dev
```

Frontend should be running at `http://localhost:5173`

### 3. Access the Application

1. Open your browser to `http://localhost:5173`
2. The app will automatically authenticate using E-IMZO
3. You should see the documents list

## Verification

### Check Backend

- Visit `http://localhost:8000/docs` - Should see Swagger API documentation
- Visit `http://localhost:8000/api/document-types` - Should return document types list

### Check Frontend

- Open browser console (F12) - Should see no errors
- Check Network tab - API calls should succeed

## Common Issues

### "Authentication Failed"

- Check E-IMZO client is running
- Verify TAX_ID in `.env` is correct
- Check backend logs for detailed error

### "Failed to fetch documents"

- Verify Didox API endpoints in `backend/main.py` match your API documentation
- Check network connectivity
- Review backend console for API errors

### Port Already in Use

- Backend: Change port in `run_backend.bat` or command
- Frontend: Change port in `frontend/vite.config.ts`

## Next Steps

- Customize the UI in `frontend/src/components/`
- Adjust API endpoints in `backend/main.py` if needed
- Add more features based on your requirements
