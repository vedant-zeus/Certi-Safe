const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./utils/cryptoUtils');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const DB_FILE = path.join(__dirname, 'db.json');
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ certificates: [] }, null, 2));
}

// Multer setup (memory storage so we can encrypt before writing to disk)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper to get DB data
const getDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- Routes ---

// 1. Get all certificates
app.get('/api/certificates', (req, res) => {
    try {
        const db = getDB();
        res.json(db.certificates);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
});

// 2. Upload and Encrypt
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { title, type, category } = req.body;
        const fileId = Date.now().toString();
        const encryptedFilename = `${fileId}.enc`;
        const filePath = path.join(UPLOADS_DIR, encryptedFilename);

        // Encrypt the buffer
        const encryptedBuffer = encrypt(req.file.buffer);
        fs.writeFileSync(filePath, encryptedBuffer);

        // Save metadata
        const newCert = {
            id: fileId,
            title: title || req.file.originalname,
            originalName: req.file.originalname,
            type: type || 'Generic',
            category: category || 'Default',
            mimeType: req.file.mimetype,
            uploadDate: new Date().toISOString(),
            fileSize: req.file.size
        };

        const db = getDB();
        db.certificates.push(newCert);
        saveDB(db);

        res.status(201).json(newCert);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Encryption and storage failed' });
    }
});

// 3. Download and Decrypt
app.get('/api/download/:id', (req, res) => {
    try {
        const db = getDB();
        const cert = db.certificates.find(c => c.id === req.params.id);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });

        const filePath = path.join(UPLOADS_DIR, `${cert.id}.enc`);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

        const encryptedBuffer = fs.readFileSync(filePath);
        const decryptedBuffer = decrypt(encryptedBuffer);

        res.setHeader('Content-Type', cert.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${cert.originalName}"`);
        res.send(decryptedBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Decryption failed' });
    }
});

// 4. Delete Certificate
app.delete('/api/certificates/:id', (req, res) => {
    try {
        const db = getDB();
        const index = db.certificates.findIndex(c => c.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Certificate not found' });

        // Remove encrypted file
        const filePath = path.join(UPLOADS_DIR, `${req.params.id}.enc`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.certificates.splice(index, 1);
        saveDB(db);

        res.json({ message: 'Certificate deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete certificate' });
    }
});

app.listen(PORT, () => {
    console.log(`Vault Server running on http://localhost:${PORT}`);
});
