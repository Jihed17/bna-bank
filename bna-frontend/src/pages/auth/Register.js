import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Register = () => {
  const { t, direction } = useLanguage();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    watch, 
    trigger 
  } = useForm();

  const password = watch('password');

  const governorates = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Medenine', 'Tozeur', 'Kebili', 'Gafsa', 'Tataouine'
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    const userData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      cin: data.cin,
      password: data.password,
      dateOfBirth: data.dateOfBirth,
      address: {
        street: data.address.street,
        city: data.address.city,
        zipCode: data.address.zipCode,
        governorate: data.address.governorate
      }
    };
    
    const result = await registerUser(userData);
    
    if (result.success) {
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  const nextStep = async () => {
    const fields = step === 1 
      ? ['firstName', 'lastName', 'email', 'phone', 'cin']
      : ['password', 'dateOfBirth', 'address.street', 'address.city', 'address.zipCode', 'address.governorate'];
    
    const isValid = await trigger(fields);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bna-primary to-bna-accent flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" dir={direction}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-bna-primary">B</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white">
            Créer votre compte BNA Digital
          </h2>
          <p className="mt-2 text-white opacity-90">
            Rejoignez-nous et profitez de nos services bancaires en ligne
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-white bg-opacity-20 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          ></div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Informations personnelles */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Informations personnelles
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('firstName', {
                          required: 'Le prénom est requis',
                          minLength: {
                            value: 2,
                            message: 'Le prénom doit contenir au moins 2 caractères'
                          }
                        })}
                        type="text"
                        className={`input-field pl-10 ${errors.firstName ? 'border-red-500' : ''}`}
                        placeholder="Jean"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('lastName', {
                          required: 'Le nom est requis',
                          minLength: {
                            value: 2,
                            message: 'Le nom doit contenir au moins 2 caractères'
                          }
                        })}
                        type="text"
                        className={`input-field pl-10 ${errors.lastName ? 'border-red-500' : ''}`}
                        placeholder="Dupont"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('email', {
                          required: 'L\'email est requis',
                          pattern: {
                            value: /^\S+@\S+$/i,
                            message: 'Email invalide'
                          }
                        })}
                        type="email"
                        className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        placeholder="jean.dupont@email.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('phone', {
                          required: 'Le téléphone est requis',
                          pattern: {
                            value: /^(\+216)?[0-9]{8}$/,
                            message: 'Numéro tunisien invalide (8 chiffres)'
                          }
                        })}
                        type="tel"
                        className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                        placeholder="XX XXX XXX"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* CIN */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CIN *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('cin', {
                          required: 'Le CIN est requis',
                          pattern: {
                            value: /^[0-9]{8}$/,
                            message: 'Le CIN doit contenir 8 chiffres'
                          }
                        })}
                        type="text"
                        className={`input-field pl-10 ${errors.cin ? 'border-red-500' : ''}`}
                        placeholder="12345678"
                        maxLength={8}
                      />
                    </div>
                    {errors.cin && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.cin.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary flex items-center gap-2"
                  >
                    Suivant
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Détails du compte */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Détails du compte
                </h3>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('password', {
                        required: 'Le mot de passe est requis',
                        minLength: {
                          value: 6,
                          message: 'Le mot de passe doit contenir au moins 6 caractères'
                        }
                      })}
                      type={showPassword ? 'text' : 'password'}
                      className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('confirmPassword', {
                        required: 'La confirmation du mot de passe est requise',
                        validate: value => value === password || 'Les mots de passe ne correspondent pas'
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de naissance *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('dateOfBirth', {
                        required: 'La date de naissance est requise'
                      })}
                      type="date"
                      className={`input-field pl-10 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Adresse</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rue *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('address.street', {
                            required: 'L\'adresse est requise'
                          })}
                          type="text"
                          className={`input-field pl-10 ${errors.address?.street ? 'border-red-500' : ''}`}
                          placeholder="123 Rue de la République"
                        />
                      </div>
                      {errors.address?.street && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.address.street.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ville *
                      </label>
                      <input
                        {...register('address.city', {
                          required: 'La ville est requise'
                        })}
                        type="text"
                        className={`input-field ${errors.address?.city ? 'border-red-500' : ''}`}
                        placeholder="Tunis"
                      />
                      {errors.address?.city && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.address.city.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code postal *
                      </label>
                      <input
                        {...register('address.zipCode', {
                          required: 'Le code postal est requis',
                          pattern: {
                            value: /^[0-9]{4}$/,
                            message: 'Le code postal doit contenir 4 chiffres'
                          }
                        })}
                        type="text"
                        className={`input-field ${errors.address?.zipCode ? 'border-red-500' : ''}`}
                        placeholder="1000"
                        maxLength={4}
                      />
                      {errors.address?.zipCode && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.address.zipCode.message}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gouvernorat *
                      </label>
                      <select
                        {...register('address.governorate', {
                          required: 'Le gouvernorat est requis'
                        })}
                        className={`input-field ${errors.address?.governorate ? 'border-red-500' : ''}`}
                      >
                        <option value="">Sélectionner un gouvernorat</option>
                        {governorates.map((gov) => (
                          <option key={gov} value={gov}>
                            {gov}
                          </option>
                        ))}
                      </select>
                      {errors.address?.governorate && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.address.governorate.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                  >
                    Précédent
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full"></div>
                        Création du compte...
                      </>
                    ) : (
                      'Créer mon compte'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </motion.div>

        {/* Login link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <p className="text-white">
            Déjà un compte?{' '}
            <Link
              to="/login"
              className="font-medium text-white underline hover:no-underline"
            >
              Se connecter
            </Link>
          </p>
        </motion.div>

        {/* Terms notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-white text-sm opacity-75"
        >
          <p>
            En créant un compte, vous acceptez nos{' '}
            <Link to="/terms" className="underline">
              conditions d'utilisation
            </Link>{' '}
            et notre{' '}
            <Link to="/privacy" className="underline">
              politique de confidentialité
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;
