
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from './Card'

export default function Grid({ items, onOpen }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 24 // Increased from 12 to show more items per page
  
  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const visibleItems = items.slice(startIndex, endIndex)

  // Reset to page 1 when items change (e.g., filtering)
  useEffect(() => {
    setCurrentPage(1)
  }, [items])

  const goToPage = (pageNum) => {
    setLoading(true)
    setTimeout(() => {
      setCurrentPage(pageNum)
      setLoading(false)
      window.scrollTo({ top: 300, behavior: 'smooth' })
    }, 300)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.3
      }
    }
  }

  const getCurrencyTypeStats = (items) => {
    const coins = items.filter(item => item.type === 'coin').length
    const notes = items.filter(item => item.type === 'note').length
    return { coins, notes, total: coins + notes }
  }

  const getEraDistribution = (items) => {
    const eras = {}
    items.forEach(item => {
      const era = item.era || 'Modern'
      eras[era] = (eras[era] || 0) + 1
    })
    return eras
  }

  const stats = getCurrencyTypeStats(visibleItems)
  const eras = getEraDistribution(visibleItems)

  if (items.length === 0) {
    return (
      <motion.div 
        className="empty"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="empty-icon">🔍</div>
        <h3>No currencies found</h3>
        <p>Try adjusting your filters or search terms to discover more items from the collection.</p>
      </motion.div>
    )
  }

  return (
    <div className="grid-container">
      {/* Grid */}
      <motion.div 
        className="grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => (
            <motion.div
              key={item.id || index}
              variants={itemVariants}
              layout
              exit="exit"
            >
              <Card item={item} onOpen={onOpen} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            marginTop: 'var(--space-lg)',
            padding: 'var(--space-md)',
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-md)',
            flexWrap: 'wrap'
          }}
        >
          {/* Previous Button */}
          <motion.button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            whileHover={{ scale: currentPage === 1 || loading ? 1 : 1.1 }}
            whileTap={{ scale: currentPage === 1 || loading ? 1 : 0.9 }}
            style={{
              padding: 'var(--space-xs) var(--space-sm)',
              background: currentPage === 1 
                ? 'var(--bg-accent)' 
                : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              color: currentPage === 1 ? 'var(--text-tertiary)' : 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: currentPage === 1 || loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              boxShadow: currentPage === 1 ? 'none' : 'var(--shadow-sm)',
              transition: 'all 0.2s'
            }}
          >
            ← Prev
          </motion.button>

          {/* Page Numbers */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <motion.button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.1, y: -2 }}
                  whileTap={{ scale: loading ? 1 : 0.9 }}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: currentPage === pageNum
                      ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                      : 'white',
                    color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                    border: `2px solid ${currentPage === pageNum ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: currentPage === pageNum ? '800' : '600',
                    fontSize: '0.85rem',
                    boxShadow: currentPage === pageNum ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s'
                  }}
                >
                  {pageNum}
                </motion.button>
              );
            })}
          </div>

          {/* Next Button */}
          <motion.button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            whileHover={{ scale: currentPage === totalPages || loading ? 1 : 1.1 }}
            whileTap={{ scale: currentPage === totalPages || loading ? 1 : 0.9 }}
            style={{
              padding: 'var(--space-xs) var(--space-sm)',
              background: currentPage === totalPages
                ? 'var(--bg-accent)'
                : 'linear-gradient(135deg, #10b981, #34d399)',
              color: currentPage === totalPages ? 'var(--text-tertiary)' : 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: currentPage === totalPages || loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              boxShadow: currentPage === totalPages ? 'none' : 'var(--shadow-sm)',
              transition: 'all 0.2s'
            }}
          >
            Next →
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}
