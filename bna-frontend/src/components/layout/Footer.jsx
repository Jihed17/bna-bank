import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <Link to="/" className="text-xl font-bold text-white">
              BNA Digital
            </Link>
            <p className="text-sm mt-3 leading-relaxed">
              Plateforme de prise de rendez-vous de la Banque Nationale Agricole.
            </p>
          </div>

          {/* Real navigation */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services"  className="hover:text-white">Services</Link></li>
              <li><Link to="/agencies"  className="hover:text-white">Agences</Link></li>
              <li><Link to="/assistant" className="hover:text-white">Assistant</Link></li>
              <li><Link to="/support"   className="hover:text-white">Centre d'aide</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
              Contact
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> +216 71 123 456
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> contact@bna.tn
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Tunis, Tunisie
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {year} Banque Nationale Agricole. Tous droits réservés.</p>
          <p>BNA Digital — Service de prise de rendez-vous</p>
        </div>
      </div>
    </footer>
  )
}
