import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { CreateRoomResponse } from '@ultimatype-monorepo/shared';

export function CreateRoomButton() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const { code } = await apiClient<CreateRoomResponse>('/rooms', {
        method: 'POST',
      });
      navigate(`/room/${code}`);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      style={{
        padding: '8px 24px',
        fontSize: '14px',
        borderRadius: '8px',
        backgroundColor: '#4ADE80',
        color: '#0F1F29',
        fontWeight: 600,
        border: 'none',
        cursor: isCreating ? 'wait' : 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        opacity: isCreating ? 0.7 : 1,
      }}
    >
      {isCreating ? 'Creando...' : 'Crear Sala'}
    </button>
  );
}
