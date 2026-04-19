import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  CreditCard, 
  Shield, 
  TrendingUp, 
  Circle,
  DollarSign,
  Smartphone,
  ArrowUpDown,
  Building,
  MoreHorizontal,
  Star,
  Users,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Services = () => {
  const { t, direction } = useLanguage();
  const { api } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');

  // Récupérer les catégories
  const { data: categoriesData } = useQuery(
    'serviceCategories',
    async () => {
      const response = await api.get('/services/categories/list');
      return response.data.categories;
    }
  );

  // Récupérer les services
  const { data: servicesData, isLoading } = useQuery(
    ['services', selectedCategory, searchTerm, sortBy],
    async () => {
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      params.sortBy = sortBy;
      
      const response = await api.get('/services', { params });
      return response.data;
    }
  );

  // Icônes pour les catégories
  const categoryIcons = {
    comptes_bancaires: Circle,
    credits_et_financement: DollarSign,
    cartes_bancaires: CreditCard,
    services_electroniques: Smartphone,
    change_et_devises: ArrowUpDown,
    assurances: Shield,
    investissement: TrendingUp,
    services_aux_entreprises: Building,
    autres: MoreHorizontal
  };

  // Couleurs pour les catégories
  const categoryColors = {
    comptes_bancaires: 'bg-blue-500',
    credits_et_financement: 'bg-green-500',
    cartes_bancaires: 'bg-purple-500',
    services_electroniques: 'bg-orange-500',
    change_et_devises: 'bg-yellow-500',
    assurances: 'bg-red-500',
    investissement: 'bg-indigo-500',
    services_aux_entreprises: 'bg-gray-500',
    autres: 'bg-gray-400'
  };

  // Filtrer les services
  const filteredServices = servicesData?.services || [];

  // Formater la durée
  const formatDuration = (duration) => {
    if (duration < 60) {
      return `${duration} min`;
    } else {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
  };

  // Formater les frais
  const formatFees = (fees) => {
    if (fees === 0) return 'Gratuit';
    return `${fees} TND`;
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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Nos Services Bancaires</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Découvrez notre gamme complète de services conçus pour répondre à tous vos besoins bancaires
            </p>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Recherche */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bna-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filtre par catégorie */}
              <div className="lg:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bna-primary focus:border-transparent"
                >
                  <option value="all">Toutes les catégories</option>
                  {categoriesData?.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tri */}
              <div className="lg:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bna-primary focus:border-transparent"
                >
                  <option value="name">Nom (A-Z)</option>
                  <option value="duration">Durée</option>
                  <option value="fees">Prix</option>
                  <option value="statistics.appointments">Popularité</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Catégories */}
        {selectedCategory === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Explorer par catégorie</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categoriesData?.map((category) => {
                const IconComponent = categoryIcons[category.name] || MoreHorizontal;
                return (
                  <motion.button
                    key={category.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(category.name)}
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-200 text-left"
                  >
                    <div className={`${categoryColors[category.name]} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{category.count} services</span>
                      <span className="text-bna-primary text-sm font-medium">Voir →</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {selectedCategory === 'all' ? 'Tous les services' : `${selectedCategory}`}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-bna-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-1">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-bna-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                <div className="w-4 h-4 space-y-1">
                  <div className="bg-current rounded-sm h-1"></div>
                  <div className="bg-current rounded-sm h-1"></div>
                  <div className="bg-current rounded-sm h-1"></div>
                </div>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des services...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun service trouvé</h3>
              <p className="text-gray-600">Essayez de modifier votre recherche ou vos filtres</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredServices.map((service, index) => (
                <motion.div
                  key={service._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200 ${
                    viewMode === 'list' ? 'p-6' : 'p-6'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    // Vue grille
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${categoryColors[service.category]} w-12 h-12 rounded-lg flex items-center justify-center`}>
                          {(categoryIcons[service.category] || MoreHorizontal)(
                            { className: "w-6 h-6 text-white" }
                          )}
                        </div>
                        <span className="px-3 py-1 bg-bna-light text-bna-primary text-xs font-medium rounded-full">
                          {service.category}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{formatFees(service.fees)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${
                              i < Math.floor(service.statistics.rating || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`} />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">
                            ({service.statistics.reviews || 0})
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/services/${service._id}`)}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          Détails
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Vue liste
                    <div className="flex items-center gap-6">
                      <div className={`${categoryColors[service.category]} w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        {(categoryIcons[service.category] || MoreHorizontal)(
                          { className: "w-8 h-8 text-white" }
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                            <p className="text-gray-600">{service.description}</p>
                          </div>
                          <span className="px-3 py-1 bg-bna-light text-bna-primary text-sm font-medium rounded-full">
                            {service.category}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(service.duration)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatFees(service.fees)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${
                                i < Math.floor(service.statistics.rating || 0)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`} />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">
                              ({service.statistics.reviews || 0})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{service.statistics.appointments || 0} rendez-vous</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => navigate(`/services/${service._id}`)}
                        className="btn-primary px-6 py-3"
                      >
                        Détails
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Section services populaires */}
        {selectedCategory === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <div className="bg-gradient-to-r from-bna-primary to-bna-accent rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-6">Services les plus populaires</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Services populaires à afficher */}
                <div className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                      <Circle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Ouverture de compte</h3>
                      <p className="text-sm opacity-90">Comptes courants et épargne</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-75">2 450 rendez-vous</span>
                    <button onClick={() => navigate('/services')} className="text-white hover:underline text-sm">Voir →</button>
                  </div>
                </div>
                
                <div className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Cartes bancaires</h3>
                      <p className="text-sm opacity-90">Visa et MasterCard</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-75">1 890 rendez-vous</span>
                    <button onClick={() => navigate('/services')} className="text-white hover:underline text-sm">Voir →</button>
                  </div>
                </div>
                
                <div className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Crédit personnel</h3>
                      <p className="text-sm opacity-90">Prêts personnels rapide</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-75">1 234 rendez-vous</span>
                    <button onClick={() => navigate('/services')} className="text-white hover:underline text-sm">Voir →</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Services;
