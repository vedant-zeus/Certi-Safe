const stringSimilarity = require('string-similarity');

function normalizeName(name) {
    if (!name) return "";
    return name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeDOB(dob) {
    if (!dob) return "";
    const match = dob.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return dob; 
}

function matchName(name1, name2) {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    if (!n1 || !n2) return 0;
    
    const score = stringSimilarity.compareTwoStrings(n1, n2);
    return Math.round(score * 100);
}

function matchDOB(dob1, dob2) {
    const d1 = normalizeDOB(dob1);
    const d2 = normalizeDOB(dob2);
    
    if (!d1 || !d2) return 0;
    if (d1 === d2) return 100;

    const date1 = new Date(d1);
    const date2 = new Date(d2);
    if (!isNaN(date1) && !isNaN(date2)) {
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 1) return 50;
    }

    return 0;
}

module.exports = {
    normalizeName,
    normalizeDOB,
    matchName,
    matchDOB
};
