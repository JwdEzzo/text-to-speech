import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export interface SpeakRequest {
  text: string;
  voice: string;
  punctuate?: boolean; // optional — backend defaults to true if omitted
}
/* 
* The backend returns raw audio bytes (audio/mpeg), not JSON.
* This turns the response into a blob URL the <audio> element can play.

* response: Response — this is the built-in browser Response type (from the Fetch API), not your data.
* RTK Query's fetchBaseQuery uses fetch() under the hood
* and when you supply a custom responseHandler, RTK Query hands you the raw Response object

* Why does this function exist
* By default, RTK Query assumes every API response is JSON and calls response.json() on it automatically. Your /speak endpoint doesn't return JSON — it returns raw MP3 bytes with Content-Type: audio/mpeg. If RTK Query tried response.json() on binary audio data, it would throw a parsing error. So you override the default behavior with your own responseHandler, telling RTK Query "here's how to interpret this specific response." 


* Line 1: const blob = await response.blob()
* Response objects have several methods to read the body depending on what format you expect: .json(), .text(), .arrayBuffer(), .blob(), etc. Each can only be called once (the body stream gets consumed).
* .blob() reads the entire response body and wraps it in a Blob — a browser object representing raw binary data (like a file), along with a MIME type (in this case audio/mpeg, since your FastAPI response set that Content-Type header). Think of a Blob as "a file-like object living in memory."
* It's async because reading the whole body takes a moment — hence await.
* 
* 
* 
* Line 2: return URL.createObjectURL(blob)
* A Blob by itself isn't something you can drop into an <audio src="..."> — HTML elements need a URL string, not a raw binary object.
* URL.createObjectURL() is a browser API that takes a Blob (or File) and generates a special temporary URL for it, looking something like:
* blob:http://localhost:5173/550e8400-e29b-41d4-a716-446655440000
* This URL doesn't point to a real network resource — it's a reference into the browser's own memory, valid only within your current page. When you set 
* <audio src={thisUrl}>, the browser resolves it internally and plays the audio bytes directly, no network request involved.
* 
*/

// Putting it together
// The whole function's job: take the raw HTTP response containing an MP3, and hand back a URL the browser can use to play it. That's exactly why in App.tsx you see:

/*
 * const url = await triggerGetSpeech({ text, voice }).unwrap();
 * setAudioUrl(url);
  {audioUrl && <audio controls autoPlay src={audioUrl} />}
 * The string this function returns becomes the src of your <audio> tag.
 * One gotcha worth knowing: memory cleanup
 * Blob URLs stay alive in browser memory until you either call URL.revokeObjectURL(url) or the page fully reloads. That's exactly why App.tsx has this: 
 */
const blobResponseHandler = async (response: Response): Promise<string> => {
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const ttsApi = createApi({
  reducerPath: 'ttsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
  }),
  endpoints: (builder) => ({
    // GET: /speak?text=...&voice=...&punctuate=...
    getSpeech: builder.query<string, SpeakRequest>({
      query: ({ text, voice, punctuate }) => ({
        url: '/speak',
        method: 'GET',
        params: { text, voice, punctuate },
        responseHandler: blobResponseHandler,
      }),
    }),
  }),
});

export const { useLazyGetSpeechQuery } = ttsApi;
