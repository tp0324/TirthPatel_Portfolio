import os
import cv2
import numpy as np
import librosa
import whisper
from moviepy.editor import VideoFileClip

class HighlightPipeline:
    def __init__(self):
        print("Loading Whisper model...")
        self.model = whisper.load_model("base")

    def extract_audio(self, video_path, audio_path="temp_audio.wav"):
        video = VideoFileClip(video_path)
        video.audio.write_audiofile(audio_path, logger=None)
        return audio_path

    def detect_audio_spikes(self, audio_path, top_n=5, window_sec=15, min_distance_sec=30):
        y, sr = librosa.load(audio_path, sr=None)
        
        # Calculate Short-Time Fourier Transform or Root-Mean-Square (RMS) Energy
        rms = librosa.feature.rms(y=y)[0]
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)
        
        # Average energy over larger windows to find sustained crowd roars
        frames_per_sec = len(times) / times[-1]
        window_frames = int(window_sec * frames_per_sec)
        
        smoothed_rms = np.convolve(rms, np.ones(window_frames)/window_frames, mode='same')
        
        # Sort indices of highest energy peaks
        sorted_indices = np.argsort(smoothed_rms)[::-1]
        
        selected_timestamps = []
        for idx in sorted_indices:
            t = times[idx]
            if all(abs(t - existing) > min_distance_sec for existing in selected_timestamps):
                selected_timestamps.append(t)
            if len(selected_timestamps) >= top_n:
                break
                
        return sorted(selected_timestamps)

    def analyze_visuals(self, video_path, timestamp, window_sec=15):
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        start_frame = int((timestamp - (window_sec / 2)) * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, start_frame))
        
        green_percentages = []
        

        for _ in range(10):
            ret, frame = cap.read()
            if not ret:
                break
            
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            lower_green = np.array([35, 40, 40])
            upper_green = np.array([85, 255, 255])
            mask = cv2.inRange(hsv, lower_green, upper_green)
            
            green_ratio = np.sum(mask > 0) / mask.size
            green_percentages.append(green_ratio)
            
            # Skip forward half a second
            cap.set(cv2.CAP_PROP_POS_FRAMES, cap.get(cv2.CAP_PROP_POS_FRAMES) + int(fps / 2))
            
        cap.release()
        
        avg_green = np.mean(green_percentages) if green_percentages else 0
        return float(avg_green)

    def transcribe_context(self, audio_path, timestamp, window_sec=15):
        start = max(0, timestamp - (window_sec / 2))
        
        y, sr = librosa.load(audio_path, sr=16000, offset=start, duration=window_sec)
        
        result = self.model.transcribe(y, fp16=False)
        return result.get("text", "").strip()

    def process_game(self, video_path):
        print("Extracting Audio...")
        audio_path = self.extract_audio(video_path)
        
        print("Locating Key Audio Spikes...")
        spikes = self.detect_audio_spikes(audio_path, top_n=4)
        
        results = []
        for i, ts in enumerate(spikes):
            print(f"Analyzing Moment {i+1} at {int(ts // 60)}m {int(ts % 60)}s...")
            
            pitch_ratio = self.analyze_visuals(video_path, ts)
            
            text = self.transcribe_context(audio_path, ts)
            
            # Formulate event classification heuristics
            event_type = "Potential Danger / Foul"
            if "goal" in text.lower() or "scores" in text.lower():
                event_type = "GOAL!"
            elif pitch_ratio < 0.4: 
                event_type = "Major Event / Replay Cut"

            results.append({
                "id": i + 1,
                "timestamp": ts,
                "formatted_time": f"{int(ts // 60):02d}:{int(ts % 60):02d}",
                "event": event_type,
                "pitch_density": f"{pitch_ratio:.2%}",
                "transcript": text
            })
            
        if os.path.exists(audio_path): os.remove(audio_path)
        return results