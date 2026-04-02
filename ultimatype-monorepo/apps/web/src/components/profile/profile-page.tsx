import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { COUNTRIES } from '@ultimatype-monorepo/shared';
import { useAuth } from '../../hooks/use-auth';
import { apiClient } from '../../lib/api-client';
import { MatchHistorySection } from './match-history-section';

export function ProfilePage() {
  const { user, isFetchingProfile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [hasChanged, setHasChanged] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutation = useMutation({
    mutationFn: (countryCode: string) =>
      apiClient('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ countryCode }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setHasChanged(false);
      setSuccessMessage('¡País actualizado correctamente!');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isFetchingProfile && (!isAuthenticated || !user)) {
      navigate('/');
    }
  }, [isFetchingProfile, isAuthenticated, user, navigate]);

  if (isFetchingProfile || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base font-sans text-text-main">
        <span className="text-2xl opacity-50">_</span>
      </div>
    );
  }

  const currentCountryName =
    user.countryCode
      ? COUNTRIES.find((c) => c.code === user.countryCode)?.name ?? user.countryCode
      : null;

  const displayInitials = user.displayName
    ? user.displayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'
    : '?';

  function handleCountryChange(code: string) {
    setSelectedCountry(code);
    setHasChanged(code !== (user?.countryCode ?? ''));
    setSuccessMessage('');
  }

  function handleSave() {
    if (!selectedCountry || !hasChanged) return;
    mutation.mutate(selectedCountry);
  }

  const effectiveCountry = selectedCountry || user.countryCode || '';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base p-6 pt-16 font-sans text-text-main">
      <Helmet>
        <title>Perfil | UltimaType</title>
      </Helmet>
      <div className="w-full max-w-2xl">
        <button
          className="mb-6 bg-transparent p-0 text-sm text-text-muted hover:text-text-main"
          onClick={() => navigate('/')}
          aria-label="Volver al inicio"
        >
          ← Volver
        </button>

        <div className="rounded-2xl bg-surface-sunken p-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-2xl font-semibold text-primary">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`Avatar de ${user.displayName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                displayInitials
              )}
            </div>
            <div>
              <div className="text-xl font-semibold">{user.displayName}</div>
              <div className="text-sm text-text-muted">{user.email}</div>
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="country-select" className="mb-2 block text-xs uppercase tracking-wide text-text-muted">
              País
            </label>
            {!selectedCountry && !user.countryCode && (
              <div className="mb-2 text-sm italic text-text-muted">
                Sin país asignado
              </div>
            )}
            {!selectedCountry && currentCountryName && (
              <div className="mb-2 text-sm">
                {currentCountryName}
              </div>
            )}
            <select
              id="country-select"
              className="w-full appearance-none rounded-lg bg-surface-base px-4 py-3 text-sm text-text-main font-sans"
              value={effectiveCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              aria-label="Seleccionar país"
            >
              <option value="">Seleccionar país...</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="mt-2 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-surface-base font-sans disabled:cursor-not-allowed disabled:opacity-40"
            onClick={handleSave}
            disabled={!hasChanged || mutation.isPending}
            aria-label="Guardar cambios de perfil"
          >
            {mutation.isPending ? '_' : 'Guardar cambios'}
          </button>

          {successMessage && (
            <div className="mt-3 text-center text-sm text-success">
              {successMessage}
            </div>
          )}

          {mutation.isError && (
            <div className="mt-3 text-center text-sm text-error">
              Error al guardar. Intenta nuevamente.
            </div>
          )}
        </div>

        <div className="mt-6">
          <MatchHistorySection />
        </div>
      </div>
    </div>
  );
}
