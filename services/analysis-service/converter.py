import pdfplumber
import pandas as pd
import os
import re

def get_tender_id_from_excel(excel_path):
    try:
        df = pd.read_excel(excel_path, header=None)
        for index, row in df.head(20).iterrows(): 
            row_text = " ".join([str(item) for item in row.tolist() if str(item) != 'nan'])
            match = re.search(r"(\d{7})", row_text)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Error reading Tender ID: {e}")
    return "N/A"

def get_opening_date_from_excel(excel_path):
    try:
        df = pd.read_excel(excel_path, header=None)
        # matches dates like 16-Feb-2026, 16-02-2026, 16/Feb/2026, 16/02/2026
        date_pattern = r"(\d{1,2}-[A-Za-z]{3}-\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2}/[A-Za-z]{3}/\d{4}|\d{1,2}/\d{1,2}/\d{4})"
        
        # Strategy 1: Look for "Date and Time of Opening" or "Opening Date" in a cell,
        # then check the cell directly below it in the next row at the same column index.
        for r_idx in range(len(df) - 1):
            row = df.iloc[r_idx]
            for c_idx, cell_val in enumerate(row):
                cell_str = str(cell_val).lower()
                if "opening" in cell_str and "date" in cell_str:
                    next_row_val = str(df.iloc[r_idx + 1, c_idx])
                    match = re.search(date_pattern, next_row_val)
                    if match:
                        return match.group(1)
        
        # Strategy 2: Scan rows for "Opening Date" or "time of opening" and extract the last date in the row
        for r_idx, row in df.iterrows():
            row_text = " | ".join([str(item) for item in row.tolist() if str(item) != 'nan'])
            row_lower = row_text.lower()
            if "opening date" in row_lower or "time of opening" in row_lower:
                dates = re.findall(date_pattern, row_text)
                if dates:
                    return dates[-1]

        # Fallback Strategy 3: Scan rows for "opening" and extract first date
        for r_idx, row in df.iterrows():
            row_text = " ".join([str(item) for item in row.tolist() if str(item) != 'nan'])
            if "opening" in row_text.lower():
                match = re.search(date_pattern, row_text)
                if match:
                    return match.group(1)

        # Fallback Strategy 4: Original sequential scan but skip publishing/invitation dates
        for r_idx, row in df.iterrows():
            row_text = " ".join([str(item) for item in row.tolist() if str(item) != 'nan'])
            if any(keyword in row_text.lower() for keyword in ["publishing", "invitation", "reference", "publish"]):
                continue
            match = re.search(date_pattern, row_text)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Error reading Date: {e}")
    return "N/A"

def convert_pdf_to_excel(target_pdf, excel_file):
    all_tables = []
    table_settings = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "snap_tolerance": 4,
        "join_tolerance": 4,
    }
    try:
        with pdfplumber.open(target_pdf) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables(table_settings=table_settings)
                for table in tables:
                    all_tables.append(pd.DataFrame(table))
        if all_tables:
            final_df = pd.concat(all_tables, ignore_index=True)
            final_df.to_excel(excel_file, index=False, header=False)
            if os.path.exists(target_pdf):
                try:
                    os.remove(target_pdf)
                except:
                    pass
            return True
        return False
    except Exception as e:
        print(f"কনভার্ট করতে সমস্যা হয়েছে: {e}")
        return False

def extract_bidder_data_from_excel(excel_path):
    try:
        df = pd.read_excel(excel_path, header=None)
        
        # Check if "opening report header" exists anywhere in the sheet
        has_opening_header = False
        for index, row in df.iterrows():
            row_str = " ".join([str(item).lower() for item in row.tolist()])
            if "opening report header" in row_str:
                has_opening_header = True
                break
        
        start_extracting = not has_opening_header  # Start extracting immediately if the standard header is missing
        bidders = []
        
        for index, row in df.iterrows():
            row_str_lower = " ".join([str(item).lower() for item in row.tolist()])
            
            if "opening report header" in row_str_lower:
                start_extracting = True
                continue
                
            if "opening report footer" in row_str_lower:
                start_extracting = False
                break
                
            if not start_extracting:
                continue
                
            row_list = [str(item).strip() for item in row.tolist() if str(item) != 'nan']
            if not row_list or len(row_list) < 3:
                continue
            
            # Inspect first 2 cells to check for serial number
            col0 = row_list[0]
            col1 = row_list[1]
            
            sl_no = None
            if col0.isdigit():
                sl_no = int(col0)
            elif col1.isdigit():
                sl_no = int(col1)
                
            if sl_no is not None:
                name = ""
                amount = None
                
                if col0.isdigit():
                    name = row_list[1]
                    for cell in reversed(row_list[2:]):
                        clean_cell = cell.replace(',', '').replace(' ', '').replace('৳', '').strip()
                        if clean_cell.replace('.', '', 1).isdigit():
                            amount = float(clean_cell)
                            break
                else:
                    name = row_list[2]
                    for cell in reversed(row_list[3:]):
                        clean_cell = cell.replace(',', '').replace(' ', '').replace('৳', '').strip()
                        if clean_cell.replace('.', '', 1).isdigit():
                            amount = float(clean_cell)
                            break
                
                if name and amount is not None:
                    # Clean up header duplicates
                    if not any(header in name.lower() for header in ['name of', 'tenderer name', 'bidder name', 'sl. no', 'sl no']):
                        bidders.append([sl_no, name, amount])
        return bidders
    except Exception as e:
        print(f"Error parsing bidder data: {e}")
        return []