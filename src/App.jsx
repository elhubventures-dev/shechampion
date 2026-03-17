import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AdUnit from './components/AdUnit';
import Home from './pages/Home';
import Challenge from './pages/Challenge';
import Programs from './pages/Programs';
import Network from './pages/Network';
import Seminars from './pages/Seminars';
import Contact from './pages/Contact';
import ScrollToTop from './components/ScrollToTop';
import MembershipPopup from './components/MembershipPopup';

function App() {
  return (
    <div className="app-container">
      <ScrollToTop />
      <Header />
      {/* Site-wide Ad Banner */}
      <div className="ad-between-sections">
        <AdUnit format="horizontal" />
      </div>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/challenge" element={<Challenge />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/network" element={<Network />} />
          <Route path="/seminars" element={<Seminars />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
      <MembershipPopup />
    </div>
  );
}

export default App;
