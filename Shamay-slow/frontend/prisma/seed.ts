import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create admin organization
  const adminOrganization = await prisma.organization.upsert({
    where: { id: 'admin-org-1' },
    update: {},
    create: {
      id: 'admin-org-1',
      name: 'Shamay.AI - Admin Organization',
    },
  })

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@shamay.ai' },
    update: {},
    create: {
      id: 'admin-user-1',
      email: 'admin@shamay.ai',
      name: 'Admin User',
    },
  })

  // Create admin membership
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: adminUser.id,
        organizationId: adminOrganization.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: adminOrganization.id,
      role: 'OWNER',
    },
  })

  // Create demo organization
  const organization = await prisma.organization.upsert({
    where: { id: 'demo-org-1' },
    update: {},
    create: {
      id: 'demo-org-1',
      name: 'דוגמה - משרד שמאי מקרקעין',
    },
  })

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      id: 'demo-user-1',
      email: 'owner@demo.com',
      name: 'בעל המשרד',
    },
  })

  // Create membership
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: 'OWNER',
    },
  })

  // Create demo valuation
  const valuation = await prisma.valuation.upsert({
    where: { id: 'demo-valuation-1' },
    update: {},
    create: {
      id: 'demo-valuation-1',
      title: 'שומת דירה בתל אביב',
      status: 'DRAFT',
      addressFull: 'רחוב הרצל 123, תל אביב',
      block: '1234',
      parcel: '56',
      subparcel: '78',
      createdById: user.id,
      organizationId: organization.id,
    },
  })

  // Create demo document
  await prisma.document.upsert({
    where: { id: 'demo-doc-1' },
    update: {},
    create: {
      id: 'demo-doc-1',
      valuationId: valuation.id,
      organizationId: organization.id,
      docType: 'TABU',
      fileName: 'נסח טאבו.pdf',
      storageKey: 'demo/storage/key',
      sha256: 'demo-sha256',
      source: 'USER_UPLOAD',
      uploadedById: user.id,
    },
  })

  // Create demo asset
  await prisma.asset.upsert({
    where: { id: 'demo-asset-1' },
    update: {},
    create: {
      id: 'demo-asset-1',
      valuationId: valuation.id,
      organizationId: organization.id,
      assetType: 'PDF',
      fileName: 'שומת מקרקעין.pdf',
      storageKey: 'demo/asset/key',
      sha256: 'demo-asset-sha256',
      generatedById: user.id,
    },
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
