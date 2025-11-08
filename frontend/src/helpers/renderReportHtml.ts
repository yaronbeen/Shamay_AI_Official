import React from 'react'
import { renderToReadableStream } from 'react-dom/server.browser'

import { ReportRenderer } from '../components/ReportRenderer'
import { REPORT_CSS } from '../components/reportStyles'
import type { RenderOptions, ReportData } from '../components/report-types'

export interface RenderReportResult {
  html: string
  pageCount: number
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    result += decoder.decode(value, { stream: true })
  }

  result += decoder.decode()
  return result
}

export async function renderReportHtml(data: ReportData, options?: RenderOptions): Promise<RenderReportResult> {
  const stream = await renderToReadableStream(React.createElement(ReportRenderer, { data, options }))
  const markup = await streamToString(stream)
  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charSet="utf-8" /><style>${REPORT_CSS}</style></head><body>${markup}</body></html>`

  const pageCount = (markup.match(/class="report-page"/g) || []).length

  return {
    html,
    pageCount,
  }
}

