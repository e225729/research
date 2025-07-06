import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (audioUrl: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioReady }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        try {
          const res = await fetch('/process_audio', {
            method: 'POST',
            body: formData
          });
          const responseBlob = await res.blob();
          const url = URL.createObjectURL(responseBlob);
          onAudioReady(url);
        } catch (err) {
          console.error('Failed to process audio', err);
        }
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-3 rounded-full transition-all duration-200 shadow-md hover:shadow-lg ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          : 'bg-green-500 hover:bg-green-600 text-white'
      }`}
      title={isRecording ? '録音を停止' : '音声入力を開始'}
    >
      {isRecording ? <Square size={20} /> : <Mic size={20} />}
    </button>
  );
};
