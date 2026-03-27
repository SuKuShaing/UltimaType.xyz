import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES } from '@ultimatype-monorepo/shared';
import { useAuth } from '../../hooks/use-auth';
import { apiClient } from '../../lib/api-client';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Space Grotesk', sans-serif",
    backgroundColor: '#0F1F29',
    color: '#F8F9FA',
    padding: '24px',
  },
  card: {
    backgroundColor: '#1A2630',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#25343F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
    color: '#FF9B51',
    overflow: 'hidden' as const,
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  displayName: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '4px',
  },
  email: {
    color: '#8B949E',
    fontSize: '0.875rem',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#8B949E',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  select: {
    width: '100%',
    backgroundColor: '#0F1F29',
    color: '#F8F9FA',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '0.9375rem',
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer',
    appearance: 'none' as const,
    outline: 'none',
  },
  buttonPrimary: {
    width: '100%',
    backgroundColor: '#FF9B51',
    color: '#0F1F29',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer',
    marginTop: '8px',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  buttonBack: {
    background: 'none',
    border: 'none',
    color: '#8B949E',
    fontSize: '0.875rem',
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer',
    marginBottom: '24px',
    padding: '0',
  },
  feedback: {
    marginTop: '12px',
    fontSize: '0.875rem',
    textAlign: 'center' as const,
  },
  feedbackSuccess: {
    color: '#4ADE80',
  },
  feedbackError: {
    color: '#FB7185',
  },
  noCountry: {
    color: '#8B949E',
    fontStyle: 'italic' as const,
  },
};

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
      <div style={styles.container}>
        <span style={{ opacity: 0.5, fontSize: '2rem' }}>_</span>
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
    <div style={styles.container}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <button
          style={styles.buttonBack}
          onClick={() => navigate('/')}
          aria-label="Volver al inicio"
        >
          ← Volver
        </button>

        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.avatar}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`Avatar de ${user.displayName}`}
                  style={styles.avatarImg}
                />
              ) : (
                displayInitials
              )}
            </div>
            <div>
              <div style={styles.displayName}>{user.displayName}</div>
              <div style={styles.email}>{user.email}</div>
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="country-select" style={styles.label}>
              País
            </label>
            {!selectedCountry && !user.countryCode && (
              <div style={{ ...styles.email, ...styles.noCountry, marginBottom: '8px' }}>
                Sin país asignado
              </div>
            )}
            {!selectedCountry && currentCountryName && (
              <div style={{ marginBottom: '8px', fontSize: '0.9375rem' }}>
                {currentCountryName}
              </div>
            )}
            <select
              id="country-select"
              style={styles.select}
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
            style={{
              ...styles.buttonPrimary,
              ...((!hasChanged || mutation.isPending) ? styles.buttonDisabled : {}),
            }}
            onClick={handleSave}
            disabled={!hasChanged || mutation.isPending}
            aria-label="Guardar cambios de perfil"
          >
            {mutation.isPending ? '_' : 'Guardar cambios'}
          </button>

          {successMessage && (
            <div style={{ ...styles.feedback, ...styles.feedbackSuccess }}>
              {successMessage}
            </div>
          )}

          {mutation.isError && (
            <div style={{ ...styles.feedback, ...styles.feedbackError }}>
              Error al guardar. Intenta nuevamente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
