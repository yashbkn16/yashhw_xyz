
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import YashJainImage from '../images/YashJain.jpg'
import { Italic } from 'lucide-react'

export default function Hero({ collectionData = [] }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)

  const getCollectionStats = () => {
    const countries = new Set(collectionData.map(item => item.country)).size
    const coins = collectionData.filter(item => item.type === 'coin').length
    const notes = collectionData.filter(item => item.type === 'note').length
    return { countries, coins, notes, total: coins + notes }
  }

  const stats = getCollectionStats()

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 50,
        y: (e.clientY - window.innerHeight / 2) / 50
      })
    }

    const handleScroll = () => setScrollY(window.scrollY)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  }

  const floatingCoins = [
    { id: 1, size: 40, delay: 0 },
    { id: 2, size: 30, delay: 1 },
    { id: 3, size: 35, delay: 2 },
    { id: 4, size: 25, delay: 3 }
  ]

  return (
    <section className="hero" id="top">
      <motion.div 
        className="hero-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          transform: `translateY(${scrollY * 0.1}px)`
        }}
      >
        <motion.h2 variants={itemVariants}>
          Hoarding money from around the world
          <br />
          <span style={{ color: 'var(--accent-primary)', fontSize: '0.6em' }}>
            (legally, and mostly worthless)
          </span>
        </motion.h2>
        
        <motion.p variants={itemVariants}>
          It started when Dad's close friend, <strong>Dr. Ramniwas</strong>, returned from the US 
          and gifted me a few US Dollars. That spark turned into an obsession. Now my family:<strong> Mom</strong>, 
          <strong> Dad</strong>, <strong> Sister (Gauri)</strong>, and even <strong>Rusty 🐕 </strong> 
          know the drill - <b>bring back currencies</b>. Friends traveling abroad? Same deal. 
        </motion.p>

        <motion.p variants={itemVariants}>  
          Once I've stacked enough duplicates, I trade with fellow numismatists. It's basically Pokémon, but with money.
        </motion.p>
          
      </motion.div>
{/* Special thanks to <strong>Snigdha Sanghi</strong>, my lovely girlfriend, and professional cutie certifier. */}
      <motion.div 
        className="hero-card"
        initial={{ opacity: 0, rotateY: -30 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        style={{
          transform: `perspective(1000px) rotateX(${mousePosition.y * 0.1}deg) rotateY(${mousePosition.x * 0.1}deg) translateY(${scrollY * 0.05}px)`
        }}
      >
        <div className="hero-coin">
          {/* Floating background coins */}
          {floatingCoins.map((coin) => (
            <motion.div
              key={coin.id}
              className="floating-coin"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1],
                rotate: [0, 360]
              }}
              transition={{
                duration: 8,
                delay: coin.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                width: coin.size,
                height: coin.size,
                background: 'linear-gradient(45deg, var(--gold), var(--gold-light))',
                borderRadius: '50%',
                top: `${20 + coin.id * 15}%`,
                left: `${10 + coin.id * 20}%`,
                filter: 'blur(1px)',
                zIndex: 1
              }}
            />
          ))}
          
          <motion.img 
            src={YashJainImage}
            alt="Yash Jain"
            initial={{ scale: 0.8, rotateY: 0 }}
            animate={{ 
              scale: 1,
              rotateY: [0, 10, -10, 0]
            }}
            transition={{
              scale: { duration: 0.8, delay: 0.8 },
              rotateY: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            style={{
              position: 'relative',
              zIndex: 2,
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'center 35%',
              width: '220px',
              height: '220px',
              border: '4px solid var(--card-bg)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}
          />
        </div>
        
        <motion.div 
          className="personal-info"
          variants={itemVariants}
          style={{
            background: 'var(--accent-tertiary)',
            border: '1px solid var(--accent-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}
        >
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
            Certified Cutie
          </div>
          <div>Sr. Software Engineer at CommVault • NIT Jaipur '22</div>
          <div style={{ marginTop: 'var(--space-xs)' }}>
            <a href="https://x.com/_yashhw" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', marginRight: 'var(--space-sm)' }}>X</a>
            <a href="https://www.instagram.com/_yashw/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', marginRight: 'var(--space-sm)' }}>Instagram</a>
            <a href="https://www.linkedin.com/in/yashhw/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>LinkedIn</a>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
