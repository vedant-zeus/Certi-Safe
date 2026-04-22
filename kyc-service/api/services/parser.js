function detectDocumentType(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('aadhaar') || lowerText.includes('government of india') || lowerText.includes('uidai')) {
        return 'aadhaar';
    } else if (lowerText.includes('income tax department') || lowerText.includes('permanent account number')) {
        return 'pan';
    } else if (lowerText.includes('passport') || lowerText.includes('republic of india') || lowerText.includes('surname')) {
        return 'passport';
    }
    return 'unknown';
}

function parseAadhaar(text) {
    let name = '';
    let dob = '';
    let id_number = '';

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Aadhaar format: 12 digits (often spaced 4-4-4)
    // We allow spaces or hyphens between digits to handle OCR glitches
    const idMatch = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
    if (idMatch) id_number = idMatch[0].replace(/[\s-]/g, '');

    const dobMatch = text.match(/(?:DOB|Year of Birth)[^\d]*([\d/-]+)/i) || text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
    if (dobMatch) dob = dobMatch[1] || dobMatch[0];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('DOB') || lines[i].match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) {
            if (i > 0) name = lines[i-1];
            break;
        }
    }
    
    return { name, dob, id_number };
}

function parsePAN(text) {
    let name = '';
    let dob = '';
    let id_number = '';
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // PAN Format: 5 Letters, 4 Digits, 1 Letter (Allowing optional space which OCR sometimes adds)
    const idMatch = text.match(/\b[A-Z]{5}[\s]?\d{4}[\s]?[A-Z]\b/i);
    if (idMatch) id_number = idMatch[0].replace(/\s/g, '').toUpperCase();

    const dobMatch = text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
    if (dobMatch) dob = dobMatch[0];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('name') && !lines[i].toLowerCase().includes('father')) {
            if (i + 1 < lines.length) name = lines[i+1];
            break;
        }
    }

    return { name, dob, id_number };
}

function parsePassport(text) {
    let name = '';
    let dob = '';
    let id_number = '';
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Passport Format: 1 Letter followed by 7 Digits (Optional space)
    const idMatch = text.match(/\b[A-Z][\s]?\d{7}\b/i);
    if (idMatch) id_number = idMatch[0].replace(/\s/g, '').toUpperCase();

    const dobMatch = text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
    if (dobMatch) dob = dobMatch[0];

    let surname = '', givenName = '';
    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('surname')) {
            surname = lines[i+1] || '';
        }
        if (lower.includes('given name')) {
            givenName = lines[i+1] || '';
        }
    }
    if (surname || givenName) {
        name = (givenName + ' ' + surname).trim();
    } else {
        // Fallback Name lookup
        name = "Unknown";
    }

    return { name, dob, id_number };
}

module.exports = {
    detectDocumentType,
    parseAadhaar,
    parsePAN,
    parsePassport
};
