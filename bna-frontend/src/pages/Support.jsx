import React, { useState } from 'react'

const FAQ = [
  {
    q: 'Comment prendre un rendez-vous ?',
    a: 'Créez un compte, choisissez un service, sélectionnez votre agence et votre créneau. Un agent vous sera assigné dès que possible.',
  },
  {
    q: 'Puis-je annuler un rendez-vous ?',
    a: "Oui, tant que le rendez-vous n'est pas encore effectué. Rendez-vous dans la section « Mes rendez-vous » et cliquez sur « Annuler ».",
  },
  {
    q: "Combien de temps à l'avance dois-je prendre rendez-vous ?",
    a: "Au minimum 1 heure à l'avance. Nous recommandons 24 à 48 heures pour garantir la disponibilité d'un agent.",
  },
  {
    q: "Que se passe-t-il si aucun agent n'est disponible ?",
    a: "Votre demande reste en attente. Dès qu'un agent se libère, il acceptera votre rendez-vous et vous serez notifié.",
  },
  {
    q: 'Puis-je modifier un rendez-vous ?',
    a: 'Pour modifier un rendez-vous, annulez-le et créez-en un nouveau avec le créneau souhaité.',
  },
]

export default function Support() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Centre d'aide
      </h1>
      <p className="text-gray-500 mb-12">
        Trouvez les réponses à vos questions sur BNA Digital.
      </p>

      <div className="space-y-3">
        {FAQ.map(({ q, a }, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <button
              className="w-full text-left px-6 py-4 flex items-center justify-between font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              {q}
              <span
                className={`text-bna-primary transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
              >
                ▼
              </span>
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 text-gray-600 text-sm leading-relaxed">
                {a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 bg-bna-light rounded-2xl p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Vous n'avez pas trouvé votre réponse ?
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          Contactez votre agence BNA directement.
        </p>
        <a
          href="tel:+21671000000"
          className="inline-block px-6 py-3 bg-bna-primary text-white rounded-xl hover:bg-bna-secondary transition-colors"
        >
          Appeler la hotline
        </a>
      </div>
    </div>
  )
}
