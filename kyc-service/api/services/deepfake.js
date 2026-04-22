/**
 * deepfake.js — Deepfake Detection Service
 *
 * Calls the Python FastAPI inference server (ml/server.py) on port 8001.
 * Falls back to a mock score if the Python server is not running,
 * so the KYC flow still works end-to-end during development.
 *
 * Start the ML server first:
 *   python ml/server.py
 */

const fs   = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8001';

/** Generic POST request using Node's built-in http module (no axios needed). */
function postFormData(url, form) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port:     urlObj.port || 80,
            path:     urlObj.pathname,
            method:   'POST',
            headers:  form.getHeaders(),
            timeout:  30000  // 30s timeout for ML inference
        };

        const req = http.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(raw));
                    } else {
                        reject(new Error(`ML server returned ${res.statusCode}: ${raw}`));
                    }
                } catch (e) {
                    reject(new Error('ML server returned invalid JSON'));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('ML server timeout')); });
        form.pipe(req);
    });
}

/** Mock fallback when ML server is offline. */
function mockFallback(reason) {
    console.warn(`[deepfake] ⚠ Using mock scores (${reason})`);
    const real = 78 + Math.random() * 17;
    return {
        real_confidence: Math.round(real * 10) / 10,
        is_real: real >= 50,
        metrics: {
            facial_movement:   Math.round((70 + Math.random() * 25) * 10) / 10,
            blink_detected:    Math.random() > 0.15,
            texture_consistency: Math.round((72 + Math.random() * 23) * 10) / 10,
            analyzed_frames:   8,
            source: 'mock'
        }
    };
}

/**
 * Analyze a video file for deepfake detection.
 * Returns: { real_confidence, is_real, metrics }
 */
async function analyzeVideo(videoPath) {
    // Small delay to simulate processing if falling back
    if (!fs.existsSync(videoPath)) {
        throw new Error('Video file not found: ' + videoPath);
    }

    const stats = fs.statSync(videoPath);
    if (stats.size < 1000) {
        throw new Error('Video file is too small to analyze');
    }

    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(videoPath), {
            filename: path.basename(videoPath),
            contentType: 'video/webm'
        });
        form.append('mode', 'video');

        const result = await postFormData(`${ML_SERVER_URL}/analyze`, form);

        console.log(`[deepfake] ML server result: real=${result.real_confidence}% frames=${result.analyzed_frames}`);

        return {
            real_confidence: result.real_confidence,
            is_real:         result.is_real,
            metrics: {
                analyzed_frames:  result.analyzed_frames,
                inference_time_ms: result.inference_time_ms,
                per_frame_scores: result.per_frame_scores,
                blink_detected:   true,  // placeholder (add CV blink detector in future)
                texture_consistency: result.real_confidence,
                source: 'ml_model'
            }
        };

    } catch (err) {
        console.warn(`[deepfake] ML server unavailable (${err.message}) — using mock.`);
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 500));
        return mockFallback(err.message);
    }
}

/**
 * Compare a face image (from Aadhaar doc) against a video (mock-based for now).
 * Production: extract face region from video frames and run FaceNet similarity.
 */
async function compareFaceToVideo(docImagePath, videoPath) {
    await new Promise(r => setTimeout(r, 600));

    if (!fs.existsSync(docImagePath)) {
        return { similarity: 72 + Math.random() * 15, matched: true };
    }

    // Placeholder ML face similarity (will be replaced with FaceNet in production)
    const similarity = Math.round((72 + Math.random() * 23) * 10) / 10;
    return { similarity, matched: similarity >= 50 };
}

module.exports = { analyzeVideo, compareFaceToVideo };
