
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Tabs from './components/Tabs'
import Stats from './components/Stats'
import Grid from './components/Grid'
import Modal from './components/Modal'
import Hero from './components/Hero'

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)))

export default function App() {
  const [data, setData] = useState([])
  const [filtered, setFiltered] = useState([])
  const [activeCountry, setActiveCountry] = useState('All')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [year, setYear] = useState('')
  const [activeItem, setActiveItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [showYearDropdown, setShowYearDropdown] = useState(false)

  const searchInputRef = useRef(null)
  const yearDropdownRef = useRef(null)

  // Handle smooth scrolling
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load collection data
  useEffect(() => {
    setLoading(true)
    fetch('/data/collection.json')
      .then(r => r.json())
      .then(json => {
        if (!Array.isArray(json)) throw new Error('collection.json must be an array')
        setData(json)
        setFiltered(json)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const countries = useMemo(() => ['All', ...uniq(data.map(x => x.country)).sort()], [data])
  const years = useMemo(() => uniq(data.map(x => x.year)).filter(Boolean).sort((a, b) => b - a), [data])

  // Generate search suggestions
  const suggestions = useMemo(() => {
    const allTerms = []
    data.forEach(item => {
      allTerms.push(item.country, item.denomination, item.currency_name, item.theme)
      if (item.tags) allTerms.push(...item.tags)
    })
    return uniq(allTerms).filter(Boolean).sort()
  }, [data])

  // Handle search input with suggestions
  const handleSearchChange = (value) => {
    setQuery(value)
    
    if (value.length > 1) {
      const filteredSuggestions = suggestions
        .filter(suggestion => 
          suggestion.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 8)
      
      setSearchSuggestions(filteredSuggestions)
      setShowSuggestions(filteredSuggestions.length > 0)
    } else {
      setShowSuggestions(false)
      setSearchSuggestions([])
    }
  }

  // Filter data based on search and filters
  useEffect(() => {
    const q = query.toLowerCase().trim()
    const res = data.filter(it => {
      const searchText = [
        it.country,
        it.denomination,
        it.year,
        it.theme,
        it.currency_name,
        it.material,
        it.era,
        ...(it.tags || [])
      ].join(' ').toLowerCase()
      
      return (!type || it.type === type)
        && (!year || it.year === year)
        && (activeCountry === 'All' || it.country === activeCountry)
        && (!q || searchText.includes(q))
    })
    setFiltered(res)
  }, [data, query, type, year, activeCountry])

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    searchInputRef.current?.blur()
  }

  // Reset all filters
  const resetFilters = () => {
    setQuery('')
    setType('')
    setYear('')
    setActiveCountry('All')
    setShowSuggestions(false)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-medium)',
            borderTop: '3px solid var(--accent-primary)',
            borderRadius: '50%',
            margin: '0 auto var(--space-lg) auto',
            animation: 'spin 1s linear infinite'
          }} />
          <h3>Loading Currency Collection...</h3>
          <p>Preparing your numismatic journey</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header OUTSIDE motion wrapper for sticky to work */}
      <header 
        className="site"
        style={{
          background: scrollY > 50 
            ? 'rgba(255, 255, 255, 0.95)' 
            : 'rgba(255, 255, 255, 0.85)',
        }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Click to scroll to top"
      >
        <div className="inner" style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          paddingLeft: 'var(--space-lg)',
          paddingRight: 'var(--space-lg)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div className="brand">
            <span className="dot" aria-hidden="true"></span>
            <h1>Yash Jain</h1>
          </div>
          <p className="tag">
            Collecting currencies, debugging code
          </p>
        </div>
      </header>

      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <main className="wrap" style={{ position: 'relative', width: '100%', maxWidth: '1400px', margin: '0 auto', overflowX: 'hidden' }}>
        {/* Indian Rupee Symbol Background - Hidden on mobile */}
        <div className="inr-background" style={{
          position: 'fixed',
          top: '15%',
          right: '5%',
          fontSize: '20rem',
          color: 'rgba(212, 175, 55, 0.12)',
          fontWeight: '900',
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: 'Arial, sans-serif',
          textShadow: '2px 2px 4px rgba(196, 154, 108, 0.1)'
        }}>
          ₹
        </div>
        <div className="inr-background" style={{
          position: 'fixed',
          bottom: '15%',
          left: '5%',
          fontSize: '16rem',
          color: 'rgba(218, 165, 32, 0.1)',
          fontWeight: '900',
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          transform: 'rotate(-20deg)',
          fontFamily: 'Arial, sans-serif',
          textShadow: '2px 2px 4px rgba(196, 154, 108, 0.08)'
        }}>
          ₹
        </div>
        <div className="inr-background" style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(10deg)',
          fontSize: '25rem',
          color: 'rgba(234, 179, 8, 0.07)',
          fontWeight: '900',
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: 'Arial, sans-serif',
          textShadow: '3px 3px 6px rgba(196, 154, 108, 0.12)'
        }}>
          ₹
        </div>
        
        <div>
          <Hero collectionData={data} />
        </div>

        <section className="panel stats">
          <Stats items={filtered} />
        </section>

        <section className="panel" style={{ position: 'relative', zIndex: 2 }}>
          {/* Modern Glass-morphism Filter Bar */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(249,250,251,0.9))',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md)',
            border: '1px solid rgba(196, 154, 108, 0.15)',
            boxShadow: '0 8px 32px rgba(196, 154, 108, 0.12)',
            marginBottom: 'var(--space-lg)',
            position: 'relative',
            zIndex: 2
          }}>
            {/* Main Filter Controls */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-md)',
              alignItems: 'stretch'
            }}>
              {/* Search Input with Icon */}
              <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                <div style={{ 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 'var(--space-md)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.1rem',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}>
                    🔍
                  </span>
                  <motion.input
                    ref={searchInputRef}
                    placeholder="Search by country, denomination, theme..."
                    value={query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => query.length > 1 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    whileFocus={{ 
                      boxShadow: '0 0 0 3px rgba(196, 154, 108, 0.15)',
                      borderColor: '#c49a6c'
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm) calc(var(--space-md) * 2.5) var(--space-sm) calc(var(--space-md) * 2.8)',
                      border: '2px solid transparent',
                      borderRadius: 'var(--radius-md)',
                      background: 'white',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      height: '44px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {query && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => {
                        setQuery('')
                        setShowSuggestions(false)
                      }}
                      style={{
                        position: 'absolute',
                        right: 'var(--space-sm)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(196, 154, 108, 0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        minWidth: '28px',
                        minHeight: '28px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        color: '#92400e',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        zIndex: 2,
                        padding: 0,
                        flexShrink: 0
                      }}
                      whileHover={{ 
                        background: 'rgba(196, 154, 108, 0.25)',
                        scale: 1.1
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ✕
                    </motion.button>
                  )}
                </div>
                
                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid rgba(196, 154, 108, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                      zIndex: 100,
                      maxHeight: '280px',
                      overflowY: 'auto',
                      overflowX: 'hidden'
                    }}
                  >
                    {searchSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        style={{
                          padding: 'var(--space-sm) var(--space-md)',
                          cursor: 'pointer',
                          borderBottom: index < searchSuggestions.length - 1 ? '1px solid rgba(196, 154, 108, 0.1)' : 'none',
                          fontSize: '0.9rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-sm)'
                        }}
                        onMouseDown={() => handleSuggestionClick(suggestion)}
                        whileHover={{
                          background: 'linear-gradient(90deg, rgba(196, 154, 108, 0.08), rgba(196, 154, 108, 0.04))',
                          color: 'var(--text-primary)',
                          paddingLeft: 'calc(var(--space-md) + 4px)'
                        }}
                      >
                        <span style={{ opacity: 0.5 }}>🔍</span>
                        <span>{suggestion}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
              
              {/* Type Filter - Modern Button Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                <label style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Type
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '4px',
                  background: 'rgba(196, 154, 108, 0.08)',
                  padding: '4px',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {[
                    { value: '', label: 'All', icon: '💰' },
                    { value: 'coin', label: 'Coins', icon: '🪙' },
                    { value: 'note', label: 'Notes', icon: '💵' }
                  ].map(option => (
                    <motion.button
                      key={option.value}
                      onClick={() => setType(option.value)}
                      whileHover={{ scale: type !== option.value ? 1.05 : 1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: type === option.value 
                          ? 'linear-gradient(135deg, #c49a6c, #d4af6a)' 
                          : 'transparent',
                        color: type === option.value ? 'white' : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: type === option.value ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: type === option.value ? '0 2px 8px rgba(196, 154, 108, 0.3)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontFamily: 'inherit'
                      }}
                    >
                      <span>{option.icon}</span>
                      <span style={{ fontSize: '0.8rem' }}>{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Year Filter - Custom Elegant Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', position: 'relative', zIndex: 20 }}>
                <label style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Year
                </label>
                <div ref={yearDropdownRef} style={{ position: 'relative', zIndex: 20 }}>
                  <motion.button
                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                    whileHover={{ 
                      boxShadow: '0 4px 12px rgba(196, 154, 108, 0.2)',
                      borderColor: '#c49a6c'
                    }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm) var(--space-md)',
                      paddingRight: 'calc(var(--space-md) * 2.5)',
                      border: '2px solid transparent',
                      borderRadius: 'var(--radius-md)',
                      background: year 
                        ? 'linear-gradient(135deg, rgba(196, 154, 108, 0.15), rgba(212, 175, 110, 0.1))' 
                        : 'white',
                      color: year ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: year ? '600' : '400',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>📅</span>
                    <span>{year || 'All Years'}</span>
                    <motion.span 
                      animate={{ rotate: showYearDropdown ? 180 : 0 }}
                      style={{
                        position: 'absolute',
                        right: 'var(--space-md)',
                        fontSize: '0.7rem',
                        color: year ? 'var(--accent-primary)' : 'var(--text-muted)',
                        transition: 'transform 0.3s ease'
                      }}
                    >
                      ▼
                    </motion.span>
                  </motion.button>
                  
                  {/* Custom Dropdown Menu */}
                  {showYearDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(135deg, #ffffff, #fefefe)',
                        border: '1px solid rgba(196, 154, 108, 0.2)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(196, 154, 108, 0.1)',
                        zIndex: 10010,
                        maxHeight: '320px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        backdropFilter: 'blur(10px)',
                        padding: 'var(--space-xs)'
                      }}
                    >
                      {/* All Years Option */}
                      <motion.div
                        onClick={() => {
                          setYear('')
                          setShowYearDropdown(false)
                        }}
                        whileHover={{ 
                          x: 4,
                          background: 'linear-gradient(90deg, rgba(196, 154, 108, 0.12), rgba(196, 154, 108, 0.06))'
                        }}
                        style={{
                          padding: 'var(--space-sm) var(--space-md)',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          color: !year ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontWeight: !year ? '600' : '400',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-sm)',
                          transition: 'all 0.2s ease',
                          background: !year ? 'linear-gradient(90deg, rgba(196, 154, 108, 0.15), rgba(196, 154, 108, 0.08))' : 'transparent',
                          marginBottom: 'var(--space-xs)'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📅</span>
                        <span style={{ flex: 1 }}>All Years</span>
                        {!year && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{ fontSize: '1rem' }}
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.div>
                      
                      {/* Divider */}
                      <div style={{
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(196, 154, 108, 0.2), transparent)',
                        margin: 'var(--space-xs) 0'
                      }} />
                      
                      {/* Year Options */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 'var(--space-xs)'
                      }}>
                        {years.map((yr, index) => (
                          <motion.div
                            key={yr}
                            onClick={() => {
                              setYear(yr)
                              setShowYearDropdown(false)
                            }}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            whileHover={{ 
                              scale: 1.05,
                              background: 'linear-gradient(135deg, rgba(196, 154, 108, 0.2), rgba(212, 175, 110, 0.15))',
                              boxShadow: '0 4px 12px rgba(196, 154, 108, 0.2)'
                            }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: 'var(--space-sm)',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.85rem',
                              color: year === yr ? 'white' : 'var(--text-secondary)',
                              fontWeight: year === yr ? '700' : '500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              background: year === yr 
                                ? 'linear-gradient(135deg, #c49a6c, #d4af6a)' 
                                : 'transparent',
                              border: year === yr ? '2px solid #c49a6c' : '2px solid transparent',
                              boxShadow: year === yr ? '0 4px 12px rgba(196, 154, 108, 0.3)' : 'none',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            {year === yr && (
                              <motion.div
                                layoutId="activeYear"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0))',
                                  borderRadius: 'var(--radius-md)'
                                }}
                              />
                            )}
                            <span style={{ position: 'relative', zIndex: 1 }}>{yr}</span>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Footer hint */}
                      <div style={{
                        marginTop: 'var(--space-sm)',
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'linear-gradient(90deg, rgba(196, 154, 108, 0.05), transparent)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}>
                        {years.length} years available
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Active Filters & Clear Button */}
            {(query || type || year || activeCountry !== 'All') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginTop: 'var(--space-md)',
                  paddingTop: 'var(--space-md)',
                  borderTop: '1px solid rgba(196, 154, 108, 0.15)'
                }}
              >
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Active Filters:
                </span>
                
                {query && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                      color: '#92400e',
                      padding: '6px var(--space-md)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    <span>🔍</span>
                    <span>"{query}"</span>
                  </motion.span>
                )}
                
                {type && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      background: 'linear-gradient(135deg, #fed7aa, #fdba74)',
                      color: '#9a3412',
                      padding: '6px var(--space-md)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      boxShadow: '0 2px 8px rgba(251, 146, 60, 0.2)'
                    }}
                  >
                    <span>{type === 'coin' ? '🪙' : '💵'}</span>
                    <span>{type === 'coin' ? 'Coins' : 'Notes'}</span>
                  </motion.span>
                )}
                
                {year && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      background: 'linear-gradient(135deg, #d9f99d, #bef264)',
                      color: '#3f6212',
                      padding: '6px var(--space-md)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      boxShadow: '0 2px 8px rgba(132, 204, 22, 0.2)'
                    }}
                  >
                    <span>📅</span>
                    <span>{year}</span>
                  </motion.span>
                )}
                
                {activeCountry !== 'All' && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      background: 'linear-gradient(135deg, #fecaca, #fca5a5)',
                      color: '#991b1b',
                      padding: '6px var(--space-md)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      boxShadow: '0 2px 8px rgba(248, 113, 113, 0.2)'
                    }}
                  >
                    <span>🌍</span>
                    <span>{activeCountry}</span>
                  </motion.span>
                )}
                
                <motion.button
                  onClick={resetFilters}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 4px 12px rgba(196, 154, 108, 0.3)'
                  }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    marginLeft: 'auto',
                    padding: 'var(--space-xs) var(--space-lg)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--accent-primary), #d4af6a)',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    fontFamily: 'inherit',
                    boxShadow: '0 2px 8px rgba(196, 154, 108, 0.3)'
                  }}
                >
                  <span>✕</span>
                  <span>Clear All</span>
                </motion.button>
              </motion.div>
            )}
          </div>
        </section>

        <section className="panel" style={{ position: 'relative', zIndex: 1 }}>
          <Tabs 
            countries={countries} 
            active={activeCountry} 
            onChange={setActiveCountry} 
            counts={countByCountry(filtered, data)} 
          />
        </section>

        <section style={{ position: 'relative', zIndex: 1, marginTop: 'var(--space-md)' }}>
          <Grid items={filtered} onOpen={setActiveItem} />
        </section>

        {activeItem && (
          <Modal item={activeItem} onClose={() => setActiveItem(null)} />
        )}

        <footer className="site">
          <div>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}>
              Every coin tells a story • Every journey adds a treasure
            </p>
          </div>
        </footer>
      </main>
      </div>
    </>
  )
}

function countByCountry(view, full) {
  const all = full.reduce((acc, it) => { acc[it.country] = (acc[it.country] || 0) + 1; return acc }, {})
  const vis = view.reduce((acc, it) => { acc[it.country] = (acc[it.country] || 0) + 1; return acc }, {})
  return { all, vis }
}
