// Valuation Database Integration Layer
// Connects session system with database persistence

import { prisma } from './db'

export interface ValuationStepData {
  step1?: any
  step2?: any
  step3?: any
  step4?: any
  step5?: any
}

export interface GISData {
  screenshots?: any[]
  analysis?: any
  annotations?: any[]
}

export interface GarmushkaData {
  measurements?: any[]
  images?: any[]
  table?: any[]
}

export class ValuationDB {
  // Create or update valuation from session data
  static async saveValuationFromSession(
    sessionId: string,
    organizationId: string,
    userId: string,
    wizardData: any
  ) {
    try {
      // Check if valuation already exists for this session
      const existingSession = await prisma.valuationSession.findUnique({
        where: { sessionId },
        include: { valuation: true }
      })

      let valuationId = existingSession?.valuationId

      if (!valuationId) {
        // Create new valuation
        const valuation = await prisma.valuation.create({
          data: {
            title: wizardData.step1?.title || 'שומה חדשה',
            addressFull: wizardData.step1?.addressFull || '',
            block: wizardData.step1?.block,
            parcel: wizardData.step1?.parcel,
            subparcel: wizardData.step1?.subparcel,
            step1Data: wizardData.step1,
            step2Data: wizardData.step2,
            step3Data: wizardData.step3,
            step4Data: wizardData.step4,
            step5Data: wizardData.step5,
            gisScreenshots: wizardData.gisScreenshots,
            gisAnalysis: wizardData.gisAnalysis,
            garmushkaMeasurements: wizardData.garmushkaMeasurements,
            garmushkaImages: wizardData.garmushkaImages,
            finalValuation: wizardData.finalValuation,
            pricePerSqm: wizardData.pricePerSqm,
            comparableData: wizardData.comparableData,
            propertyAnalysis: wizardData.propertyAnalysis,
            createdById: userId,
            organizationId: organizationId,
            status: 'IN_PROGRESS'
          }
        })
        valuationId = valuation.id

        // Update session with valuation ID
        await prisma.valuationSession.update({
          where: { sessionId },
          data: { valuationId }
        })
      } else {
        // Update existing valuation
        await prisma.valuation.update({
          where: { id: valuationId },
          data: {
            step1Data: wizardData.step1,
            step2Data: wizardData.step2,
            step3Data: wizardData.step3,
            step4Data: wizardData.step4,
            step5Data: wizardData.step5,
            gisScreenshots: wizardData.gisScreenshots,
            gisAnalysis: wizardData.gisAnalysis,
            garmushkaMeasurements: wizardData.garmushkaMeasurements,
            garmushkaImages: wizardData.garmushkaImages,
            finalValuation: wizardData.finalValuation,
            pricePerSqm: wizardData.pricePerSqm,
            comparableData: wizardData.comparableData,
            propertyAnalysis: wizardData.propertyAnalysis,
            status: 'IN_PROGRESS'
          }
        })
      }

      return { valuationId, success: true }
    } catch (error) {
      console.error('Error saving valuation from session:', error)
      return { error: 'Failed to save valuation' }
    }
  }

  // Load valuation data for wizard
  static async loadValuationForWizard(valuationId: string) {
    try {
      const valuation = await prisma.valuation.findUnique({
        where: { id: valuationId },
        include: {
          documents: true,
          images: true,
          assets: true
        }
      })

      if (!valuation) {
        return { error: 'Valuation not found' }
      }

      // Convert database data back to wizard format
      const wizardData = {
        step1: valuation.step1Data,
        step2: valuation.step2Data,
        step3: valuation.step3Data,
        step4: valuation.step4Data,
        step5: valuation.step5Data,
        gisScreenshots: valuation.gisScreenshots,
        gisAnalysis: valuation.gisAnalysis,
        garmushkaMeasurements: valuation.garmushkaMeasurements,
        garmushkaImages: valuation.garmushkaImages,
        finalValuation: valuation.finalValuation,
        pricePerSqm: valuation.pricePerSqm,
        comparableData: valuation.comparableData,
        propertyAnalysis: valuation.propertyAnalysis,
        documents: valuation.documents,
        images: valuation.images,
        assets: valuation.assets
      }

      return { wizardData, success: true }
    } catch (error) {
      console.error('Error loading valuation for wizard:', error)
      return { error: 'Failed to load valuation' }
    }
  }

  // Save GIS data
  static async saveGISData(valuationId: string, gisData: GISData) {
    try {
      await prisma.valuation.update({
        where: { id: valuationId },
        data: {
          gisScreenshots: gisData.screenshots,
          gisAnalysis: gisData.analysis
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error saving GIS data:', error)
      return { error: 'Failed to save GIS data' }
    }
  }

  // Save Garmushka data
  static async saveGarmushkaData(valuationId: string, garmushkaData: GarmushkaData) {
    try {
      await prisma.valuation.update({
        where: { id: valuationId },
        data: {
          garmushkaMeasurements: garmushkaData.measurements,
          garmushkaImages: garmushkaData.images
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error saving Garmushka data:', error)
      return { error: 'Failed to save Garmushka data' }
    }
  }

  // Save final valuation results
  static async saveFinalResults(
    valuationId: string,
    finalValuation: number,
    pricePerSqm: number,
    comparableData: any,
    propertyAnalysis: any
  ) {
    try {
      await prisma.valuation.update({
        where: { id: valuationId },
        data: {
          finalValuation,
          pricePerSqm,
          comparableData,
          propertyAnalysis,
          status: 'READY'
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error saving final results:', error)
      return { error: 'Failed to save final results' }
    }
  }

  // Get user's valuations
  static async getUserValuations(userId: string, organizationId: string) {
    try {
      const valuations = await prisma.valuation.findMany({
        where: {
          createdById: userId,
          organizationId: organizationId
        },
        include: {
          createdBy: {
            select: { name: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return { valuations, success: true }
    } catch (error) {
      console.error('Error getting user valuations:', error)
      return { error: 'Failed to get valuations' }
    }
  }

  // Complete valuation
  static async completeValuation(valuationId: string) {
    try {
      await prisma.valuation.update({
        where: { id: valuationId },
        data: { status: 'SIGNED' }
      })

      return { success: true }
    } catch (error) {
      console.error('Error completing valuation:', error)
      return { error: 'Failed to complete valuation' }
    }
  }

  // Archive valuation
  static async archiveValuation(valuationId: string) {
    try {
      await prisma.valuation.update({
        where: { id: valuationId },
        data: { status: 'ARCHIVED' }
      })

      return { success: true }
    } catch (error) {
      console.error('Error archiving valuation:', error)
      return { error: 'Failed to archive valuation' }
    }
  }

  // Get valuation by ID
  static async getValuationById(valuationId: string, organizationId: string) {
    try {
      const valuation = await prisma.valuation.findFirst({
        where: {
          id: valuationId,
          organizationId: organizationId
        },
        include: {
          createdBy: {
            select: { name: true }
          },
          documents: true,
          images: true,
          assets: true
        }
      })

      if (!valuation) {
        return { error: 'Valuation not found' }
      }

      return { valuation, success: true }
    } catch (error) {
      console.error('Error getting valuation:', error)
      return { error: 'Failed to get valuation' }
    }
  }

  // Search valuations
  static async searchValuations(
    organizationId: string,
    searchTerm?: string,
    status?: string
  ) {
    try {
      const where: any = { organizationId }

      if (searchTerm) {
        where.OR = [
          { addressFull: { contains: searchTerm, mode: 'insensitive' } },
          { block: { contains: searchTerm, mode: 'insensitive' } },
          { parcel: { contains: searchTerm, mode: 'insensitive' } },
          { subparcel: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }

      if (status && status !== 'all') {
        where.status = status
      }

      const valuations = await prisma.valuation.findMany({
        where,
        include: {
          createdBy: {
            select: { name: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return { valuations, success: true }
    } catch (error) {
      console.error('Error searching valuations:', error)
      return { error: 'Failed to search valuations' }
    }
  }
}
