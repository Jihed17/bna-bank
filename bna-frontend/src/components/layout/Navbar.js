import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import { 
  Menu, 
  X, 
  Bell, 
  User, 
  Calendar, 
  MapPin, 
  FileText, 
  LogOut,
  ChevronDown,
  Home,
  Phone,
  MessageCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Navbar = () => {
  const { t, direction, language, changeLanguage } = useLanguage();
  const { user, isAuthenticated, logout, api } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Récupérer les notifications non lues
  const { data: notificationsData } = useQuery(
    'unreadNotifications',
    async () => {
      if (!isAuthenticated) return null;
      const response = await api.get('/users/notifications/unread-count');
      return response.data;
    },
    { 
      enabled: isAuthenticated,
      refetchInterval: 30000 // Rafraîchir toutes les 30 secondes
    }
  );

  // Récupérer les notifications récentes
  const { data: recentNotifications } = useQuery(
    'recentNotifications',
    async () => {
      if (!isAuthenticated) return null;
      const response = await api.get('/users/notifications?limit=5');
      return response.data;
    },
    { enabled: isAuthenticated }
  );

  const unreadCount = notificationsData?.unreadCount || 0;

  // Navigation items
  const mainNavItems = [
    { path: '/', label: 'Accueil', icon: Home },
    { path: '/services', label: 'Services', icon: FileText },
    { path: '/agencies', label: 'Agences', icon: MapPin },
    { path: '/assistant', label: 'Assistant', icon: MessageCircle },
  ];

  const userNavItems = [
    { path: '/appointments', label: 'Rendez-vous', icon: Calendar },
    { path: '/profile', label: 'Profil', icon: User },
    { path: '/dashboard', label: 'Tableau de bord', icon: Settings, role: ['agent', 'administrateur'] },
  ];

  // Filtrer les éléments de navigation selon le rôle
  const filteredUserNavItems = userNavItems.filter(item => 
    !item.role || item.role.includes(user?.role)
  );

  // Gérer la déconnexion
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Gérer le clic sur une notification
  const handleNotificationClick = async (notification) => {
    // Marquer comme lue
    try {
      await api.put(`/users/notifications/${notification._id}/read`);
    } catch (error) {
      console.error('Erreur marquer notification lue:', error);
    }

    // Rediriger vers l'action si spécifiée
    if (notification.data?.actionUrl) {
      navigate(notification.data.actionUrl);
    }
    
    setIsNotificationsOpen(false);
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      await api.put('/users/notifications/read-all');
    } catch (error) {
      console.error('Erreur marquer toutes notifications lues:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bna-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">BNA Digital</span>
          </Link>

          {/* Navigation desktop */}
          <div className="hidden lg:flex items-center gap-8">
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-bna-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            
            {isAuthenticated && filteredUserNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-bna-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-4">
            {/* Sélecteur de langue */}
            <div className="hidden md:block">
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bna-primary focus:border-transparent"
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown notifications */}
                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                              <button
                                onClick={markAllAsRead}
                                className="text-sm text-bna-primary hover:underline"
                              >
                                Tout marquer comme lu
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="max-h-96 overflow-y-auto">
                          {recentNotifications?.notifications?.length > 0 ? (
                            recentNotifications.notifications.map((notification) => (
                              <button
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
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
                              </button>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-600">Aucune notification</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-200">
                          <Link
                            to="/profile"
                            className="text-sm text-bna-primary hover:underline"
                            onClick={() => setIsNotificationsOpen(false)}
                          >
                            Voir toutes les notifications
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profil */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-bna-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Dropdown profil */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-200">
                          <p className="font-medium text-gray-900">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{user?.email}</p>
                          <span className="inline-block px-2 py-1 bg-bna-light text-bna-primary text-xs rounded-full mt-1">
                            {user?.role}
                          </span>
                        </div>
                        
                        <div className="py-2">
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <User className="w-4 h-4" />
                            <span>Mon profil</span>
                          </Link>
                          
                          <Link
                            to="/appointments"
                            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Mes rendez-vous</span>
                          </Link>
                          
                          {['agent', 'administrateur'].includes(user?.role) && (
                            <Link
                              to="/dashboard"
                              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsProfileOpen(false)}
                            >
                              <Settings className="w-4 h-4" />
                              <span>Tableau de bord</span>
                            </Link>
                          )}
                        </div>
                        
                        <div className="border-t border-gray-200 py-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Déconnexion</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Boutons auth */
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="btn-primary px-4 py-2"
                >
                  S'inscrire
                </Link>
              </div>
            )}

            {/* Menu mobile */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-200"
            >
              <div className="py-4 space-y-2">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-bna-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                {isAuthenticated && filteredUserNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-bna-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                {!isAuthenticated && (
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <Link
                      to="/login"
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-5 h-5" />
                      <span>Connexion</span>
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center gap-3 px-4 py-3 bg-bna-primary text-white rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-5 h-5" />
                      <span>S'inscrire</span>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
