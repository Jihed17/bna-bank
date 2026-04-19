import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageCircle,
  Users,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Support = () => {
  const { t, direction } = useLanguage();
  const { user, api } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const categories = [
    { id: 'technical', name: 'Problème technique', icon: AlertCircle },
    { id: 'appointment', name: 'Rendez-vous', icon: Clock },
    { id: 'account', name: 'Compte', icon: Users },
    { id: 'service', name: 'Service bancaire', icon: FileText },
    { id: 'general', name: 'Question générale', icon: HelpCircle }
  ];

  const faqItems = [
    {
      question: 'Comment prendre un rendez-vous ?',
      answer: 'Vous pouvez prendre un rendez-vous en vous connectant à votre compte et en accédant à la section "Rendez-vous". Choisissez l\'agence, le service, et le créneau horaire qui vous convient.'
    },
    {
      question: 'Quels documents sont nécessaires pour ouvrir un compte ?',
      answer: 'Pour ouvrir un compte, vous aurez besoin de votre carte d\'identité nationale, d\'un justificatif de domicile et d\'un justificatif de revenus pour certains types de comptes.'
    },
    {
      question: 'Comment annuler un rendez-vous ?',
      answer: 'Vous pouvez annuler un rendez-vous depuis votre espace personnel dans la section "Mes rendez-vous". Sélectionnez le rendez-vous concerné et cliquez sur "Annuler".'
    },
    {
      question: 'Quels sont les horaires d\'ouverture des agences ?',
      answer: 'Les agences BNA sont ouvertes du lundi au vendredi de 8h00 à 16h30 et le samedi de 8h00 à 12h00. Certaines agences peuvent avoir des horaires étendus.'
    },
    {
      question: 'Comment contacter le support client ?',
      answer: 'Vous pouvez nous contacter par téléphone au +216 71 123 456, par email à support@bna.tn, ou via le formulaire de contact sur cette page.'
    }
  ];

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      // Simuler l'envoi du formulaire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSubmitted(true);
      reset();
    } catch (error) {
      console.error('Erreur envoi formulaire:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Support Client</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Notre équipe est à votre disposition pour vous aider avec tous vos besoins bancaires
          </p>
        </motion.div>

        {/* Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-bna-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Téléphone</h3>
            <p className="text-gray-600 mb-4">+216 71 123 456</p>
            <p className="text-sm text-gray-500">Lun - Ven: 8h - 17h</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-bna-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
            <p className="text-gray-600 mb-4">support@bna.tn</p>
            <p className="text-sm text-gray-500">Réponse sous 24h</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-bna-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Agences</h3>
            <p className="text-gray-600 mb-4">150+ agences</p>
            <p className="text-sm text-gray-500">Dans toute la Tunisie</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-8 border border-gray-200"
          >
            {!isSubmitted ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Envoyer un message</h2>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((category) => {
                        const IconComponent = category.icon;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category.id)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              selectedCategory === category.id
                                ? 'border-bna-primary bg-bna-light'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <IconComponent className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                            <span className="text-sm">{category.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      {...register('category', { required: 'Veuillez sélectionner une catégorie' })}
                      type="hidden"
                      value={selectedCategory}
                    />
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sujet *
                    </label>
                    <input
                      {...register('subject', {
                        required: 'Le sujet est requis',
                        minLength: {
                          value: 3,
                          message: 'Le sujet doit contenir au moins 3 caractères'
                        }
                      })}
                      type="text"
                      className="input-field"
                      placeholder="Décrivez brièvement votre demande"
                    />
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      {...register('message', {
                        required: 'Le message est requis',
                        minLength: {
                          value: 10,
                          message: 'Le message doit contenir au moins 10 caractères'
                        }
                      })}
                      rows={5}
                      className="input-field"
                      placeholder="Décrivez votre problème ou question en détail..."
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                    )}
                  </div>

                  {/* User Info (if logged in) */}
                  {user ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">
                        <strong>Envoyé par:</strong> {user.firstName} {user.lastName} ({user.email})
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nom *
                          </label>
                          <input
                            {...register('name', { required: 'Le nom est requis' })}
                            type="text"
                            className="input-field"
                            placeholder="Votre nom"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email *
                          </label>
                          <input
                            {...register('email', {
                              required: 'L\'email est requis',
                              pattern: {
                                value: /^\S+@\S+$/i,
                                message: 'Email invalide'
                              }
                            })}
                            type="email"
                            className="input-field"
                            placeholder="votre@email.com"
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer le message
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Message envoyé !</h3>
                <p className="text-gray-600 mb-6">
                  Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setSelectedCategory('');
                  }}
                  className="btn-primary"
                >
                  Envoyer un autre message
                </button>
              </div>
            )}
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-8 border border-gray-200"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Questions fréquentes</h2>
            
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{item.question}</span>
                    <MessageCircle className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-600">{item.answer}</p>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-bna-light rounded-lg">
              <h3 className="font-semibold text-bna-primary mb-2">Besoin d'aide supplémentaire ?</h3>
              <p className="text-gray-700 text-sm mb-4">
                Si vous ne trouvez pas réponse à votre question, n'hésitez pas à contacter notre support.
              </p>
              <div className="flex gap-3">
                <a
                  href="tel:+21671123456"
                  className="flex items-center gap-2 text-bna-primary hover:underline text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Appeler
                </a>
                <a
                  href="mailto:support@bna.tn"
                  className="flex items-center gap-2 text-bna-primary hover:underline text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Live Chat Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="fixed bottom-6 right-6"
        >
          <button className="w-14 h-14 bg-bna-primary text-white rounded-full shadow-lg hover:bg-bna-secondary transition-colors flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Support;
