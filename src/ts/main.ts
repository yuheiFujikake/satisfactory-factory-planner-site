import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ============================
// Scroll Progress Bar
// ============================
function initScrollProgress(): void {
  const bar = document.querySelector<HTMLElement>('.scroll-progress__bar')
  if (!bar) return

  const update = (): void => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
    bar.style.width = `${pct}%`
  }

  window.addEventListener('scroll', update, { passive: true })
  update()
}

// ============================
// Header scroll behavior
// ============================
function initHeader(): void {
  const header = document.querySelector<HTMLElement>('.header')
  if (!header) return

  let lastY = 0

  const update = (): void => {
    const y = window.scrollY
    if (y > 60) {
      header.classList.add('is-scrolled')
    } else {
      header.classList.remove('is-scrolled')
    }
    lastY = y
  }

  window.addEventListener('scroll', update, { passive: true })
  update()

  // Active nav link highlight
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav__link')
  const sections = Array.from(links)
    .map(link => {
      const href = link.getAttribute('href')
      const id = href?.replace('#', '')
      return id ? document.getElementById(id) : null
    })
    .filter(Boolean) as HTMLElement[]

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('is-active'))
          const activeLink = Array.from(links).find(
            l => l.getAttribute('href') === `#${entry.target.id}`
          )
          activeLink?.classList.add('is-active')
        }
      })
    },
    { rootMargin: '-40% 0px -55% 0px' }
  )

  sections.forEach(s => observer.observe(s))
}

// ============================
// Mobile Menu
// ============================
function initMobileMenu(): void {
  const btn = document.querySelector<HTMLButtonElement>('.nav__menu-btn')
  const menu = document.querySelector<HTMLElement>('.nav__mobile-menu')
  if (!btn || !menu) return

  const toggle = (): void => {
    const isOpen = btn.classList.toggle('is-open')
    menu.classList.toggle('is-open', isOpen)
    btn.setAttribute('aria-expanded', String(isOpen))
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }

  btn.addEventListener('click', toggle)

  // Close on link click
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('is-open')
      menu.classList.remove('is-open')
      btn.setAttribute('aria-expanded', 'false')
      document.body.style.overflow = ''
    })
  })
}

// ============================
// Canvas particle background
// ============================
class FactoryCanvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private nodes: Array<{
    x: number; y: number
    vx: number; vy: number
    size: number; opacity: number
    isSquare: boolean
    pulsePhase: number
  }>
  private frameId = 0
  private mouseX = -9999
  private mouseY = -9999

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.nodes = []
    this.resize()
    this.initNodes()
    this.animate()

    window.addEventListener('resize', () => {
      this.resize()
      this.initNodes()
    }, { passive: true })

    canvas.parentElement?.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      this.mouseX = e.clientX - rect.left
      this.mouseY = e.clientY - rect.top
    }, { passive: true })

    canvas.parentElement?.addEventListener('mouseleave', () => {
      this.mouseX = -9999
      this.mouseY = -9999
    }, { passive: true })
  }

  private resize(): void {
    const parent = this.canvas.parentElement
    if (!parent) return
    this.canvas.width = parent.offsetWidth
    this.canvas.height = parent.offsetHeight
  }

  private initNodes(): void {
    const { width, height } = this.canvas
    const count = Math.max(20, Math.floor((width * height) / 18000))
    this.nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 2 + 1.5,
      opacity: Math.random() * 0.5 + 0.2,
      isSquare: Math.random() > 0.7,
      pulsePhase: Math.random() * Math.PI * 2,
    }))
  }

  private animate = (): void => {
    const { ctx, canvas, nodes } = this
    const t = performance.now() * 0.001

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const PRIMARY = [79, 142, 247]
    const AMBER   = [245, 158, 11]

    nodes.forEach((node, i) => {
      // Move
      node.x += node.vx
      node.y += node.vy

      // Mouse repulsion
      const mdx = node.x - this.mouseX
      const mdy = node.y - this.mouseY
      const mdist = Math.hypot(mdx, mdy)
      if (mdist < 100) {
        const force = (100 - mdist) / 100 * 0.3
        node.vx += (mdx / mdist) * force
        node.vy += (mdy / mdist) * force
      }

      // Speed limit
      const speed = Math.hypot(node.vx, node.vy)
      if (speed > 0.8) { node.vx *= 0.8 / speed; node.vy *= 0.8 / speed }

      // Bounce
      if (node.x < 0 || node.x > canvas.width)  node.vx *= -1
      if (node.y < 0 || node.y > canvas.height)  node.vy *= -1

      // Pulse opacity
      const pulse = Math.sin(t * 1.2 + node.pulsePhase) * 0.2
      const alpha = Math.max(0.1, node.opacity + pulse)

      // Color: alternate between primary and accent
      const [r, g, b] = i % 5 === 0 ? AMBER : PRIMARY

      // Draw node
      ctx.beginPath()
      if (node.isSquare) {
        ctx.rect(node.x - node.size, node.y - node.size, node.size * 2, node.size * 2)
      } else {
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.fill()

      // Connections
      for (let j = i + 1; j < nodes.length; j++) {
        const other = nodes[j]
        const dist = Math.hypot(node.x - other.x, node.y - other.y)
        const maxDist = 140

        if (dist < maxDist) {
          const lineAlpha = ((1 - dist / maxDist) * 0.18) * alpha
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(other.x, other.y)
          ctx.strokeStyle = `rgba(${PRIMARY[0]},${PRIMARY[1]},${PRIMARY[2]},${lineAlpha})`
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }
    })

    this.frameId = requestAnimationFrame(this.animate)
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId)
  }
}

// ============================
// Scroll Reveal (Intersection Observer)
// ============================
function initScrollReveal(): void {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          // Don't unobserve — keep visible
        }
      })
    },
    { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
  )

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
}

// ============================
// GSAP Hero animations (already done via CSS for first paint,
// but we can enhance with GSAP for more complex effects)
// ============================
function initHeroAnimations(): void {
  // Stagger reveal for hero content (runs on top of CSS animations)
  const tl = gsap.timeline({ delay: 0.1 })

  tl.from('.hero__badge', {
    y: 20, opacity: 0, duration: 0.7, ease: 'power3.out'
  })
  .from('.hero__title-line', {
    y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12
  }, '-=0.4')
  .from('.hero__subtitle', {
    y: 20, opacity: 0, duration: 0.7, ease: 'power3.out'
  }, '-=0.5')
  .from('.hero__actions .btn', {
    y: 16, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1
  }, '-=0.4')
  .from('.hero__visual', {
    x: 40, opacity: 0, duration: 1, ease: 'power3.out'
  }, '-=0.8')
}

// ============================
// Counter animations
// ============================
function initCounters(): void {
  const counters = document.querySelectorAll<HTMLElement>('.stat-card__number')

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        observer.unobserve(entry.target)

        const el = entry.target as HTMLElement
        const target = parseInt(el.dataset.target ?? '0', 10)
        const countEl = el.querySelector<HTMLElement>('.stat-card__count')
        if (!countEl) return

        const duration = 1800
        const start = performance.now()
        const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)

        const tick = (now: number): void => {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)
          const value = Math.round(easeOut(progress) * target)
          countEl.textContent = value.toString()
          if (progress < 1) requestAnimationFrame(tick)
        }

        requestAnimationFrame(tick)
      })
    },
    { threshold: 0.5 }
  )

  counters.forEach(c => observer.observe(c))
}

// ============================
// Stagger reveal for grids
// ============================
function initGridAnimations(): void {
  // Feature cards
  const featureCards = document.querySelectorAll('.feature-card')
  const featureObserver = new IntersectionObserver(
    entries => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            ;(entry.target as HTMLElement).style.opacity = '1'
            ;(entry.target as HTMLElement).style.transform = 'translateY(0)'
          }, 0)
          featureObserver.unobserve(entry.target)
        }
      })
    },
    { rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
  )

  featureCards.forEach((card, i) => {
    const el = card as HTMLElement
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = `opacity 0.6s ${i * 0.1}s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s ${i * 0.1}s cubic-bezier(0.16, 1, 0.3, 1)`
    featureObserver.observe(card)
  })

  // Steps
  const steps = document.querySelectorAll('.howto__step')
  const stepObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ;(entry.target as HTMLElement).style.opacity = '1'
          ;(entry.target as HTMLElement).style.transform = 'translateY(0)'
          stepObserver.unobserve(entry.target)
        }
      })
    },
    { rootMargin: '0px 0px -40px 0px', threshold: 0.15 }
  )

  steps.forEach((step, i) => {
    const el = step as HTMLElement
    el.style.opacity = '0'
    el.style.transform = 'translateY(30px)'
    el.style.transition = `opacity 0.7s ${i * 0.15}s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s ${i * 0.15}s cubic-bezier(0.16, 1, 0.3, 1)`
    stepObserver.observe(step)
  })

  // About problems
  const problems = document.querySelectorAll('.about__problem')
  const probObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ;(entry.target as HTMLElement).style.opacity = '1'
          ;(entry.target as HTMLElement).style.transform = 'translateX(0)'
          probObserver.unobserve(entry.target)
        }
      })
    },
    { rootMargin: '0px 0px -30px 0px', threshold: 0.1 }
  )

  problems.forEach((p, i) => {
    const el = p as HTMLElement
    el.style.opacity = '0'
    el.style.transform = 'translateX(20px)'
    el.style.transition = `opacity 0.6s ${i * 0.1}s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s ${i * 0.1}s cubic-bezier(0.16, 1, 0.3, 1)`
    probObserver.observe(p)
  })
}

// ============================
// Demo screenshot tilt effect
// ============================
function initTiltEffect(): void {
  const frames = document.querySelectorAll<HTMLElement>('.demo__browser-frame')

  frames.forEach(frame => {
    const MAX_TILT = 6

    frame.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = frame.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)

      frame.style.transform = `
        perspective(900px)
        rotateY(${dx * MAX_TILT}deg)
        rotateX(${-dy * MAX_TILT}deg)
        translateZ(8px)
      `
    })

    frame.addEventListener('mouseleave', () => {
      frame.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      frame.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0)'
      setTimeout(() => { frame.style.transition = '' }, 500)
    })
  })
}

// ============================
// Section reveal using GSAP ScrollTrigger
// ============================
function initSectionReveals(): void {
  // Section headers
  gsap.utils.toArray<Element>('.section-header').forEach(header => {
    gsap.from(header.querySelectorAll('.section-tag, .section-title, .section-desc'), {
      scrollTrigger: {
        trigger: header,
        start: 'top 80%',
      },
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
    })
  })

  // Demo screens
  gsap.utils.toArray<Element>('.demo__screen').forEach((screen, i) => {
    gsap.from(screen, {
      scrollTrigger: {
        trigger: screen,
        start: 'top 80%',
      },
      y: 40,
      opacity: 0,
      duration: 0.9,
      delay: i * 0.2,
      ease: 'power3.out',
    })
  })

  // Stats
  gsap.from('.stats__grid', {
    scrollTrigger: {
      trigger: '.stats',
      start: 'top 75%',
    },
    y: 20,
    opacity: 0,
    duration: 0.7,
    ease: 'power3.out',
  })

  // CTA
  gsap.from('.cta__inner > *', {
    scrollTrigger: {
      trigger: '.cta',
      start: 'top 75%',
    },
    y: 24,
    opacity: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: 'power3.out',
  })
}

// ============================
// Smooth scroll for anchor links
// ============================
function initSmoothScroll(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href')
      if (!href || href === '#') return

      const target = document.querySelector<HTMLElement>(href)
      if (!target) return

      e.preventDefault()

      const headerHeight = document.querySelector<HTMLElement>('.header')?.offsetHeight ?? 70
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16

      window.scrollTo({ top, behavior: 'smooth' })
    })
  })
}

// ============================
// CTA button glow on hover
// ============================
function initButtonEffects(): void {
  document.querySelectorAll<HTMLElement>('.btn--primary').forEach(btn => {
    btn.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      btn.style.setProperty('--btn-gx', `${x}%`)
      btn.style.setProperty('--btn-gy', `${y}%`)
    })
  })
}

// ============================
// Mock table row animation
// ============================
function initMockTableRows(): void {
  const rows = document.querySelectorAll<HTMLElement>('.hero__mock-table tbody tr')
  const observer = new IntersectionObserver(
    () => {
      rows.forEach((row, i) => {
        row.style.opacity = '0'
        row.style.transform = 'translateX(-10px)'
        row.style.transition = `opacity 0.5s ${0.8 + i * 0.08}s, transform 0.5s ${0.8 + i * 0.08}s`
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            row.style.opacity = '1'
            row.style.transform = 'translateX(0)'
          })
        })
      })
      observer.disconnect()
    },
    { threshold: 0.3 }
  )

  const table = document.querySelector('.hero__screen-mock')
  if (table) observer.observe(table)
}

// ============================
// Main init
// ============================
function init(): void {
  initScrollProgress()
  initHeader()
  initMobileMenu()
  initSmoothScroll()
  initScrollReveal()
  initCounters()
  initGridAnimations()
  initTiltEffect()
  initButtonEffects()
  initMockTableRows()

  initSectionReveals()

  // Canvas background
  const canvas = document.querySelector<HTMLCanvasElement>('.hero__canvas')
  if (canvas) {
    new FactoryCanvas(canvas)
  }

  // Reveal about section elements
  const aboutInner = document.querySelector('.about__inner')
  if (aboutInner) {
    gsap.from('.about__text', {
      scrollTrigger: { trigger: '.about', start: 'top 75%' },
      x: -30, opacity: 0, duration: 0.9, ease: 'power3.out'
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
