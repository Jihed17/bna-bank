import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Building,
  Clock,
  Shield,
  Users
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const Footer = () => {
  const { t, direction } = useLanguage();

  const footerLinks = {
    services: [
      { name: 'Comptes Bancaires', href: '/services?category=comptes_bancaires' },
      { name: 'Crédits et Financement', href: '/services?category=credits_et_financement' },
      { name: 'Cartes Bancaires', href: '/services?category=cartes_bancaires' },
      { name: 'Services Électroniques', href: '/services?category=services_electroniques' },
      { name: 'Change et Devises', href: '/services?category=change_et_devises' },
      { name: 'Assurances', href: '/services?category=assurances' }
    ],
    company: [
      { name: 'À propos', href: '/about' },
      { name: 'Carrières', href: '/careers' },
      { name: 'Actualités', href: '/news' },
      { name: 'Responsabilité Sociale', href: '/csr' },
      { name: 'Investisseurs', href: '/investors' },
      { name: 'Presse', href: '/press' }
    ],
    support: [
      { name: 'Centre d\'aide', href: '/help' },
      { name: 'Contact', href: '/contact' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Signaler un problème', href: '/report' },
      { name: 'Accessibilité', href: '/accessibility' },
      { name: 'Mentions légales', href: '/legal' }
    ],
    legal: [
      { name: 'Conditions d\'utilisation', href: '/terms' },
      { name: 'Politique de confidentialité', href: '/privacy' },
      { name: 'Cookies', href: '/cookies' },
      { name: 'Sécurité', href: '/security' },
      { name: 'Réglementation', href: '/regulation' },
      { name: 'Tarifs', href: '/fees' }
    ]
  };

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/bna.tn' },
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/bna_tn' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/bna' },
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/bna.tn' }
  ];

  const contactInfo = {
    phone: '+216 71 123 456',
    email: 'contact@bna.tn',
    address: 'Avenue Habib Bourguiba, Tunis, Tunisie',
    hours: 'Lundi - Vendredi: 8h00 - 16h30, Samedi: 8h00 - 12h00'
  };

  return (
    <footer className="bg-gray-900 text-white" dir={direction}>
      {/* Newsletter */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">Restez informé</h3>
            <p className="text-gray-400 mb-6">
              Abonnez-vous à notre newsletter pour recevoir les dernières actualités et offres spéciales
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-bna-primary"
              />
              <button className="btn-primary bg-bna-primary hover:bg-bna-secondary">
                S'abonner
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-bna-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-xl font-bold">BNA Digital</span>
            </div>
            
            <p className="text-gray-400 mb-6">
              La Banque Nationale Agricole, votre partenaire de confiance depuis 1956. 
              Nous mettons la technologie au service de votre banking.
            </p>

            {/* Contact info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-400">
                <Phone className="w-5 h-5 text-bna-primary" />
                <span>{contactInfo.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Mail className="w-5 h-5 text-bna-primary" />
                <span>{contactInfo.email}</span>
              </div>
              <div className="flex items-start gap-3 text-gray-400">
                <MapPin className="w-5 h-5 text-bna-primary mt-0.5 flex-shrink-0" />
                <span>{contactInfo.address}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Clock className="w-5 h-5 text-bna-primary" />
                <span>{contactInfo.hours}</span>
              </div>
            </div>

            {/* Social links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-bna-primary transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold mb-4 mt-6">Légal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.slice(0, 3).map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Features bar */}
      <div className="border-y border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-bna-primary rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h5 className="font-semibold">Sécurité</h5>
              <p className="text-gray-400 text-sm">
                Vos données sont protégées avec les meilleurs standards de sécurité
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-bna-primary rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h5 className="font-semibold">Disponibilité</h5>
              <p className="text-gray-400 text-sm">
                Accès à vos services 24/7 depuis n'importe où
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-bna-primary rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h5 className="font-semibold">Support</h5>
              <p className="text-gray-400 text-sm">
                Notre équipe est à votre disposition pour vous aider
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-bna-primary rounded-full flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <h5 className="font-semibold">Réseau</h5>
              <p className="text-gray-400 text-sm">
                Plus de 150 agences à votre service dans toute la Tunisie
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-400 text-sm">
              © 2024 Banque Nationale Agricole. Tous droits réservés.
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-400">Développé avec ❤️ en Tunisie</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Version</span>
                <span className="text-bna-primary font-medium">1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
