import pandas as pd
import numpy as np
from decimal import Decimal, ROUND_HALF_UP

# ১. রাউন্ডিং ফাংশন (এটি মূল ফাংশনের বাইরে থাকবে)
def my_round(value):
    try:
        # ৫ বা তার বেশি হলে উপরে যাবে (২.৫৫৫৫ = ২.৫৫৬)
        return float(Decimal(str(value)).quantize(Decimal('0.000'), rounding=ROUND_HALF_UP))
    except:
        return value

def perform_analysis(
    tender_data,
    oce,
    nppi,
    method,
    non_responsive_sl,
    tender_id_auto="N/A",
    tender_id_manual=""
):
    # ২. ডাটাফ্রেম তৈরি
    df = pd.DataFrame(tender_data, columns=['SL. NO', 'NAME OF TENDERER', 'BID_AMOUNT'])
    
    # ৩. অযোগ্য বিডারদের লিস্ট তৈরি
    nr_list = []
    if non_responsive_sl:
        if isinstance(non_responsive_sl, list):
            nr_list = [int(x) for x in non_responsive_sl if str(x).isdigit()]
        else:
            nr_list = [int(x.strip()) for x in str(non_responsive_sl).split(',') if x.strip().isdigit()]
    
    df['STATUS'] = 'Responsive'
    df.loc[df['SL. NO'].isin(nr_list), 'STATUS'] = 'Technically Non-Responsive'
    
    # ৪. ১০% এর অধিক দরদাতার ভ্যারিয়েশন চেক
    df['VARIATION'] = ((df['BID_AMOUNT'] - oce) / oce * 100).round(2)
    df.loc[(df['STATUS'] == 'Responsive') & (df['VARIATION'] > 10), 'STATUS'] = 'Excluded for above 10%'

    # ৫. ভারযুক্ত গড় (Weighted Average) ক্যালকুলেশন
    only_responsive_for_avg = df[~df['STATUS'].isin(['Technically Non-Responsive', 'Excluded for above 10%'])].copy()
    bid_average = only_responsive_for_avg['BID_AMOUNT'].mean() if not only_responsive_for_avg.empty else 0
    
    adj_oe = oce * nppi # NPPI Adjusted Official Estimate
    weighted_avg = (0.5 * bid_average) + (0.3 * adj_oe) + (0.2 * oce)
    
    # ৬. স্ট্যান্ডার্ড ডেভিয়েশন (SD) ক্যালকুলেশন
    responsive_bids = only_responsive_for_avg['BID_AMOUNT'].values
    n = len(responsive_bids)
    
    if n > 0:
        deviations_squared = (responsive_bids - weighted_avg)**2
        variance = np.sum(deviations_squared) / n
        weighted_sd_val = np.sqrt(variance)
    else:
        weighted_sd_val = 0
    
    # ৭. SLT Limit নির্ধারণ
    slt_limit = weighted_avg - weighted_sd_val
    df.loc[(df['STATUS'] == 'Responsive') & (df['BID_AMOUNT'] < slt_limit), 'STATUS'] = 'Excluded for SLT'

    # ৮. র্যাঙ্কিং লজিক
    rank_df = df[~df['STATUS'].isin(['Technically Non-Responsive', 'Excluded for above 10%', 'Excluded for SLT'])].copy()
    rank_df = rank_df.sort_values(by='BID_AMOUNT')
    
    rank_counter = 1
    l1_name = "N/A"
    for idx in rank_df.index:
        if rank_counter == 1:
            df.loc[idx, 'STATUS'] = '1st Lowest (L1)'
            l1_name = df.loc[idx, 'NAME OF TENDERER']
        else:
            df.loc[idx, 'STATUS'] = f'L{rank_counter}'
        rank_counter += 1

    # ৯. টেন্ডার আইডি নির্ধারণ
    final_tender_id = tender_id_auto
    if tender_id_auto == "N/A" or not str(tender_id_auto).strip():
        final_tender_id = tender_id_manual

    # ১০. সামারি ডাটা তৈরি (এখানে রাউন্ডিং ব্যবহার করা হয়েছে)
    actual_nr_rows = df[df['STATUS'] == 'Technically Non-Responsive']
    actual_nr_count = len(actual_nr_rows)
    actual_nr_sl = ", ".join(map(str, sorted(actual_nr_rows['SL. NO'].tolist())))

    above_10_rows = df[df['STATUS'] == 'Excluded for above 10%']
    above_10_count = len(above_10_rows)
    above_10_sl = ", ".join(map(str, sorted(above_10_rows['SL. NO'].tolist())))

    slt_rows = df[df['STATUS'] == 'Excluded for SLT']
    slt_count = len(slt_rows)
    slt_sl = ", ".join(map(str, sorted(slt_rows['SL. NO'].tolist())))

    summary = {
        "tender_id": final_tender_id,
        "opening_date": "N/A",
        "total_bidders": len(df),
        "first_lowest": l1_name,
        "non_responsive": f"{actual_nr_count} (Sl: {actual_nr_sl})" if actual_nr_count > 0 else "0",
        "above_10": f"{above_10_count} (Sl: {above_10_sl})" if above_10_count > 0 else "0",
        "excluded_for_slt": f"{slt_count} (Sl: {slt_sl})" if slt_count > 0 else "0",
        "responsive_bidders": n,
        "oce": my_round(oce),
        "current_nppi": my_round(nppi),
        "adjusted_oe": my_round(adj_oe),
        "bid_average": my_round(bid_average),
        "weighted_avg": my_round(weighted_avg),
        "weighted_sd_val": my_round(weighted_sd_val),
        "slt_limit": my_round(slt_limit),
    }

    return df.to_dict('records'), summary
