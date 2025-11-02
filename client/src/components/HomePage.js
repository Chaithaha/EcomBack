import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./common/LoadingSpinner";
import ErrorMessage from "./common/ErrorMessage";
import Header from "./Header";
import ProductCard from "./ProductCard";
import AuthDebug from "./AuthDebug";
import AuthPopup from "./common/AuthPopup";
import "../NewLandingPage.css";
import apiClient from '../utils/apiClient';

// Helper function to normalize URLs and prevent double slashes
const normalizeUrl = (baseUrl, endpoint) => {
  // Remove trailing slash from base URL
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  // Remove leading slash from endpoint
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  return `${normalizedBaseUrl}/${normalizedEndpoint}`;
};

const HomePage = ({ isDarkMode, setIsDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Handle authentication popup - only show after initial mount
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      return;
    }

    // Show popup when authentication state changes
    setShowAuthPopup(true);
  }, [isAuthenticated, hasMounted]);

  // Fetch products when component mounts, when page gains focus, or when location changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching products from: api/items");

        const { success, data, error } = await apiClient.get('api/items');

        if (success) {
          console.log("Fetched products:", data.length);
          setProducts(data);
        } else {
          console.error("Error response:", error);
          throw new Error(`HTTP error: ${error}`);
        }

      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Network error. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Add event listener for when page gains focus (e.g., navigating back from create post)
    const handleFocus = () => {
      fetchProducts();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [location.key]); // Add location.key as dependency to refresh on navigation

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { success, data, error } = await apiClient.get(`api/items?search=${encodeURIComponent(searchQuery)}`);

      if (success) {
        setProducts(data);
      } else {
        setError(error || "Search failed");
      }
    } catch (err) {
      setError("Network error during search");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (productId) => {
    navigate(`/product/${productId}`);
  };

  return (
    <div className="landing-page">
      <div className="layout-container">
        {/* Debug Component */}
        {user &&
          (user.email === "admin@example.com" || user.role === "admin") && (
            <AuthDebug />
          )}

        {/* Header Component */}
        <Header
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          isAuthenticated={isAuthenticated}
          user={user}
          username={user?.email || ""}
          onLogout={async () => {
            try {
              await logout();
              navigate("/home");
            } catch (error) {
              console.error("Logout failed:", error);
              // Still navigate even if logout fails
              navigate("/home");
            }
          }}
        />

        {/* Main Content */}
        <main className="main-content">
          <div className="content-container">
            {/* Hero Section */}
            <div className="hero">
              <div className="hero-content">
                <h1 className="hero-title">
                  ForOranges. Verified. Transparent.
                </h1>
                <h2 className="hero-subtitle">
                  The Marketplace Where Diagnostics Aren't Optional.
                </h2>
              </div>
              {/* Search Section */}
              <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                  <div className="search-wrapper">
                    <span className="search-icon">
                      <span className="material-symbols-outlined">search</span>
                    </span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search by Device, Model, or... Battery Health."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="search-btn">
                      Search
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Products Section */}
            <div className="products-section">
              <div className="products-header">
                <h2>Latest Listings</h2>
              </div>
              <div className="products-grid">
                {loading ? (
                  <div className="loading-container">
                    <LoadingSpinner />
                  </div>
                ) : error ? (
                  <div className="error-container">
                    <ErrorMessage message={error} />
                  </div>
                ) : products.length === 0 ? (
                  <div className="no-products-container">
                    <h3>No products found</h3>
                    <p>Check back later for new listings.</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onViewDetails={handleViewDetails}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Authentication Popup */}
      <AuthPopup
        isAuthenticated={isAuthenticated}
        username={user?.email || ""}
        isVisible={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
      />
    </div>
  );
};

export default HomePage;
