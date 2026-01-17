# **Function calling with the Gemini API**

Function calling lets you connect models to external tools and APIs. Instead of generating text responses, the model determines when to call specific functions and provides the necessary parameters to execute real-world actions. This allows the model to act as a bridge between natural language and real-world actions and data.

## **Primary Use Cases**

Function calling has 3 primary use cases:

* **Augment Knowledge:** Access information from external sources like databases, APIs, and knowledge bases.  
* **Extend Capabilities:** Use external tools to perform computations and extend the limitations of the model, such as using a calculator or creating charts.  
* **Take Actions:** Interact with external systems using APIs, such as scheduling appointments, creating invoices, sending emails, or controlling smart home devices.

## **Quick Start (Python)**

from google import genai  
from google.genai import types

\# Define the function declaration for the model  
schedule\_meeting\_function \= {  
    "name": "schedule\_meeting",  
    "description": "Schedules a meeting with specified attendees at a given time and date.",  
    "parameters": {  
        "type": "object",  
        "properties": {  
            "attendees": {  
                "type": "array",  
                "items": {"type": "string"},  
                "description": "List of people attending the meeting.",  
            },  
            "date": {  
                "type": "string",  
                "description": "Date of the meeting (e.g., '2024-07-29')",  
            },  
            "time": {  
                "type": "string",  
                "description": "Time of the meeting (e.g., '15:00')",  
            },  
            "topic": {  
                "type": "string",  
                "description": "The subject or topic of the meeting.",  
            },  
        },  
        "required": \["attendees", "date", "time", "topic"\],  
    },  
}

\# Configure the client and tools  
client \= genai.Client()  
tools \= types.Tool(function\_declarations=\[schedule\_meeting\_function\])  
config \= types.GenerateContentConfig(tools=\[tools\])

\# Send request with function declarations  
response \= client.models.generate\_content(  
    model="gemini-3-flash-preview",  
    contents="Schedule a meeting with Bob and Alice for 03/14/2025 at 10:00 AM about the Q3 planning.",  
    config=config,  
)

\# Check for a function call  
if response.candidates\[0\].content.parts\[0\].function\_call:  
    function\_call \= response.candidates\[0\].content.parts\[0\].function\_call  
    print(f"Function to call: {function\_call.name}")  
    print(f"Arguments: {function\_call.args}")  
    \# In a real app, you would call your function here:  
    \# result \= schedule\_meeting(\*\*function\_call.args)  
else:  
    print("No function call found in the response.")  
    print(response.text)

## **How Function Calling Works**

Function calling involves a structured interaction between your application, the model, and external functions:

1. **Define Function Declaration:** Describe the function's name, parameters, and purpose to the model in your application code.  
2. **Call LLM with function declarations:** Send the user prompt along with the declarations. The model determines if a function call is helpful and responds with a structured JSON object.  
3. **Execute Function Code (Your Responsibility):** The model does **not** execute the function. Your application extracts the name and args, executes the function, and captures the result.  
4. **Create User-friendly response:** Send the result back to the model. It uses the result to generate a final, natural language response.

## **Implementation Steps**

### **Step 1: Define a function declaration**

Define a function and its declaration that allows users to set light values.

\# Define a function declaration  
set\_light\_values\_declaration \= {  
    "name": "set\_light\_values",  
    "description": "Sets the brightness and color temperature of a light.",  
    "parameters": {  
        "type": "object",  
        "properties": {  
            "brightness": {  
                "type": "integer",  
                "description": "Light level from 0 to 100\. Zero is off and 100 is full brightness",  
            },  
            "color\_temp": {  
                "type": "string",  
                "enum": \["daylight", "cool", "warm"\],  
                "description": "Color temperature of the light fixture, which can be \`daylight\`, \`cool\` or \`warm\`.",  
            },  
        },  
        "required": \["brightness", "color\_temp"\],  
    },  
}

\# The actual mock function  
def set\_light\_values(brightness: int, color\_temp: str) \-\> dict\[str, int | str\]:  
    """Set the brightness and color temperature (mock API)."""  
    return {"brightness": brightness, "colorTemperature": color\_temp}

### **Step 2: Call the model with function declarations**

from google.genai import types

client \= genai.Client()  
tools \= types.Tool(function\_declarations=\[set\_light\_values\_declaration\])  
config \= types.GenerateContentConfig(tools=\[tools\])

contents \= \[  
    types.Content(  
        role="user", parts=\[types.Part(text="Turn the lights down to a romantic level")\]  
    )  
\]

response \= client.models.generate\_content(  
    model="gemini-3-flash-preview",  
    contents=contents,  
    config=config,  
)

print(response.candidates\[0\].content.parts\[0\].function\_call)  
\# Expected Output: id=None args={'color\_temp': 'warm', 'brightness': 25} name='set\_light\_values'

### **Step 3: Execute function code**

tool\_call \= response.candidates\[0\].content.parts\[0\].function\_call

if tool\_call.name \== "set\_light\_values":  
    result \= set\_light\_values(\*\*tool\_call.args)  
    print(f"Function execution result: {result}")

### **Step 4: Create final response**

function\_response\_part \= types.Part.from\_function\_response(  
    name=tool\_call.name,  
    response={"result": result},  
)

contents.append(response.candidates\[0\].content)   
contents.append(types.Content(role="user", parts=\[function\_response\_part\])) 

final\_response \= client.models.generate\_content(  
    model="gemini-3-flash-preview",  
    config=config,  
    contents=contents,  
)  
print(final\_response.text)

## **Function Declarations**

You define functions using a subset of the OpenAPI schema:

* **name (string):** Unique name (e.g., get\_weather\_forecast). Use underscores or camelCase.  
* **description (string):** Clear, detailed explanation of purpose. Crucial for model understanding.  
* **parameters (object):**  
  * **type:** Usually object.  
  * **properties:** Individual parameters with type, description, and optional enum.  
  * **required (array):** Mandatory parameter names.

## **Function Calling with Thinking Models**

Gemini 3 and 2.5 series models use an internal "thinking" process to reason through requests.

### **Thought Signatures**

Because the Gemini API is stateless, models use **thought signatures** to maintain context.

* **Official SDKs:** Automatically handle thought signatures.  
* **Manual/REST:** You **must** send the thought\_signature back to the model inside its original Part. Do not merge or combine parts containing signatures.

### **Inspecting Thought Signatures**

import base64  
part \= response.candidates\[0\].content.parts\[0\]  
if part.thought\_signature:  
    print(base64.b64encode(part.thought\_signature).decode("utf-8"))

## **Parallel Function Calling**

Lets you execute multiple independent functions at once (e.g., gathering data from different sources).

\# Force 'ANY' mode for a party request  
config \= types.GenerateContentConfig(  
    tools=house\_tools,  
    automatic\_function\_calling=types.AutomaticFunctionCallingConfig(disable=True),  
    tool\_config=types.ToolConfig(  
        function\_calling\_config=types.FunctionCallingConfig(mode='ANY')  
    ),  
)

chat \= client.chats.create(model="gemini-3-flash-preview", config=config)  
response \= chat.send\_message("Turn this place into a party\!")

for fn in response.function\_calls:  
    args \= ", ".join(f"{key}={val}" for key, val in fn.args.items())  
    print(f"{fn.name}({args})")

## **Compositional Function Calling**

Allows Gemini to chain multiple function calls together (e.g., finding location first, then weather).

def get\_weather\_forecast(location: str) \-\> dict:  
    return {"temperature": 25, "unit": "celsius"}

def set\_thermostat\_temperature(temperature: int) \-\> dict:  
    return {"status": "success"}

config \= types.GenerateContentConfig(  
    tools=\[get\_weather\_forecast, set\_thermostat\_temperature\]  
)

response \= client.models.generate\_content(  
    model="gemini-3-flash-preview",  
    contents="If it's warmer than 20°C in London, set the thermostat to 20°C, otherwise set it to 18°C.",  
    config=config,  
)

## **Function Calling Modes**

Control tool usage via function\_calling\_config:

* **AUTO (Default):** Model decides between text or function call.  
* **ANY:** Constrained to always predict a function call. Can specify allowed\_function\_names.  
* **NONE:** Prohibits function calls.  
* **VALIDATED (Preview):** Constrained to predict either function calls or natural language, ensuring schema adherence.

## **Automatic Function Calling (Python Only)**

The Python SDK can convert Python functions (with type hints and docstrings) directly into declarations and handle execution automatically.

def get\_current\_temperature(location: str) \-\> dict:  
    """Gets the current temperature.  
    Args:  
        location: The city and state, e.g. San Francisco, CA  
    """  
    return {"temperature": 25, "unit": "Celsius"}

config \= types.GenerateContentConfig(tools=\[get\_current\_temperature\])  
response \= client.models.generate\_content(  
    model="gemini-3-flash-preview",  
    contents="What's the temperature in Boston?",  
    config=config,  
)

### **Automatic Schema Declaration**

Supported types: int, float, bool, str, list, and pydantic.BaseModel. Dict types (like dict\[str: int\]) are not well supported.

## **Multimodal Function Responses**

Note: Available for Gemini 3 series models.  
You can include multimodal content (images, PDFs) in function responses.

* **Images:** image/png, image/jpeg, image/webp  
* **Documents:** application/pdf, text/plain

Reference a multimodal part within the structured response using {"$ref": "\<displayName\>"}.

## **Model Context Protocol (MCP)**

MCP is an open standard for connecting AI to tools. Gemini SDKs offer built-in support for MCP tools.

from mcp import ClientSession, StdioServerParameters  
from mcp.client.stdio import stdio\_client

\# Example using a weather MCP server  
server\_params \= StdioServerParameters(command="npx", args=\["-y", "@philschmid/weather-mcp"\])

async def run():  
    async with stdio\_client(server\_params) as (read, write):  
        async with ClientSession(read, write) as session:  
            await session.initialize()  
            response \= await client.aio.models.generate\_content(  
                model="gemini-2.5-flash",  
                contents="What is the weather in London?",  
                config=genai.types.GenerateContentConfig(tools=\[session\]),  
            )  
            print(response.text)

**MCP Limitations:**

* Only tools are supported (not resources or prompts).  
* Available for Python and JS/TS SDKs.  
* Experimental feature; breaking changes may occur.

## **Supported Models**

| Model | Function Calling | Parallel Calling | Compositional Calling |
| :---- | :---- | :---- | :---- |
| Gemini 3 Pro | ✔️ | ✔️ | ✔️ |
| Gemini 3 Flash | ✔️ | ✔️ | ✔️ |
| Gemini 2.5 Pro | ✔️ | ✔️ | ✔️ |
| Gemini 2.5 Flash | ✔️ | ✔️ | ✔️ |
| Gemini 2.5 Flash-Lite | ✔️ | ✔️ | ✔️ |
| Gemini 2.0 Flash | ✔️ | ✔️ | ✔️ |
| Gemini 2.0 Flash-Lite | X | X | X |

## **Best Practices**

1. **Descriptions:** Be extremely clear. The model relies on these to choose tools.  
2. **Naming:** Use descriptive names (no spaces/periods/dashes).  
3. **Strong Typing:** Use integers, enums, and specific types to reduce errors.  
4. **Tool Selection:** Keep the active set to 10-20 tools for optimal performance.  
5. **Temperature:** \* Use **0** for deterministic calls in most models.  
   * **Gemini 3 models:** Keep at default **1.0** to avoid looping or degraded reasoning.  
6. **Validation:** Validate high-consequence calls (e.g., orders) with the user.  
7. **Error Handling:** Return informative error messages so the model can rectify the issue.  
8. **Security:** Avoid exposing sensitive data; use proper auth for APIs.  
9. **Token Limits:** Descriptions count toward limits; keep them focused.

## **Notes and Limitations**

* Only a subset of OpenAPI schema is supported.  
* Supported parameter types in Python are limited.  
* Automatic function calling is a Python SDK feature only.