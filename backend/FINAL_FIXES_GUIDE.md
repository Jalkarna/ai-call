# Final Fixes Required - Step by Step

## Issue Summary from User Testing

✅ **Silero VAD working** - Speech end detected correctly most of the time  
❌ **STT hallucination** - Transcribed wrong text when user was speaking number  
❌ **Address format inconsistent** - Mixing Hindi/English  
❌ **Pincode not required** - Should be mandatory  
❌ **Asking for contact number** - Caller is already on phone!  
❌ **Not step-by-step** - Asks for multiple things at once  
❌ **Gemini processing slow** - 2-15 seconds for simple responses  
❌ **end_call timing wrong** - Calls it after confirmation, not after "need help?" → "no"  
❌ **TTS cutoff on end_call** - Farewell message cuts off mid-word  

---

## Fix 1: System Prompt (DONE ✅)
**File**: `app/schemas/gemini_system_prompt.txt`

**Changes Made**:
- Step-by-step collection (one field at a time)
- Pincode required (390XXX format)
- NO contact_number field (they're calling!)
- All data stored in ENGLISH only
- Correct end_call timing (ask "need help?" first)
- Brief responses (max 20 words)

---

## Fix 2: Wait for TTS Mark Before Closing (CRITICAL!)  
**File**: `app/api/calls.py`

**Problem**: Currently closes WebSocket immediately when `should_end_call=True`, cutting off audio

**Solution**: Wait for TTS "mark" event before closing

### Code Changes Needed:

#### A. Add variables at start of `stream_audio` function (after line 115):
```python
pending_end_call = False
farewell_mark_id = None
```

#### B. Replace lines 207-217 (the end_call block):
**OLD**:
```python
if should_end_call:
    print("DEBUG: Call should end (Gemini called end_call)")
    logger.info("ending_call_per_gemini", session_id=session_id)
    await asyncio.sleep(2.0)
    await orchestrator.end_call(session_id, db)
    await websocket.close()
    print("DEBUG: WebSocket closed, call ended")
    break
```

**NEW**:
```python
if should_end_call and tts_audio:
    # Don't close immediately - wait for TTS mark event
    pending_end_call = True
    farewell_mark_id = mark_id  # mark_id from line 196
    print(f"DEBUG: Call will end after TTS finishes, mark={mark_id}")
    logger.info("ending_call_waiting_for_farewell", 
               session_id=session_id, 
               mark_id=mark_id)
```

#### C. Update mark event handler (lines 219-226):
**OLD**:
```python
elif event == "mark":
    mark_name = message.get("mark", {}).get("name", "")
    print(f"DEBUG: Event: mark, name={mark_name}")
    
    if mark_name.startswith("response_") or mark_name == "greeting_done":
        await orchestrator.mark_speaking_done(session_id, db)
        logger.info("ai_speaking_done", session_id=session_id, mark=mark_name)
```

**NEW**:
```python
elif event == "mark":
    mark_name = message.get("mark", {}).get("name", "")
    print(f"DEBUG: Event: mark, name={mark_name}")
    
    if mark_name.startswith("response_") or mark_name == "greeting_done":
        await orchestrator.mark_speaking_done(session_id, db)
        logger.info("ai_speaking_done", session_id=session_id, mark=mark_name)
        
        # If waiting for farewell to finish, close call now
        if pending_end_call and mark_name == farewell_mark_id:
            print(f"DEBUG: Farewell TTS finished ({mark_name}), ending call")
            await orchestrator.end_call(session_id, db)
            await websocket.close()
            print("DEBUG: WebSocket closed, call ended")
            break
```

---

## Fix 3: Optimize Gemini Context (Reduce Processing Time)
**File**: `app/services/gemini_client.py`

**Problem**: Sending full conversation history every time (7+ turns = massive context)

**Solution**: Only send last 3 turns + current_form

### Code Changes Needed in `GeminiClient.process()`:

**Find this section** (around line 207):
```python
# Build conversation for Gemini
conversation = []
for entry in history.messages:
    conversation.append({
        "role": "user" if entry.role == "user" else "model",
        "parts": [entry.text]
    })
```

**Replace with**:
```python
# Build conversation for Gemini (only last 3 turns for efficiency)
conversation = []
recent_messages = history.messages[-6:] if len(history.messages) > 6 else history.messages
for entry in recent_messages:
    conversation.append({
        "role": "user" if entry.role == "user" else "model",
        "parts": [entry.text]
    })
```

---

## Fix 4: Adjust Silero VAD Thresholds
**File**: `app/services/silero_vad.py`

**Problem**: Occasionally cuts off speech or hits max buffer

**Solution**: Fine-tune thresholds

### In `__init__` method (around line 64):
**Change**:
```python
self.vad_threshold = 0.5,       # Speech probability threshold
```

**To**:
```python
self.vad_threshold = 0.6,       # Slightly higher = less false positives
```

### In `add_audio` method (around line 140):
**Change hangover calculation**:
```python
# Check for speech end
if self.silence_samples >= (self.silence_bytes + self.hangover_bytes):
```

**To** (increase hangover):
```python
# Check for speech end (with extra buffer for word endings)
extra_hangover = int((self.sample_rate * 500) / 1000)  # Extra 500ms
if self.silence_samples >= (self.silence_bytes + self.hangover_bytes + extra_hangover):
```

---

## Fix 5: Update State Machine for Pincode Validation
**File**: `app/services/state_machine.py`

**Find** the validation logic and ensure pincode is checked.

Should have logic like:
```python
# Validate pincode format
if pincode and (len(pincode) != 6 or not pincode.startswith('390')):
    # Invalid pincode format
    return CallState.ASK_DETAILS
```

---

## Testing After Fixes

### Expected Flow:
```
1. User: "गड्ढा है सोसाइटी के बाहर"
   AI: "कहाँ पर? पूरा पता बताएं।" (Ask for address ONLY)

2. User: "हाउस 4"  
   AI: "कौनसे एरिया में?" (Ask for locality ONLY)

3. User: "जे पी नगर"
   AI: "पिनकोड क्या है?" (Ask for pincode ONLY)

4. User: "390001"
   AI: "धन्यवाद। House 4, JP Nagar, 390001 पर गड्ढे की शिकायत दर्ज करूं?" (Confirm)

5. User: "हाँ"
   AI: "शिकायत दर्ज हो गई। क्या कुछ और मदद चाहिए?" (File + ask for more help)

6. User: "नहीं"
   AI: "धन्यवाद। नमस्ते।" (End call AFTER this plays completely)
   → WebSocket closes ONLY after mark event received
```

### Expected Timings:
- VAD: Speech end within 1.5 seconds of silence
- STT: <500ms
- Gemini: <2 seconds (with optimized context)
- TTS: <1 second
- **Total**: <5 seconds per turn

---

## Priority Order:
1. ✅ **System prompt** (DONE)
2. 🔥 **Fix TTS cutoff** (calls.py - CRITICAL for UX)
3. ⚡ **Optimize Gemini context** (gemini_client.py - speeds up responses)
4. 🎯 **VAD fine-tuning** (silero_vad.py - prevents cutoffs)
5. ✔️ **Pincode validation** (state_machine.py - data quality)

---

## Files to Edit:
1. ✅ `app/schemas/gemini_system_prompt.txt` - DONE
2. 🔥 `app/api/calls.py` - ADD pending_end_call logic
3. ⚡ `app/services/gemini_client.py` - LIMIT conversation history
4. 🎯 `app/services/silero_vad.py` - ADJUST thresholds
5. ✔️ `app/services/state_machine.py` - VALIDATE pincode
