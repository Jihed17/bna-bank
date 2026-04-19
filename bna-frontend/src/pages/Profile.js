import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Settings, 
  Bell,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Edit2,
  Save,
  X,
  Camera,
  Globe,
  Volume2,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Profile = () => {
  const { t, direction, language, changeLanguage } = useLanguage();
  const { user, api, updateProfile, changePassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();

  // Récupérer le profil complet
  const { data: profileData, isLoading, refetch } = useQuery(
    'profile',
    async () => {
      const response = await api.get('/users/profile');
      return response.data.user;
    }
  );

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation(
    async (data) => {
      return await updateProfile(data);
    },
    {
      onSuccess: () => {
        toast.success('Profil mis à jour avec succès');
        setIsEditing(false);
        refetch();
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Erreur lors de la mise à jour';
        toast.error(message);
      }
    }
  );

  // Mutation pour changer le mot de passe
  const changePasswordMutation = useMutation(
    async (data) => {
      return await changePassword(data.currentPassword, data.newPassword);
    },
    {
      onSuccess: () => {
        toast.success('Mot de passe modifié avec succès');
        setShowPasswordForm(false);
        reset();
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Erreur lors du changement de mot de passe';
        toast.error(message);
      }
    }
  );

  // Récupérer les notifications
  const { data: notificationsData } = useQuery(
    'notifications',
    async () => {
      const response = await api.get('/users/notifications?limit=10');
      return response.data;
    }
  );

  const profile = profileData || user;

  // Soumettre la mise à jour du profil
  const onProfileSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  // Soumettre le changement de mot de passe
  const onPasswordSubmit = (data) => {
    changePasswordMutation.mutate(data);
  };

  // Annuler l'édition
  const cancelEdit = () => {
    setIsEditing(false);
    reset(profile);
  };

  // Activer l'édition
  const startEdit = () => {
    setIsEditing(true);
    reset(profile);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-b-2 border-bna-primary rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal', label: 'Informations personnelles', icon: User },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Préférences', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600">Gérez vos informations personnelles et préférences</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            {/* Profile card */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-bna-primary rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                    </span>
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-bna-primary text-white rounded-full flex items-center justify-center hover:bg-bna-secondary transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900">
                  {profile?.firstName} {profile?.lastName}
                </h3>
                <p className="text-gray-600">{profile?.email}</p>
                
                <div className="mt-4 inline-flex items-center px-3 py-1 bg-bna-light text-bna-primary text-sm rounded-full">
                  {profile?.role}
                </div>
              </div>
            </div>

            {/* Navigation tabs */}
            <div className="bg-white rounded-xl shadow-sm p-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-bna-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Informations personnelles</h2>
                  {!isEditing ? (
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                      <button
                        onClick={handleSubmit(onProfileSubmit)}
                        disabled={updateProfileMutation.isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary transition-colors disabled:opacity-50"
                      >
                        {updateProfileMutation.isLoading ? (
                          <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Enregistrer
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                      <input
                        {...register('firstName')}
                        type="text"
                        disabled={!isEditing}
                        className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                        defaultValue={profile?.firstName}
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                      <input
                        {...register('lastName')}
                        type="text"
                        disabled={!isEditing}
                        className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                        defaultValue={profile?.lastName}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          disabled
                          className="input-field pl-10 bg-gray-50"
                          defaultValue={profile?.email}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          {...register('phone')}
                          type="tel"
                          disabled={!isEditing}
                          className={`input-field pl-10 ${!isEditing ? 'bg-gray-50' : ''}`}
                          defaultValue={profile?.phone}
                        />
                      </div>
                    </div>

                    {/* CIN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CIN</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          disabled
                          className="input-field pl-10 bg-gray-50"
                          defaultValue={profile?.cin}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Le CIN ne peut pas être modifié</p>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          disabled
                          className="input-field pl-10 bg-gray-50"
                          defaultValue={profile?.dateOfBirth?.split('T')[0]}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">La date de naissance ne peut pas être modifiée</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Adresse</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rue</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('address.street')}
                            type="text"
                            disabled={!isEditing}
                            className={`input-field pl-10 ${!isEditing ? 'bg-gray-50' : ''}`}
                            defaultValue={profile?.address?.street}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                        <input
                          {...register('address.city')}
                          type="text"
                          disabled={!isEditing}
                          className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                          defaultValue={profile?.address?.city}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Code postal</label>
                        <input
                          {...register('address.zipCode')}
                          type="text"
                          disabled={!isEditing}
                          className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                          defaultValue={profile?.address?.zipCode}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gouvernorat</label>
                        <input
                          {...register('address.governorate')}
                          type="text"
                          disabled={!isEditing}
                          className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                          defaultValue={profile?.address?.governorate}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Sécurité du compte</h2>
                  
                  {!showPasswordForm ? (
                    <div className="text-center py-8">
                      <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Mot de passe</h3>
                      <p className="text-gray-600 mb-4">Modifiez votre mot de passe régulièrement pour sécuriser votre compte</p>
                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="btn-primary"
                      >
                        Changer le mot de passe
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-6">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('currentPassword', {
                              required: 'Le mot de passe actuel est requis'
                            })}
                            type={showCurrentPassword ? 'text' : 'password'}
                            className="input-field pl-10 pr-10"
                            placeholder="Entrez votre mot de passe actuel"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Eye className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {errors.currentPassword && (
                          <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
                        )}
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('newPassword', {
                              required: 'Le nouveau mot de passe est requis',
                              minLength: {
                                value: 6,
                                message: 'Le mot de passe doit contenir au moins 6 caractères'
                              }
                            })}
                            type={showNewPassword ? 'text' : 'password'}
                            className="input-field pl-10 pr-10"
                            placeholder="Entrez votre nouveau mot de passe"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Eye className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {errors.newPassword && (
                          <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                        )}
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('confirmNewPassword', {
                              required: 'La confirmation est requise',
                              validate: value => value === watch('newPassword') || 'Les mots de passe ne correspondent pas'
                            })}
                            type="password"
                            className="input-field pl-10"
                            placeholder="Confirmez votre nouveau mot de passe"
                          />
                        </div>
                        {errors.confirmNewPassword && (
                          <p className="mt-1 text-sm text-red-600">{errors.confirmNewPassword.message}</p>
                        )}
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordForm(false);
                            reset();
                          }}
                          className="btn-secondary"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={changePasswordMutation.isLoading}
                          className="btn-primary disabled:opacity-50"
                        >
                          {changePasswordMutation.isLoading ? 'Modification...' : 'Changer le mot de passe'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Security Info */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de sécurité</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Authentification à deux facteurs</p>
                        <p className="text-sm text-gray-600">Ajoutez une couche de sécurité supplémentaire</p>
                      </div>
                      <button className="text-bna-primary hover:underline text-sm">Activer</button>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Connexions récentes</p>
                        <p className="text-sm text-gray-600">Consultez les appareils connectés</p>
                      </div>
                      <button className="text-bna-primary hover:underline text-sm">Voir</button>
                    </div>
                    
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-gray-900">Email vérifié</p>
                        <p className="text-sm text-gray-600">
                          {profile?.emailVerified ? 'Votre email est vérifié' : 'Vérifiez votre email'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        profile?.emailVerified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {profile?.emailVerified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Préférences de notification</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Canaux de notification</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">Email</p>
                            <p className="text-sm text-gray-600">Recevoir les notifications par email</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bna-primary"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">SMS</p>
                            <p className="text-sm text-gray-600">Recevoir les notifications par SMS</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bna-primary"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">Notifications push</p>
                            <p className="text-sm text-gray-600">Notifications dans le navigateur</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bna-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Types de notifications</h3>
                    <div className="space-y-4">
                      {[
                        { title: 'Rendez-vous', description: 'Confirmations, rappels et changements' },
                        { title: 'Sécurité', description: 'Alertes de sécurité et connexions' },
                        { title: 'Promotions', description: 'Offres spéciales et nouveaux services' },
                        { title: 'Systeme', description: 'Mises à jour et maintenance' }
                      ].map((type, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                          <div>
                            <p className="font-medium text-gray-900">{type.title}</p>
                            <p className="text-sm text-gray-600">{type.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bna-primary"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                {/* Language */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Préférences générales</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Langue</label>
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-gray-600" />
                        <select
                          value={language}
                          onChange={(e) => changeLanguage(e.target.value)}
                          className="input-field"
                        >
                          <option value="fr">Français</option>
                          <option value="ar">العربية</option>
                        </select>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Choisissez la langue d'affichage de l'interface</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fuseau horaire</label>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-600" />
                        <select className="input-field">
                          <option>Heure de Tunis (GMT+1)</option>
                        </select>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Définissez votre fuseau horaire pour les rendez-vous</p>
                    </div>
                  </div>
                </div>

                {/* Accessibility */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Accessibilité</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Mode contraste élevé</p>
                        <p className="text-sm text-gray-600">Améliore le contraste des couleurs</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bna-primary"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-gray-900">Texte agrandi</p>
                        <p className="text-sm text-gray-600">Augmente la taille du texte</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bna-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
