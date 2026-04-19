import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  Star,
  Users,
  CreditCard,
  Parking,
  Wifi,
  Accessibility,
  Navigation,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const AgencyDetail = () => {
  const { id } = useParams();
  const { t, direction } = useLanguage();
  const { api } = useAuth();

  // 🔁 Fetch agence
  const { data: agencyData, isLoading, error } = useQuery(
    ['agency', id],
    async () => {
      const response = await api.get(`/agencies/${id}`);
      return response.data.agency;
    },
    { enabled: !!id }
  );

  // ⚡ Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'agence...</p>
        </div>
      </div>
    );
  }

  // ⚠️ Erreur ou agence introuvable
  if (error || !agencyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Agence non trouvée</h3>
          <p className="text-gray-600 mb-4">L'agence que vous recherchez n'existe pas.</p>
          <Link to="/agencies" className="btn-primary">
            Retour aux agences
          </Link>
        </div>
      </div>
    );
  }

  const agency = agencyData;

  // 🔧 Icons pour les facilities
  const facilityIcons = {
    guichet_automatique: CreditCard,
    parking: Parking,
    accessibilite_pmr: Accessibility,
    wifi: Wifi,
    zone_attente: Users,
    caveau_fort: Users,
    drive: Navigation,
    salle_conference: Users
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            to="/agencies"
            className="text-bna-primary hover:underline flex items-center gap-2 mb-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Retour aux agences
          </Link>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{agency.name}</h1>
                    <p className="text-gray-600">Agence BNA - {agency.address.city}</p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      agency.isOpenNow ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {agency.isOpenNow ? 'Ouvert' : 'Fermé'}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin className="w-5 h-5" />
                    <span>{agency.address.street}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-5 h-5" />
                    <span>{agency.contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail className="w-5 h-5" />
                    <span>{agency.contact.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Clock className="w-5 h-5" />
                    <span>Lun-Ven: 8h-16h30, Sam: 8h-12h</span>
                  </div>
                </div>

                {/* Rating */}
                {agency.statistics?.averageRating > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(agency.statistics.averageRating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-700">
                      {agency.statistics.averageRating.toFixed(1)} (
                      {agency.statistics.totalReviews || 0} avis)
                    </span>
                  </div>
                )}
              </div>

              {/* Map placeholder */}
              <div className="lg:w-80">
                <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Carte interactive</p>
                    <p className="text-sm text-gray-500">Bientôt disponible</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* MAIN CONTENT */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
            {/* Services */}
            {agency.services?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Services disponibles</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {agency.services.map((service) => (
                    <div
                      key={service._id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <h3 className="font-medium text-gray-900 mb-1">{service.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{service.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{service.duration} min</span>
                        <span className="text-sm font-medium text-bna-primary">
                          {service.fees === 0 ? 'Gratuit' : `${service.fees} TND`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opening Hours */}
            {agency.openingHours?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Heures d'ouverture</h2>
                <div className="space-y-3">
                  {agency.openingHours.map((hours, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <span className="font-medium text-gray-900">{hours.day}</span>
                      <span className="text-gray-600">{hours.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Facilities */}
            {agency.facilities?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Équipements</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {agency.facilities.map((facility) => {
                    const IconComponent = facilityIcons[facility] || Users;
                    return (
                      <div key={facility} className="flex items-center gap-2 text-gray-600">
                        <IconComponent className="w-5 h-5" />
                        <span className="text-sm capitalize">{facility.replace('_', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* SIDEBAR */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
              <div className="space-y-3">
                <Link
                  to={`/appointments/new?agency=${agency._id}`}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Prendre rendez-vous
                </Link>

                <a href={`tel:${agency.contact.phone}`} className="w-full btn-secondary flex items-center justify-center gap-2">
                  <Phone className="w-5 h-5" />
                  Appeler l'agence
                </a>

                <button className="w-full btn-outline flex items-center justify-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Obtenir l'itinéraire
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Adresse</h3>
                  <p className="text-gray-600">
                    {agency.address.street}<br />
                    {agency.address.zipCode} {agency.address.city}<br />
                    {agency.address.governorate}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Téléphone</h3>
                  <p className="text-gray-600">{agency.contact.phone}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Email</h3>
                  <p className="text-gray-600">{agency.contact.email}</p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rendez-vous ce mois</span>
                  <span className="font-medium text-gray-900">{agency.statistics.appointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Note moyenne</span>
                  <span className="font-medium text-gray-900">
                    {agency.statistics.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Services disponibles</span>
                  <span className="font-medium text-gray-900">{agency.services?.length || 0}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AgencyDetail;