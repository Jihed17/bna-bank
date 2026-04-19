import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Star,
  MapPin,
  Phone,
  Mail,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileText,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const { t, direction } = useLanguage();
  const { user, api } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedView, setSelectedView] = useState('overview');

  // Récupérer les statistiques
  const { data: statsData } = useQuery(
    'dashboardStats',
    async () => {
      const response = await api.get('/users/statistics');
      return response.data.statistics;
    },
    { enabled: ['agent', 'administrateur'].includes(user?.role) }
  );

  // Récupérer les rendez-vous récents
  const { data: appointmentsData } = useQuery(
    'recentAppointments',
    async () => {
      const params = {};
      if (user?.role === 'agent') {
        params.date = new Date().toISOString().split('T')[0];
      }
      const response = await api.get(user?.role === 'agent' ? '/appointments/agent' : '/appointments', { params });
      return response.data;
    }
  );

  // Récupérer les notifications
  const { data: notificationsData } = useQuery(
    'dashboardNotifications',
    async () => {
      const response = await api.get('/users/notifications?limit=5');
      return response.data;
    }
  );

  const stats = statsData || {};
  const appointments = appointmentsData?.appointments || [];
  const notifications = notificationsData?.notifications || [];

  // Statistiques pour le dashboard
  const overviewStats = [
    {
      title: 'Rendez-vous aujourd\'hui',
      value: appointments.filter(apt => {
        const today = new Date().toDateString();
        return new Date(apt.dateTime).toDateString() === today;
      }).length,
      icon: Calendar,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Rendez-vous cette semaine',
      value: appointments.filter(apt => {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return new Date(apt.dateTime) >= now && new Date(apt.dateTime) <= weekFromNow;
      }).length,
      icon: Clock,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Clients satisfaits',
      value: '94%',
      icon: Star,
      color: 'bg-yellow-500',
      change: '+2%',
      changeType: 'positive'
    },
    {
      title: 'Taux de complétion',
      value: '87%',
      icon: CheckCircle,
      color: 'bg-purple-500',
      change: '-3%',
      changeType: 'negative'
    }
  ];

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmé': return 'bg-blue-100 text-blue-800';
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      case 'en_cours': return 'bg-purple-100 text-purple-800';
      case 'terminé': return 'bg-green-100 text-green-800';
      case 'annulé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tableau de bord
                {user?.role === 'agent' && ' - Agent'}
                {user?.role === 'administrateur' && ' - Administrateur'}
              </h1>
              <p className="text-gray-600 mt-1">
                Bienvenue, {user?.firstName} {user?.lastName}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bna-primary focus:border-transparent"
              >
                <option value="day">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {overviewStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className="w-4 h-4" />
                    <span>{stat.change}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-gray-600 text-sm">{stat.title}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Recent Appointments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user?.role === 'agent' ? 'Mes rendez-vous' : 'Rendez-vous récents'}
                  </h2>
                  <button className="text-bna-primary hover:underline text-sm">
                    Voir tout
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {appointments.length > 0 ? (
                  appointments.slice(0, 5).map((appointment) => (
                    <div key={appointment._id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {appointment.service?.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                              {appointment.status === 'en_attente' ? 'En attente' :
                               appointment.status === 'confirmé' ? 'Confirmé' :
                               appointment.status === 'en_cours' ? 'En cours' :
                               appointment.status === 'terminé' ? 'Terminé' : 'Annulé'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(appointment.dateTime)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{appointment.agency?.name}</span>
                            </div>
                            {(user?.role === 'agent' || user?.role === 'administrateur') && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>
                                  {appointment.client?.firstName} {appointment.client?.lastName}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {appointment.notes?.client && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">{appointment.notes.client}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {['en_attente', 'confirmé'].includes(appointment.status) && (
                            <>
                              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucun rendez-vous
                    </h3>
                    <p className="text-gray-600">
                      {user?.role === 'agent' ? 'Vous n\'avez pas de rendez-vous programmés' : 'Aucun rendez-vous à afficher'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Actions rapides</h2>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Nouveau rendez-vous</span>
                </button>
                <button className="p-4 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-center">
                  <Users className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Voir les clients</span>
                </button>
                <button className="p-4 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-center">
                  <MapPin className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Gérer les agences</span>
                </button>
                <button className="p-4 bg-bna-light text-bna-primary rounded-lg hover:bg-bna-primary hover:text-white transition-colors text-center">
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Rapports</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notification) => (
                    <div key={notification._id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.status === 'envoyé' ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                          <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                          <p className="text-gray-500 text-xs mt-2">
                            {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">Aucune notification</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <button className="text-bna-primary hover:underline text-sm w-full text-center">
                  Voir toutes les notifications
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de contact</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm">{user?.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm">
                    {user?.address?.city}, {user?.address?.governorate}
                  </span>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">État du système</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Serveur</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Opérationnel</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Base de données</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Opérationnel</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Opérationnel</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
