const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./utils/cryptoUtils');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
require('dotenv').config();

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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

// Helper for Cloudinary upload
const uploadToCloudinary = (buffer, publicId) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'raw', public_id: publicId },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

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
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { title, type, category } = req.body;
        const fileId = Date.now().toString();
        const encryptedFilename = `${fileId}.enc`;

        // Encrypt the buffer
        const encryptedBuffer = encrypt(req.file.buffer);
        
        // Upload to Cloudinary (pointer-based storage)
        const cloudResult = await uploadToCloudinary(encryptedBuffer, encryptedFilename);

        // Save metadata with Cloudinary URL (the pointer)
        const newCert = {
            id: fileId,
            title: title || req.file.originalname,
            originalName: req.file.originalname,
            type: type || 'Generic',
            category: category || 'Default',
            mimeType: req.file.mimetype,
            uploadDate: new Date().toISOString(),
            fileSize: req.file.size,
            cloudinaryUrl: cloudResult.secure_url,
            cloudinaryPublicId: cloudResult.public_id
        };

        const db = getDB();
        db.certificates.push(newCert);
        saveDB(db);

        res.status(201).json(newCert);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Encryption or cloud storage failed' });
    }
});

// 3. Download and Decrypt
app.get('/api/download/:id', async (req, res) => {
    try {
        const db = getDB();
        const cert = db.certificates.find(c => c.id === req.params.id);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });

        if (!cert.cloudinaryUrl) return res.status(404).json({ error: 'Cloud pointer missing' });

        // Fetch encrypted file from Cloudinary
        const response = await axios.get(cert.cloudinaryUrl, { responseType: 'arraybuffer' });
        const encryptedBuffer = Buffer.from(response.data);
        
        const decryptedBuffer = decrypt(encryptedBuffer);

        res.setHeader('Content-Type', cert.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${cert.originalName}"`);
        res.send(decryptedBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Decryption or cloud fetch failed' });
    }
});

// 4. Delete Certificate
app.delete('/api/certificates/:id', async (req, res) => {
    try {
        const db = getDB();
        const index = db.certificates.findIndex(c => c.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Certificate not found' });

        const cert = db.certificates[index];

        // Remove from Cloudinary if publicId exists
        if (cert.cloudinaryPublicId) {
            await cloudinary.uploader.destroy(cert.cloudinaryPublicId, { resource_type: 'raw' });
        }

        db.certificates.splice(index, 1);
        saveDB(db);

        res.json({ message: 'Certificate deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete certificate' });
    }
});

app.listen(PORT, () => {
    console.log(`Vault Server running on http://localhost:${PORT}`);
});
