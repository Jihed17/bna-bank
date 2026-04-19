import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, Mail, Phone } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bna-primary to-bna-accent flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center"
      >
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className="mb-8"
        >
          <h1 className="text-9xl font-bold text-white opacity-20">404</h1>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-red-500" />
          </div>

          {/* Title and Description */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Page non trouvée
          </h2>
          
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée. 
            Vérifiez l'URL ou retournez à la page d'accueil.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              to="/"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Page précédente
            </button>
          </div>

          {/* Help Section */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Besoin d'aide ?
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5 text-bna-primary" />
                <span>support@bna.tn</span>
              </div>
              
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-bna-primary" />
                <span>+216 71 123 456</span>
              </div>
            </div>
            
            <p className="text-gray-500 text-sm mt-4">
              Notre équipe est disponible du lundi au vendredi de 8h à 17h
            </p>
          </div>

          {/* Quick Links */}
          <div className="mt-8">
            <h4 className="font-medium text-gray-900 mb-3">Vous cherchiez peut-être :</h4>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                to="/services"
                className="px-4 py-2 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-sm"
              >
                Services
              </Link>
              <Link
                to="/agencies"
                className="px-4 py-2 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-sm"
              >
                Agences
              </Link>
              <Link
                to="/appointments"
                className="px-4 py-2 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-sm"
              >
                Rendez-vous
              </Link>
              <Link
                to="/assistant"
                className="px-4 py-2 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-sm"
              >
                Assistant
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-white text-sm opacity-75"
        >
          <p>Erreur 404 - Page introuvable</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
