# Gemini 3 Developer Guide

We have updated our Terms of Service.

Gemini 3 is our most intelligent model family to date, built on a foundation of state-of-the-art reasoning. It is designed to bring any idea to life by mastering agentic workflows, autonomous coding, and complex multimodal tasks. This guide covers key features of the Gemini 3 model family and how to get the most out of it.

**Try Gemini 3 Pro** | **Try Gemini 3 Flash** | **Try Nano Banana Pro**

Explore our collection of Gemini 3 apps to see how the model handles advanced reasoning, autonomous coding, and complex multimodal tasks.

Get started with a few lines of code:

**Python** | **JavaScript** | **REST**

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function run() {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: "Find the race condition in this multi-threaded C++ snippet: [code here]",
  });

  console.log(response.text);
}

run();
```

## Meet the Gemini 3 series

*   **Gemini 3 Pro**, the first model in the new series, is best for complex tasks that require broad world knowledge and advanced reasoning across modalities.
*   **Gemini 3 Flash** is our latest 3-series model, with Pro-level intelligence at the speed and pricing of Flash.
*   **Nano Banana Pro** (also known as Gemini 3 Pro Image) is our highest quality image generation model yet.

All Gemini 3 models are currently in preview.

| Model ID | Context Window (In / Out) | Knowledge Cutoff | Pricing (Input / Output)* |
| :--- | :--- | :--- | :--- |
| gemini-3-pro-preview | 1M / 64k | Jan 2025 | $2 / $12 (<200k tokens)<br>$4 / $18 (>200k tokens) |
| gemini-3-flash-preview | 1M / 64k | Jan 2025 | $0.50 / $3 |
| gemini-3-pro-image-preview | 65k / 32k | Jan 2025 | $2 (Text Input) / $0.134 (Image Output)** |

\* Pricing is per 1 million tokens unless otherwise noted.
\** Image pricing varies by resolution. See the pricing page for details.

For detailed limits, pricing, and additional information, see the models page.

## New API features in Gemini 3

Gemini 3 introduces new parameters designed to give developers more control over latency, cost, and multimodal fidelity.

### Thinking level

Gemini 3 series models use dynamic thinking by default to reason through prompts. You can use the `thinking_level` parameter, which controls the maximum depth of the model's internal reasoning process before it produces a response. Gemini 3 treats these levels as relative allowances for thinking rather than strict token guarantees.

If `thinking_level` is not specified, Gemini 3 will default to `high`. For faster, lower-latency responses when complex reasoning isn't required, you can constrain the model's thinking level to `low`.

#### Gemini 3 Pro and Flash thinking levels:

The following thinking levels are supported by both Gemini 3 Pro and Flash:

*   **low**: Minimizes latency and cost. Best for simple instruction following, chat, or high-throughput applications.
*   **high** (Default, dynamic): Maximizes reasoning depth. The model may take significantly longer to reach a first token, but the output will be more carefully reasoned.

#### Gemini 3 Flash thinking levels

In addition to the levels above, Gemini 3 Flash also supports the following thinking levels that are not currently supported by Gemini 3 Pro:

*   **minimal**: Matches the “no thinking” setting for most queries. The model may think very minimally for complex coding tasks. Minimizes latency for chat or high throughput applications.
    *   *Note: Circulation of thought signatures is required even when thinking level is set to minimal for Gemini 3 Flash.*
*   **medium**: Balanced thinking for most tasks.

**Python** | **JavaScript** | **REST**

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: "How does AI work?",
    config: {
      thinkingConfig: {
        thinkingLevel: "low",
      }
    },
  });

console.log(response.text);
```

**Important:** You cannot use both `thinking_level` and the legacy `thinking_budget` parameter in the same request. Doing so will return a 400 error.

### Media resolution

Gemini 3 introduces granular control over multimodal vision processing via the `media_resolution` parameter. Higher resolutions improve the model's ability to read fine text or identify small details, but increase token usage and latency. The `media_resolution` parameter determines the maximum number of tokens allocated per input image or video frame.

You can now set the resolution to `media_resolution_low`, `media_resolution_medium`, `media_resolution_high`, or `media_resolution_ultra_high` per individual media part or globally (via `generation_config`, global not available for ultra high). If unspecified, the model uses optimal defaults based on the media type.

#### Recommended settings

| Media Type | Recommended Setting | Max Tokens | Usage Guidance |
| :--- | :--- | :--- | :--- |
| Images | media_resolution_high | 1120 | Recommended for most image analysis tasks to ensure maximum quality. |
| PDFs | media_resolution_medium | 560 | Optimal for document understanding; quality typically saturates at medium. Increasing to high rarely improves OCR results for standard documents. |
| Video (General) | media_resolution_low (or medium) | 70 (per frame) | Note: For video, low and medium settings are treated identically (70 tokens) to optimize context usage. This is sufficient for most action recognition and description tasks. |
| Video (Text-heavy) | media_resolution_high | 280 (per frame) | Required only when the use case involves reading dense text (OCR) or small details within video frames. |

**Note:** The `media_resolution` parameter maps to different token counts depending on the input type. While images scale linearly (`media_resolution_low`: 280, `media_resolution_medium`: 560, `media_resolution_high`: 1120), Video is compressed more aggressively. For Video, both `media_resolution_low` and `media_resolution_medium` are capped at 70 tokens per frame, and `media_resolution_high` is capped at 280 tokens.

**Python** | **JavaScript** | **REST**

```javascript
import { GoogleGenAI } from "@google/genai";

// The media_resolution parameter is currently only available in the v1alpha API version.
const ai = new GoogleGenAI({ apiVersion: "v1alpha" });

async function run() {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        parts: [
          { text: "What is in this image?" },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: "...",
            },
            mediaResolution: {
              level: "media_resolution_high"
            }
          }
        ]
      }
    ]
  });

  console.log(response.text);
}

run();
```

### Temperature

For Gemini 3, we strongly recommend keeping the `temperature` parameter at its default value of **1.0**.

While previous models often benefited from tuning temperature to control creativity versus determinism, Gemini 3's reasoning capabilities are optimized for the default setting. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance, particularly in complex mathematical or reasoning tasks.

### Thought signatures

Gemini 3 uses **Thought signatures** to maintain reasoning context across API calls. These signatures are encrypted representations of the model's internal thought process. To ensure the model maintains its reasoning capabilities you must return these signatures back to the model in your request exactly as they were received:

*   **Function Calling (Strict):** The API enforces strict validation on the "Current Turn". Missing signatures will result in a 400 error.
    *   *Note: Circulation of thought signatures is required even when thinking level is set to minimal for Gemini 3 Flash.*
*   **Text/Chat:** Validation is not strictly enforced, but omitting signatures will degrade the model's reasoning and answer quality.
*   **Image generation/editing (Strict):** The API enforces strict validation on all Model parts including a `thoughtSignature`. Missing signatures will result in a 400 error.

**Success:** If you use the official SDKs (Python, Node, Java) and standard chat history, Thought Signatures are handled automatically. You do not need to manually manage these fields.

#### Function calling (strict validation)

When Gemini generates a `functionCall`, it relies on the `thoughtSignature` to process the tool's output correctly in the next turn. The "Current Turn" includes all Model (`functionCall`) and User (`functionResponse`) steps that occurred since the last standard User text message.

*   **Single Function Call:** The `functionCall` part contains a signature. You must return it.
*   **Parallel Function Calls:** Only the first `functionCall` part in the list will contain the signature. You must return the parts in the exact order received.
*   **Multi-Step (Sequential):** If the model calls a tool, receives a result, and calls another tool (within the same turn), both function calls have signatures. You must return all accumulated signatures in the history.

#### Text and streaming

For standard chat or text generation, the presence of a signature is not guaranteed.

*   **Non-Streaming:** The final content part of the response may contain a `thoughtSignature`, though it is not always present. If one is returned, you should send it back to maintain best performance.
*   **Streaming:** If a signature is generated, it may arrive in a final chunk that contains an empty text part. Ensure your stream parser checks for signatures even if the text field is empty.

#### Image generation and editing

For `gemini-3-pro-image-preview`, thought signatures are critical for conversational editing. When you ask the model to modify an image it relies on the `thoughtSignature` from the previous turn to understand the composition and logic of the original image.

*   **Editing:** Signatures are guaranteed on the first part after the thoughts of the response (text or `inlineData`) and on every subsequent `inlineData` part. You must return all of these signatures to avoid errors.

#### Code examples
*   Multi-step Function Calling (Sequential)
*   Parallel Function Calling
*   Text/In-Context Reasoning (No Validation)
*   Image Generation & Editing

#### Migrating from other models

If you are transferring a conversation trace from another model (e.g., Gemini 2.5) or injecting a custom function call that was not generated by Gemini 3, you will not have a valid signature.

To bypass strict validation in these specific scenarios, populate the field with this specific dummy string: `"thoughtSignature": "context_engineering_is_the_way_to_go"`

### Structured Outputs with tools

Gemini 3 models allow you to combine Structured Outputs with built-in tools, including Grounding with Google Search, URL Context, and Code Execution.

**Python** | **JavaScript** | **REST**

```javascript
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const ai = new GoogleGenAI({});

const matchSchema = z.object({
  winner: z.string().describe("The name of the winner."),
  final_match_score: z.string().describe("The final score."),
  scorers: z.array(z.string()).describe("The name of the scorer.")
});

async function run() {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: "Search for all details for the latest Euro.",
    config: {
      tools: [
        { googleSearch: {} },
        { urlContext: {} }
      ],
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(matchSchema),
    },
  });

  const match = matchSchema.parse(JSON.parse(response.text));
  console.log(match);
}

run();
```