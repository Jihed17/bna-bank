import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import { 
  Send, 
  Bot, 
  User, 
  Calendar, 
  MapPin, 
  FileText, 
  Phone, 
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  MessageCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Assistant = () => {
  const { t, direction } = useLanguage();
  const { api, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const messagesEndRef = useRef(null);

  // Messages de bienvenue selon le contexte
  const welcomeMessages = {
    new: {
      text: "Bonjour ! Je suis votre assistant BNA. Je peux vous aider à prendre rendez-vous, trouver une agence, découvrir nos services ou répondre à vos questions. Comment puis-je vous aider ?",
      suggestions: [
        { text: "Prendre rendez-vous", icon: Calendar, action: "appointment" },
        { text: "Trouver une agence", icon: MapPin, action: "agency" },
        { text: "Découvrir les services", icon: FileText, action: "services" },
        { text: "Contacter le support", icon: Phone, action: "support" }
      ]
    },
    returning: {
      text: `Bonjour ! Je vois que vous avez déjà des rendez-vous avec nous. Souhaitez-vous prendre un nouveau rendez-vous, consulter vos services ou avez-vous d'autres questions ?`,
      suggestions: [
        { text: "Prendre un nouveau rendez-vous", icon: Calendar, action: "appointment" },
        { text: "Voir mes rendez-vous", icon: Clock, action: "my_appointments" },
        { text: "Statut de mon dernier rendez-vous", icon: CheckCircle, action: "last_appointment" },
        { text: "Questions sur mes services", icon: FileText, action: "services_help" }
      ]
    }
  };

  // Initialiser la conversation
  useEffect(() => {
    const welcomeType = isAuthenticated ? 'returning' : 'new';
    const welcome = welcomeMessages[welcomeType];
    
    setMessages([{
      id: 'welcome',
      type: 'bot',
      text: welcome.text,
      timestamp: new Date(),
      suggestions: welcome.suggestions
    }]);
  }, [isAuthenticated]);

  // Scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simuler une réponse IA (remplacer par appel API réel)
  const generateBotResponse = async (userMessage) => {
    setIsTyping(true);
    
    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const message = userMessage.toLowerCase();
    let response = {
      id: Date.now().toString(),
      type: 'bot',
      text: '',
      timestamp: new Date(),
      actions: []
    };

    // Logique de réponse basée sur des mots-clés
    if (message.includes('rendez-vous') || message.includes('appointment') || message.includes('rdv')) {
      if (message.includes('nouveau') || message.includes('prendre') || message.includes('créer')) {
        response.text = "Je peux vous aider à prendre un rendez-vous. Voulez-vous que je vous guide pas à pas ou préférez-vous accéder directement au formulaire ?";
        response.actions = [
          { text: "Guide pas à pas", action: "guided_appointment" },
          { text: "Formulaire direct", action: "direct_appointment" }
        ];
      } else if (message.includes('annuler') || message.includes('cancel')) {
        response.text = "Pour annuler un rendez-vous, veuillez vous connecter à votre compte et accéder à la section 'Mes rendez-vous'. Vous pourrez y gérer tous vos rendez-vous.";
        response.actions = [
          { text: "Accéder à mes rendez-vous", action: "my_appointments" }
        ];
      } else {
        response.text = "Pour gérer vos rendez-vous, vous pouvez prendre un nouveau rendez-vous, consulter vos rendez-vous existants ou annuler un rendez-vous. Que souhaitez-vous faire ?";
        response.actions = [
          { text: "Prendre rendez-vous", action: "appointment" },
          { text: "Mes rendez-vous", action: "my_appointments" }
        ];
      }
    } else if (message.includes('agence') || message.includes('agency') || message.includes('agences')) {
      if (message.includes('proche') || message.includes('près') || message.includes('localisation')) {
        response.text = "Je peux vous aider à trouver l'agence la plus proche. Pour cela, j'ai besoin de votre localisation ou de votre ville. Pouvez-vous me dire où vous vous trouvez ?";
        response.actions = [
          { text: "Utiliser ma position", action: "get_location" },
          { text: "Rechercher par ville", action: "search_city" }
        ];
      } else if (message.includes('horaire') || message.includes('ouvert') || message.includes('fermé')) {
        response.text = "Les agences BNA sont généralement ouvertes du lundi au vendredi de 8h à 16h30 et le samedi matin. Certaines agences ont des horaires étendus. Quelle agence vous intéresse ?";
        response.actions = [
          { text: "Voir toutes les agences", action: "all_agencies" }
        ];
      } else {
        response.text = "Je peux vous aider à trouver une agence BNA. Voulez-vous trouver l'agence la plus proche, rechercher par ville, ou voir toutes nos agences ?";
        response.actions = [
          { text: "Agence la plus proche", action: "nearest_agency" },
          { text: "Rechercher par ville", action: "search_city" },
          { text: "Toutes les agences", action: "all_agencies" }
        ];
      }
    } else if (message.includes('service') || message.includes('services')) {
      if (message.includes('compte') || message.includes('comptes')) {
        response.text = "BNA propose plusieurs types de comptes : compte courant, compte épargne, compte jeune, et compte professionnel. Chaque compte a des avantages spécifiques. Quel type de compte vous intéresse ?";
        response.actions = [
          { text: "Compte courant", action: "service_compte_courant" },
          { text: "Compte épargne", action: "service_compte_epargne" },
          { text: "Tous les comptes", action: "all_accounts" }
        ];
      } else if (message.includes('crédit') || message.includes('prêt') || message.includes('emprunt')) {
        response.text = "BNA offre différentes solutions de crédit : crédit personnel, crédit auto, crédit logement, et crédit professionnel. Quel type de crédit vous intéresse ?";
        response.actions = [
          { text: "Crédit personnel", action: "service_credit_personnel" },
          { text: "Crédit logement", action: "service_credit_logement" },
          { text: "Tous les crédits", action: "all_credits" }
        ];
      } else if (message.includes('carte') || message.includes('cb')) {
        response.text = "BNA propose plusieurs cartes bancaires : Visa Classic, Visa Gold, MasterCard, et cartes prépayées. Quelle carte vous intéresse ?";
        response.actions = [
          { text: "Cartes Visa", action: "service_cartes_visa" },
          { text: "Cartes MasterCard", action: "service_cartes_mastercard" },
          { text: "Toutes les cartes", action: "all_cards" }
        ];
      } else {
        response.text = "BNA propose une large gamme de services bancaires : comptes, crédits, cartes, services électroniques, change, assurances et investissements. Quel service vous intéresse ?";
        response.actions = [
          { text: "Comptes bancaires", action: "category_comptes" },
          { text: "Crédits et financement", action: "category_credits" },
          { text: "Cartes bancaires", action: "category_cartes" },
          { text: "Tous les services", action: "all_services" }
        ];
      }
    } else if (message.includes('contact') || message.includes('support') || message.includes('aide')) {
      response.text = "Vous pouvez contacter BNA de plusieurs manières :\n\n📞 Par téléphone : 71 123 456\n📧 Par email : support@bna.tn\n🏢 En agence : trouvez l'agence la plus proche\n\nComment préférez-vous nous contacter ?";
      response.actions = [
        { text: "Appeler le support", action: "call_support" },
        { text: "Envoyer un email", action: "email_support" },
        { text: "Trouver une agence", action: "nearest_agency" }
      ];
    } else if (message.includes('horaire') || message.includes('ouverture') || message.includes('fermeture')) {
      response.text = "Les horaires d'ouverture des agences BNA sont :\n\n🏢 Du lundi au vendredi : 8h00 - 16h30\n🏢 Samedi : 8h00 - 12h00\n🏢 Dimanche : Fermé\n\nCertains services en ligne sont disponibles 24/7. Quel service vous intéresse ?";
      response.actions = [
        { text: "Services en ligne", action: "online_services" },
        { text: "Services en agence", action: "agency_services" }
      ];
    } else if (message.includes('document') || message.includes('pièce') || message.includes('justificatif')) {
      response.text = "Les documents requis dépendent du service que vous souhaitez. En général, vous aurez besoin de :\n\n📄 Carte d'identité nationale\n📄 Justificatif de domicile\n📄 Justificatif de revenus (pour certains crédits)\n\nQuel service vous intéresse pour je vous donne la liste exacte des documents ?";
      response.actions = [
          { text: "Ouverture de compte", action: "documents_account" },
          { text: "Crédit personnel", action: "documents_credit" },
          { text: "Carte bancaire", action: "documents_card" }
      ];
    } else if (message.includes('bonjour') || message.includes('salut') || message.includes('hello')) {
      response.text = "Bonjour ! Je suis là pour vous aider. Que souhaitez-vous savoir sur les services BNA ?";
      response.actions = [
        { text: "Prendre rendez-vous", action: "appointment" },
        { text: "Découvrir les services", action: "services" },
        { text: "Trouver une agence", action: "agency" }
      ];
    } else if (message.includes('merci')) {
      response.text = "Je vous en prie ! N'hésitez pas si vous avez d'autres questions. Y a-t-il autre chose que je puisse faire pour vous ?";
      response.actions = [
        { text: "Autre question", action: "other_question" },
        { text: "Prendre rendez-vous", action: "appointment" }
      ];
    } else {
      // Réponse par défaut
      response.text = "Je comprends votre question. Pour mieux vous aider, pourriez-vous être plus précis ? Je peux vous aider avec :\n\n📅 Prise de rendez-vous\n🏢 Localisation d'agences\n📋 Information sur les services\n📞 Contact et support\n\nQuel sujet vous intéresse ?";
      response.actions = [
        { text: "Prendre rendez-vous", action: "appointment" },
        { text: "Trouver une agence", action: "agency" },
        { text: "Découvrir les services", action: "services" },
        { text: "Contacter le support", action: "support" }
      ];
    }

    setIsTyping(false);
    return response;
  };

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setShowSuggestions(false);

    // Générer la réponse du bot
    const botResponse = await generateBotResponse(inputMessage);
    setMessages(prev => [...prev, botResponse]);
  };

  // Gérer l'action sur une suggestion
  const handleAction = (action) => {
    const actionMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: `Je veux ${action.text}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, actionMessage]);
    setShowSuggestions(false);

    // Traiter l'action
    processAction(action.action);
  };

  // Traiter les actions
  const processAction = async (action) => {
    setIsTyping(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    let response = {
      id: Date.now().toString(),
      type: 'bot',
      text: '',
      timestamp: new Date(),
      actions: []
    };

    switch (action) {
      case 'appointment':
      case 'guided_appointment':
        response.text = "Parfait ! Pour prendre un rendez-vous, je vais vous guider. D'abord, quelle agence vous intéresse ?";
        response.actions = [
          { text: "Agence la plus proche", action: "nearest_agency" },
          { text: "Choisir une agence", action: "choose_agency" }
        ];
        break;
        
      case 'direct_appointment':
        response.text = "Je vous redirige vers le formulaire de prise de rendez-vous.";
        response.redirect = '/appointments/new';
        break;
        
      case 'my_appointments':
        if (isAuthenticated) {
          response.text = "Je vous redirige vers vos rendez-vous.";
          response.redirect = '/appointments';
        } else {
          response.text = "Pour accéder à vos rendez-vous, vous devez d'abord vous connecter.";
          response.actions = [
            { text: "Se connecter", action: "login" },
            { text: "S'inscrire", action: "register" }
          ];
        }
        break;
        
      case 'nearest_agency':
        response.text = "Je vais utiliser votre position pour trouver l'agence la plus proche. Veuillez autoriser l'accès à votre localisation.";
        response.actions = [
          { text: "Autoriser la localisation", action: "get_location" },
          { text: "Rechercher manuellement", action: "search_manual" }
        ];
        break;
        
      case 'all_agencies':
        response.text = "Je vous redirige vers la liste de toutes nos agences.";
        response.redirect = '/agencies';
        break;
        
      case 'all_services':
        response.text = "Je vous redirige vers notre catalogue complet de services.";
        response.redirect = '/services';
        break;
        
      case 'support':
        response.text = "Vous pouvez contacter le support BNA :\n\n📞 Téléphone : 71 123 456\n📧 Email : support@bna.tn\n\nComment préférez-vous nous contacter ?";
        response.actions = [
          { text: "Appeler maintenant", action: "call_support" },
          { text: "Envoyer un email", action: "email_support" }
        ];
        break;
        
      case 'login':
        response.redirect = '/login';
        break;
        
      case 'register':
        response.redirect = '/register';
        break;
        
      default:
        response.text = "Je vais vous aider avec ça. Un instant...";
        // Traiter d'autres actions spécifiques
        break;
    }

    setIsTyping(false);
    setMessages(prev => [...prev, response]);

    // Rediriger si nécessaire
    if (response.redirect) {
      setTimeout(() => {
        window.location.href = response.redirect;
      }, 2000);
    }
  };

  // Donner un feedback sur une réponse
  const handleFeedback = (messageId, isPositive) => {
    setFeedbackGiven(prev => ({ ...prev, [messageId]: isPositive }));
    
    // Envoyer le feedback au serveur (à implémenter)
    console.log(`Feedback ${isPositive ? 'positif' : 'négatif'} pour le message ${messageId}`);
  };

  // Formater l'heure
  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bna-primary to-bna-accent" dir={direction}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Bot className="w-8 h-8 text-bna-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Assistant BNA</h1>
              <p className="text-white opacity-90">Votre assistant bancaire intelligent</p>
            </div>
          </div>
        </motion.div>

        {/* Chat container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: '600px' }}
        >
          {/* Messages area */}
          <div className="h-[440px] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-[80%] ${
                  message.type === 'user' ? 'flex-row-reverse' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-bna-primary text-white' 
                      : 'bg-bna-light text-bna-primary'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className={`${message.type === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-bna-primary text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="whitespace-pre-line">{message.text}</p>
                    </div>
                    
                    {/* Actions */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleAction(action)}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-bna-light hover:border-bna-primary transition-all text-sm"
                          >
                            {action.icon && <action.icon className="w-4 h-4" />}
                            {action.text}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Feedback */}
                    {message.type === 'bot' && !feedbackGiven[message.id] && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Cette réponse vous a-t-elle aidé ?</span>
                        <button
                          onClick={() => handleFeedback(message.id, true)}
                          className="p-1 hover:bg-green-100 rounded transition-colors"
                        >
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, false)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                    
                    <span className="text-xs text-gray-500 mt-1">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-bna-light text-bna-primary flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 p-4">
            {/* Suggestions */}
            {showSuggestions && messages.length === 1 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Suggestions rapides :</p>
                <div className="flex flex-wrap gap-2">
                  {messages[0].suggestions?.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleAction(suggestion)}
                      className="flex items-center gap-2 px-3 py-2 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-all text-sm"
                    >
                      <suggestion.icon className="w-4 h-4" />
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tapez votre message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bna-primary focus:border-transparent"
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="p-3 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Info footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="flex items-center justify-center gap-6 text-white text-sm">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              <span>Disponible 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>Réponses instantanées</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>100% confidentiel</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Assistant;
