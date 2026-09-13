const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.uczuhokgtbrfdrfggedz:XKijkuNASNovvURi@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
  const res = await prisma.property.updateMany({
    data: {
      email: 'indiralodge@gmail.com',
      phone: '+91 70028 90165',
      address: 'Solicitor Lodge, Near ASTC, Malow Ali',
      city: 'Jorhat',
      state: 'Assam',
      zipCode: '781005',
    }
  });
  console.log('Updated properties in Supabase:', res.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
