import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from deepface import DeepFace

app = FastAPI(title="Face Verification Service")

@app.post("/verify_face")
async def verify_face(document_image: UploadFile = File(...), live_image: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_doc:
        doc_bytes = await document_image.read()
        tmp_doc.write(doc_bytes)
        doc_path = tmp_doc.name
        
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_live:
        live_bytes = await live_image.read()
        tmp_live.write(live_bytes)
        live_path = tmp_live.name

    try:
        # Check faces
        doc_faces = DeepFace.extract_faces(img_path=doc_path, enforce_detection=True)
        if len(doc_faces) > 1:
             raise HTTPException(status_code=400, detail="Multiple faces detected in document image.")
             
        live_faces = DeepFace.extract_faces(img_path=live_path, enforce_detection=True)
        if len(live_faces) > 1:
             raise HTTPException(status_code=400, detail="Multiple faces detected in live image.")

        # Verify face
        result = DeepFace.verify(
            img1_path=doc_path, 
            img2_path=live_path, 
            model_name="Facenet",
            distance_metric="cosine", 
            enforce_detection=True
        )
        
        distance = result.get("distance", 1.0)
        # Cosine distance: 0 is identical, higher is different.
        # similarity = 1 - distance
        similarity_score = round(max(0.0, 1.0 - distance), 2)
        
        status = "mismatch"
        if similarity_score >= 0.8:
            status = "match"
        elif similarity_score >= 0.6:
            status = "suspicious"
            
        response = {
            "similarity_score": similarity_score,
            "status": status,
            "raw_detail": {
                "verified": result.get("verified"),
                "distance": distance
            }
        }
        
    except ValueError as e:
        err_msg = str(e).lower()
        if "could not be detected" in err_msg or "face could not be detected" in err_msg:
            raise HTTPException(status_code=400, detail="No face detected or image quality is too low.")
        else:
            raise HTTPException(status_code=400, detail=f"Image processing error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        if os.path.exists(doc_path):
            os.remove(doc_path)
        if os.path.exists(live_path):
            os.remove(live_path)

    return JSONResponse(content=response)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8005))
    uvicorn.run(app, host="0.0.0.0", port=port)
