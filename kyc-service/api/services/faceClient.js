const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function compareFace(docImagePath, liveImagePath) {
    try {
        const form = new FormData();
        form.append('document_image', fs.createReadStream(docImagePath));
        form.append('live_image', fs.createReadStream(liveImagePath));

        const faceServiceUrl = process.env.FACE_SERVICE_URL || 'http://localhost:8005';
        const response = await axios.post(`${faceServiceUrl}/verify_face`, form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity
        });

        return response.data;
    } catch (error) {
        console.error("Face API Error:", error.response ? error.response.data : error.message);
        throw new Error("Face verification service failed");
    }
}

module.exports = {
    compareFace
};
