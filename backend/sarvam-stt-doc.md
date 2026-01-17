# Streaming Speech-to-Text API

> Real-time audio transcription and translation with WebSocket connections. Low-latency streaming for live applications with instant results and interactive features.

## Overview

Transform audio into text in real-time with our WebSocket-based streaming API. Built for applications requiring immediate speech processing with minimal delay.

### Key Benefits

<CardGroup cols={3}>
  <Card title="Ultra-Low Latency" icon="zap">
    Get transcription results in milliseconds, not seconds. Process speech as it happens with near-instantaneous responses.
  </Card>

  <Card title="Multi-Language Support" icon="language">
    Support for 10+ Indian languages plus English with high accuracy transcription and translation capabilities.
  </Card>

  <Card title="Advanced Voice Detection" icon="microphone">
    Smart Voice Activity Detection (VAD) with customizable sensitivity for optimal speech boundary detection.
  </Card>
</CardGroup>

### Common Use Cases

* **Live Transcription**: Real-time captions for meetings, webinars, and broadcasts
* **Voice Assistants**: Interactive voice applications with immediate responses
* **Call Centers**: Live call transcription and analysis
* **Accessibility**: Real-time captioning for hearing-impaired users

<Note>
  **Audio Format Support**: Streaming APIs only support **two audio formats**:

  * **WAV** (`wav`)
  * **Raw PCM** (`pcm_s16le`, `pcm_l16`, `pcm_raw`)

  Other formats like MP3, AAC, OGG, etc. are not supported for WebSocket streaming. Find sample audio files in our [GitHub cookbook](https://github.com/sarvamai/sarvam-ai-cookbook/tree/main/sample_data/stt).
</Note>

## Getting Started

Get up and running with streaming in minutes. Choose between Speech-to-Text (STT) for transcription or Speech-to-Text Translation (STTT) for direct translation.

### Basic Usage

The simplest way to get started with real-time processing:

<Tabs>
  <Tab title="Speech-to-Text (STT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def basic_transcription():
            # Initialize client with your API key
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            # Connect and transcribe
            async with client.speech_to_text_streaming.connect(
                language_code="en-IN", high_vad_sensitivity=True
            ) as ws:
                # Send audio for transcription
                await ws.transcribe(audio=audio_data)
                
                # Get the result
                response = await ws.recv()
                print(f"Transcription: {response}")

        # Run the transcription
        asyncio.run(basic_transcription())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        // Helper function to convert audio to base64
        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function basicTranscription() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");

          // Initialize client
          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          // Connect to streaming API
          const socket = await client.speechToTextStreaming.connect({
            "language-code": "en-IN",  // English (India)
            high_vad_sensitivity: "true"
          });

          // Handle connection events
          socket.on("open", () => {
            // Send audio for transcription
            socket.transcribe({
              audio: audioData,
              sample_rate: 16000,
              encoding: "audio/wav",
            });
          });

          socket.on("message", (response) => {
            console.log("Transcription:", response);
          });

          // Wait for results
          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 5000));
          socket.close();
        }

        basicTranscription();
        ```
      </Tab>
    </Tabs>
  </Tab>

  <Tab title="Speech-to-Text Translation (STTT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def basic_translation():
            # Initialize client
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            # Connect to translation streaming
            async with client.speech_to_text_translate_streaming.connect(
                model="saaras:v2.5",  # Translation model
                high_vad_sensitivity=True
            ) as ws:
                # Send audio for direct translation
                await ws.translate(audio=audio_data)
                
                # Get translated result
                response = await ws.recv()
                print(f"Translation: {response}")

        # Run the translation
        asyncio.run(basic_translation())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function basicTranslation() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");
          
          // Initialize client
          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          // Connect to translation streaming
          const socket = await client.speechToTextTranslateStreaming.connect({
            model: "saaras:v2.5",  // Translation model
            high_vad_sensitivity: "true"
            });

          socket.on("open", () => {
            // Send audio for direct translation
            socket.translate({
              audio: audioData,
              sample_rate: 16000,
              encoding: "audio/wav",
            });
          });

          socket.on("message", (response) => {
            console.log("Translation:", response);
          });

          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 5000));
          socket.close();
        }

        basicTranslation();
        ```
      </Tab>
    </Tabs>
  </Tab>
</Tabs>

### Enhanced Processing with Voice Detection

Add smart voice activity detection for better accuracy and control:

<Tabs>
  <Tab title="Speech-to-Text (STT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def enhanced_transcription():
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            async with client.speech_to_text_streaming.connect(
                language_code="hi-IN",           # Hindi (India)
                model="saarika:v2.5",           # Latest model
                high_vad_sensitivity=True,       # Better voice detection
                vad_signals=True                # Get speech start/end signals
            ) as ws:
                # Send audio
                await ws.transcribe(
                    audio=audio_data,
                    encoding="audio/wav",
                    sample_rate=16000
                )
                
                # Handle multiple response types
                async for message in ws:
                    if message.get("type") == "speech_start":
                        print("🎤 Speech detected")
                    elif message.get("type") == "speech_end":
                        print("🔇 Speech ended")
                    elif message.get("type") == "transcript":
                        print(f"📝 Result: {message.get('text')}")
                        break  # Got our transcription

        # Run the enhanced transcription
        asyncio.run(enhanced_transcription())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        // Helper function to convert audio to base64
        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function enhancedTranscription() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");

          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          const socket = await client.speechToTextStreaming.connect({
            "language-code": "hi-IN",        // Hindi (India)
            model: "saarika:v2.5",          // Latest model
            high_vad_sensitivity: "true",    // Better voice detection
            vad_signals: "true"             // Get speech start/end signals
          });

          socket.on("open", () => {
            socket.transcribe({
              audio: audioData,
              sample_rate: 16000,
              encoding: "audio/wav",
            });
          });

          socket.on("message", (message) => {
            if (message.type === "speech_start") {
              console.log("🎤 Speech detected");
            } else if (message.type === "speech_end") {
              console.log("🔇 Speech ended");
            } else if (message.type === "transcript") {
              console.log(`📝 Result: ${message.text}`);
            }
          });

          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 10000));
          socket.close();
        }

        enhancedTranscription();
        ```
      </Tab>
    </Tabs>
  </Tab>

  <Tab title="Speech-to-Text Translation (STTT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def enhanced_translation():
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            async with client.speech_to_text_translate_streaming.connect(
                model="saaras:v2.5",
                high_vad_sensitivity=True,    # Better voice detection
                vad_signals=True             # Get speech events
            ) as ws:
                # Send audio
                await ws.translate(
                    audio=audio_data,
                    encoding="audio/wav",
                    sample_rate=16000
                )
                
                # Handle response sequence
                async for message in ws:
                    if message.get("type") == "speech_start":
                        print("🎤 Speech detected")
                    elif message.get("type") == "speech_end":
                        print("🔇 Speech ended")
                    elif message.get("type") == "translation":
                        print(f"🌐 Translation: {message.get('text')}")
                        break

        # Run the enhanced translation
        asyncio.run(enhanced_translation())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function enhancedTranslation() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");

          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          const socket = await client.speechToTextTranslateStreaming.connect({
            model: "saaras:v2.5",
            high_vad_sensitivity: "true",    // Better voice detection
            vad_signals: "true"             // Get speech events
          });

          socket.on("open", () => {
            socket.translate({
              audio: audioData,
              sample_rate: 16000,
              encoding: "audio/wav",
            });
          });

          socket.on("message", (message) => {
            if (message.type === "speech_start") {
              console.log("🎤 Speech detected");
            } else if (message.type === "speech_end") {
              console.log("🔇 Speech ended");
            } else if (message.type === "translation") {
              console.log(`🌐 Translation: ${message.text}`);
            }
          });

          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 10000));
          socket.close();
        }

        enhancedTranslation();
        ```
      </Tab>
    </Tabs>
  </Tab>
</Tabs>

### Instant Processing with Flush Signals

Force immediate processing without waiting for silence detection:

<Tabs>
  <Tab title="Speech-to-Text (STT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def instant_processing():
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            async with client.speech_to_text_streaming.connect(
                language_code="en-IN",
                model="saarika:v2.5",
                flush_signal=True  # Enable manual control
            ) as ws:
                # Send audio
                await ws.transcribe(
                    audio=audio_data,
                    encoding="audio/wav",
                    sample_rate=16000
                )
                
                # Force immediate processing
                await ws.flush()
                print("⚡ Processing forced - getting immediate results")

                # Get results
                async for message in ws:
                    print(f"Result: {message}")
                    break

        # Run instant processing
        asyncio.run(instant_processing())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function instantProcessing() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");

          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          const socket = await client.speechToTextStreaming.connect({
            "language-code": "en-IN",
            model: "saarika:v2.5",
            flush_signal: "true"  // Enable manual control
          });

          socket.on("open", () => {
            // Send audio
            socket.transcribe({
              audio: audioData,
              sample_rate: 16000,
              encoding: "audio/wav",
            });
            
            // Force processing after 2 seconds
            setTimeout(() => {
              socket.flush();
              console.log("⚡ Processing forced - getting immediate results");
            }, 2000);
          });

          socket.on("message", (message) => {
            console.log(`Result: ${JSON.stringify(message)}`);
          });

          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 10000));
          socket.close();
        }

        instantProcessing();
        ```
      </Tab>
    </Tabs>
  </Tab>

  <Tab title="Speech-to-Text Translation (STTT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def instant_translation():
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            async with client.speech_to_text_translate_streaming.connect(
                model="saaras:v2.5",
                flush_signal=True  # Enable manual control
            ) as ws:
                # Send audio
                await ws.translate(
                    audio=audio_data,
                    encoding="audio/wav",
                    sample_rate=16000
                )
                
                # Force immediate processing
                await ws.flush()
                print("⚡ Processing forced - getting immediate results")

                # Get results
                async for message in ws:
                    print(f"Translation: {message}")
                    break

        # Run instant translation
        asyncio.run(instant_translation())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function instantTranslation() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");

          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          const socket = await client.speechToTextTranslateStreaming.connect({
            model: "saaras:v2.5",
            flush_signal: "true"  // Enable manual control
          });

          socket.on("open", () => {
            // Send audio
            socket.translate({
              audio: audioData,
              sample_rate: 16000,
              encoding: "audio/wav",
            });
            
            // Force processing after 2 seconds
            setTimeout(() => {
              socket.flush();
              console.log("⚡ Processing forced - getting immediate results");
            }, 2000);
          });

          socket.on("message", (message) => {
            console.log(`Translation: ${JSON.stringify(message)}`);
          });

          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 10000));
          socket.close();
        }

        instantTranslation();
        ```
      </Tab>
    </Tabs>
  </Tab>
</Tabs>

### Custom Audio Configuration

Optimize for your specific audio setup:

<Tabs>
  <Tab title="Speech-to-Text (STT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def custom_audio_config():
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            async with client.speech_to_text_streaming.connect(
                language_code="kn-IN",
                model="saarika:v2.5",
                sample_rate=8000,               # Match your audio
                input_audio_codec="pcm_s16le",  # Specify codec (wav, pcm_s16le, pcm_l16, pcm_raw)
                high_vad_sensitivity=True       # For noisy environments
            ) as ws:
                await ws.transcribe(
                    audio=audio_data,
                    encoding="audio/wav",
                    sample_rate=8000  # Must match connection setting
                )
                
                response = await ws.recv()
                print(f"Optimized result: {response}")

        # Run custom audio configuration
        asyncio.run(custom_audio_config())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function customAudioConfig() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");

          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          const socket = await client.speechToTextStreaming.connect({
            "language-code": "kn-IN",
            model: "saarika:v2.5",
            sample_rate: 8000,                  // Match your audio
            input_audio_codec: "pcm_s16le",     // Specify codec (wav, pcm_s16le, pcm_l16, pcm_raw)
            high_vad_sensitivity: "true"        // For noisy environments
          });

          socket.on("open", () => {
            socket.transcribe({
              audio: audioData,
              sample_rate: 8000,  // Must match connection setting
              encoding: "audio/wav",
            });
          });

          socket.on("message", (message) => {
            console.log(`Optimized result: ${JSON.stringify(message)}`);
          });

          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 10000));
          socket.close();
        }

        customAudioConfig();
        ```
      </Tab>
    </Tabs>
  </Tab>

  <Tab title="Speech-to-Text Translation (STTT)">
    <Tabs>
      <Tab title="Python">
        ```python
        import asyncio
        import base64
        from sarvamai import AsyncSarvamAI

        # Load your audio file
        with open("path/to/your/audio.wav", "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")

        async def custom_audio_translation():
            client = AsyncSarvamAI(api_subscription_key="your-api-key")

            async with client.speech_to_text_translate_streaming.connect(
                model="saaras:v2.5",
                sample_rate=8000,               # Match your audio
                input_audio_codec="pcm_s16le",  # Specify codec (wav, pcm_s16le, pcm_l16, pcm_raw)
                high_vad_sensitivity=True       # For noisy environments
            ) as ws:
                await ws.translate(
                    audio=audio_data,
                    encoding="audio/wav",
                    sample_rate=8000  # Must match connection setting
                )
                
                response = await ws.recv()
                print(f"Optimized translation: {response}")

        # Run custom audio translation
        asyncio.run(custom_audio_translation())
        ```
      </Tab>

      <Tab title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import * as fs from "fs";

        function audioFileToBase64(filePath) {
          return fs.readFileSync(filePath).toString("base64");
        }

        async function customAudioTranslation() {
          // Load your audio file
          const audioData = audioFileToBase64("path/to/your/audio.wav");

          const client = new SarvamAIClient({
            apiSubscriptionKey: "your-api-key"
          });

          const socket = await client.speechToTextTranslateStreaming.connect({
            model: "saaras:v2.5",
            sample_rate: 8000,                  // Match your audio
            input_audio_codec: "pcm_s16le",     // Specify codec (wav, pcm_s16le, pcm_l16, pcm_raw)
            high_vad_sensitivity: "true"        // For noisy environments
          });

          socket.on("open", () => {
            socket.translate({
              audio: audioData,
              sample_rate: 8000,  // Must match connection setting
              encoding: "audio/wav",
            });
          });

          socket.on("message", (message) => {
            console.log(`Optimized translation: ${JSON.stringify(message)}`);
          });

          await socket.waitForOpen();
          await new Promise(resolve => setTimeout(resolve, 10000));
          socket.close();
        }

        customAudioTranslation();
        ```
      </Tab>
    </Tabs>
  </Tab>
</Tabs>

<Warning>
  **Important: Sample Rate Configuration for 8kHz Audio**

  When working with 8kHz audio, you **must** set the `sample_rate` parameter in **both** places:

  1. **When connecting to the WebSocket** (connection parameter)
  2. **When sending audio data** (transcribe/translate parameter)

  Both values must match your audio's actual sample rate. Mismatched sample rates will result in poor transcription quality or errors.

  **Example for STT:**

  ```python
  # Set sample_rate when connecting
  async with client.speech_to_text_streaming.connect(
      language_code="en-IN",
      sample_rate=8000  # Must match your audio
  ) as ws:
      # Set sample_rate when sending audio
      await ws.transcribe(
          audio=audio_data,
          sample_rate=8000  # Must match connection setting
      )
  ```

  **Example for STTT:**

  ```python
  # Set sample_rate when connecting
  async with client.speech_to_text_translate_streaming.connect(
      model="saaras:v2.5",
      sample_rate=8000  # Must match your audio
  ) as ws:
      # Set sample_rate when sending audio
      await ws.translate(
          audio=audio_data,
          sample_rate=8000  # Must match connection setting
      )
  ```
</Warning>

<Note>
  For detailed endpoint documentation, see:
  [Speech-to-Text WebSocket](/api-reference-docs/speech-to-text/transcribe/ws) |
  [Speech-to-Text Translate WebSocket](/api-reference-docs/speech-to-text-translate/ws)
</Note>

## API Reference

### Connection Parameters

Configure your WebSocket connection with these parameters:

| Parameter              | Type    | Description                                                                                          | Example                                        |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `language_code`        | string  | Language for speech recognition (STT only)                                                           | `"en-IN"`, `"hi-IN"`, `"kn-IN"`                |
| `model`                | string  | Model version to use                                                                                 | `"saarika:v2.5"` (STT), `"saaras:v2.5"` (STTT) |
| `sample_rate`          | integer | Audio sample rate in Hz                                                                              | `8000`, `16000`                                |
| `input_audio_codec`    | string  | Audio codec format. Only `wav` and raw PCM formats (`pcm_s16le`, `pcm_l16`, `pcm_raw`) are supported | `"wav"`, `"pcm_s16le"`                         |
| `high_vad_sensitivity` | boolean | Enhanced voice activity detection                                                                    | `true`, `false`                                |
| `vad_signals`          | boolean | Receive speech start/end events                                                                      | `true`, `false`                                |
| `flush_signal`         | boolean | Enable manual buffer flushing                                                                        | `true`, `false`                                |

### Audio Data Parameters

When sending audio data to the streaming endpoint:

| Parameter     | Type    | Description                                                                   | Required |
| ------------- | ------- | ----------------------------------------------------------------------------- | -------- |
| `audio`       | string  | Base64-encoded audio data                                                     | ✅        |
| `encoding`    | string  | Audio format                                                                  | ✅        |
| `sample_rate` | integer | Audio sample rate (16000 Hz recommended). Must match the connection parameter | ✅        |

### Response Types

When `vad_signals=true`, you'll receive different message types:

**For STT:**

* **`speech_start`**: Voice activity detected
* **`speech_end`**: Voice activity stopped
* **`transcript`**: Final transcription result

**For STTT:**

* **`speech_start`**: Voice activity detected
* **`speech_end`**: Voice activity stopped
* **`translation`**: Final translation result

### Key Differences: STT vs STTT

| Aspect          | STT            | STTT                         |
| --------------- | -------------- | ---------------------------- |
| Model           | `saarika:v2.5` | `saaras:v2.5`                |
| Method          | `transcribe()` | `translate()`                |
| Language Code   | Required       | Not required (auto-detected) |
| Output Language | Same as input  | English only                 |

### Best Practices

* **Audio Quality & Sample Rate**:
  * Use 16kHz sample rate for best results
  * For 8kHz audio, **always set `sample_rate=8000` in both connection and transcribe/translate calls**
  * Ensure both sample rate parameters match your actual audio sample rate
* **Silence Handling**:
  * Use 1 second silence when `high_vad_sensitivity=false`
  * Use 0.5 seconds silence when `high_vad_sensitivity=true`
* **Continuous Streaming**: Send audio data continuously for real-time results
* **Error Handling**: Always implement proper WebSocket error handling
* **Model Selection**:
  * Use Saarika (`saarika:v2.5`) for transcription in the original language
  * Use Saaras (`saaras:v2.5`) for direct translation to English