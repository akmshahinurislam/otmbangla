import os
import uuid
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from converter import convert_pdf_to_excel, get_tender_id_from_excel, get_opening_date_from_excel, extract_bidder_data_from_excel
from analysis import perform_analysis

app = FastAPI(title="SLT Calculator Analysis API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_tender(
    method: str = Form(...),
    oce: float = Form(...),
    nppi: float = Form(...),
    tender_id: Optional[str] = Form(None),
    opening_date: Optional[str] = Form(None),
    disqualified: Optional[str] = Form(None),
    b_name: List[str] = Form(default=[], alias="b_name[]"),
    b_amount: List[float] = Form(default=[], alias="b_amount[]"),
    pdf_file: Optional[UploadFile] = File(None)
):
    try:
        # 1. Manual Entry Mode
        if method == 'manual':
            if not b_name or not b_amount or len(b_name) != len(b_amount):
                raise HTTPException(status_code=400, detail="Invalid manual bidder rows.")
            
            tender_data = []
            for idx, (name, amount) in enumerate(zip(b_name, b_amount), start=1):
                tender_data.append([idx, name.strip(), float(amount)])
                
            records, summary = perform_analysis(
                tender_data=tender_data,
                oce=oce,
                nppi=nppi,
                method=method,
                non_responsive_sl=disqualified or "",
                tender_id_auto="N/A",
                tender_id_manual=tender_id or "N/A"
            )
            summary["opening_date"] = opening_date or "N/A"
            return {"records": records, "summary": summary}
            
        # 2. PDF Upload Mode
        elif method == 'pdf':
            if not pdf_file:
                raise HTTPException(status_code=400, detail="PDF file is required in PDF mode")
                
            # Create a unique temp folder to avoid race conditions
            request_id = str(uuid.uuid4())
            temp_pdf_path = f"temp_{request_id}.pdf"
            temp_excel_path = f"temp_{request_id}.xlsx"
            
            # Save uploaded PDF to disk
            with open(temp_pdf_path, "wb") as buffer:
                shutil.copyfileobj(pdf_file.file, buffer)
                
            # Convert PDF to Excel
            success = convert_pdf_to_excel(temp_pdf_path, temp_excel_path)
            if not success:
                # Clean up temp file
                if os.path.exists(temp_pdf_path):
                    try: os.remove(temp_pdf_path)
                    except: pass
                raise HTTPException(status_code=422, detail="Failed to parse the PDF document. Make sure it is a valid e-GP Tender Opening Report.")
                
            # Extract metadata and bidder data
            tender_id_auto = get_tender_id_from_excel(temp_excel_path)
            opening_date_auto = get_opening_date_from_excel(temp_excel_path)
            tender_data = extract_bidder_data_from_excel(temp_excel_path)
            
            # Clean up temp files
            if os.path.exists(temp_excel_path):
                try: os.remove(temp_excel_path)
                except: pass
            if os.path.exists(temp_pdf_path):
                try: os.remove(temp_pdf_path)
                except: pass
                    
            if not tender_data:
                raise HTTPException(status_code=422, detail="No bidder records could be extracted from the PDF document.")
                
            # Perform Analysis
            records, summary = perform_analysis(
                tender_data=tender_data,
                oce=oce,
                nppi=nppi,
                method=method,
                non_responsive_sl=disqualified or "",
                tender_id_auto=tender_id_auto,
                tender_id_manual=tender_id or ""
            )
            summary["opening_date"] = opening_date_auto
            return {"records": records, "summary": summary}
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
