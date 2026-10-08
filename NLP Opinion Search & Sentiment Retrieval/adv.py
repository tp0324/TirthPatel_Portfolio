import os
import re
import pandas as pd
import nltk
from nltk.tokenize import sent_tokenize
from transformers import pipeline

nltk.download('punkt')
nltk.download('punkt_tab')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SQL_FILE_PATH = os.path.join(SCRIPT_DIR, "reviews_segment.sql")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "Outputs", "AdvancedModel")

os.makedirs(OUTPUT_DIR, exist_ok=True)

QUERIES = [
    {"name": "audio_quality", "aspect": ["audio", "quality"], "opinion": ["poor"], "target_sentiment": "NEGATIVE"},
    {"name": "wifi_signal", "aspect": ["wifi", "signal"], "opinion": ["strong"], "target_sentiment": "POSITIVE"},
    {"name": "mouse_button", "aspect": ["mouse", "button"], "opinion": ["click", "problem"], "target_sentiment": "NEGATIVE"},
    {"name": "gps_map", "aspect": ["gps", "map", "maps"], "opinion": ["useful", "helpful"], "target_sentiment": "POSITIVE"},
    {"name": "image_quality", "aspect": ["image", "quality"], "opinion": ["sharp"], "target_sentiment": "POSITIVE"}
]

sentiment_analyzer = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

def load_data_from_sql_direct(sql_filepath):
    print(f"Loading data directly from SQL file: {sql_filepath}")
    records = []
    
    if not os.path.exists(sql_filepath):
        raise FileNotFoundError(f"SQL file not found at {sql_filepath}")

    with open(sql_filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    tuples = re.findall(r"\((['\"].*?)\)(?:,|\s*;|\s*$)", content, re.DOTALL)
    
    for t in tuples:
        id_match = re.search(r"['\"]?(R[A-Z0-9]{10,15})['\"]?", t)
        if not id_match:
            continue
            
        r_id = id_match.group(1).strip()
        
        cols = [c.strip(" '\"") for c in re.split(r",(?=(?:[^']*'[^']*')*[^']*$)", t)]
        if len(cols) >= 8:
            r_text = cols[7]
        else:
            r_text = t

        records.append({"review_id": r_id, "review_text": r_text})

    print(f"Successfully extracted {len(records)} clean reviews into memory.")

    if len(records) == 0:
        raise ValueError("No records extracted! Check that reviews_segment.sql is non-empty and in the codes folder.")

    return pd.DataFrame(records)

def contains_word(text, word):
    return bool(re.search(rf'\b{re.escape(word)}\b', text, flags=re.IGNORECASE))

def analyze_connotation():
    df = load_data_from_sql_direct(SQL_FILE_PATH)
    df['review_text'] = df['review_text'].fillna('')
    df['review_id'] = df['review_id'].astype(str)

    for q in QUERIES:
        q_name = q["name"]
        aspects = q["aspect"]
        opinions = q["opinion"]
        target_sent = q["target_sentiment"]
        
        t4_ids = []
        print(f"Running Advanced Connotation Search on: {q_name}")

        for idx, row in df.iterrows():
            r_id = row['review_id']
            text = row['review_text']
            
            sentences = sent_tokenize(text)
            match_found = False

            for sent in sentences:
                has_asp = any(contains_word(sent, asp) for asp in aspects)
                has_op = any(contains_word(sent, op) for op in opinions)

                if has_asp and has_op:
                    res = sentiment_analyzer(sent, truncation=True, max_length=512)[0]
                    if res['label'] == target_sent:
                        match_found = True
                        break
            
            if match_found:
                t4_ids.append(r_id)

        save_output(f"{q_name}_test4.txt", t4_ids)

def save_output(filename, ids):
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        for r_id in ids:
            f.write(f"{r_id}\n")
    print(f"Saved {len(ids)} records to {filepath}")

if __name__ == "__main__":
    analyze_connotation()