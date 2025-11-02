
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Coins, BookOpen, Star, Award, Globe } from 'lucide-react'

export default function Modal({ item, onClose }) {
  const [activeTab, setActiveTab] = useState('details')
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  if (!item) return null

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  }

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 100
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
        duration: 0.5
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: 100,
      transition: {
        duration: 0.3
      }
    }
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.2,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

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
    return code ? `https://flagcdn.com/w80/${code}.png` : null
  }

  const getCountryFlag = (country) => {
    return getFlagUrl(country)
  }

  const getRarityDetails = (rarity) => {
    const rarityInfo = {
      'Common': { icon: '⚪', description: 'Widely available and frequently found' },
      'Uncommon': { icon: '🟢', description: 'Less frequently encountered, moderate value' },
      'Rare': { icon: '🟡', description: 'Difficult to find, significant collector value' },
      'Very Rare': { icon: '🟠', description: 'Extremely scarce, museum-quality specimen' }
    }
    return rarityInfo[rarity] || rarityInfo['Common']
  }

  const tabs = [
    { id: 'details', label: 'Details', icon: Coins },
    { id: 'history', label: 'History', icon: BookOpen },
    { id: 'country', label: 'Country Info', icon: Globe }
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className="modal"
          variants={modalVariants}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header">
            <motion.div
              className="modal-title-section"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {getFlagUrl(item.country) ? (
                  <img 
                    src={getFlagUrl(item.country)}
                    alt={`${item.country} flag`}
                    style={{
                      width: '40px',
                      height: '30px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(0,0,0,0.1)'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '1.5em' }}>🌍</span>
                )}
                <span>{item.denomination}</span>
              </h2>
              <p style={{ 
                color: 'var(--text-secondary)', 
                margin: '4px 0 0 0',
                fontSize: '1rem'
              }}>
                {item.country} • {item.year} • {item.currency_name}
              </p>
            </motion.div>
            
            <motion.button
              className="modal-close"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>
          </div>

          {/* Modal Body */}
          <div className="modal-body">
            {/* Tab Navigation */}
            <motion.div 
              className="tab-navigation"
              variants={itemVariants}
              style={{
                display: 'flex',
                gap: 'var(--space-xs)',
                marginBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: 'var(--space-sm)'
              }}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <motion.button
                    key={tab.id}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      background: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                      border: '1px solid',
                      borderColor: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--border-medium)',
                      padding: 'var(--space-xs) var(--space-sm)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </motion.button>
                )
              })}
            </motion.div>

            <motion.div
              key={activeTab}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              {activeTab === 'details' && (
                <div className="modal-grid">
                  {/* Images Section */}
                  <motion.div className="modal-images" variants={itemVariants}>
                    <div className="modal-image">
                      <img
                        src={item.image_front || item.image || item.image_obverse || '/favicon.svg'}
                        alt={`${item.denomination} front`}
                        onLoad={() => setImageLoaded(true)}
                        style={{
                          opacity: imageLoaded ? 1 : 0,
                          transition: 'opacity 0.3s ease'
                        }}
                      />
                    </div>
                    <div className="modal-image">
                      <img
                        src={item.image_back || item.image_reverse || item.image || '/favicon.svg'}
                        alt={`${item.denomination} back`}
                      />
                    </div>
                  </motion.div>

                  {/* Details Section */}
                  <motion.div className="modal-info" variants={itemVariants}>
                    <div className="modal-section">
                      <h3><Coins size={20} />Specifications</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Type</span>
                          <span className="info-value">
                            {item.type === 'coin' ? '🪙' : '💵'} {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Material</span>
                          <span className="info-value">{item.material || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Weight</span>
                          <span className="info-value">{item.weight || item.weight_g || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Diameter</span>
                          <span className="info-value">{item.diameter || item.diameter_mm || item.dimensions || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Era</span>
                          <span className="info-value">{item.era || 'Modern'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Condition</span>
                          <span className="info-value">{item.condition || item.grade || 'Good'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rarity Information */}
                    <div className="modal-section">
                      <h3><Award size={18} />Rarity & Value</h3>
                      <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-md)'
                      }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                          <span style={{ fontSize: '2rem' }}>{getRarityInfo(item.rarity).icon}</span>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginTop: 'var(--space-xs)',
                            color: 'var(--text-primary)'
                          }}>
                            {item.rarity || 'Common'}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-xs)'
                          }}>
                            {getRarityInfo(item.rarity).description}
                          </div>
                        </div>
                        
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Face Value</span>
                            <span className="info-value">{item.face_value || 'N/A'}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Estimated Value</span>
                            <span className="info-value">₹{item.estimated_value || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Theme/Story */}
                    {item.theme && (
                      <div className="modal-section">
                        <h3><Star size={20} />Theme & Story</h3>
                        <div style={{
                          background: 'var(--accent-tertiary)',
                          border: '1px solid var(--accent-secondary)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-lg)'
                        }}>
                          <h4 style={{ 
                            color: 'var(--accent-primary)', 
                            margin: '0 0 var(--space-sm) 0',
                            fontSize: '1rem'
                          }}>
                            "{item.theme}"
                          </h4>
                          <p style={{ 
                            color: 'var(--text-secondary)', 
                            lineHeight: 1.6,
                            margin: 0
                          }}>
                            {item.story}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}

              {activeTab === 'history' && (
                <motion.div variants={itemVariants}>
                  <div className="modal-section">
                    <h3><BookOpen size={20} />Fun Facts</h3>
                    {item.fun_facts && item.fun_facts.length > 0 ? (
                      <div className="fun-facts">
                        <ul>
                          {item.fun_facts.map((fact, index) => (
                            <motion.li
                              key={index}
                              variants={itemVariants}
                              transition={{ delay: index * 0.1 }}
                            >
                              {fact}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No historical facts available for this item.
                      </p>
                    )}
                  </div>

                  {item.currency_name && (
                    <div className="modal-section">
                      <h3><Calendar size={20} />Currency Timeline</h3>
                      <div style={{
                        background: 'var(--bg-accent)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-lg)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            background: 'var(--accent-primary)',
                            borderRadius: '50%'
                          }} />
                          <div>
                            <div style={{ fontWeight: '600' }}>{item.year}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              {item.denomination} issued
                            </div>
                          </div>
                        </div>
                        <p style={{ 
                          color: 'var(--text-secondary)', 
                          lineHeight: 1.6,
                          margin: 0,
                          fontSize: '0.9rem'
                        }}>
                          This {item.type} is part of the {item.currency_name} series, 
                          representing the monetary system of {item.country} during the {item.era?.toLowerCase()} era.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'country' && (
                <motion.div variants={itemVariants}>
                  {item.country_info && (
                    <>
                      <div className="modal-section">
                        <h3><MapPin size={20} />Country Information</h3>
                        <div className="country-info">
                          <div style={{ marginBottom: 'var(--space-md)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Capital:</strong>{' '}
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {item.country_info.capital}
                            </span>
                          </div>
                          
                          <div style={{ marginBottom: 'var(--space-md)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Currency History:</strong>
                            <p style={{ 
                              color: 'var(--text-secondary)', 
                              lineHeight: 1.6,
                              margin: 'var(--space-sm) 0 0 0'
                            }}>
                              {item.country_info.currency_history}
                            </p>
                          </div>

                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>Interesting Fact:</strong>
                            <p style={{ 
                              color: 'var(--text-secondary)', 
                              lineHeight: 1.6,
                              margin: 'var(--space-sm) 0 0 0',
                              fontStyle: 'italic'
                            }}>
                              💡 {item.country_info.interesting_fact}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="modal-section">
                          <h3><Star size={20} />Related Topics</h3>
                          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                            {item.tags.map((tag, index) => (
                              <motion.span
                                key={tag}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                style={{
                                  background: 'var(--accent-tertiary)',
                                  color: 'var(--accent-primary)',
                                  padding: 'var(--space-xs) var(--space-sm)',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.8rem',
                                  fontWeight: '500'
                                }}
                              >
                                {tag}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
