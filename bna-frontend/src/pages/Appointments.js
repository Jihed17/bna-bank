import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  MoreVertical,
  Star,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Appointments = () => {
  const { t, direction } = useLanguage();
  const { api, user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Récupérer les rendez-vous
  const { data: appointmentsData, isLoading, refetch } = useQuery(
    ['appointments', filter],
    async () => {
      const response = await api.get('/appointments', {
        params: filter !== 'all' ? { status: filter } : {}
      });
      return response.data;
    }
  );

  // Mutation pour annuler un rendez-vous
  const cancelMutation = useMutation(
    async (appointmentId) => {
      return await api.delete(`/appointments/${appointmentId}`, {
        data: { reason: 'Annulé par le client' }
      });
    },
    {
      onSuccess: () => {
        toast.success('Rendez-vous annulé avec succès');
        refetch();
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Erreur lors de l\'annulation';
        toast.error(message);
      }
    }
  );

  // Mutation pour check-in
  const checkInMutation = useMutation(
    async (appointmentId) => {
      return await api.put(`/appointments/${appointmentId}/checkin`, {
        method: 'manuel'
      });
    },
    {
      onSuccess: () => {
        toast.success('Check-in effectué avec succès');
        refetch();
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Erreur lors du check-in';
        toast.error(message);
      }
    }
  );

  // Filtrer les rendez-vous selon le statut
  const filteredAppointments = appointmentsData?.appointments?.filter(apt => {
    const matchesFilter = filter === 'all' || apt.status === filter;
    const matchesSearch = searchTerm === '' || 
      apt.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.agency.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  }) || [];

  // Obtenir la couleur du statut
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmé': return 'bg-blue-100 text-blue-800';
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      case 'en_cours': return 'bg-purple-100 text-purple-800';
      case 'terminé': return 'bg-green-100 text-green-800';
      case 'annulé': return 'bg-red-100 text-red-800';
      case 'reporté': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmé': return <CheckCircle className="w-4 h-4" />;
      case 'en_attente': return <AlertCircle className="w-4 h-4" />;
      case 'en_cours': return <Clock className="w-4 h-4" />;
      case 'terminé': return <CheckCircle className="w-4 h-4" />;
      case 'annulé': return <XCircle className="w-4 h-4" />;
      case 'reporté': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Vérifier si le rendez-vous peut faire un check-in
  const canCheckIn = (appointment) => {
    const now = new Date();
    const appointmentTime = new Date(appointment.dateTime);
    const timeDiff = (appointmentTime - now) / (1000 * 60); // Différence en minutes
    
    return appointment.status === 'confirmé' && timeDiff <= 15 && timeDiff >= -60;
  };

  // Gérer l'annulation
  const handleCancel = (appointmentId) => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
      cancelMutation.mutate(appointmentId);
    }
  };

  // Gérer le check-in
  const handleCheckIn = (appointmentId) => {
    checkInMutation.mutate(appointmentId);
  };

  // Ajouter un feedback
  const handleFeedback = (appointmentId) => {
    // Rediriger vers la page de feedback
    window.location.href = `/appointments/${appointmentId}/feedback`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Mes rendez-vous</h1>
            <button
              onClick={() => window.location.href = '/appointments/new'}
              className="btn-primary flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Prendre rendez-vous
            </button>
          </div>

          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un rendez-vous..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {['all', 'en_attente', 'confirmé', 'en_cours', 'terminé', 'annulé'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === status
                      ? 'bg-bna-primary text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status === 'all' ? 'Tous' : 
                   status === 'en_attente' ? 'En attente' :
                   status === 'confirmé' ? 'Confirmé' :
                   status === 'en_cours' ? 'En cours' :
                   status === 'terminé' ? 'Terminé' : 'Annulé'}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Liste des rendez-vous */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des rendez-vous...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Aucun rendez-vous trouvé' : 'Aucun rendez-vous'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Essayez une autre recherche' : 'Prenez votre premier rendez-vous dès maintenant'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => window.location.href = '/appointments/new'}
                className="btn-primary"
              >
                Prendre rendez-vous
              </button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {filteredAppointments.map((appointment, index) => (
              <motion.div
                key={appointment._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* En-tête du rendez-vous */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {appointment.service.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(appointment.dateTime)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {appointment.duration} min
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          {appointment.status === 'en_attente' ? 'En attente' :
                           appointment.status === 'confirmé' ? 'Confirmé' :
                           appointment.status === 'en_cours' ? 'En cours' :
                           appointment.status === 'terminé' ? 'Terminé' :
                           appointment.status === 'annulé' ? 'Annulé' : 'Reporté'}
                        </span>
                      </div>
                    </div>

                    {/* Détails du rendez-vous */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{appointment.agency.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{appointment.agency.address.city}, {appointment.agency.address.governorate}</span>
                        </div>
                      </div>
                      
                      {appointment.agent && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {appointment.agent.firstName} {appointment.agent.lastName}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">Agent assigné</div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {appointment.notes?.client && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <FileText className="w-4 h-4" />
                          <span>Vos notes</span>
                        </div>
                        <p className="text-sm text-gray-700">{appointment.notes.client}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {appointment.status === 'confirmé' && canCheckIn(appointment) && (
                        <button
                          onClick={() => handleCheckIn(appointment._id)}
                          disabled={checkInMutation.isLoading}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          {checkInMutation.isLoading ? 'Check-in...' : 'Check-in'}
                        </button>
                      )}
                      
                      {appointment.status === 'terminé' && !appointment.feedback && (
                        <button
                          onClick={() => handleFeedback(appointment._id)}
                          className="btn-outline text-sm px-4 py-2 flex items-center gap-2"
                        >
                          <Star className="w-4 h-4" />
                          Donner son avis
                        </button>
                      )}
                      
                      {['en_attente', 'confirmé'].includes(appointment.status) && (
                        <button
                          onClick={() => handleCancel(appointment._id)}
                          disabled={cancelMutation.isLoading}
                          className="btn-outline text-sm px-4 py-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {cancelMutation.isLoading ? 'Annulation...' : 'Annuler'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedAppointment(appointment)}
                        className="btn-outline text-sm px-4 py-2"
                      >
                        Voir les détails
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Modal détails du rendez-vous */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Détails du rendez-vous</h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedAppointment.service.name}</h3>
                  <p className="text-gray-600">{selectedAppointment.service.category}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Date et heure</h4>
                    <p className="text-gray-600">{formatDate(selectedAppointment.dateTime)}</p>
                    <p className="text-gray-600">Durée: {selectedAppointment.duration} minutes</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Agence</h4>
                    <p className="text-gray-600">{selectedAppointment.agency.name}</p>
                    <p className="text-gray-600">{selectedAppointment.agency.address.city}</p>
                  </div>
                </div>

                {selectedAppointment.agent && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Agent</h4>
                    <p className="text-gray-600">
                      {selectedAppointment.agent.firstName} {selectedAppointment.agent.lastName}
                    </p>
                  </div>
                )}

                {selectedAppointment.notes?.client && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-gray-600">{selectedAppointment.notes.client}</p>
                  </div>
                )}

                {selectedAppointment.feedback && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Votre avis</h4>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(selectedAppointment.feedback.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600">{selectedAppointment.feedback.comment}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="btn-secondary flex-1"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
