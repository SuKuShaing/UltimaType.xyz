import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    hset: ReturnType<typeof vi.fn>;
    hget: ReturnType<typeof vi.fn>;
    hgetall: ReturnType<typeof vi.fn>;
    hdel: ReturnType<typeof vi.fn>;
    hlen: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      hset: vi.fn(),
      hget: vi.fn(),
      hgetall: vi.fn(),
      hdel: vi.fn(),
      hlen: vi.fn(),
      del: vi.fn(),
      expire: vi.fn(),
    };
    service = new RedisService(mockRedis as any);
  });

  describe('get', () => {
    it('retorna el valor de una clave', async () => {
      mockRedis.get.mockResolvedValue('value');
      const result = await service.get('key');
      expect(result).toBe('value');
      expect(mockRedis.get).toHaveBeenCalledWith('key');
    });

    it('retorna null si la clave no existe', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.get('missing');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('guarda un valor sin TTL', async () => {
      await service.set('key', 'value');
      expect(mockRedis.set).toHaveBeenCalledWith('key', 'value');
    });

    it('guarda un valor con TTL', async () => {
      await service.set('key', 'value', 3600);
      expect(mockRedis.set).toHaveBeenCalledWith('key', 'value', 'EX', 3600);
    });
  });

  describe('hset', () => {
    it('guarda un campo en un hash', async () => {
      await service.hset('hash', 'field', 'value');
      expect(mockRedis.hset).toHaveBeenCalledWith('hash', 'field', 'value');
    });
  });

  describe('hget', () => {
    it('retorna el valor de un campo del hash', async () => {
      mockRedis.hget.mockResolvedValue('value');
      const result = await service.hget('hash', 'field');
      expect(result).toBe('value');
    });
  });

  describe('hgetall', () => {
    it('retorna todos los campos del hash', async () => {
      const data = { field1: 'v1', field2: 'v2' };
      mockRedis.hgetall.mockResolvedValue(data);
      const result = await service.hgetall('hash');
      expect(result).toEqual(data);
    });
  });

  describe('hdel', () => {
    it('elimina campos de un hash', async () => {
      mockRedis.hdel.mockResolvedValue(1);
      const result = await service.hdel('hash', 'field');
      expect(result).toBe(1);
    });
  });

  describe('hlen', () => {
    it('retorna el numero de campos en un hash', async () => {
      mockRedis.hlen.mockResolvedValue(5);
      const result = await service.hlen('hash');
      expect(result).toBe(5);
    });
  });

  describe('del', () => {
    it('elimina claves', async () => {
      mockRedis.del.mockResolvedValue(2);
      const result = await service.del('key1', 'key2');
      expect(result).toBe(2);
    });
  });

  describe('expire', () => {
    it('establece TTL en una clave', async () => {
      await service.expire('key', 3600);
      expect(mockRedis.expire).toHaveBeenCalledWith('key', 3600);
    });
  });
});
