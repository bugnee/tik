import { PrismaClient } from "@prisma/client";
import { scheduleGeneratorService } from "../src/services/schedule-generator.service";

const prisma = new PrismaClient();

const TEAM_CONFIG = [
  { name: "퍼포먼스 마케팅 1팀", clientPrefix: "PF1", clientCount: 20 },
  { name: "바이럴 마케팅 2팀", clientPrefix: "VR2", clientCount: 20 },
  { name: "콘텐츠 마케팅 3팀", clientPrefix: "CT3", clientCount: 15 },
];

async function main() {
  console.log("조직 + 고객사 시드 시작...");

  await prisma.task.deleteMany();
  await prisma.monthlySchedule.deleteMany();
  await prisma.clientAssignment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const ceo = await prisma.user.create({
    data: {
      email: "ceo@tripitkorea.co.kr",
      password: "hashed",
      name: "김대표",
      role: "CEO",
    },
  });

  const executive = await prisma.user.create({
    data: {
      email: "exec@tripitkorea.co.kr",
      password: "hashed",
      name: "박임원",
      role: "EXECUTIVE",
    },
  });

  let totalClients = 0;

  for (const config of TEAM_CONFIG) {
    const team = await prisma.team.create({ data: { name: config.name } });

    const leader = await prisma.user.create({
      data: {
        email: `${config.clientPrefix.toLowerCase()}.leader@tripitkorea.co.kr`,
        password: "hashed",
        name: `${config.name} 팀장`,
        role: "LEADER",
        teamId: team.id,
      },
    });

    await prisma.team.update({
      where: { id: team.id },
      data: { leaderId: leader.id },
    });

    const managers = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        prisma.user.create({
          data: {
            email: `${config.clientPrefix.toLowerCase()}.mgr${n}@tripitkorea.co.kr`,
            password: "hashed",
            name: `${config.name} 담당${n}`,
            role: "MANAGER",
            teamId: team.id,
          },
        }),
      ),
    );

    for (let i = 1; i <= config.clientCount; i++) {
      const manager = managers[(i - 1) % managers.length];
      const isFirstTeamFirstClient = config.clientPrefix === "PF1" && i === 1;
      const clientName = isFirstTeamFirstClient
        ? "양양서프리조트"
        : `${config.name} 고객사 ${String(i).padStart(3, "0")}`;

      const client = await prisma.client.create({
        data: {
          code: `${config.clientPrefix}-${String(i).padStart(4, "0")}`,
          name: clientName,
          businessNumber: `123-45-${String(totalClients + 1).padStart(5, "0")}`,
          contractStatus: i % 17 === 0 ? "HOLD" : "ACTIVE",
          teamId: team.id,
          assignments: {
            create: { userId: manager.id, isPrimary: true },
          },
          contracts: {
            create: {
              startDate: new Date("2026-06-05"),
              endDate: new Date("2026-07-04"),
              amount: 2500000 + i * 10000,
              outsourcingFee: 600000,
              billingStatus: i % 11 === 0 ? "OVERDUE" : "PENDING",
            },
          },
        },
      });

      if (isFirstTeamFirstClient) {
        await scheduleGeneratorService.create({
          clientId: client.id,
          targetYear: 2026,
          targetMonth: 6,
          title: "6월 플레이스 & 블로그 집중 패키지",
          contractStartDate: new Date("2026-06-05"),
          contractEndDate: new Date("2026-07-04"),
          packageType: "PLACE_BLOG_FOCUS",
          assigneeId: manager.id,
          overwrite: true,
        });
      }

      totalClients++;
    }

    console.log(`✓ ${config.name}: 담당 5명, 고객사 ${config.clientCount}개`);
  }

  console.log("\n시드 완료");
  console.log(`- CEO: ${ceo.name} (id=${ceo.id})`);
  console.log(`- 임원: ${executive.name} (id=${executive.id})`);
  console.log(`- 팀: ${TEAM_CONFIG.length}개, 고객사: ${totalClients}개`);
  console.log("\n데모 로그인: http://localhost:3000/ → 상단에서 역할 선택");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
