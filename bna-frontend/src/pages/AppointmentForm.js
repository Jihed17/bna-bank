import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const AppointmentForm = () => {
  const { t, direction } = useLanguage();
  const { api } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // ID du rendez-vous si édition

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isEditing, setIsEditing] = useState(!!id);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  // Récupérer les agences
  const { data: agencies, isLoading: agenciesLoading } = useQuery(
    'agencies',
    async () => {
      const response = await api.get('/agencies');
      return response.data.agencies;
    }
  );

  // Récupérer les services
  const { data: services, isLoading: servicesLoading } = useQuery(
    'services',
    async () => {
      const response = await api.get('/services');
      return response.data.services;
    }
  );

  // Récupérer les services d'une agence spécifique
  const { data: agencyServices } = useQuery(
    ['agencyServices', selectedAgency],
    async () => {
      if (!selectedAgency) return [];
      const response = await api.get(`/services/agency/${selectedAgency}`);
      return response.data.services;
    },
    { enabled: !!selectedAgency }
  );

  // Récupérer les créneaux disponibles
  const fetchAvailableSlots = async (agencyId, date) => {
    if (!agencyId || !date) return;
    
    try {
      const response = await api.get(`/appointments/available-slots/${agencyId}/${date}`);
      setAvailableSlots(response.data.availableSlots);
    } catch (error) {
      console.error('Erreur créneaux disponibles:', error);
    }
  };

  // Mutation pour créer/mettre à jour un rendez-vous
  const appointmentMutation = useMutation(
    async (data) => {
      if (isEditing) {
        return await api.put(`/appointments/${id}`, data);
      }
      return await api.post('/appointments', data);
    },
    {
      onSuccess: () => {
        toast.success(isEditing ? 'Rendez-vous mis à jour!' : 'Rendez-vous créé!');
        navigate('/appointments');
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Erreur lors de la création du rendez-vous';
        toast.error(message);
      }
    }
  );

  // Effet pour récupérer les créneaux quand la date change
  useEffect(() => {
    if (selectedAgency && selectedDate) {
      fetchAvailableSlots(selectedAgency, selectedDate);
    }
  }, [selectedAgency, selectedDate]);

  // Gérer la sélection d'agence
  const handleAgencySelect = (agency) => {
    setSelectedAgency(agency._id);
    setSelectedService(null);
    setCurrentStep(2);
  };

  // Gérer la sélection de service
  const handleServiceSelect = (service) => {
    setSelectedService(service._id);
    setCurrentStep(3);
  };

  // Gérer la sélection de date
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    fetchAvailableSlots(selectedAgency, date);
  };

  // Gérer la sélection d'heure
  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setCurrentStep(4);
  };

  // Soumettre le formulaire
  const onSubmit = (data) => {
    const appointmentData = {
      agency: selectedAgency,
      service: selectedService,
      dateTime: new Date(`${selectedDate}T${selectedTime}`),
      duration: agencyServices.find(s => s._id === selectedService)?.duration || 30,
      notes: {
        client: data.notes || ''
      },
      priority: data.priority || 'normal'
    };

    appointmentMutation.mutate(appointmentData);
  };

  // Étapes du formulaire
  const steps = [
    { id: 1, title: 'Choisir l\'agence', icon: MapPin },
    { id: 2, title: 'Choisir le service', icon: FileText },
    { id: 3, title: 'Choisir la date', icon: Calendar },
    { id: 4, title: 'Confirmer', icon: CheckCircle }
  ];

  // Obtenir la date minimale (demain)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Formater l'heure
  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Modifier le rendez-vous' : 'Prendre rendez-vous'}
            </h1>
          </div>

          {/* Progress bar */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= step.id
                        ? 'bg-bna-primary text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep >= step.id ? 'text-bna-primary font-medium' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-4 ${
                    currentStep > step.id ? 'bg-bna-primary' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Étape 1: Choix de l'agence */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold mb-4">Choisissez une agence</h2>
            
            {agenciesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des agences...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {agencies?.map((agency) => (
                  <motion.div
                    key={agency._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAgencySelect(agency)}
                    className="card p-6 cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{agency.name}</h3>
                        <p className="text-gray-600">{agency.address.city}, {agency.address.governorate}</p>
                      </div>
                      <MapPin className="w-5 h-5 text-bna-primary" />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">
                          {agency.isOpenNow ? (
                            <span className="text-green-600">Ouvert maintenant</span>
                          ) : (
                            <span className="text-red-600">Fermé</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">{agency.contact.phone}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Étape 2: Choix du service */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold mb-4">Choisissez un service</h2>
            
            {servicesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des services...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {agencyServices?.map((service) => (
                  <motion.div
                    key={service._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleServiceSelect(service)}
                    className="card p-6 cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-gray-600">{service.category}</p>
                      </div>
                      <FileText className="w-5 h-5 text-bna-primary" />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">Durée: {service.duration} min</span>
                      </div>
                      {service.fees > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Frais: {service.fees} TND</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Étape 3: Choix de la date et heure */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold mb-4">Choisissez la date et l'heure</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Sélection de la date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date du rendez-vous
                </label>
                <input
                  type="date"
                  min={getMinDate()}
                  value={selectedDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Créneaux disponibles */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Créneaux disponibles
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleTimeSelect(slot.time)}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedTime === slot.time
                              ? 'border-bna-primary bg-bna-primary text-white'
                              : 'border-gray-200 hover:border-bna-primary hover:bg-bna-light'
                          }`}
                        >
                          {slot.formatted}
                        </motion.button>
                      ))
                    ) : (
                      <p className="col-span-3 text-gray-500 text-center py-4">
                        Aucun créneau disponible pour cette date
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedTime && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span>
                    Créneau sélectionné: {new Date(selectedDate).toLocaleDateString('fr-FR')} à {formatTime(selectedTime)}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Étape 4: Confirmation et notes */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold mb-4">Confirmez votre rendez-vous</h2>
            
            {/* Récapitulatif */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Récapitulatif</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{agencies?.find(a => a._id === selectedAgency)?.name}</p>
                    <p className="text-sm text-gray-600">
                      {agencies?.find(a => a._id === selectedAgency)?.address.city}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{agencyServices?.find(s => s._id === selectedService)?.name}</p>
                    <p className="text-sm text-gray-600">
                      Durée: {agencyServices?.find(s => s._id === selectedService)?.duration} min
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {new Date(selectedDate).toLocaleDateString('fr-FR')} à {formatTime(selectedTime)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire de notes */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="input-field"
                  placeholder="Ajoutez des informations supplémentaires pour votre rendez-vous..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select {...register('priority')} className="input-field">
                  <option value="bas">Bas</option>
                  <option value="normal">Normal</option>
                  <option value="élevé">Élevé</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-secondary flex-1"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={appointmentMutation.isLoading}
                  className="btn-primary flex-1"
                >
                  {appointmentMutation.isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full"></div>
                      {isEditing ? 'Mise à jour...' : 'Création...'}
                    </span>
                  ) : (
                    `Confirmer le rendez-vous`
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AppointmentForm;
