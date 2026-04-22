const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testKYC() {
    try {
        const form = new FormData();
        
        if (fs.existsSync('dummy_aadhaar.pdf')) form.append('aadhaar', fs.createReadStream('dummy_aadhaar.pdf'));
        if (fs.existsSync('dummy_pan.pdf')) form.append('pan', fs.createReadStream('dummy_pan.pdf'));
        if (fs.existsSync('dummy_passport.pdf')) form.append('passport', fs.createReadStream('dummy_passport.pdf'));
        
        // This is required
        if (fs.existsSync('dummy_selfie.jpg')) {
            form.append('live_photo', fs.createReadStream('dummy_selfie.jpg'));
        } else {
            console.warn("Please create a dummy_selfie.jpg for the live photo input.");
        }

        console.log("Sending multipart request to KYC API port 3000...");
        const response = await axios.post('http://localhost:3000/api/v1/kyc/verify', form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity // Allow large PDF payloads
        });

        console.log("Verification Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
         console.error("Test Failed:", error.response ? error.response.data : error.message);
    }
}

testKYC();
