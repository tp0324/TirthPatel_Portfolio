import streamlit as st
import os
from pipeline import HighlightPipeline

st.set_page_config(page_title="AI Soccer Highlight Detector", layout="wide")

st.title("⚽ World Cup Automatic Highlight Detector")
st.subheader("Smart data-triage pipeline running Audio spikes, OpenCV parsing, and Whisper transcription.")

@st.cache_resource
def load_pipeline():
    return HighlightPipeline()

pipeline = load_pipeline()

uploaded_file = st.file_uploader("Upload Match Footage (.mp4)", type=["mp4"])

if uploaded_file is not None:
    video_path = "temp_match.mp4"
    with open(video_path, "wb") as f:
        f.write(uploaded_file.read())
        
    st.video(video_path)
    
    if st.button("⚡ Run Smart Highlight Detection Pipeline"):
        with st.spinner("Processing... Triage engine is skimming audio profiles and verifying frames."):
            
            detected_events = pipeline.process_game(video_path)
            
            st.success("Analysis Complete! Here are the detected highlights:")
            
            for event in detected_events:
                with st.expander(f"🎬 Event #{event['id']} at {event['formatted_time']} — {event['event']}"):
                    col1, col2 = st.columns([1, 2])
                    
                    with col1:
                        st.metric("Pitch Density (OpenCV Check)", event['pitch_density'])
                        st.write(f"**Target Timestamp:** {event['formatted_time']}")
                        
                    with col2:
                        st.markdown("**AI Commentary Transcript Snippet (Whisper):**")
                        st.info(f'"{event["transcript"]}"' if event["transcript"] else "No audible commentary detected.")
                        
    if os.path.exists(video_path):
        os.remove(video_path)