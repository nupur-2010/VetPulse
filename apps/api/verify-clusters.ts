import { PrismaClient } from '@prisma/client';
import { outbreakDetectionService } from './src/services/outbreak-detection.service.js';

const prisma = new PrismaClient();

async function main() {
  // Remove old mock reports from the earlier seed so only the new demo dataset drives clustering
  const oldMock = await prisma.healthReport.deleteMany({
    where: { reportNumber: { startsWith: 'RPT-MOCK-' } },
  });
  console.log('Deleted old RPT-MOCK-* reports:', oldMock.count);

  const total = await prisma.healthReport.count();
  console.log('Total health reports now:', total);

  // Re-run DBSCAN and log clusters by size
  const clusters = await outbreakDetectionService.detectClusters();
  console.log('\n=== DBSCAN CLUSTERS (' + clusters.length + ') ===');
  const sorted = [...clusters].sort((a, b) => b.reportCount - a.reportCount);
  for (const c of sorted) {
    console.log(
      c.disease.padEnd(32),
      '| cases:'.padEnd(9) + c.reportCount,
      '| risk:',
      c.reportCount >= 10 ? 'CRITICAL' : c.reportCount >= 5 ? 'HIGH' : c.reportCount >= 3 ? 'MEDIUM' : 'LOW',
      '|',
      c.centerLatitude.toFixed(3),
      c.centerLongitude.toFixed(3)
    );
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
