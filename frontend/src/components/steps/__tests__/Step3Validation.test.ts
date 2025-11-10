import { describe, it, expect } from 'vitest'
import { filterPdfFiles, getStep3FileTypeLabel, Step3DocumentFile } from '../Step3Validation'

describe('getStep3FileTypeLabel', () => {
  it('returns Hebrew labels for known document types', () => {
    expect(getStep3FileTypeLabel('tabu')).toBe('נסח טאבו')
    expect(getStep3FileTypeLabel('permit')).toBe('היתר בניה')
    expect(getStep3FileTypeLabel('building_permit')).toBe('היתר בניה')
    expect(getStep3FileTypeLabel('condo')).toBe('צו בית משותף')
    expect(getStep3FileTypeLabel('planning')).toBe('מידע תכנוני')
  })

  it('falls back to the original value for unknown types', () => {
    expect(getStep3FileTypeLabel('custom_type')).toBe('custom_type')
    expect(getStep3FileTypeLabel('')).toBe('')
  })
})

describe('filterPdfFiles', () => {
  const baseUploadPath = '/uploads/session-id/'

  it('keeps only PDF documents from allowed sources and excludes garmushka exports', () => {
    const files: Step3DocumentFile[] = [
      {
        type: 'application/pdf',
        name: 'tabu-document.pdf',
        url: `${baseUploadPath}tabu-document.pdf`
      },
      {
        type: 'tabu',
        name: 'ownership',
        url: `${baseUploadPath}ownership.pdf`
      },
      {
        type: 'condo',
        name: 'condo-plan.pdf',
        url: `${baseUploadPath}condo-plan.pdf`
      },
      {
        type: 'image/png',
        name: 'front-photo.png',
        url: `${baseUploadPath}front-photo.png`
      },
      {
        type: 'application/pdf',
        name: 'garmushka.pdf',
        url: `${baseUploadPath}garmushka.pdf`
      },
      {
        type: 'application/pdf',
        name: 'external.pdf',
        url: 'https://example.com/external.pdf'
      }
    ]

    const result = filterPdfFiles(files)

    expect(result).toEqual([
      {
        type: 'application/pdf',
        name: 'tabu-document.pdf',
        url: `${baseUploadPath}tabu-document.pdf`
      },
      {
        type: 'tabu',
        name: 'ownership',
        url: `${baseUploadPath}ownership.pdf`
      },
      {
        type: 'condo',
        name: 'condo-plan.pdf',
        url: `${baseUploadPath}condo-plan.pdf`
      }
    ])
  })
})

