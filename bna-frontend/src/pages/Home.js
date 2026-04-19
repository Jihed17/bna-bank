import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Clock, 
  Shield, 
  Users, 
  TrendingUp,
  ArrowRight,
  Star,
  CheckCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { t, direction } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState({
    agencies: 150,
    clients: 500000,
    appointments: 10000,
    satisfaction: 98
  });

  // Animate numbers on mount
  useEffect(() => {
    const animateValue = (start, end, duration, callback) => {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        callback(Math.floor(progress * (end - start) + start));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    animateValue(0, 150, 2000, (value) => setStats(prev => ({ ...prev, agencies: value })));
    animateValue(0, 500000, 2000, (value) => setStats(prev => ({ ...prev, clients: value })));
    animateValue(0, 10000, 2000, (value) => setStats(prev => ({ ...prev, appointments: value })));
    animateValue(0, 98, 2000, (value) => setStats(prev => ({ ...prev, satisfaction: value })));
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const features = [
    {
      icon: Calendar,
      title: t('services.bookAppointment'),
      description: 'Prenez rendez-vous en ligne avec nos agents',
      color: 'bg-blue-500'
    },
    {
      icon: MapPin,
      title: t('agencies.title'),
      description: 'Trouvez l\'agence la plus proche de chez vous',
      color: 'bg-green-500'
    },
    {
      icon: Shield,
      title: 'Sécurité',
      description: 'Vos données sont protégées avec les meilleurs standards',
      color: 'bg-purple-500'
    },
    {
      icon: Clock,
      title: 'Rapidité',
      description: 'Gagnez du temps avec nos services en ligne',
      color: 'bg-orange-500'
    }
  ];

  const testimonials = [
    {
      name: 'Mohamed Ali',
      role: 'Client BNA',
      content: 'Excellent service! J\'ai pu prendre rendez-vous en quelques minutes seulement.',
      rating: 5
    },
    {
      name: 'Sarra Ben',
      role: 'Cliente BNA',
      content: 'Très pratique pour trouver les agences et connaître leurs horaires.',
      rating: 5
    },
    {
      name: 'Youssef Trabelsi',
      role: 'Client BNA',
      content: 'L\'assistant virtuel m\'a aidé à trouver exactement le service dont j\'avais besoin.',
      rating: 4
    }
  ];

  return (
    <div className="min-h-screen" dir={direction}>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-bna-primary to-bna-accent text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center"
          >
            <motion.h1
              variants={itemVariants}
              className="text-4xl lg:text-6xl font-bold mb-6"
            >
              Bienvenue sur BNA Digital
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-xl lg:text-2xl mb-8 opacity-90"
            >
              Votre banque au cœur de la transformation digitale
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {isAuthenticated ? (
                <>
                  <Link
                    to="/appointments/new"
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Prendre rendez-vous
                  </Link>
                  <Link
                    to="/dashboard"
                    className="btn-outline inline-flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-5 h-5" />
                    Mon tableau de bord
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    S'inscrire maintenant
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/services"
                    className="btn-outline inline-flex items-center justify-center gap-2"
                  >
                    Découvrir nos services
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              { value: stats.agencies, label: 'Agences', icon: MapPin },
              { value: stats.clients.toLocaleString(), label: 'Clients', icon: Users },
              { value: stats.appointments.toLocaleString(), label: 'Rendez-vous', icon: Calendar },
              { value: `${stats.satisfaction}%`, label: 'Satisfaction', icon: Star }
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center"
              >
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <stat.icon className="w-12 h-12 text-bna-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Pourquoi choisir BNA Digital?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Découvrez tous les avantages de notre plateforme digitale
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="card p-6 text-center hover:scale-105 transition-transform"
              >
                <div className={`${feature.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ce que nos clients disent
            </h2>
            <p className="text-xl text-gray-600">
              Des milliers de clients nous font déjà confiance
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-bna-light rounded-full flex items-center justify-center mr-3">
                    <span className="text-bna-primary font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-bna-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Prêt à commencer?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Rejoignez des milliers de clients qui utilisent déjà BNA Digital
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isAuthenticated ? "/appointments/new" : "/register"}
                className="bg-white text-bna-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
              >
                {isAuthenticated ? 'Prendre rendez-vous' : 'S\'inscrire gratuitement'}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/services"
                className="border-2 border-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-bna-primary transition-colors inline-flex items-center justify-center"
              >
                En savoir plus
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
