// =====================================================
// KYC SYNC — Two-Step Verification Logic
// Step 1: Document OCR  |  Step 2: Liveness + Deepfake
// =====================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// ---------- Utilities ----------

async function convertPdfToImageBlob(file) {
    if (!file || file.type !== 'application/pdf') return file;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const vp   = page.getViewport({ scale: 2.5 });

        const canvas = document.createElement('canvas');
        canvas.width  = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

        return new Promise(resolve => {
            canvas.toBlob(blob => {
                resolve(blob
                    ? new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })
                    : file);
            }, 'image/png', 1.0);
        });
    } catch (e) {
        console.warn('PDF conversion failed:', e);
        return file;
    }
}

function animateCounter(el, target, suffix = '%') {
    let cur = 0;
    const step = Math.ceil(target / 60);
    const iv = setInterval(() => {
        cur = Math.min(cur + step, target);
        el.innerText = cur + suffix;
        if (cur >= target) clearInterval(iv);
    }, 16);
}

function paintRing(ring, score, status) {
    const colorMap = { verified: 'var(--success)', review: 'var(--review)', rejected: 'var(--rejected)' };
    const color = colorMap[status] || 'var(--primary)';
    ring.style.background = `conic-gradient(${color} ${score}%, rgba(161,136,127,0.1) 0%)`;
}

function setStep(n) {
    [1, 2, 3, 4].forEach(i => {
        const dot  = document.getElementById(`step-dot-${i}`);
        const line = document.getElementById(`step-line-${i}`);
        if (dot) {
            dot.classList.toggle('active',    i <= n);
            dot.classList.toggle('completed', i < n);
        }
        if (line) line.classList.toggle('active', i < n);
    });
}


// =====================================================
// STEP 1 — Document Verification
// =====================================================

document.getElementById('kycForm').addEventListener('submit', async e => {
    e.preventDefault();

    const submitBtn    = document.getElementById('submitBtn');
    const loading      = document.getElementById('loadingDocs');
    const resultDiv    = document.getElementById('docResult');

    submitBtn.disabled = true;
    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    try {
        const fd = new FormData();

        const aadhaarFile  = document.getElementById('aadhaar').files[0];
        const panFile      = document.getElementById('pan').files[0];
        const passportFile = document.getElementById('passport').files[0];

        if (!aadhaarFile && !panFile && !passportFile) {
            alert('Please upload at least one document.');
            return;
        }

        if (aadhaarFile)  fd.append('aadhaar',  await convertPdfToImageBlob(aadhaarFile));
        if (panFile)      fd.append('pan',       await convertPdfToImageBlob(panFile));
        if (passportFile) fd.append('passport',  await convertPdfToImageBlob(passportFile));

        const res  = await fetch('/api/v1/kyc/verify', { method: 'POST', body: fd });
        const data = await res.json();

        if (!res.ok) {
            alert('API Error: ' + (data.error || 'Something went wrong'));
            return;
        }

        // Save extracted data + aadhaar image path to localStorage
        localStorage.setItem('kyc_doc_result', JSON.stringify(data));
        localStorage.setItem('kyc_aadhaar_image', data.aadhaar_image_path || '');

        // Display document result card
        const score = data.confidence_score;
        const ring  = document.getElementById('docRing');
        const scoreEl = document.getElementById('docScoreText');

        paintRing(ring, score, data.status);
        animateCounter(scoreEl, score);

        const statusEl = document.getElementById('docStatusText');
        statusEl.innerText = data.status.toUpperCase();
        const colorMap = { verified: 'var(--success)', review: 'var(--review)', rejected: 'var(--rejected)' };
        statusEl.style.color = colorMap[data.status] || 'var(--primary)';

        document.getElementById('d_nameMatch').innerText = (data.details?.name_match ?? '--') + '%';
        document.getElementById('d_dobMatch').innerText  = (data.details?.dob_match  ?? '--') + '%';
        document.getElementById('d_docCons').innerText   = (data.details?.doc_consistency ?? '--') + '%';

        resultDiv.classList.remove('hidden');
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (score >= 50) {
            document.getElementById('docPassedMsg').classList.remove('hidden');
            document.getElementById('docRejectedMsg').classList.add('hidden');
            // Reveal step 2 after a short delay
            setTimeout(() => {
                document.getElementById('section-liveness').classList.remove('hidden');
                document.getElementById('section-liveness').scrollIntoView({ behavior: 'smooth' });
                setStep(2);
            }, 1500);
        } else {
            document.getElementById('docRejectedMsg').classList.remove('hidden');
            document.getElementById('docPassedMsg').classList.add('hidden');
        }

    } catch (err) {
        alert('Verification failed: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        loading.classList.add('hidden');
    }
});


// =====================================================
// STEP 2 — Live Camera + Recording + Deepfake Check
// =====================================================

let mediaStream   = null;
let mediaRecorder = null;
let recordedChunks = [];

const cameraFeed      = document.getElementById('cameraFeed');
const cameraStatus    = document.getElementById('cameraStatus');
const startCameraBtn  = document.getElementById('startCameraBtn');
const startRecordBtn  = document.getElementById('startRecordBtn');
const recordingOverlay = document.getElementById('recordingOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNum    = document.getElementById('countdownNum');

startCameraBtn.addEventListener('click', async () => {
    try {
        cameraStatus.innerText = 'Requesting camera access…';
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraFeed.srcObject = mediaStream;
        cameraStatus.innerText = '✅ Camera active – click Record when ready';
        startCameraBtn.classList.add('hidden');
        startRecordBtn.classList.remove('hidden');
    } catch (err) {
        cameraStatus.innerText = '❌ Camera access denied: ' + err.message;
    }
});

startRecordBtn.addEventListener('click', () => startCountdownAndRecord());

function startCountdownAndRecord() {
    startRecordBtn.disabled = true;
    let count = 3;
    countdownNum.innerText = count;
    countdownOverlay.classList.remove('hidden');
    cameraStatus.innerText = 'Get ready…';

    const iv = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(iv);
            countdownOverlay.classList.add('hidden');
            beginRecording();
        } else {
            countdownNum.innerText = count;
        }
    }, 1000);
}

function beginRecording() {
    recordedChunks = [];

    // Pick a supported MIME type
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';

    mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = handleRecordingComplete;

    mediaRecorder.start(200); // collect data every 200ms
    recordingOverlay.classList.remove('hidden');
    cameraStatus.innerText = '🔴 Recording…';

    // Record for 4 seconds then stop automatically
    let sec = 4;
    const countdown = setInterval(() => {
        sec--;
        cameraStatus.innerText = `🔴 Recording… ${sec}s remaining`;
        if (sec <= 0) {
            clearInterval(countdown);
            mediaRecorder.stop();
        }
    }, 1000);
}

async function handleRecordingComplete() {
    recordingOverlay.classList.add('hidden');
    cameraStatus.innerText = '✅ Video captured – uploading for analysis…';

    const mimeType = recordedChunks[0]?.type || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const videoBlob = new Blob(recordedChunks, { type: mimeType });
    const videoFile = new File([videoBlob], `liveness.${ext}`, { type: mimeType });

    // Stop camera stream
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());

    // Show loading
    document.getElementById('loadingLiveness').classList.remove('hidden');
    startRecordBtn.disabled = true;

    try {
        const fd = new FormData();
        fd.append('liveness_video', videoFile);

        // Attach aadhaar image path for face comparison
        const aadhaarPath = localStorage.getItem('kyc_aadhaar_image') || '';
        if (aadhaarPath) fd.append('aadhaar_image_path', aadhaarPath);

        const res  = await fetch('/api/v1/kyc/liveness', { method: 'POST', body: fd });
        const data = await res.json();

        document.getElementById('loadingLiveness').classList.add('hidden');

        if (!res.ok) {
            cameraStatus.innerText = '❌ Error: ' + (data.error || 'Analysis failed');
            startRecordBtn.disabled = false;
            return;
        }

        showFinalResult(data);
    } catch (err) {
        document.getElementById('loadingLiveness').classList.add('hidden');
        cameraStatus.innerText = '❌ Upload failed: ' + err.message;
        startRecordBtn.disabled = false;
    }
}

function showFinalResult(data) {
    const score   = data.confidence_score;
    const ring    = document.getElementById('liveRing');
    const scoreEl = document.getElementById('liveScoreText');
    const statusEl = document.getElementById('liveStatusText');

    paintRing(ring, score, data.status);
    animateCounter(scoreEl, score);

    const colorMap = { verified: 'var(--success)', review: 'var(--review)', rejected: 'var(--rejected)' };
    statusEl.innerText = data.status.toUpperCase();
    statusEl.style.color = colorMap[data.status] || 'var(--primary)';

    document.getElementById('l_liveness').innerText = (data.details?.liveness_score ?? '--') + '%';
    document.getElementById('l_faceMatch').innerText = (data.face_match_similarity ?? data.details?.face_match ?? '--') + '%';
    document.getElementById('l_frames').innerText   = data.deepfake_metrics?.analyzed_frames ?? '--';
    document.getElementById('l_blink').innerText    = data.deepfake_metrics?.blink_detected ? '✅ Yes' : '❌ No';

    const finalSection = document.getElementById('section-final');
    finalSection.classList.remove('hidden');
    finalSection.scrollIntoView({ behavior: 'smooth' });

    if (score >= 50) {
        document.getElementById('livePassedMsg').classList.remove('hidden');
        document.getElementById('liveRejectedMsg').classList.add('hidden');
        document.getElementById('retryLivenessBtn').classList.add('hidden');
        
        // Show Step 3 (QnA) after a short delay
        setTimeout(() => {
            document.getElementById('section-qna').classList.remove('hidden');
            document.getElementById('section-qna').scrollIntoView({ behavior: 'smooth' });
            setStep(3);
            generateCaptcha();
        }, 1500);
    } else {
        document.getElementById('liveRejectedMsg').classList.remove('hidden');
        document.getElementById('livePassedMsg').classList.add('hidden');
        document.getElementById('retryLivenessBtn').classList.remove('hidden');
    }
}

// Retry liveness
document.getElementById('retryLivenessBtn').addEventListener('click', () => {
    document.getElementById('section-final').classList.add('hidden');
    document.getElementById('loadingLiveness').classList.add('hidden');
    startRecordBtn.classList.add('hidden');
    startCameraBtn.classList.remove('hidden');
    startRecordBtn.disabled = false;
    cameraStatus.innerText = 'Camera not started';
    mediaStream = null;
});

// =====================================================
// STEP 3 & 4 — Behavioral Q&A & Complete
// =====================================================
let currentCaptcha = '';

function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentCaptcha = captcha;
    
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#e8dfc8'; // match background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(161,136,127,${Math.random() * 0.5})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#4e342e';
    ctx.setTransform(1, Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1, 1, 0, 0);
    ctx.fillText(captcha, 20, 28);
    
    const textEl = document.getElementById('captchaText');
    if(textEl) {
        textEl.innerHTML = '';
        textEl.appendChild(canvas);
    }
}

const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
if(refreshCaptchaBtn) refreshCaptchaBtn.addEventListener('click', generateCaptcha);

document.getElementById('qnaForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('captchaInput').value;
    const errorMsg = document.getElementById('captchaErrorMsg');
    
    if (input.trim().toLowerCase() !== currentCaptcha.toLowerCase()) {
        errorMsg.classList.remove('hidden');
        generateCaptcha();
        document.getElementById('captchaInput').value = '';
        return;
    }
    
    errorMsg.classList.add('hidden');
    
    // Show Final Complete
    document.getElementById('section-final-complete').classList.remove('hidden');
    document.getElementById('section-final-complete').scrollIntoView({ behavior: 'smooth' });
    setStep(4);
    
    // Disable form
    const submitBtn = document.getElementById('submitQnaBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Verified & Submitted';
    }
    
    // Disable inputs
    document.querySelectorAll('.qna-input').forEach(el => el.disabled = true);
});
