import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  Clock,
  DollarSign,
  Calendar,
  Star,
  Users,
  FileText,
  ChevronRight,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const ServiceDetail = () => {
  const { id } = useParams();
  const { direction } = useLanguage();
  const { api } = useAuth();

  const { data: serviceData, isLoading, error } = useQuery(
    ['service', id],
    async () => {
      const response = await api.get(`/services/${id}`);
      return response.data;
    },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du service...</p>
        </div>
      </div>
    );
  }

  if (error || !serviceData?.service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Service non trouvé</h3>
          <p className="text-gray-600 mb-4">Le service que vous recherchez n'existe pas.</p>
          <Link to="/services" className="btn-primary">
            Retour aux services
          </Link>
        </div>
      </div>
    );
  }

  const service = serviceData.service;

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/services"
            className="text-bna-primary hover:underline flex items-center gap-2 mb-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Retour aux services
          </Link>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-bna-light text-bna-primary text-sm rounded-full">
                    {service.category}
                  </span>
                  {service.isActive && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      Disponible
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{service.name}</h1>
                <p className="text-gray-600 mb-6">{service.description}</p>

                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-bna-primary" />
                    <div>
                      <p className="text-sm text-gray-500">Durée</p>
                      <p className="font-medium text-gray-900">{service.duration} min</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-bna-primary" />
                    <div>
                      <p className="text-sm text-gray-500">Frais</p>
                      <p className="font-medium text-gray-900">
                        {service.fees === 0 ? 'Gratuit' : `${service.fees} TND`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-bna-primary" />
                    <div>
                      <p className="text-sm text-gray-500">Rendez-vous</p>
                      <p className="font-medium text-gray-900">{service.statistics.appointments || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Rating */}
                {service.statistics.averageRating > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-5 h-5 ${
                          i < Math.floor(service.statistics.averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`} />
                      ))}
                    </div>
                    <span className="text-gray-700">
                      {service.statistics.averageRating.toFixed(1)} ({service.statistics.reviews || 0} avis)
                    </span>
                  </div>
                )}
              </div>

              <div className="lg:w-80">
                <div className="bg-gradient-to-br from-bna-primary to-bna-accent rounded-xl p-6 text-white">
                  <h3 className="text-xl font-semibold mb-4">Prendre rendez-vous</h3>
                  <p className="mb-6 text-white opacity-90">
                    Réservez votre créneau pour ce service en quelques clics
                  </p>
                  <Link
                    to={`/appointments/new?service=${service._id}`}
                    className="w-full bg-white text-bna-primary rounded-lg py-3 font-medium hover:bg-gray-100 transition-colors text-center block"
                  >
                    <Calendar className="w-5 h-5 inline mr-2" />
                    Réserver maintenant
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Requirements */}
            {service.requirements && service.requirements.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Prérequis</h2>
                <ul className="space-y-2">
                  {service.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-bna-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Documents */}
            {service.documents && service.documents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents requis</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {service.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-bna-primary" />
                      <span className="text-gray-700">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description détaillée */}
            {service.detailedDescription && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description détaillée</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700">{service.detailedDescription}</p>
                </div>
              </div>
            )}

            {/* FAQ */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions fréquentes</h2>
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Quelle est la durée du service ?</h3>
                  <p className="text-gray-600">Ce service dure environ {service.duration} minutes.</p>
                </div>
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Quels documents sont nécessaires ?</h3>
                  <p className="text-gray-600">
                    Vous aurez besoin de votre carte d'identité nationale et d'un justificatif de domicile.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Puis-je annuler mon rendez-vous ?</h3>
                  <p className="text-gray-600">
                    Oui, vous pouvez annuler votre rendez-vous jusqu'à 24 heures avant l'heure prévue.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Agencies offering this service */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Agences disponibles</h2>
              <div className="space-y-4">
                {service.availableAgencies?.slice(0, 3).map((agency) => (
                  <div key={agency._id} className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-1">{agency.name}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{agency.address.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{agency.contact.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/agencies"
                className="text-bna-primary hover:underline text-sm mt-4 block"
              >
                Voir toutes les agences →
              </Link>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Besoin d'aide ?</h2>
              <div className="space-y-3">
                <a
                  href="tel:+21671123456"
                  className="flex items-center gap-3 text-gray-600 hover:text-bna-primary transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  <span>+216 71 123 456</span>
                </a>
                <a
                  href="mailto:support@bna.tn"
                  className="flex items-center gap-3 text-gray-600 hover:text-bna-primary transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span>support@bna.tn</span>
                </a>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Disponible Lun-Ven: 8h-17h
              </p>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rendez-vous ce mois</span>
                  <span className="font-medium text-gray-900">{service.statistics.appointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Note moyenne</span>
                  <span className="font-medium text-gray-900">
                    {service.statistics.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Vues</span>
                  <span className="font-medium text-gray-900">{service.statistics.views || 0}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
