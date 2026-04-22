const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { verifyDocuments, verifyLiveness } = require('../controllers/kycController');

const upload = multer({ dest: 'uploads/' });

// Step 1 – Document OCR verification (no face required)
router.post('/verify', upload.fields([
    { name: 'aadhaar',  maxCount: 1 },
    { name: 'pan',      maxCount: 1 },
    { name: 'passport', maxCount: 1 }
]), verifyDocuments);

// Step 2 – Liveness check: deepfake detection + face match vs Aadhaar
router.post('/liveness', upload.fields([
    { name: 'liveness_video', maxCount: 1 }
]), verifyLiveness);

module.exports = router;
