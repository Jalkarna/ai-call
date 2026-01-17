````md
# Gemini Thinking (Gemini API)

The **Gemini 3** and **Gemini 2.5** series models use an internal **thinking process** that significantly improves their reasoning and multi-step planning abilities. This makes them highly effective for complex tasks such as coding, advanced mathematics, and data analysis.

This guide explains how to work with Gemini's thinking capabilities using the **Gemini API**.

---

## Generating Content with Thinking

Initiating a request with a thinking model is similar to any other content generation request.  
The key difference is specifying a model that supports thinking in the `model` field.

### Example: Text Generation

#### Python
```python
from google import genai

client = genai.Client()
prompt = "Explain the concept of Occam's Razor and provide a simple, everyday example."
response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=prompt
)

print(response.text)
````

---

## Thought Summaries

Thought summaries are **summarized versions of the model's raw thoughts**, offering insight into how the model reasoned internally.

> **Note:** Thinking levels and budgets apply to the model’s *raw thoughts*, not the summarized thoughts.

To enable thought summaries, set `includeThoughts=True` in your request configuration.
You can then inspect each response part and check the `thought` boolean.

### Example: Thought Summaries (Non-Streaming)

#### Python

```python
from google import genai
from google.genai import types

client = genai.Client()
prompt = "What is the sum of the first 50 prime numbers?"

response = client.models.generate_content(
  model="gemini-3-flash-preview",
  contents=prompt,
  config=types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
      include_thoughts=True
    )
  )
)

for part in response.candidates[0].content.parts:
  if not part.text:
    continue
  if part.thought:
    print("Thought summary:")
    print(part.text)
    print()
  else:
    print("Answer:")
    print(part.text)
    print()
```

---

### Example: Thought Summaries (Streaming)

#### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

prompt = """
Alice, Bob, and Carol each live in a different house on the same street: red, green, and blue.
The person who lives in the red house owns a cat.
Bob does not live in the green house.
Carol owns a dog.
The green house is to the left of the red house.
Alice does not own a cat.
Who lives in each house, and what pet do they own?
"""

thoughts = ""
answer = ""

for chunk in client.models.generate_content_stream(
    model="gemini-3-flash-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
      thinking_config=types.ThinkingConfig(
        include_thoughts=True
      )
    )
):
  for part in chunk.candidates[0].content.parts:
    if not part.text:
      continue
    elif part.thought:
      if not thoughts:
        print("Thoughts summary:")
      print(part.text)
      thoughts += part.text
    else:
      if not answer:
        print("Answer:")
      print(part.text)
      answer += part.text
```

---

## Controlling Thinking

Gemini models use **dynamic thinking by default**, adjusting reasoning depth based on task complexity.

If you need lower latency or deeper reasoning, you can control thinking behavior manually.

---

## Thinking Levels (Gemini 3)

The `thinkingLevel` parameter controls reasoning behavior.

### Gemini 3 Pro & Flash

| Level            | Description                                       |
| ---------------- | ------------------------------------------------- |
| `low`            | Minimizes latency and cost. Best for simple tasks |
| `high` (default) | Maximizes reasoning depth; higher latency         |

### Gemini 3 Flash (Additional Levels)

| Level     | Description                             |
| --------- | --------------------------------------- |
| `minimal` | Nearly no thinking (not guaranteed off) |
| `medium`  | Balanced reasoning                      |
| `low`     | Reduced reasoning                       |
| `high`    | Deep reasoning                          |

> **Notes**

* You cannot disable thinking for **Gemini 3 Pro**
* Gemini 3 Flash does not fully support “thinking off”

### Example: Setting Thinking Level

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Provide a list of 3 famous physicists and their key contributions",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level="low")
    ),
)

print(response.text)
```

---

## Thinking Budgets (Gemini 2.5)

Gemini 2.5 models use `thinkingBudget` instead of `thinkingLevel`.

| Model             | Range     | Disable Thinking | Dynamic Thinking |
| ----------------- | --------- | ---------------- | ---------------- |
| 2.5 Pro           | 128–32768 | ❌                | `-1` (default)   |
| 2.5 Flash         | 0–24576   | `0`              | `-1`             |
| 2.5 Flash Preview | 0–24576   | `0`              | `-1`             |
| 2.5 Flash Lite    | 512–24576 | `0`              | `-1`             |
| Robotics-ER 1.5   | 0–24576   | `0`              | `-1`             |

> **Note:**
> Use `thinkingLevel` for Gemini 3 models.
> `thinkingBudget` is supported only for backward compatibility.

### Example: Using Thinking Budget

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Provide a list of 3 famous physicists and their key contributions",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_budget=1024)
        # Disable thinking:
        # thinking_config=types.ThinkingConfig(thinking_budget=0)
        # Dynamic thinking:
        # thinking_config=types.ThinkingConfig(thinking_budget=-1)
    ),
)

print(response.text)
```

---

## Thought Signatures

The Gemini API is **stateless**, so each request is independent.

To preserve reasoning context across turns, Gemini returns **thought signatures**—encrypted representations of the model’s internal thinking.

### Key Points

* Gemini 2.5 returns thought signatures when:

  * Thinking is enabled
  * Function calling is used
* Gemini 3 may return thought signatures for all parts
* Always pass thought signatures back unchanged
* Required for function calling
* Do **not** merge or concatenate parts containing signatures

> The Google GenAI SDK handles thought signatures automatically unless you use REST or modify conversation history manually.

---

## Pricing

* Pricing = **thinking tokens + output tokens**
* Thought summaries are included in free and paid tiers
* Full internal thoughts are billed even though only summaries are returned

### Example: Token Usage

```python
print("Thoughts tokens:", response.usage_metadata.thoughts_token_count)
print("Output tokens:", response.usage_metadata.candidates_token_count)
```

Learn more in the **Token Counting Guide**.

---

## Best Practices

### Debugging & Steering

* Inspect thought summaries to understand model reasoning
* Adjust prompts to guide reasoning direction and depth

### Task Complexity Guidelines

#### Easy Tasks (Thinking Optional)

* Fact lookup
* Classification

Examples:

* "Where was DeepMind founded?"
* "Is this email requesting a meeting?"

#### Medium Tasks (Default Thinking)

* Comparisons
* Analogies

Examples:

* Compare electric vs hybrid cars
* Explain photosynthesis using an analogy

#### Hard Tasks (High Thinking Recommended)

* Advanced math
* Large-scale coding

Examples:

* Solve AIME-level problems
* Build a real-time stock market web app with auth

---

## Supported Models & Capabilities

* Thinking supported on **Gemini 3** and **Gemini 2.5**
* Works with all Gemini tools:

  * Function calling
  * Code execution
  * Real-time data access

Check the **Model Overview Page** for full capability details.

You can explore advanced examples in the **Thinking Cookbook**.

```

If you want, I can also:
- split this into multiple `.md` files  
- convert it to **MkDocs / Docusaurus** format  
- or clean it up for internal documentation / README usage
```
