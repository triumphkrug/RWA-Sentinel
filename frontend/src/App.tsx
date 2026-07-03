import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Problem from './components/Problem'
import Pipeline from './components/Pipeline'
import TrustFactors from './components/TrustFactors'
import UseCases from './components/UseCases'
import WhyTimeLimited from './components/WhyTimeLimited'
import SDKSection from './components/SDKSection'
import Architecture from './components/Architecture'
import FAQ from './components/FAQ'
import CtaFooter from './components/CtaFooter'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import NotFound from './components/NotFound'
import PortalLayout from './components/portal/PortalLayout'
import Overview from './components/portal/Overview'
import Assets from './components/portal/Assets'
import Oracles from './components/portal/Oracles'
import Governance from './components/portal/Governance'
import SBT from './components/portal/SBT'
import Contracts from './components/portal/Contracts'
import Anomalies from './components/portal/Anomalies'
import AgentDemo from './components/portal/AgentDemo'
import Playground from './components/portal/Playground'

function Landing() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const raf = requestAnimationFrame(() => {
        const el = document.getElementById(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <Hero />
      <Problem />
      <Pipeline />
      <TrustFactors />
      <UseCases />
      <WhyTimeLimited />
      <Architecture />
      <SDKSection />
      <FAQ />
      <CtaFooter />
    </>
  )
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1" onClick={mobileOpen ? closeMobile : undefined}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="assets" element={<Assets />} />
            <Route path="oracles" element={<Oracles />} />
            <Route path="governance" element={<Governance />} />
            <Route path="sbt" element={<SBT />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="anomalies" element={<Anomalies />} />
            <Route path="agent-demo" element={<AgentDemo />} />
            <Route path="playground" element={<Playground />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
