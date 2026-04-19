import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  Users,
  Building,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const AdminDashboard = () => {
  const { direction } = useLanguage();
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  // Get statistics
  const { data: stats } = useQuery('adminStats', async () => {
    const response = await api.get('/admin/statistics');
    return response.data;
  });

  // Get all services
  const { data: services, isLoading: servicesLoading } = useQuery('adminServices', async () => {
    const response = await api.get('/services');
    return response.data.services;
  });

  // Get all agencies
  const { data: agencies, isLoading: agenciesLoading } = useQuery('adminAgencies', async () => {
    const response = await api.get('/agencies');
    return response.data.agencies;
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation(
    async (serviceId) => {
      await api.delete(`/services/${serviceId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminServices');
        toast.success('Service supprimé avec succès');
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      }
    }
  );

  // Delete agency mutation
  const deleteAgencyMutation = useMutation(
    async (agencyId) => {
      await api.delete(`/agencies/${agencyId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminAgencies');
        toast.success('Agence supprimée avec succès');
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      }
    }
  );

  const handleDeleteService = (serviceId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce service?')) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  const handleDeleteAgency = (agencyId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette agence?')) {
      deleteAgencyMutation.mutate(agencyId);
    }
  };

  if (!stats) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de Bord Administrateur</h1>
          <p className="text-gray-600">Gérez les services, agences et utilisateurs</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-bna-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Services</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalServices || 0}</p>
              </div>
              <CreditCard className="w-8 h-8 text-bna-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Agences</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalAgencies || 0}</p>
              </div>
              <Building className="w-8 h-8 text-bna-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rendez-vous</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalAppointments || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-bna-primary" />
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'services'
                  ? 'border-bna-primary text-bna-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('agencies')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'agencies'
                  ? 'border-bna-primary text-bna-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Agences
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'services' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Gestion des Services</h2>
              <button className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un Service
              </button>
            </div>

            {servicesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nom</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Catégorie</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Durée</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Frais</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services?.map((service, index) => (
                      <tr key={service._id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-3 px-4 text-sm text-gray-900">{service.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{service.category}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{service.duration} min</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{service.fees === 0 ? 'Gratuit' : `${service.fees} TND`}</td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button className="text-bna-primary hover:text-bna-secondary">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteService(service._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'agencies' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Gestion des Agences</h2>
              <button className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Ajouter une Agence
              </button>
            </div>

            {agenciesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nom</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Ville</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Téléphone</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agencies?.map((agency, index) => (
                      <tr key={agency._id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-3 px-4 text-sm text-gray-900">{agency.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{agency.address.city}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{agency.contact.phone}</td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button className="text-bna-primary hover:text-bna-secondary">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAgency(agency._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
