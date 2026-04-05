import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { MatchResultsService } from './match-results.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Integration tests contra PostgreSQL real.
 * Requiere Docker con postgres corriendo (docker-compose up -d).
 * Valida AC6: creación, paginación, filtro por usuario, cascade delete,
 * matchCode duplicado, FK violation graceful.
 */
describe('MatchResultsService (Integration)', () => {
  let prisma: PrismaClient;
  let prismaService: PrismaService;
  let service: MatchResultsService;

  const TEST_USER_1 = {
    id: 'integration-test-user-1',
    provider: 'GOOGLE' as const,
    providerId: 'integration-test-provider-1',
    email: 'test1@integration.test',
    displayName: 'Test User 1',
    countryCode: 'AR',
    slug: 'tu-int1',
  };

  const TEST_USER_2 = {
    id: 'integration-test-user-2',
    provider: 'GITHUB' as const,
    providerId: 'integration-test-provider-2',
    email: 'test2@integration.test',
    displayName: 'Test User 2',
    countryCode: 'CL',
    slug: 'tu-int2',
  };

  beforeAll(async () => {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL not set — cannot run integration tests');
    }

    const adapter = new PrismaPg({ connectionString });
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    // Use PrismaService-like object for the service
    prismaService = {
      user: prisma.user,
      matchResult: prisma.matchResult,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onModuleInit: async () => { /* noop */ },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onModuleDestroy: async () => { /* noop */ },
    } as unknown as PrismaService;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const mockLeaderboardService = { invalidateForLevel: async () => { /* noop */ } } as any;
    service = new MatchResultsService(prismaService, mockLeaderboardService);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.matchResult.deleteMany({
      where: {
        userId: { in: [TEST_USER_1.id, TEST_USER_2.id] },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [TEST_USER_1.id, TEST_USER_2.id] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean match results between tests
    await prisma.matchResult.deleteMany({
      where: {
        userId: { in: [TEST_USER_1.id, TEST_USER_2.id] },
      },
    });
    // Ensure test users exist
    await prisma.user.upsert({
      where: { id: TEST_USER_1.id },
      create: TEST_USER_1,
      update: {},
    });
    await prisma.user.upsert({
      where: { id: TEST_USER_2.id },
      create: TEST_USER_2,
      update: {},
    });
  });

  it('crea registros de match result en la DB', async () => {
    await service.persistResults('INTG01', 3, [
      {
        playerId: TEST_USER_1.id,
        displayName: 'Test User 1',
        colorIndex: 0,
        countryCode: 'AR',
        rank: 1,
        wpm: 85.5,
        precision: 97,
        score: 829.35,
        missingChars: 0,
        finished: true,
        finishedAt: '2026-04-02T12:00:00.000Z',
      },
    ]);

    const results = await prisma.matchResult.findMany({
      where: { matchCode: 'INTG01' },
    });

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(TEST_USER_1.id);
    expect(results[0].wpm).toBe(85.5);
    expect(results[0].precision).toBe(97);
    expect(results[0].score).toBe(829.35);
    expect(results[0].rank).toBe(1);
    expect(results[0].finished).toBe(true);
    expect(results[0].level).toBe(3);
  });

  it('filtra guests — solo persiste usuarios reales', async () => {
    await service.persistResults('INTG02', 2, [
      {
        playerId: TEST_USER_1.id,
        displayName: 'Test User 1',
        colorIndex: 0,
        countryCode: 'AR',
        rank: 1,
        wpm: 90,
        precision: 95,
        score: 855,
        missingChars: 5,
        finished: true,
        finishedAt: '2026-04-02T12:00:00.000Z',
      },
      {
        playerId: 'guest-fake-id-12345',
        displayName: 'Guest',
        colorIndex: 1,
        countryCode: null,
        rank: 2,
        wpm: 50,
        precision: 80,
        score: 400,
        missingChars: 20,
        finished: true,
        finishedAt: '2026-04-02T12:01:00.000Z',
      },
    ]);

    const results = await prisma.matchResult.findMany({
      where: { matchCode: 'INTG02' },
    });

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(TEST_USER_1.id);
  });

  it('soporta múltiples resultados por matchCode (uno por jugador)', async () => {
    await service.persistResults('INTG03', 1, [
      {
        playerId: TEST_USER_1.id,
        displayName: 'Test User 1',
        colorIndex: 0,
        countryCode: 'AR',
        rank: 1,
        wpm: 100,
        precision: 99,
        score: 990,
        missingChars: 0,
        finished: true,
        finishedAt: '2026-04-02T12:00:00.000Z',
      },
      {
        playerId: TEST_USER_2.id,
        displayName: 'Test User 2',
        colorIndex: 1,
        countryCode: 'CL',
        rank: 2,
        wpm: 80,
        precision: 90,
        score: 720,
        missingChars: 10,
        finished: true,
        finishedAt: '2026-04-02T12:01:00.000Z',
      },
    ]);

    const results = await prisma.matchResult.findMany({
      where: { matchCode: 'INTG03' },
      orderBy: { rank: 'asc' },
    });

    expect(results).toHaveLength(2);
    expect(results[0].userId).toBe(TEST_USER_1.id);
    expect(results[1].userId).toBe(TEST_USER_2.id);
  });

  it('retorna resultados paginados filtrados por usuario', async () => {
    // Create 3 results for user 1 and 1 for user 2
    for (let i = 1; i <= 3; i++) {
      await service.persistResults(`PAG0${i}`, 1, [
        {
          playerId: TEST_USER_1.id,
          displayName: 'Test User 1',
          colorIndex: 0,
          countryCode: 'AR',
          rank: 1,
          wpm: 80 + i,
          precision: 90 + i,
          score: 700 + i * 10,
          missingChars: 0,
          finished: true,
          finishedAt: `2026-04-02T12:0${i}:00.000Z`,
        },
      ]);
    }
    await service.persistResults('PAG04', 1, [
      {
        playerId: TEST_USER_2.id,
        displayName: 'Test User 2',
        colorIndex: 1,
        countryCode: 'CL',
        rank: 1,
        wpm: 60,
        precision: 85,
        score: 510,
        missingChars: 5,
        finished: true,
        finishedAt: '2026-04-02T12:04:00.000Z',
      },
    ]);

    // Page 1, limit 2 for user 1
    const page1 = await service.findByUser(TEST_USER_1.id, 1, 2);
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(3);

    // Page 2
    const page2 = await service.findByUser(TEST_USER_1.id, 2, 2);
    expect(page2.data).toHaveLength(1);
    expect(page2.total).toBe(3);

    // User 2 only sees their own
    const user2Results = await service.findByUser(TEST_USER_2.id, 1, 20);
    expect(user2Results.data).toHaveLength(1);
    expect(user2Results.total).toBe(1);
  });

  it('cascade delete — borrar usuario borra sus match results', async () => {
    await service.persistResults('CASC01', 1, [
      {
        playerId: TEST_USER_2.id,
        displayName: 'Test User 2',
        colorIndex: 1,
        countryCode: 'CL',
        rank: 1,
        wpm: 70,
        precision: 88,
        score: 616,
        missingChars: 3,
        finished: true,
        finishedAt: '2026-04-02T12:00:00.000Z',
      },
    ]);

    // Verify result exists
    const before = await prisma.matchResult.count({
      where: { userId: TEST_USER_2.id },
    });
    expect(before).toBe(1);

    // Delete user — should cascade
    await prisma.user.delete({ where: { id: TEST_USER_2.id } });

    const after = await prisma.matchResult.count({
      where: { userId: TEST_USER_2.id },
    });
    expect(after).toBe(0);

    // Recreate user for subsequent tests (beforeEach will handle it)
  });

  it('idempotencia — doble persistResults no duplica (unique constraint)', async () => {
    const playerResult = {
      playerId: TEST_USER_1.id,
      displayName: 'Test User 1',
      colorIndex: 0,
      countryCode: 'AR' as string | null,
      rank: 1,
      wpm: 85,
      precision: 97,
      score: 824.5,
      missingChars: 0,
      finished: true,
      finishedAt: '2026-04-02T12:00:00.000Z',
    };

    // First call
    await service.persistResults('IDEMP1', 3, [playerResult]);
    // Second call — should not throw, should not duplicate
    await service.persistResults('IDEMP1', 3, [playerResult]);

    const results = await prisma.matchResult.findMany({
      where: { matchCode: 'IDEMP1' },
    });
    expect(results).toHaveLength(1);
  });

  it('FK violation graceful — userId inexistente no crashea', async () => {
    // This tests the path where the service filters out non-existent users
    await expect(
      service.persistResults('FKVIO1', 1, [
        {
          playerId: 'non-existent-user-id-xyz',
          displayName: 'Ghost',
          colorIndex: 0,
          countryCode: null,
          rank: 1,
          wpm: 50,
          precision: 80,
          score: 400,
          missingChars: 10,
          finished: true,
          finishedAt: '2026-04-02T12:00:00.000Z',
        },
      ]),
    ).resolves.toBeUndefined();

    const results = await prisma.matchResult.findMany({
      where: { matchCode: 'FKVIO1' },
    });
    expect(results).toHaveLength(0);
  });
});
