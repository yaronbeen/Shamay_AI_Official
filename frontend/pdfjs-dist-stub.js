// Stub module to replace pdfjs-dist in webpack bundle
// PDF.js is loaded from CDN via script tag instead
module.exports = {
  getDocument: () => {
    throw new Error('PDF.js is loaded from CDN. Use window.pdfjsLib instead.')
  },
  GlobalWorkerOptions: {}
}

