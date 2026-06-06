import os
import pdfplumber

pdf_dir = r"f:\OTMBangla-Main\PDFs"
files = [
    "Section1_Instructions to Tenderers.pdf",
    "Section2_e-Tender Data Sheet.pdf",
    "Section3_General Conditions of Contract.pdf",
    "Section4_Particular Conditions of Contract.pdf"
]

print("--- PDF ANALYSIS START ---")
for file_name in files:
    file_path = os.path.join(pdf_dir, file_name)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
    
    print(f"\n==================================================")
    print(f"File: {file_name}")
    print(f"==================================================")
    
    try:
        with pdfplumber.open(file_path) as pdf:
            num_pages = len(pdf.pages)
            print(f"Total Pages: {num_pages}")
            
            # Extract text from the first page
            first_page_text = pdf.pages[0].extract_text() or ""
            print("--- Page 1 Preview ---")
            print(first_page_text[:1500])
            print("----------------------")
            
            # If there's a second page, preview it too
            if num_pages > 1:
                second_page_text = pdf.pages[1].extract_text() or ""
                print("--- Page 2 Preview ---")
                print(second_page_text[:1000])
                print("----------------------")
                
            # Let's check some text from the last page to see how it ends
            last_page_text = pdf.pages[-1].extract_text() or ""
            print("--- Last Page Preview ---")
            print(last_page_text[:1000])
            print("----------------------")
            
    except Exception as e:
        print(f"Error reading {file_name}: {e}")

print("\n--- PDF ANALYSIS END ---")
