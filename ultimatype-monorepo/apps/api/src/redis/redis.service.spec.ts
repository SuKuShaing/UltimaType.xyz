import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.module';
import { REDIS_CLIENT as REDIS_CLIENT_CONST } from './redis.constants';

describe('REDIS_CLIENT token', () => {
  it('no debe ser undefined al importar desde redis.module (circular import guard)', () => {
    // Si redis.module y redis.service se importan mutuamente, Node.js devuelve
    // undefined en la exportación porque el módulo aún no terminó de evaluarse.
    // Este test falla inmediatamente si se introduce ese ciclo.
    expect(REDIS_CLIENT).toBeDefined();
    expect(typeof REDIS_CLIENT).toBe('string');
    expect(REDIS_CLIENT.length).toBeGreaterThan(0);
  });

  it('el token re-exportado desde redis.module debe ser idéntico al de redis.constants', () => {
    expect(REDIS_CLIENT).toBe(REDIS_CLIENT_CONST);
  });
});

describe('RedisModule DI', () => {
  it('RedisService debe poder inyectarse sin errores de dependencia', async () => {
    const mockRedis = {
      get: vi.fn(), set: vi.fn(), hset: vi.fn(), hget: vi.fn(),
      hgetall: vi.fn(), hdel: vi.fn(), hlen: vi.fn(), del: vi.fn(),
      expire: vi.fn(), scan: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        { provide: REDIS_CLIENT, useValue: mockRedis },
        RedisService,
      ],
    }).compile();

    const service = module.get(RedisService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RedisService);
  });
});

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
    scan: ReturnType<typeof vi.fn>;
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
      scan: vi.fn(),
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

  describe('keys', () => {
    it('retorna claves que coinciden con el patron (una sola iteracion)', async () => {
      // cursor '0' al final indica que SCAN terminó
      mockRedis.scan.mockResolvedValueOnce(['0', ['leaderboard:level:1:country:ALL:period:all']]);

      const result = await service.keys('leaderboard:*');

      expect(result).toEqual(['leaderboard:level:1:country:ALL:period:all']);
      expect(mockRedis.scan).toHaveBeenCalledWith(0, 'MATCH', 'leaderboard:*', 'COUNT', 100);
    });

    it('acumula resultados de multiples iteraciones del cursor', async () => {
      // Primera iteracion: cursor != 0, hay mas keys por recorrer
      mockRedis.scan
        .mockResolvedValueOnce(['42', ['leaderboard:level:1:country:ALL:period:all:page:1:limit:100']])
        .mockResolvedValueOnce(['0',  ['leaderboard:level:2:country:ALL:period:all:page:1:limit:100']]);

      const result = await service.keys('leaderboard:*');

      expect(result).toEqual([
        'leaderboard:level:1:country:ALL:period:all:page:1:limit:100',
        'leaderboard:level:2:country:ALL:period:all:page:1:limit:100',
      ]);
      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.scan).toHaveBeenNthCalledWith(1, 0,  'MATCH', 'leaderboard:*', 'COUNT', 100);
      expect(mockRedis.scan).toHaveBeenNthCalledWith(2, 42, 'MATCH', 'leaderboard:*', 'COUNT', 100);
    });

    it('retorna array vacio si no hay coincidencias', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);

      const result = await service.keys('nonexistent:*');

      expect(result).toEqual([]);
    });
  });
});
