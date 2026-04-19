import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Clock,
  Navigation,
  Star,
  Building,
  Parking,
  Accessibility,
  Wifi,
  CreditCard,
  Users,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Agencies = () => {
  const { direction } = useLanguage();
  const { api } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null);

  // 🔁 Debounce recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 📍 Gouvernorats
  const { data: governoratesData } = useQuery('governorates', async () => {
    const res = await api.get('/agencies/governorates/list');
    return res.data.governorates;
  });

  // 🏙️ Villes
  const { data: citiesData } = useQuery(
    ['cities', selectedGovernorate],
    async () => {
      if (selectedGovernorate === 'all') return [];
      const res = await api.get(`/agencies/cities/${selectedGovernorate}`);
      return res.data.cities;
    },
    { enabled: selectedGovernorate !== 'all' }
  );

  // 🏦 Agences
  const { data: agenciesData, isLoading } = useQuery(
    ['agencies', selectedGovernorate, selectedCity, debouncedSearch],
    async () => {
      const params = {};
      if (selectedGovernorate !== 'all') params.governorate = selectedGovernorate;
      if (selectedCity !== 'all') params.city = selectedCity;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get('/agencies', { params });
      return res.data;
    }
  );

  // 📍 Agences proches
  const { data: nearbyAgenciesData } = useQuery(
    ['nearby', userLocation],
    async () => {
      if (!userLocation) return [];
      const res = await api.get(
        `/agencies/nearby/${userLocation.lat}/${userLocation.lng}`
      );
      return res.data.agencies;
    },
    { enabled: !!userLocation }
  );

  // 🎯 Choix agences
  const agencies = useMemo(() => {
    return userLocation
      ? nearbyAgenciesData || []
      : agenciesData?.agencies || [];
  }, [userLocation, nearbyAgenciesData, agenciesData]);

  // 📍 Géolocalisation
  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => console.error(err)
    );
  };

  // 🧰 Icons
  const facilityIcons = {
    guichet_automatique: CreditCard,
    parking: Parking,
    accessibilite_pmr: Accessibility,
    wifi: Wifi,
    zone_attente: Users,
    caveau_fort: Building,
    drive: Navigation
  };

  const isOpen = (agency) => agency?.isOpenNow;

  const formatOpeningHours = (agency) =>
    agency?.formattedOpeningHours?.slice(0, 2).join(', ') || 'Non disponible';

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4 max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Nos Agences</h1>
          <p className="text-gray-600">
            Trouvez l'agence la plus proche
          </p>
        </div>

        {/* SEARCH */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <div className="flex gap-3 flex-wrap">

            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border p-3 rounded-lg"
            />

            <button onClick={getUserLocation} className="btn-primary">
              <Navigation /> Ma position
            </button>

            <button onClick={() => setShowFilters(!showFilters)}>
              <Filter />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <select
                value={selectedGovernorate}
                onChange={(e) => {
                  setSelectedGovernorate(e.target.value);
                  setSelectedCity('all');
                }}
              >
                <option value="all">Tous</option>
                {governoratesData?.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="all">Toutes</option>
                {citiesData?.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* LIST */}
        {isLoading ? (
          <p className="text-center">Chargement...</p>
        ) : agencies.length === 0 ? (
          <p className="text-center">Aucune agence</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {agencies.map((agency) => (
              <div key={agency._id} className="bg-white p-6 rounded-xl shadow">

                {/* HEADER */}
                <div className="flex justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold">
                      {agency?.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {agency?.address?.city}, {agency?.address?.governorate}
                    </p>
                  </div>

                  <span className={`text-sm px-2 py-1 rounded ${
                    isOpen(agency) ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isOpen(agency) ? 'Ouvert' : 'Fermé'}
                  </span>
                </div>

                {/* ADDRESS */}
                <p className="text-gray-600 mb-2">
                  {agency?.address?.street}
                </p>

                {/* PHONE */}
                <div className="flex justify-between items-center mb-2">
                  <span>{agency?.contact?.phone}</span>
                  <a href={`tel:${agency?.contact?.phone}`} className="text-blue-600">
                    Appeler
                  </a>
                </div>

                {/* HOURS */}
                <p className="text-sm text-gray-500 mb-3">
                  {formatOpeningHours(agency)}
                </p>

                {/* FACILITIES */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {agency?.facilities?.slice(0, 4).map((f) => {
                    const Icon = facilityIcons[f] || Building;
                    return (
                      <div key={f} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                        <Icon size={12} /> {f}
                      </div>
                    );
                  })}
                </div>

                {/* RATING */}
                {agency?.statistics?.averageRating > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="text-yellow-400" size={16} />
                    {agency.statistics.averageRating.toFixed(1)}
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAgency(agency)}
                    className="btn-primary flex-1"
                  >
                    Détails
                  </button>

                  <button
                    onClick={() =>
                      (window.location.href = `/appointments/new?agency=${agency._id}`)
                    }
                    className="btn-outline flex-1"
                  >
                    RDV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL */}
        {selectedAgency && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl max-w-lg w-full">

              <div className="flex justify-between mb-4">
                <h2>{selectedAgency.name}</h2>
                <button onClick={() => setSelectedAgency(null)}>
                  <X />
                </button>
              </div>

              <p>{selectedAgency.address.street}</p>

              <p>{selectedAgency.contact.phone}</p>

              <button
                className="btn-primary mt-4 w-full"
                onClick={() =>
                  (window.location.href = `/appointments/new?agency=${selectedAgency._id}`)
                }
              >
                Prendre rendez-vous
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Agencies;