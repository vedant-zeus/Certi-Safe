/**
 * Step 1: Document-only scoring (no face match).
 * Uses name match, DOB match, and cross-document consistency.
 */
function calculateDocumentScore(nameScore, dobScore, docConsistency) {
    // Weighted: name 40%, dob 35%, consistency 25%
    const confidence = (0.40 * nameScore) + (0.35 * dobScore) + (0.25 * docConsistency);

    let status = 'rejected';
    if (confidence >= 70) status = 'verified';
    else if (confidence >= 50) status = 'review';

    return {
        status,
        confidence_score: Math.round(confidence),
        details: {
            name_match: Math.round(nameScore),
            dob_match: Math.round(dobScore),
            doc_consistency: Math.round(docConsistency)
        }
    };
}

/**
 * Step 2: Liveness + face-match scoring (deepfake + doc face comparison).
 * realConfidence: 0-100 score from deepfake ML model
 * faceMatchScore:  0-100 score from face similarity vs Aadhaar doc
 */
function calculateLivenessScore(realConfidence, faceMatchScore) {
    // Weighted: deepfake detection 60%, face identity match 40%
    const confidence = (0.60 * realConfidence) + (0.40 * faceMatchScore);

    let status = 'rejected';
    if (confidence >= 70) status = 'verified';
    else if (confidence >= 50) status = 'review';

    return {
        status,
        confidence_score: Math.round(confidence),
        details: {
            liveness_score: Math.round(realConfidence),
            face_match: Math.round(faceMatchScore)
        }
    };
}

module.exports = { calculateDocumentScore, calculateLivenessScore };
