
import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { convertToINR, CURRENCY_CODES } from '../utils/currencyAPI'

export default function Stats({ items }){
  const [portfolioValue, setPortfolioValue] = useState(null)
  const [loadingValue, setLoadingValue] = useState(true)

  const { count, countries, coins, notes } = useMemo(()=>{
    const setC = new Set(items.map(x=>x.country).filter(Boolean))
    const coinCount = items.filter(x => x.type === 'coin').length
    const noteCount = items.filter(x => x.type === 'note' || x.type === 'banknote').length
    return { count: items.length, countries: setC.size, coins: coinCount, notes: noteCount }
  },[items])

  // Calculate portfolio value in INR
  useEffect(() => {
    const calculateValue = async () => {
      setLoadingValue(true)
      try {
        let totalINR = 0
        
        for (const item of items) {
          const estimatedValue = item.estimated_value || item.face_value || 1
          const currencyCode = item.currency_code || CURRENCY_CODES[item.country] || 'USD'
          
          const inrValue = await convertToINR(estimatedValue, currencyCode)
          totalINR += inrValue
        }
        
        setPortfolioValue(totalINR)
      } catch (error) {
        console.error('Error calculating portfolio value:', error)
        setPortfolioValue(0)
      } finally {
        setLoadingValue(false)
      }
    }

    if (items && items.length > 0) {
      calculateValue()
    }
  }, [items])


  return (
    <motion.div 
      className="stats-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        background: 'transparent',
        padding: 0,
        margin: 'var(--space-md) 0',
        position: 'relative',
        zIndex: 1
      }}
    >
      <h3 style={{
        fontSize: '0.8rem',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        marginBottom: 'var(--space-md)',
        textAlign: 'left',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        Collection Overview
      </h3>
      <div className="stats" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 'var(--space-md)',
        textAlign: 'center'
      }}>
        {/* Portfolio Value Card - Featured */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.6), rgba(220, 252, 231, 0.4))',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            border: '1px solid #10b981',
            boxShadow: '0 1px 3px rgba(16, 185, 129, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate'
          }}
        >
          {/* Shimmer effect */}
          {loadingValue && (
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                pointerEvents: 'none',
                zIndex: 1
              }}
            />
          )}
          
          <div style={{ 
            fontSize: '1.5rem', 
            marginBottom: 'var(--space-xs)',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
          }}>
            ₹
          </div>
          <strong style={{
            display: 'block',
            fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
            color: '#065f46',
            fontWeight: '800',
            lineHeight: 1.2,
            marginBottom: 'var(--space-xs)'
          }}>
            {loadingValue ? (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ fontSize: '1.2rem' }}
              >
                ⟳
              </motion.span>
            ) : portfolioValue !== null ? (
              <>₹{portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>
            ) : (
              '—'
            )}
          </strong>
          <span style={{
            color: '#047857',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600',
            display: 'block',
            marginBottom: 'var(--space-xs)'
          }}>
            Portfolio
          </span>
          {!loadingValue && portfolioValue !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: '0.65rem',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                fontWeight: '600'
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ●
              </motion.span>
              LIVE
            </motion.div>
          )}
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(254, 243, 199, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            isolation: 'isolate'
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>📊</div>
          <strong style={{
            display: 'block',
            fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
            color: '#92400e',
            fontWeight: '800',
            lineHeight: 1.2,
            marginBottom: 'var(--space-xs)'
          }}>
            {count.toLocaleString()}
          </strong>
          <span style={{
            color: '#78350f',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            fontWeight: '600'
          }}>
            Total Items
          </span>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(254, 215, 170, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            border: '1px solid rgba(251, 146, 60, 0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            isolation: 'isolate'
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>🪙</div>
          <strong style={{
            display: 'block',
            fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
            color: '#9a3412',
            fontWeight: '800',
            lineHeight: 1.2,
            marginBottom: 'var(--space-xs)'
          }}>
            {coins}
          </strong>
          <span style={{
            color: '#7c2d12',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            fontWeight: '600'
          }}>
            Coins
          </span>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(217, 249, 157, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            border: '1px solid rgba(132, 204, 22, 0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            isolation: 'isolate'
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>💵</div>
          <strong style={{
            display: 'block',
            fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
            color: '#3f6212',
            fontWeight: '800',
            lineHeight: 1.2,
            marginBottom: 'var(--space-xs)'
          }}>
            {notes}
          </strong>
          <span style={{
            color: '#365314',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            fontWeight: '600'
          }}>
            Notes
          </span>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(254, 202, 202, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            isolation: 'isolate'
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>🌍</div>
          <strong style={{
            display: 'block',
            fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
            color: '#991b1b',
            fontWeight: '800',
            lineHeight: 1.2,
            marginBottom: 'var(--space-xs)'
          }}>
            {countries}
          </strong>
          <span style={{
            color: '#7f1d1d',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            fontWeight: '600'
          }}>
            Countries
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}
