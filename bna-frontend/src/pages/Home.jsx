import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import SlotBrowser from '../clients/guest/SlotBrowser'
import { useIsAuthenticated } from '../store/hooks'
import { useGetServicesQuery } from '../store/services/serviceApi'

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

export default function Home() {
  const isAuthenticated = useIsAuthenticated()
  const { data: services = [] } = useGetServicesQuery({})
  const featured = services.slice(0, 3)

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-bna-secondary to-bna-primary text-white">
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <motion.h1
            className="text-4xl md:text-6xl font-extrabold leading-tight mb-6"
            variants={FADE_UP}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            Gérez vos rendez-vous<br />
            <span className="text-green-200">BNA en ligne</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-green-100 max-w-2xl mx-auto mb-10"
            variants={FADE_UP}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            Prenez rendez-vous dans votre agence BNA en quelques clics.
            Choisissez le service, l'agence, et le créneau qui vous convient.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={FADE_UP}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            {isAuthenticated ? (
              <Link
                to="/appointments/new"
                className="px-8 py-4 bg-white text-bna-secondary font-semibold rounded-xl hover:bg-green-50 transition-colors shadow-lg"
              >
                Prendre un rendez-vous
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="px-8 py-4 bg-white text-bna-secondary font-semibold rounded-xl hover:bg-green-50 transition-colors shadow-lg"
                >
                  Créer un compte
                </Link>
                <Link
                  to="/services"
                  className="px-8 py-4 bg-bna-primary text-white font-semibold rounded-xl border border-bna-accent hover:bg-bna-accent transition-colors"
                >
                  Consulter les services
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Choisissez un service',
                desc: 'Parcourez le catalogue des services BNA et trouvez celui qui correspond à votre besoin.',
                icon: '🔍',
              },
              {
                step: '02',
                title: 'Sélectionnez une agence',
                desc: "Trouvez l'agence la plus proche ou la plus pratique qui propose ce service.",
                icon: '📍',
              },
              {
                step: '03',
                title: 'Confirmez votre créneau',
                desc: "Choisissez la date et l'heure qui vous conviennent. Un agent vous prendra en charge.",
                icon: '✅',
              },
            ].map(({ step, title, desc, icon }, i) => (
              <motion.div
                key={step}
                className="bg-white rounded-2xl p-8 shadow-sm text-center"
                variants={FADE_UP}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <div className="text-4xl mb-4">{icon}</div>
                <div className="text-xs font-bold text-bna-primary mb-2 tracking-widest">
                  ÉTAPE {step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Slot browser ───────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Consultez les disponibilités
          </h2>
          <SlotBrowser />
        </div>
      </section>

      {/* ── Featured services ──────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold text-gray-900">
                Services populaires
              </h2>
              <Link
                to="/services"
                className="text-sm text-bna-primary hover:underline"
              >
                Voir tous les services →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((service, i) => (
                <motion.div
                  key={service.id}
                  variants={FADE_UP}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                >
                  <Link
                    to={`/services/${service.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow h-full"
                  >
                    <div className="text-3xl mb-3">{service.icon || '🏦'}</div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {service.description || service.category_display}
                    </p>
                    <div className="mt-4 text-xs text-bna-primary font-medium">
                      {service.duration_minutes} min →
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="bg-bna-primary text-white py-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à gagner du temps ?
            </h2>
            <p className="text-green-100 mb-8">
              Créez votre compte BNA Digital gratuitement et prenez
              rendez-vous depuis chez vous, 24h/24.
            </p>
            <Link
              to="/register"
              className="inline-block px-8 py-4 bg-white text-bna-secondary font-semibold rounded-xl hover:bg-green-50 transition-colors shadow-lg"
            >
              S'inscrire maintenant
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
