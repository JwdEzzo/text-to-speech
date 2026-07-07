import { useEffect, useState } from "react";
import { useLazyGetSpeechQuery, usePostSpeechMutation } from "./api/ttsApi";
import "./index.css";

const VOICES = [
  { value: "en-US-AriaNeural", label: "Aria (US, female)" },
  { value: "en-US-GuyNeural", label: "Guy (US, male)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (UK, female)" },
  { value: "en-GB-RyanNeural", label: "Ryan (UK, male)" },
];

function App() {
  const [text, setText] = useState<string>("");
  const [voice, setVoice] = useState(VOICES[0].value);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [triggerGetSpeech, getSpeechResult] = useLazyGetSpeechQuery();
  const [postSpeech, postSpeechResult] = usePostSpeechMutation();

  const isLoading = getSpeechResult.isFetching || postSpeechResult.isLoading;
  const hasError = Boolean(getSpeechResult.error || postSpeechResult.error);

  // Release the previous blob URL whenever it's replaced or the component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function handleListen() {
    if (!text.trim()) return;
    const url = await triggerGetSpeech({ text, voice }).unwrap();
    setAudioUrl(url);
  };

  async function handleSpeak() {
    if (!text.trim()) return;
    const url = await postSpeech({ text, voice }).unwrap();
    setAudioUrl(url);
  };

  return (
    <div className="container">
      <h1>Text to Speech</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something to hear it spoken..."
        rows={5}
      />

      <select value={voice} onChange={(e) => setVoice(e.target.value)}>
        {VOICES.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>

      <div className="actions">
        <button onClick={handleListen} disabled={isLoading || !text.trim()}>
          Listen (GET)
        </button>
        <button onClick={handleSpeak} disabled={isLoading || !text.trim()}>
          Speak (POST)
        </button>
      </div>

      {isLoading && <p className="status">Generating audio...</p>}
      {hasError && (
        <p className="status error">Something went wrong generating the audio.</p>
      )}

      {audioUrl && <audio controls autoPlay src={audioUrl} className="player" />}
    </div>
  );
}

export default App;