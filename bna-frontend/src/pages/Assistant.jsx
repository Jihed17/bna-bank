import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Calendar,
  MapPin,
  FileText,
  Phone,
  Clock,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  MessageCircle,
} from "lucide-react";

import { useLanguage } from "../contexts/LanguageContext";
import { useIsAuthenticated } from "../store/hooks";

/* =========================
   ACTION REGISTRY (IMPORTANT)
========================= */
const ACTION_REGISTRY = {
  appointment: {
    icon: Calendar,
    route: "/appointments/new",
  },
  my_appointments: {
    icon: Clock,
    route: "/appointments",
  },
  agency: {
    icon: MapPin,
    route: "/agencies",
  },
  services: {
    icon: FileText,
    route: "/services",
  },
  support: {
    icon: Phone,
  },
  login: {
    route: "/login",
  },
  register: {
    route: "/register",
  },
  nearest_agency: {
    icon: MapPin,
  },
};

const Assistant = () => {
  const { direction } = useLanguage();
  const isAuthenticated = useIsAuthenticated();

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const messagesEndRef = useRef(null);

  /* =========================
     WELCOME MESSAGES
  ========================= */
  const welcomeMessages = {
    new: {
      text:
        "Bonjour ! Je suis votre assistant BNA. Comment puis-je vous aider ?",
      suggestions: [
        { text: "Prendre rendez-vous", action: "appointment" },
        { text: "Trouver une agence", action: "agency" },
        { text: "Services", action: "services" },
        { text: "Support", action: "support" },
      ],
    },
    returning: {
      text:
        "Bonjour ! Souhaitez-vous gérer vos rendez-vous ou consulter nos services ?",
      suggestions: [
        { text: "Nouveau rendez-vous", action: "appointment" },
        { text: "Mes rendez-vous", action: "my_appointments" },
        { text: "Agences proches", action: "agency" },
        { text: "Support", action: "support" },
      ],
    },
  };

  /* =========================
     INIT
  ========================= */
  useEffect(() => {
    const type = isAuthenticated ? "returning" : "new";
    const welcome = welcomeMessages[type];

    setMessages([
      {
        id: "welcome",
        type: "bot",
        text: welcome.text,
        timestamp: new Date(),
        actions: welcome.suggestions,
      },
    ]);
  }, [isAuthenticated]);

  /* =========================
     SCROLL
  ========================= */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* =========================
     API CALL
  ========================= */
  const generateBotResponse = async (userMessage) => {
    setIsTyping(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "/api"}/chatbot/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: userMessage }] }),
        }
      );

      const data = await res.json();

      return {
        id: Date.now().toString(),
        type: "bot",
        text: data.reply || "No response",
        timestamp: new Date(),
        actions: [],
      };
    } catch (err) {
      return {
        id: Date.now().toString(),
        type: "bot",
        text: "Erreur de connexion avec le serveur.",
        timestamp: new Date(),
        actions: [],
      };
    } finally {
      setIsTyping(false);
    }
  };

  /* =========================
     SEND MESSAGE
  ========================= */
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      text: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setShowSuggestions(false);

    const botResponse = await generateBotResponse(inputMessage);
    setMessages((prev) => [...prev, botResponse]);
  };

  /* =========================
     ACTION HANDLER
  ========================= */
  const handleAction = async (action) => {
    const meta = ACTION_REGISTRY[action.action];

    const userMsg = {
      id: Date.now().toString(),
      type: "user",
      text: action.text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setShowSuggestions(false);

    if (!meta) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "bot",
          text: "Action non reconnue.",
          timestamp: new Date(),
          actions: [],
        },
      ]);
      return;
    }

    if (meta.route) {
      setTimeout(() => {
        window.location.href = meta.route;
      }, 800);
      return;
    }

    // fallback simple bot response
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "bot",
        text: `Action "${action.action}" en cours de traitement...`,
        timestamp: new Date(),
        actions: [],
      },
    ]);
  };

  /* =========================
     FEEDBACK
  ========================= */
  const handleFeedback = (id, value) => {
    setFeedbackGiven((prev) => ({ ...prev, [id]: value }));
  };

  const formatTime = (d) =>
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  /* =========================
     UI
  ========================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-500" dir={direction}>
      <div className="container mx-auto max-w-4xl py-8 px-4">

        {/* HEADER */}
        <div className="text-center mb-6 text-white">
          <h1 className="text-3xl font-bold">Assistant BNA</h1>
          <p>Support intelligent</p>
        </div>

        {/* CHAT BOX */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-[600px] flex flex-col">

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[75%]">

                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      msg.type === "user"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* ACTIONS */}
                  {msg.actions?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.actions.map((a, i) => {
                        const meta = ACTION_REGISTRY[a.action];
                        const Icon = meta?.icon;

                        return (
                          <button
                            key={i}
                            onClick={() => handleAction(a)}
                            className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-100"
                          >
                            {Icon && <Icon size={16} />}
                            {a.text}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    {formatTime(msg.timestamp)}
                  </div>

                  {/* FEEDBACK */}
                  {msg.type === "bot" && feedbackGiven[msg.id] === undefined && (
                    <div className="flex gap-2 mt-2 text-gray-500 text-sm">
                      <span>Utile ?</span>
                      <button onClick={() => handleFeedback(msg.id, true)}>
                        👍
                      </button>
                      <button onClick={() => handleFeedback(msg.id, false)}>
                        👎
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-3 border-t flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Écrire un message..."
            />
            <button
              onClick={handleSendMessage}
              className="bg-green-600 text-white px-4 rounded-lg"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assistant;