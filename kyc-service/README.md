# KYC Identity Verification System

This application processes multiple KYC documents (Aadhaar, PAN, Passport PDFs) and a live selfie to automatically verify user identity. It uses OCR to extract text from Identity proofs, parses them to cross-reference Names and Dates of Birth, and performs AI Face Verification using `DeepFace`.

The system is split into two independent microservices:
1. **Node.js Express API**: Orchestrates document uploads, OCR extraction (`tesseract.js`), regex parsing, validation algorithms, and final scoring.
2. **Python FastAPI Service**: Dedicated Python ML server that computes cosine similarity between a live selfie and a document photo using FaceNet.

## Prerequisites

- **Node.js** (v16+)
- **Python** (v3.8+)
- **Ghostscript and GraphicsMagick** (Required by `pdf2pic` to convert PDF pages into images)

> **Note for Windows Users**: Ensure Ghostscript and GraphicsMagick are installed and added to your System PATH, otherwise the PDF OCR extraction will fail.

---

## 🚀 1. Running the Python Face Verification Service

This service must be running for the Node.js API to verify facial similarity. It exposes an endpoint at `http://localhost:8005/verify_face`.

```bash
cd face-service

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows PowerShell
# source venv/bin/activate    # On Linux/Mac

# Install dependencies (Downloads DeepFace/Tensorflow models)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --port 8005 --reload
```
*Note: The first time `DeepFace.verify()` is called inside the service, it may take an extra minute to download the pre-trained `FaceNet` ML models.*

---

## 🚀 2. Running the Node.js KYC API

This is the primary gateway where multipart form requests are submitted. It exposes the main KYC endpoint at `http://localhost:3000/api/v1/kyc/verify`.

```bash
cd api

# Install Node modules
npm install

# Start the Express server
npm start
```

---

## 🧪 3. How to Test the Application

With **both** the Python service and Node.js server running concurrently, you can submit an HTTP `POST` multipart/form-data request to the API.

### Endpoints
`POST http://localhost:3000/api/v1/kyc/verify`

**Form Data Fields Accepted:**
- `aadhaar` (File - PDF)
- `pan` (File - PDF)
- `passport` (File - PDF)
- `live_photo` (File - JPG/PNG) *Required*

### Using the Automated Test Stub
We've included a `test_client.js` script to quickly test the entire integration locally.

1. Ensure you have dummy files placed in the `api` folder:
    - `dummy_aadhaar.pdf`
    - `dummy_pan.pdf`
    - `dummy_passport.pdf`
    - `dummy_selfie.jpg`

2. Run the test script in a new terminal:
```bash
cd api
node test_client.js
```

### Expected JSON Output
You will receive a structured JSON body outlining the extraction scores, string similarity metrics, and final decision (`verified`, `review`, or `rejected`):
```json
{
  "status": "verified",
  "confidence_score": 86,
  "details": {
    "name_match": 91,
    "dob_match": 100,
    "face_match": 85,
    "doc_consistency": 100
  }
}
```
