import { spawn } from 'child_process'
import { join } from 'path'

export class BackendIntegration {
  private static async runBackendModule(modulePath: string, filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const backendProcess = spawn('node', [modulePath, filePath], {
        cwd: join(process.cwd(), '..')
      })

      let output = ''
      let errorOutput = ''

      backendProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      backendProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      backendProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(result)
          } catch (parseError) {
            resolve({ message: 'File processed but data parsing failed', rawOutput: output })
          }
        } else {
          reject(new Error(errorOutput))
        }
      })
    })
  }

  static async processLandRegistry(filePath: string): Promise<any> {
    const modulePath = join(process.cwd(), '..', 'land-registry-management', 'ai-field-extractor.js')
    return this.runBackendModule(modulePath, filePath)
  }

  static async processBuildingPermit(filePath: string): Promise<any> {
    const modulePath = join(process.cwd(), '..', 'building-permits', 'ai-field-extractor.js')
    return this.runBackendModule(modulePath, filePath)
  }

  static async processSharedBuildingOrder(filePath: string): Promise<any> {
    const modulePath = join(process.cwd(), '..', 'shared-building-order', 'ai-field-extractor.js')
    return this.runBackendModule(modulePath, filePath)
  }
}
