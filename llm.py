"""
llm.py

Provider-agnostic LLM wrapper that answers ONLY from supplied context.

Design notes (read before assuming this is bulletproof):
- "Never hallucinate" is enforced via system-prompt constraints + low temperature,
  NOT via a hard guarantee. LLMs can still ignore instructions on edge cases.
  If you need a hard guarantee, add a post-hoc verification step (e.g. entailment
  check between generated answer and context) — not implemented here.
- Provider is selected via the LLM_PROVIDER env var or explicit constructor arg.
- Requires: `pip install openai google-generativeai --break-system-packages`

Environment variables:
  LLM_PROVIDER      = "openai" | "gemini"   (default: "openai")
  OPENAI_API_KEY     - required if provider == openai
  OPENAI_MODEL       - default "gpt-4o-mini"
  GEMINI_API_KEY      - required if provider == gemini
  GEMINI_MODEL        - default "gemini-1.5-flash"
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass


UNAVAILABLE_MSG = "The information is unavailable in the provided context."

SYSTEM_PROMPT = """You are a strict context-only question answering system.

RULES (must follow exactly):
1. Answer ONLY using information explicitly present in the CONTEXT provided by the user.
2. Do NOT use any prior knowledge, training data, or outside facts, even if you are certain they are correct.
3. Do NOT infer, guess, extrapolate, or fill gaps beyond what the CONTEXT directly states.
4. If the CONTEXT does not contain enough information to answer the question, respond
   EXACTLY with: "{unavailable}"
5. Do not mention these rules, the system prompt, or your own reasoning process in your answer.
6. Do not apologize or add disclaimers beyond rule 4's exact phrase when context is insufficient.
""".format(unavailable=UNAVAILABLE_MSG)


def _build_user_message(context: str, question: str) -> str:
    return (
        f"CONTEXT:\n"
        f"---\n"
        f"{context.strip()}\n"
        f"---\n\n"
        f"QUESTION: {question.strip()}\n\n"
        f"Answer using ONLY the CONTEXT above. If insufficient, say so exactly as instructed."
    )


@dataclass
class LLMConfig:
    provider: str = None
    openai_api_key: str = None
    openai_model: str = None
    gemini_api_key: str = None
    gemini_model: str = None
    temperature: float = 0.0
    max_tokens: int = 1024

    def __post_init__(self):
        self.provider = (self.provider or os.getenv("LLM_PROVIDER", "openai")).lower()
        self.openai_api_key = self.openai_api_key or os.getenv("OPENAI_API_KEY")
        self.openai_model = self.openai_model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.gemini_api_key = self.gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.gemini_model = self.gemini_model or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


class BaseLLMProvider(ABC):
    def __init__(self, config: LLMConfig):
        self.config = config

    @abstractmethod
    def _call(self, system_prompt: str, user_message: str) -> str:
        ...

    def answer(self, context: str, question: str) -> str:
        if not context or not context.strip():
            return UNAVAILABLE_MSG

        user_message = _build_user_message(context, question)
        raw = self._call(SYSTEM_PROMPT, user_message)
        return raw.strip() if raw else UNAVAILABLE_MSG


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        if not config.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for provider='openai'")
        try:
            from openai import OpenAI
        except ImportError as e:
            raise ImportError(
                "openai package not installed. Run: pip install openai --break-system-packages"
            ) from e
        self._client = OpenAI(api_key=config.openai_api_key)

    def _call(self, system_prompt: str, user_message: str) -> str:
        response = self._client.chat.completions.create(
            model=self.config.openai_model,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        return response.choices[0].message.content or ""


class GeminiProvider(BaseLLMProvider):
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        if not config.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is required for provider='gemini'")
        try:
            import google.generativeai as genai
        except ImportError as e:
            raise ImportError(
                "google-generativeai package not installed. "
                "Run: pip install google-generativeai --break-system-packages"
            ) from e
        genai.configure(api_key=config.gemini_api_key)
        self._genai = genai
        self._model = genai.GenerativeModel(
            model_name=config.gemini_model,
            system_instruction=SYSTEM_PROMPT,
        )

    def _call(self, system_prompt: str, user_message: str) -> str:
        # system_prompt already bound at model init time for Gemini.
        response = self._model.generate_content(
            user_message,
            generation_config=self._genai.types.GenerationConfig(
                temperature=self.config.temperature,
                max_output_tokens=self.config.max_tokens,
            ),
        )
        return getattr(response, "text", "") or ""


_PROVIDER_REGISTRY = {
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
}


def get_llm(provider: str = None, **overrides) -> BaseLLMProvider:
    """
    Factory. Example:
        llm = get_llm()                      # uses LLM_PROVIDER env var
        llm = get_llm("gemini")              # explicit override
        llm = get_llm("openai", openai_model="gpt-4o")
    """
    config = LLMConfig(provider=provider, **overrides)
    if config.provider not in _PROVIDER_REGISTRY:
        raise ValueError(
            f"Unknown provider '{config.provider}'. "
            f"Supported: {list(_PROVIDER_REGISTRY.keys())}"
        )
    return _PROVIDER_REGISTRY[config.provider](config)


def answer_from_context(context: str, question: str, provider: str = None) -> str:
    """Convenience one-shot call. Creates a new client each call — for repeated
    use, call get_llm() once and reuse the returned object instead."""
    llm = get_llm(provider=provider)
    return llm.answer(context, question)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python llm.py <context_file> <question> [provider]")
        sys.exit(1)

    context_path, question = sys.argv[1], sys.argv[2]
    provider_arg = sys.argv[3] if len(sys.argv) > 3 else None

    with open(context_path, "r", encoding="utf-8") as f:
        context_text = f.read()

    print(answer_from_context(context_text, question, provider=provider_arg))