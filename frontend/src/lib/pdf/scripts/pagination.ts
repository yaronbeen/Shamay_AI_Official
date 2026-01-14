/**
 * Pagination scripts for PDF document generation
 *
 * Contains client-side scripts that run in the document to handle:
 * - Page numbering
 * - Auto-pagination and page breaks
 */

/**
 * Script that updates page numbers in the document.
 * Should be included in the document HTML.
 */
export const pageNumberScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const pages = Array.from(document.querySelectorAll('.page'))
      const total = pages.length
      pages.forEach((page, index) => {
        const target = page.querySelector('[data-page-number]')
        if (target) {
          target.textContent = 'עמוד ' + (index + 1) + ' מתוך ' + total
        }
      })
    })
  </script>
`;

/**
 * Script that handles automatic pagination.
 * Splits content across pages when it exceeds the maximum height.
 * Handles chapter title page breaks.
 */
export const autoPaginateScript = `
  <script>
    // Helper functions
    const mmToPx = (mm) => (mm * 96) / 25.4
    const MAX_CONTENT_HEIGHT = Math.round(mmToPx(297 - 30)) // A4 height minus ~15mm top/bottom
    const HALF_PAGE_HEIGHT = MAX_CONTENT_HEIGHT * 0.5

    // ===== CHAPTER TITLE PAGE BREAK LOGIC =====
    // If a chapter title is in the bottom 50% of page, move it to next page
    const handleChapterTitlePageBreaks = () => {
      // Remove any previously inserted auto page breaks
      const existingBreaks = Array.from(document.querySelectorAll('.auto-page-break-marker'))
      existingBreaks.forEach((el) => el.remove())

      const chapterTitles = Array.from(document.querySelectorAll('.chapter-title'))

      chapterTitles.forEach((title) => {
        const page = title.closest('.page')
        if (!page || page.classList.contains('cover')) return

        const pageBody = page.querySelector('.page-body')
        if (!pageBody) return

        const pageRect = pageBody.getBoundingClientRect()
        const titleRect = title.getBoundingClientRect()

        // Calculate position relative to page body
        const titlePositionInPage = titleRect.top - pageRect.top

        // If title is in bottom 50% of page, we need a page break
        if (titlePositionInPage > HALF_PAGE_HEIGHT) {
          // Find all siblings before this title (content that stays on current page)
          const allChildren = Array.from(pageBody.children)
          const titleIndex = allChildren.indexOf(title.closest('.section-block') || title)

          if (titleIndex > 0 && title.parentElement) {
            // Create a page break marker before the chapter title with visual indicator
            const pageBreak = document.createElement('div')
            pageBreak.className = 'chapter-page-break auto-page-break-marker'
            pageBreak.style.cssText = 'break-before: page; page-break-before: always;'
            pageBreak.setAttribute('data-page-break', 'auto')
            title.parentElement.insertBefore(pageBreak, title)
          }
        }
      })
    }

    // Expose global function for re-triggering pagination
    window.__applyAutoPagination = function(force = false) {
      if (!force && document.body.dataset.paginated === 'true') {
        return;
      }

      // Run chapter title check
      handleChapterTitlePageBreaks()

      if (!force) {
        document.body.dataset.paginated = 'true';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      if (document.body.dataset.paginated === 'true') {
        return;
      }
      document.body.dataset.paginated = 'true';

      const previouslyGenerated = Array.from(document.querySelectorAll('section.page[data-generated-page="true"]'));
      previouslyGenerated.forEach((page) => page.remove());

      // Run chapter title check before pagination
      handleChapterTitlePageBreaks()

      const createEmptyPage = (referencePage) => {
        const newPage = document.createElement('section')
        newPage.classList.add('page')
        newPage.setAttribute('data-generated-page', 'true')
        referencePage.classList.forEach((cls) => {
          if (cls !== 'cover' && cls !== 'page') {
            newPage.classList.add(cls)
          }
        })

        const newBody = document.createElement('div')
        newBody.className = 'page-body'
        newPage.appendChild(newBody)

        const pageNumberTemplate = referencePage.querySelector('.page-number[data-page-number]')
        if (pageNumberTemplate) {
          const clone = pageNumberTemplate.cloneNode(true)
          clone.textContent = ''
          newPage.appendChild(clone)
        }

        return { page: newPage, body: newBody }
      }

      // Helper to check if element is a good break point
      const isGoodBreakBefore = (el) => {
        if (!el) return false
        // Good to break BEFORE these elements
        return el.classList.contains('chapter-title') ||
               el.classList.contains('section-block') ||
               el.classList.contains('sub-title') ||
               el.tagName === 'TABLE' ||
               el.classList.contains('table') ||
               el.classList.contains('media-gallery') ||
               el.classList.contains('media-card')
      }

      // Find the best break point index
      const findBestBreakIndex = (body) => {
        const children = Array.from(body.children)
        if (children.length <= 1) return children.length - 1

        let accumulatedHeight = 0
        let overflowIndex = -1

        // Find where content exceeds page height
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          const rect = child.getBoundingClientRect()
          const height = rect ? rect.height : child.scrollHeight || 0

          if (accumulatedHeight + height > MAX_CONTENT_HEIGHT) {
            overflowIndex = i
            break
          }
          accumulatedHeight += height
        }

        // If no overflow found, return last index
        if (overflowIndex === -1) return children.length - 1

        // Look for a good break point at or after overflowIndex
        for (let j = overflowIndex; j < children.length; j++) {
          if (isGoodBreakBefore(children[j])) {
            return j
          }
        }

        // Fallback: look for a good break point before overflowIndex
        for (let j = overflowIndex - 1; j >= 0; j--) {
          if (isGoodBreakBefore(children[j])) {
            return j
          }
        }

        // Last resort: break at overflow point
        return overflowIndex > 0 ? overflowIndex : children.length - 1
      }

      const splitPage = (page) => {
        if (page.classList.contains('cover')) {
          return
        }
        const body = page.querySelector('.page-body')
        if (!body) {
          return
        }

        const ensurePageFits = (currentPage, currentBody, safety = 0) => {
          if (safety > 100) {
            console.warn('Auto pagination aborted due to safety threshold')
            return
          }
          if (currentBody.scrollHeight <= MAX_CONTENT_HEIGHT) {
            return
          }

          if (currentBody.children.length === 0) {
            return
          }

          const { page: newPage, body: newBody } = createEmptyPage(page)
          currentPage.parentNode.insertBefore(newPage, currentPage.nextSibling)

          // Find the best logical break point
          const breakIndex = findBestBreakIndex(currentBody)
          const children = Array.from(currentBody.children)

          // Move elements from breakIndex to end to new page
          let movedCount = 0
          for (let i = breakIndex; i < children.length; i++) {
            const child = children[i]
            const childHeight = child.getBoundingClientRect ? child.getBoundingClientRect().height : child.scrollHeight
            // Skip if single element exceeds page height
            if (childHeight && childHeight >= MAX_CONTENT_HEIGHT && movedCount === 0) {
              console.warn('Auto pagination: element exceeds single-page height, leaving in place', child)
              continue
            }
            newBody.appendChild(child)
            movedCount++
          }

          if (newBody.children.length === 0) {
            newPage.remove()
            return
          }

          if (currentBody.scrollHeight > MAX_CONTENT_HEIGHT && currentBody.children.length > 0) {
            ensurePageFits(currentPage, currentBody, safety + 1)
          }

          if (newBody.scrollHeight > MAX_CONTENT_HEIGHT && newBody.children.length > 1) {
            ensurePageFits(newPage, newBody, safety + 1)
          }
        }

        ensurePageFits(page, body, 0)
      }

      const pages = Array.from(document.querySelectorAll('section.page'))
      pages.forEach(splitPage)
    })
  </script>
`;
