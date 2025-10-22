import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const valuationId = searchParams.get('valuationId')

    const where: any = {
      organizationId: session.user.primaryOrganizationId,
    }

    if (valuationId) {
      where.valuationId = valuationId
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        generatedBy: {
          select: { name: true }
        },
        valuation: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
