"""
Language configuration and mapping utilities for multi-lingual support.
"""

from enum import Enum
from typing import Dict, Optional

class LanguageCode(str, Enum):
    """ISO language codes used in the system."""
    GUJARATI = "gu"
    HINDI = "hi"  
    ENGLISH = "en"

class SarvamLanguage(str, Enum):
    """Sarvam AI language codes."""
    GUJARATI = "gu-IN"
    HINDI = "hi-IN"
    ENGLISH = "en-IN"

# Mapping from ISO code to Sarvam format
LANG_CODE_TO_SARVAM: Dict[str, str] = {
    "gu": "gu-IN",
    "hi": "hi-IN",
    "en": "en-IN",
}

# Language names for logging/display
LANG_NAMES: Dict[str, str] = {
    "gu": "Gujarati",
    "hi": "Hindi",
    "en": "English",
}

# Gemini system prompt language instructions
GEMINI_LANG_INSTRUCTIONS: Dict[str, str] = {
    "gu": """You must respond ONLY in Gujarati language. 
Examples of proper Gujarati responses:
- "તમારું નામ શું છે?" (What is your name?)
- "તમારો ફોન નંબર?" (Your phone number?)
All your responses must be in Gujarati script.""",
    
    "hi": """You must respond ONLY in Hindi language.
Examples of proper Hindi responses:  
- "आपका नाम क्या है?" (What is your name?)
- "आपका फ़ोन नंबर?" (Your phone number?)
All your responses must be in Devanagari script.""",
    
    "en": """You must respond ONLY in English language.
Use simple, clear Indian English.
Examples:
- "What is your name?"
-" What is your phone number?"
Keep language simple for all education levels."""
}


def get_sarvam_language(lang_code: str) -> str:
    """
    Convert ISO language code to Sarvam format.
    
    Args:
        lang_code: ISO code (gu/hi/en)
        
    Returns:
        Sarvam language code (gu-IN/hi-IN/en-IN)
    """
    return LANG_CODE_TO_SARVAM.get(lang_code, "hi-IN")  # Default to Hindi


def get_language_name(lang_code: str) -> str:
    """Get human-readable language name."""
    return LANG_NAMES.get(lang_code, "Hindi")


def get_gemini_language_instruction(lang_code: str) -> str:
    """Get Gemini system prompt language instruction."""
    return GEMINI_LANG_INSTRUCTIONS.get(lang_code, GEMINI_LANG_INSTRUCTIONS["hi"])


def validate_language_code(lang_code: Optional[str]) -> str:
    """
    Validate and normalize language code.
    
    Args:
        lang_code: Language code to validate
        
    Returns:
        Valid language code (defaults to 'hi' if invalid)
    """
    if not lang_code:
        return "hi"
    
    lang_code = lang_code.lower().strip()
    if lang_code in ["gu", "hi", "en"]:
        return lang_code
    
    # Default to Hindi for invalid codes
    return "hi"
