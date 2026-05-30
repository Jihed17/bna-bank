import logging
import re
from decouple import config
from .prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class ChatbotService:
    """Minimal BNA Bank Chatbot Service (no database)."""

    def __init__(self):
        self.use_openai = config("USE_OPENAI", default=False, cast=bool)
        self.system_prompt = SYSTEM_PROMPT
        self.client = None

        if self.use_openai:
            try:
                from openai import OpenAI
                api_key = config("OPENAI_API_KEY", default="")

                if not api_key:
                    logger.warning("Missing OPENAI_API_KEY -> fallback mode")
                    self.use_openai = False
                else:
                    self.client = OpenAI(api_key=api_key)
                    logger.info("Chatbot initialized with OpenAI")

            except ImportError:
                logger.warning("OpenAI not installed -> fallback mode")
                self.use_openai = False

    def sanitize_message(self, message: str) -> str:
        return re.sub(r"[<>]", "", message).strip()[:1000]

    def generate_response(self, user_message, history=None):
        user_message = self.sanitize_message(user_message)

        if self.use_openai and self.client:
            return self._openai_response(user_message, history)

        return self._mock_response(user_message)

    def _openai_response(self, user_message, history):
        try:
            messages = [{"role": "system", "content": self.system_prompt}]

            if history:
                messages.extend(history)

            messages.append({"role": "user", "content": user_message})

            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=messages,
                temperature=0.4,
                max_tokens=500,
            )

            return {
                "answer": response.choices[0].message.content,
                "actions": self._extract_actions(user_message),
            }

        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return self._mock_response(user_message)

    def _extract_actions(self, message):
        msg = message.lower()
        actions = []

        if "rendez-vous" in msg or "rdv" in msg:
            actions.append({"text": "Prendre rendez-vous", "action": "appointment"})

        if "agence" in msg:
            actions.append({"text": "Trouver une agence", "action": "nearest_agency"})

        if "service" in msg:
            actions.append({"text": "Voir services", "action": "all_services"})

        return actions

    def _mock_response(self, user_message):
        msg = user_message.lower()

        allowed = [
            "bna", "banque", "compte", "crédit", "prêt", "carte",
            "agence", "rendez-vous", "rdv", "service", "horaire"
        ]

        if not any(k in msg for k in allowed):
            return {
                "answer": "Je peux répondre uniquement aux questions liées aux services BNA.",
                "actions": []
            }

        if "rendez-vous" in msg or "rdv" in msg:
            return {
                "answer": "Vous pouvez gérer vos rendez-vous depuis votre espace client.",
                "actions": [{"text": "Prendre rendez-vous", "action": "appointment"}]
            }

        if "agence" in msg:
            return {
                "answer": "Consultez la liste des agences dans l'application.",
                "actions": [{"text": "Voir agences", "action": "all_agencies"}]
            }

        if "compte" in msg:
            return {
                "answer": "BNA propose comptes courants, épargne et professionnels.",
                "actions": [{"text": "Voir comptes", "action": "services"}]
            }

        return {
            "answer": "Comment puis-je vous aider avec les services BNA ?",
            "actions": []
        }
