'use client'

import React, { useState } from 'react'
import { ProvenanceViewer, sampleProvenanceData } from '../../components/ProvenanceViewer'

export default function ProvenancePlayground() {
  const [data, setData] = useState(sampleProvenanceData)

  return (
    <div className="min-h-screen">
      <ProvenanceViewer 
        data={data} 
        onChange={setData}
      />
    </div>
  )
}
