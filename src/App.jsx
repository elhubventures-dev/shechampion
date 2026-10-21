import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Challenge from './pages/Challenge';
import Programs from './pages/Programs';
import Network from './pages/Network';
import Seminars from './pages/Seminars';
import Contact from './pages/Contact';
import EventChallenge2026 from './pages/EventChallenge2026';
import PaymentResult from './pages/PaymentResult';
import EventPrivacyNotice from './pages/legal/EventPrivacyNotice';
import EventParticipationTerms from './pages/legal/EventParticipationTerms';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ScrollToTop from './components/ScrollToTop';
import FloatingActions from './components/FloatingActions';
import MembershipPopup from './components/MembershipPopup';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <div className="app-container">
        <ScrollToTop />
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/event-registrations" element={<AdminDashboard />} />
          <Route path="/admin/*" element={<AdminLogin />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <ScrollToTop />
      <Header />
      <main className="main-content" id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/challenge" element={<Challenge />} />
          <Route
            path="/business-empowerment-challenge-2026"
            element={<EventChallenge2026 />}
          />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/legal/event-privacy-notice" element={<EventPrivacyNotice />} />
          <Route
            path="/legal/event-participation-terms"
            element={<EventParticipationTerms />}
          />
          <Route path="/programs" element={<Programs />} />
          <Route path="/network" element={<Network />} />
          <Route path="/seminars" element={<Seminars />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
      <FloatingActions />
      <MembershipPopup />
    </div>
  );
}

export default App;
