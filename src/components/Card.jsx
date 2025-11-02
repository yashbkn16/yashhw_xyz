
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

export default function Card({ item, onOpen }) {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  })

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / 10
    const y = (e.clientY - rect.top - rect.height / 2) / 10
    setMousePosition({ x, y })
  }

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'var(--text-muted)'
      case 'uncommon': return 'var(--accent-secondary)'
      case 'rare': return 'var(--gold)'
      case 'very rare': return 'var(--copper)'
      default: return 'var(--text-muted)'
    }
  }

  const getRarityGradient = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'linear-gradient(135deg, #f7fafc, #edf2f7)'
      case 'uncommon': return 'linear-gradient(135deg, #e6fffa, #b2f5ea)'
      case 'rare': return 'linear-gradient(135deg, #fffbeb, #fef3c7)'
      case 'very rare': return 'linear-gradient(135deg, #fef5e7, #fed7aa)'
      default: return 'linear-gradient(135deg, #f7fafc, #edf2f7)'
    }
  }

  const cardVariants = {
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
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  // TODO: Re-enable when images are added back
  // const imageVariants = {
  //   hover: {
  //     scale: 1.1,
  //     rotateY: 8,
  //     transition: {
  //       duration: 0.4,
  //       ease: "easeOut"
  //     }
  //   }
  // }

  const getCountryCode = (country) => {
    const countryMap = {
      'India': 'in',
      'United States': 'us',
      'Japan': 'jp',
      'United Kingdom': 'gb',
      'Canada': 'ca',
      'Australia': 'au',
      'Brazil': 'br',
      'Germany': 'de',
      'France': 'fr',
      'Italy': 'it',
      'Russia': 'ru',
      'Singapore': 'sg',
      'China': 'cn',
      'Mexico': 'mx',
      'Spain': 'es',
      'Netherlands': 'nl',
      'Switzerland': 'ch',
      'South Korea': 'kr',
      'Thailand': 'th',
      'UAE': 'ae',
      'South Africa': 'za'
    }
    return countryMap[country] || null
  }

  const getFlagUrl = (country) => {
    const code = getCountryCode(country)
    return code ? `https://flagcdn.com/w40/${code}.png` : null
  }

  return (
    <motion.div
      ref={ref}
      className={`card rarity-${item.rarity?.toLowerCase().replace(' ', '-')}`}
      variants={cardVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      onClick={() => onOpen(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setMousePosition({ x: 0, y: 0 })
      }}
      onMouseMove={handleMouseMove}
      style={{
        transform: isHovered 
          ? `perspective(1000px) rotateX(${mousePosition.y * 0.1}deg) rotateY(${mousePosition.x * 0.1}deg) translateZ(20px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
        background: getRarityGradient(item.rarity),
        cursor: 'pointer'
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.3 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Rarity indicator */}
      <div 
        className="rarity-indicator"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${getRarityColor(item.rarity)}, transparent)`,
          borderRadius: '12px 12px 0 0'
        }}
      />

      {/* Card Image Section */}
      {/* TODO: FUTURE ENHANCEMENT - Add currency images when full collection is ready
          - Uncomment the img tag below
          - Use item.image_front for front view
          - Use item.image_back for back view in modal
          - Consider lazy loading for performance
      */}
      <div className="card-image">
        {/* Image temporarily disabled - will be added with complete collection */}
        {/* <motion.img
          src={item.image_front || item.image}
          alt={`${item.country} ${item.denomination}`}
          variants={imageVariants}
          animate={isHovered ? "hover" : ""}
          loading="lazy"
          style={{
            filter: `drop-shadow(0 ${isHovered ? 15 : 8}px ${isHovered ? 20 : 12}px rgba(0, 0, 0, 0.1))`
          }}
        /> */}
        
        {/* Placeholder content - shows denomination as large text */}
        <div style={{
          fontSize: 'clamp(1.2rem, 4vw, 2rem)',
          fontWeight: '700',
          color: 'var(--accent-primary)',
          textAlign: 'center',
          padding: 'var(--space-md)'
        }}>
          {item.denomination}
        </div>
        
        {/* Type badge */}
        <motion.div
          className="type-badge"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            background: item.type === 'coin' ? 'var(--gold)' : 'var(--accent-primary)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.6rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {item.type === 'coin' ? '🪙' : '💵'}
        </motion.div>

        {/* Hover overlay with quick info */}
        <motion.div
          className="card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 'var(--space-sm)',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: '500'
          }}
        >
          <div>
            <div>💰 {item.material || 'Unknown'}</div>
            {item.weight && <div>⚖️ {item.weight}</div>}
          </div>
        </motion.div>
      </div>

      {/* Card Content */}
      <div className="card-content">
        <div className="card-header">
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getFlagUrl(item.country) ? (
                <img 
                  src={getFlagUrl(item.country)}
                  alt={`${item.country} flag`}
                  style={{
                    width: '20px',
                    height: '15px',
                    objectFit: 'cover',
                    borderRadius: '2px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}
                  loading="lazy"
                />
              ) : (
                <span style={{ fontSize: '1em' }}>🌍</span>
              )}
              <span style={{ fontSize: '0.85rem' }}>{item.denomination}</span>
            </h3>
            <p className="card-subtitle">{item.country}</p>
          </div>
          <div className="card-year">{item.year}</div>
        </div>

        {/* Theme/Description */}
        {item.theme && (
          <motion.div
            className="card-theme"
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: isHovered ? 1 : 0, 
              height: isHovered ? 'auto' : 0
            }}
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              marginBottom: isHovered ? 'var(--space-xs)' : 0,
              fontStyle: 'italic',
              overflow: 'hidden',
              lineHeight: 1.3
            }}
          >
            "{item.theme.length > 50 ? item.theme.substring(0, 50) + '...' : item.theme}"
          </motion.div>
        )}

        {/* Meta Information */}
        <div className="card-meta" style={{ marginTop: 'auto' }}>
          <div className="card-meta-item">
            <span className="card-meta-label" style={{ fontSize: '0.65rem' }}>Era</span>
            <span className="card-meta-value" style={{ fontSize: '0.7rem' }}>{item.era?.substring(0, 20) || 'Modern'}</span>
          </div>
          <div className="card-meta-item">
            <span className="card-meta-label" style={{ fontSize: '0.65rem' }}>Rarity</span>
            <span 
              className="card-meta-value"
              style={{ color: getRarityColor(item.rarity), fontSize: '0.7rem' }}
            >
              {item.rarity || 'Common'}
            </span>
          </div>
        </div>

        {/* Educational hint - only show on hover for compact view */}
        <motion.div
          className="educational-hint"
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: isHovered ? 1 : 0, 
            y: isHovered ? 0 : 10,
            height: isHovered ? 'auto' : 0
          }}
          style={{
            marginTop: isHovered ? 'var(--space-xs)' : 0,
            padding: isHovered ? 'var(--space-xs)' : 0,
            background: 'var(--accent-tertiary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.65rem',
            color: 'var(--accent-primary)',
            fontWeight: '500',
            overflow: 'hidden'
          }}
        >
          💡 Click to learn more
        </motion.div>
      </div>

      {/* 3D depth effect */}
      <div
        style={{
          position: 'absolute',
          inset: '2px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(0,0,0,0.05))',
          borderRadius: 'var(--radius-lg)',
          pointerEvents: 'none',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
    </motion.div>
  )
}
