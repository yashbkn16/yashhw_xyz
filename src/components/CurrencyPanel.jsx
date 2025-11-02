import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getExchangeRate, getCurrencySymbol, CURRENCY_CODES, formatCurrency } from '../utils/currencyAPI'

export default function CurrencyPanel({ country, onClose }) {
  const [rate, setRate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const currencyCode = CURRENCY_CODES[country]
  const currencySymbol = getCurrencySymbol(currencyCode)

  useEffect(() => {
    if (!currencyCode) {
      setError('Currency not found')
      setLoading(false)
      return
    }

    const fetchRate = async () => {
      setLoading(true)
      setError(null)
      try {
        const exchangeRate = await getExchangeRate(currencyCode, 'INR')
        setRate(exchangeRate)
        setLastUpdate(new Date())
      } catch (err) {
        setError('Failed to fetch rate')
        console.error('Exchange rate error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRate()
    
    // Refresh rate every 5 minutes
    const interval = setInterval(fetchRate, 300000)
    return () => clearInterval(interval)
  }, [currencyCode])

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }

  const panelVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 50,
      transition: { duration: 0.2 }
    }
  }

  if (!country) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-md)'
        }}
      >
            {/* Panel */}
            <motion.div
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))',
                backdropFilter: 'blur(20px)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                position: 'relative'
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: 'var(--space-sm)',
                  right: 'var(--space-sm)',
                  background: 'rgba(0,0,0,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  transition: 'all 0.2s',
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.1)'}
              >
                ✕
              </button>

              {/* Header */}
              <div style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  style={{
                    fontSize: '3rem',
                    marginBottom: 'var(--space-sm)'
                  }}
                >
                  💱
                </motion.div>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {country} Currency
                </h2>
                <p style={{
                  margin: 'var(--space-xs) 0 0 0',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}>
                  Live Exchange Rate to INR
                </p>
              </div>

              {/* Exchange Rate Display */}
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-xl)',
                marginBottom: 'var(--space-md)',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
              }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{
                        display: 'inline-block',
                        fontSize: '2.5rem'
                      }}
                    >
                      ⟳
                    </motion.div>
                    <p style={{ marginTop: 'var(--space-sm)', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Fetching live rate...
                    </p>
                  </div>
                ) : error ? (
                  <div style={{ textAlign: 'center', color: '#dc2626', padding: 'var(--space-md)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>⚠️</div>
                    <p style={{ fontSize: '0.95rem' }}>{error}</p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-lg)',
                      flexWrap: 'wrap'
                    }}>
                      {/* From Currency */}
                      <div style={{
                        background: 'white',
                        padding: 'var(--space-md) var(--space-lg)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        minWidth: '140px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          From
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                          {currencySymbol}1
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                          {currencyCode}
                        </div>
                      </div>

                      {/* Arrow */}
                      <motion.div
                        animate={{ x: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ fontSize: '2rem', color: 'var(--accent-primary)' }}
                      >
                        →
                      </motion.div>

                      {/* To Currency (INR) */}
                      <div style={{
                        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                        padding: 'var(--space-md) var(--space-lg)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                        border: '2px solid #f59e0b',
                        minWidth: '140px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          To
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b45309', marginBottom: '4px' }}>
                          ₹{rate ? rate.toFixed(2) : '0.00'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '600' }}>
                          INR
                        </div>
                      </div>
                    </div>

                    {/* Live Indicator */}
                    <div style={{
                      marginTop: 'var(--space-md)',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-xs)'
                    }}>
                      <motion.span
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ color: '#10b981', fontSize: '0.7rem' }}
                      >
                        ●
                      </motion.span>
                      <span style={{ 
                        color: '#059669', 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        LIVE
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Info */}
              <div style={{
                padding: 'var(--space-sm)',
                background: 'rgba(59, 130, 246, 0.08)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                borderLeft: '3px solid var(--accent-primary)'
              }}>
                💡 Real-time exchange rates from international markets
              </div>
            </motion.div>
          </motion.div>
    </AnimatePresence>,
    document.body
  )
}
