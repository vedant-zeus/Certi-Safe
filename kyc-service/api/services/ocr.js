const { fromPath } = require('pdf2pic');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function extractFromPDF(filePath, mimetype = '') {
    try {
        let imagePath = filePath;
        
        if (mimetype === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
            const options = {
                density: 600,
                saveFilename: `temp_page_${Date.now()}`,
                savePath: "./uploads",
                format: "png",
                width: 2400,
                height: 3200
            };
            const convert = fromPath(filePath, options);
            const result = await convert(1, { responseType: "image" });
            imagePath = result.path;
        }
        
        const { data: { text } } = await Tesseract.recognize(
            imagePath,
            'eng',
            { 
                langPath: path.join(__dirname, '..'),
                logger: m => console.log(m)
            }
        );
        
        // if (fs.existsSync(imagePath)) {
        //     fs.unlinkSync(imagePath);
        // }
        
        return { text, imagePath };
    } catch (error) {
        console.error("OCR Error:", error);
        return { text: "", imagePath: null };
    }
}

module.exports = {
    extractFromPDF
};
