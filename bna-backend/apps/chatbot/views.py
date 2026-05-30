import os
import json
import logging
import re

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def _mock_response(user_message):
    """Simple mock response based on keywords using prompts.py content."""
    msg = user_message.lower()
    
    # Keywords from BNA services
    keywords = {
        "rendez-vous": "Vous pouvez prendre rendez-vous en choisissant un service, une agence et un créneau horaire. Connectez-vous sur BNA Digital pour finaliser votre réservation.",
        "rdv": "Vous pouvez prendre rendez-vous en choisissant un service, une agence et un créneau horaire. Connectez-vous sur BNA Digital pour finaliser votre réservation.",
        "agence": "BNA dispose de plusieurs agences à Tunis, Sfax, Sousse, Monastir et Gabès. Consultez la liste complète sur l'application.",
        "service": "BNA propose des services pour particuliers (comptes, crédits, cartes), entreprises (comptes pro, crédit professionnel), investissement, assurance et services digitaux.",
        "compte": "BNA propose des comptes courants, d'épargne et professionnels adaptés à vos besoins.",
        "crédit": "BNA offre divers types de crédits : immobilier, personnel, auto, agricole et professionnel.",
        "carte": "BNA propose différentes cartes bancaires pour vos paiements et retraits.",
        "horaire": "Les agences BNA sont ouvertes du lundi au vendredi de 8h00 à 17h00, et le samedi de 8h30 à 12h30. Fermées le dimanche et jours fériés.",
    }
    
    for keyword, response in keywords.items():
        if keyword in msg:
            return response
    
    return "Comment puis-je vous aider avec les services BNA ? Je peux vous renseigner sur les rendez-vous, les agences, les services, les comptes, les crédits ou les horaires."


@csrf_exempt
@require_POST
def chatbot_view(request):
    """
    Endpoint principal du chatbot BNA.

    Attend un body JSON :
    {
        "messages": [
            {"role": "user",      "content": "Bonjour"},
            {"role": "assistant", "content": "Bonjour ! ..."},
            {"role": "user",      "content": "Je veux un RDV"}
        ]
    }

    Retourne :
    {
        "reply": "Bien sûr ! Pour quel type de service ..."
    }
    """
    try:
        # Parsing du body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Corps de la requête JSON invalide."}, status=400)

        messages = data.get("messages", [])

        if not messages:
            return JsonResponse({"error": "La liste 'messages' est vide ou absente."}, status=400)

        # Validation basique des messages
        for msg in messages:
            if "role" not in msg or "content" not in msg:
                return JsonResponse(
                    {"error": "Chaque message doit contenir 'role' et 'content'."},
                    status=400,
                )

        # Conversion du format {role, content} vers le format Gemini {role, parts}
        # Gemini utilise "model" à la place de "assistant"
        history = []
        for msg in messages[:-1]:  # tout sauf le dernier message
            gemini_role = "user" if msg["role"] == "user" else "model"
            history.append({
                "role": gemini_role,
                "parts": [msg["content"]],
            })

        # Mock response (no API call needed)
        last_message = messages[-1]["content"]
        response_text = _mock_response(last_message)

        return JsonResponse({"reply": response_text})

    except Exception as e:
        logger.error("Erreur chatbot BNA : %s", str(e), exc_info=True)
        return JsonResponse(
            {"reply": "Une erreur interne s'est produite. Veuillez réessayer."},
            status=500,
        )


@csrf_exempt
def chatbot_health(request):
    """
    Endpoint de vérification — GET /api/chatbot/health/
    Utile pour tester que la clé API est bien configurée.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return JsonResponse({"status": "error", "detail": "GEMINI_API_KEY non configurée."}, status=500)
    return JsonResponse({"status": "ok", "model": "gemini-1.5-flash"})