
// window.addEventListener('load', trackPageView);
// Initialize Firebase with Analytics
const firebaseConfig = {
    apiKey: "AIzaSyCvKDqPjERac1yh0O4BcARsuag6hNN9_1A",
    authDomain: "foodidu-website.firebaseapp.com",
    projectId: "foodidu-website",
    storageBucket: "foodidu-website.appspot.com",
    messagingSenderId: "515131692962",
    appId: "1:515131692962:web:5d81b9e165181ec80bc4fb"
};

// Initialize Firebase with error handling
let db, analytics;
let isFirebaseReady = false;
let userProfile = {};

try {
    console.log("Initializing Firebase...");
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    analytics = firebase.analytics();
    isFirebaseReady = true;
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Failed to initialize Firebase:", error);
    isFirebaseReady = false;
}

// Device and Browser Detection
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let os = 'unknown';
    let browser = 'unknown';
    
    // Device Type Detection
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
        deviceType = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
        deviceType = 'mobile';
    }
    
    // OS Detection
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    // Browser Detection
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';
    
    return {
        type: deviceType,
        os: os,
        browser: browser,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        languages: navigator.languages || [navigator.language],
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        userAgent: ua
    };
}

// Location Detection
async function getLocationInfo() {
    try {
        // First try to get precise location (requires user permission)
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                { timeout: 10000, enableHighAccuracy: false }
            );
        });
        
        return {
            type: 'precise',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
        };
    } catch (error) {
        console.log('Precise location not available, trying IP-based location');
        
        // Fallback to IP-based location
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            return {
                type: 'ip_based',
                country: data.country_name,
                countryCode: data.country_code,
                region: data.region,
                city: data.city,
                postal: data.postal,
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                isp: data.org
            };
        } catch (ipError) {
            console.warn('IP-based location failed:', ipError);
            return {
                type: 'none',
                error: 'Location detection failed'
            };
        }
    }
}

// User Identification
function getUserInfo() {
    // Check for existing user data
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // Generate or retrieve user ID
    if (!userData.userId) {
        userData.userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    // Try to get user name from various sources
    if (!userData.userName) {
        // Check if user has filled any forms with name
        const nameInputs = document.querySelectorAll('input[name*="name"], input[id*="name"]');
        nameInputs.forEach(input => {
            if (input.value && input.value.length > 2) {
                userData.userName = input.value;
            }
        });
        
        // Check for logged-in user data (if you have authentication)
        if (window.currentUser && window.currentUser.displayName) {
            userData.userName = window.currentUser.displayName;
        }
    }
    
    // Save updated user data
    localStorage.setItem('userData', JSON.stringify(userData));
    return userData;
}

// Enhanced visitor ID with more entropy
function getVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        const deviceInfo = getDeviceInfo();
        const fingerprint = btoa(deviceInfo.userAgent + deviceInfo.screenWidth + deviceInfo.timezone).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8);
        visitorId = 'visitor_' + fingerprint + '_' + Date.now();
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
}

// Enhanced Analytics Events
function trackEnhancedEvent(eventName, eventParams = {}) {
    if (!isFirebaseReady || !analytics) return;
    
    const enhancedParams = {
        ...eventParams,
        visitor_id: getVisitorId(),
        user_id: userProfile.userId || null,
        device_type: userProfile.deviceInfo?.type || 'unknown',
        browser: userProfile.deviceInfo?.browser || 'unknown',
        os: userProfile.deviceInfo?.os || 'unknown',
        country: userProfile.location?.country || 'unknown',
        city: userProfile.location?.city || 'unknown',
        page_path: window.location.pathname,
        page_title: document.title,
        referrer: document.referrer || 'direct'
    };
    
    analytics.logEvent(eventName, enhancedParams);
    console.log(`Tracked event: ${eventName}`, enhancedParams);
}

// Set User Properties for Analytics Audiences
function setUserProperties() {
    if (!isFirebaseReady || !analytics) return;
    
    analytics.setUserProperties({
        device_type: userProfile.deviceInfo?.type || 'unknown',
        browser: userProfile.deviceInfo?.browser || 'unknown',
        operating_system: userProfile.deviceInfo?.os || 'unknown',
        country: userProfile.location?.country || 'unknown',
        city: userProfile.location?.city || 'unknown',
        timezone: userProfile.deviceInfo?.timezone || 'unknown',
        language: userProfile.deviceInfo?.language || 'unknown',
        screen_resolution: userProfile.deviceInfo ? `${userProfile.deviceInfo.screenWidth}x${userProfile.deviceInfo.screenHeight}` : 'unknown',
        user_type: userProfile.userName ? 'identified' : 'anonymous'
    });
    
    // Set User ID for cross-device tracking
    if (userProfile.userId) {
        analytics.setUserId(userProfile.userId);
    }
}

// Cookie consent functions with enhanced tracking
document.addEventListener('DOMContentLoaded', async function() {
    let cookieBanner = document.getElementById('cookie-consent-banner');
    let acceptButton = document.getElementById('accept-cookies');
    let rejectButton = document.getElementById('reject-cookies');
    let cookieSettingsLink = document.getElementById('cookie-settings-link');
    
    // If elements aren't found immediately, wait for them to load
    if (!cookieBanner) {
        console.log('Cookie banner not found immediately, waiting for components to load...');
        
        // Wait for components to load
        const waitForElements = () => {
            return new Promise((resolve) => {
                const checkElements = () => {
                    cookieBanner = document.getElementById('cookie-consent-banner');
                    acceptButton = document.getElementById('accept-cookies');
                    rejectButton = document.getElementById('reject-cookies');
                    cookieSettingsLink = document.getElementById('cookie-settings-link');
                    
                    if (cookieBanner && acceptButton && rejectButton) {
                        resolve();
                    } else {
                        setTimeout(checkElements, 100);
                    }
                };
                checkElements();
            });
        };
        
        await waitForElements();
        console.log('Cookie elements found after waiting');
    }
    
    // Initialize user profile
    console.log('Initializing user profile...');
    userProfile.userData = getUserInfo();
    userProfile.deviceInfo = getDeviceInfo();
    userProfile.location = await getLocationInfo();
    userProfile.userId = userProfile.userData.userId;
    userProfile.userName = userProfile.userData.userName;
    
    console.log('User profile initialized:', userProfile);
    
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    
    if (!cookieConsent) {
        // Show the banner if no choice has been made
        trackEnhancedEvent('cookie_banner_shown');
        showBanner();
    } else {
        // Apply stored preferences and hide banner
        applyStoredPreferences();
        if (cookieBanner) {
            cookieBanner.style.display = 'none';
        }
    }
    
    // Accept cookies
    if (acceptButton) {
        acceptButton.addEventListener('click', function() {
            const consent = {
                essential: true,
                analytics: true,
                marketing: true,
                timestamp: new Date().toISOString()
            };
            
            saveConsent(consent);
            hideBanner();
            applyPreferences(consent);
            
            // Track consent given
            trackEnhancedEvent('cookie_consent_given', {
                consent_type: 'all_accepted'
            });
        });
    }
    
    // Reject cookies
    if (rejectButton) {
        rejectButton.addEventListener('click', function() {
            const consent = {
                essential: true,
                analytics: false,
                marketing: false,
                timestamp: new Date().toISOString()
            };
            
            saveConsent(consent);
            hideBanner();
            applyPreferences(consent);
            
            // Track consent rejected
            trackEnhancedEvent('cookie_consent_given', {
                consent_type: 'rejected'
            });
        });
    }
    
    // Open cookie settings - handle multiple links
    function setupCookieSettingsLinks() {
        const cookieSettingsLinks = document.querySelectorAll('#cookie-settings-link, [data-cookie-settings]');
        
        cookieSettingsLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Cookie settings clicked');
                
                // Remove existing consent to allow fresh choice
                localStorage.removeItem('cookieConsent');
                
                trackEnhancedEvent('cookie_settings_opened');
                
                // Show the banner
                showBanner();
            });
        });
        
        console.log(`Set up ${cookieSettingsLinks.length} cookie settings links`);
    }
    
    // Set up cookie settings links initially
    setupCookieSettingsLinks();
    
    // Log current state for debugging
    console.log('Cookie consent initialization complete');
    console.log('Banner element found:', !!cookieBanner);
    console.log('Accept button found:', !!acceptButton);
    console.log('Reject button found:', !!rejectButton);
    console.log('Current consent status:', localStorage.getItem('cookieConsent'));
    
    // Also set up a global function for cookie settings
    window.openCookieSettings = function() {
        localStorage.removeItem('cookieConsent');
        trackEnhancedEvent('cookie_settings_opened');
        showBanner();
    };
    
    // Add event delegation for cookie settings links
    document.addEventListener('click', function(e) {
        if (e.target.id === 'cookie-settings-link' || e.target.hasAttribute('data-cookie-settings')) {
            e.preventDefault();
            console.log('Cookie settings clicked (event delegation)');
            localStorage.removeItem('cookieConsent');
            trackEnhancedEvent('cookie_settings_opened');
            showBanner();
        }
    });
    
    // Set up mutation observer to handle dynamically loaded content
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any new cookie settings links were added
                const newLinks = document.querySelectorAll('#cookie-settings-link:not([data-cookie-listener])');
                newLinks.forEach(link => {
                    link.setAttribute('data-cookie-listener', 'true');
                    console.log('New cookie settings link detected and set up');
                });
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Enhanced consent saving
    async function saveConsent(consent) {
        localStorage.setItem('cookieConsent', JSON.stringify(consent));
        console.log("Cookie consent saved locally");
        
        // Enhanced Firestore tracking
        if (isFirebaseReady && db) {
            const visitorId = getVisitorId();
            
            const enhancedConsentData = {
                // Basic consent info
                visitorId: visitorId,
                userId: userProfile.userId,
                userName: userProfile.userName || null,
                essential: consent.essential,
                analytics: consent.analytics,
                marketing: consent.marketing,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Device information
                deviceInfo: userProfile.deviceInfo,
                
                // Location information
                location: userProfile.location,
                
                // Session information
                sessionInfo: {
                    referrer: document.referrer || 'direct',
                    path: window.location.pathname,
                    url: window.location.href,
                    title: document.title,
                    loadTime: Date.now() - performance.timing.navigationStart
                }
            };
            
            try {
                await db.collection('cookieConsent').doc(visitorId).set(enhancedConsentData, { merge: true });
                console.log("Enhanced consent data saved to Firestore");
                
                // Also save to a separate collection for analytics
                await db.collection('userSessions').add({
                    ...enhancedConsentData,
                    sessionId: 'session_' + Date.now(),
                    eventType: 'consent_given'
                });
                
            } catch (error) {
                console.warn("Could not save to Firestore:", error.message);
            }
        }
    }
    
    // Show the banner with proper animation
    function showBanner() {
        // Try to find the banner element if not already found
        if (!cookieBanner) {
            cookieBanner = document.getElementById('cookie-consent-banner');
        }
        
        if (cookieBanner) {
            cookieBanner.style.display = 'block';
            cookieBanner.classList.remove('hide');
            cookieBanner.classList.add('show');
            console.log('Cookie banner shown');
        } else {
            console.error('Cookie banner element not found');
            // Retry after a short delay in case it's still loading
            setTimeout(() => {
                cookieBanner = document.getElementById('cookie-consent-banner');
                if (cookieBanner) {
                    cookieBanner.style.display = 'block';
                    cookieBanner.classList.remove('hide');
                    cookieBanner.classList.add('show');
                    console.log('Cookie banner shown (retry)');
                }
            }, 100);
        }
    }
    
    function hideBanner() {
        if (cookieBanner) {
            cookieBanner.classList.add('hide');
            cookieBanner.classList.remove('show');
            console.log('Cookie banner hidden');
            
            // Hide the element after animation completes
            setTimeout(() => {
                if (cookieBanner.classList.contains('hide')) {
                    cookieBanner.style.display = 'none';
                }
            }, 500);
        }
    }
    
    function applyStoredPreferences() {
        const storedConsent = localStorage.getItem('cookieConsent');
        if (storedConsent) {
            try {
                const consent = JSON.parse(storedConsent);
                applyPreferences(consent);
            } catch (error) {
                console.error("Error parsing stored consent:", error);
                localStorage.removeItem('cookieConsent');
            }
        }
    }
    
    function applyPreferences(consent) {
        if (consent.analytics && isFirebaseReady) {
            try {
                // Set user properties for audience building
                setUserProperties();
                
                console.log("Analytics initialized with enhanced tracking");
                
                // Track page view with enhanced data
                trackEnhancedEvent('page_view');
                
            } catch (error) {
                console.warn("Could not initialize analytics:", error);
            }
        }
        
        if (consent.marketing) {
            console.log("Marketing cookies enabled");
            // Initialize marketing pixels, ads tracking, etc.
            initializeMarketingScripts();
        }
    }
    
    // Initialize marketing scripts
    function initializeMarketingScripts() {
        // Google Ads
        if (typeof gtag !== 'undefined') {
            gtag('config', 'YOUR_GOOGLE_ADS_ID', {
                custom_map: {
                    'custom_parameter_1': 'device_type',
                    'custom_parameter_2': 'user_location'
                }
            });
        }
        
        // Facebook Pixel (example)
        // fbq('init', 'YOUR_FACEBOOK_PIXEL_ID');
        // fbq('track', 'PageView');
    }
});

// Enhanced page tracking
function trackPageView() {
    const storedConsent = localStorage.getItem('cookieConsent');
    if (storedConsent && isFirebaseReady) {
        try {
            const consent = JSON.parse(storedConsent);
            if (consent.analytics) {
                trackEnhancedEvent('page_view', {
                    engagement_time_msec: Date.now() - performance.timing.navigationStart
                });
            }
        } catch (error) {
            console.warn("Could not track page view:", error);
        }
    }
}

// Track user interactions
function trackUserInteraction(element, action) {
    trackEnhancedEvent('user_interaction', {
        element_type: element.tagName?.toLowerCase() || 'unknown',
        element_id: element.id || null,
        element_class: element.className || null,
        action: action,
        element_text: element.textContent?.substring(0, 100) || null
    });
}

// Auto-track clicks on important elements
document.addEventListener('click', function(e) {
    const target = e.target;
    
    // Track button clicks
    if (target.tagName === 'BUTTON' || target.type === 'submit') {
        trackUserInteraction(target, 'click');
    }
    
    // Track link clicks
    if (target.tagName === 'A') {
        trackUserInteraction(target, 'link_click');
    }
    
    // Track form submissions
    if (target.type === 'submit') {
        trackEnhancedEvent('form_submit', {
            form_id: target.closest('form')?.id || null
        });
    }
});

// Track scroll depth
let maxScrollDepth = 0;
window.addEventListener('scroll', function() {
    const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    
    if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        
        // Track milestone scroll depths
        if (scrollDepth >= 25 && scrollDepth < 50 && maxScrollDepth < 25) {
            trackEnhancedEvent('scroll_depth', { depth_percentage: 25 });
        } else if (scrollDepth >= 50 && scrollDepth < 75 && maxScrollDepth < 50) {
            trackEnhancedEvent('scroll_depth', { depth_percentage: 50 });
        } else if (scrollDepth >= 75 && scrollDepth < 90 && maxScrollDepth < 75) {
            trackEnhancedEvent('scroll_depth', { depth_percentage: 75 });
        } else if (scrollDepth >= 90 && maxScrollDepth < 90) {
            trackEnhancedEvent('scroll_depth', { depth_percentage: 90 });
        }
    }
});

// Track time on page
let pageStartTime = Date.now();
let isPageVisible = true;

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden' && isPageVisible) {
        const timeOnPage = Date.now() - pageStartTime;
        trackEnhancedEvent('page_engagement', {
            engagement_time_msec: timeOnPage,
            engagement_type: 'page_exit'
        });
        isPageVisible = false;
    } else if (document.visibilityState === 'visible' && !isPageVisible) {
        pageStartTime = Date.now();
        isPageVisible = true;
    }
});

// Track before page unload
window.addEventListener('beforeunload', function() {
    if (isPageVisible) {
        const timeOnPage = Date.now() - pageStartTime;
        trackEnhancedEvent('page_engagement', {
            engagement_time_msec: timeOnPage,
            engagement_type: 'page_unload'
        });
    }
});

// Initialize tracking when page loads
window.addEventListener('load', function() {
    trackPageView();
    
    // Track performance metrics
    setTimeout(() => {
        const perfData = performance.timing;
        trackEnhancedEvent('page_performance', {
            load_time: perfData.loadEventEnd - perfData.navigationStart,
            dom_ready_time: perfData.domContentLoadedEventEnd - perfData.navigationStart,
            first_byte_time: perfData.responseStart - perfData.navigationStart
        });
    }, 1000);
});

// Export functions for external use
window.foodiduAnalytics = {
    trackEvent: trackEnhancedEvent,
    getUserProfile: () => userProfile,
    updateUserName: (name) => {
        userProfile.userName = name;
        userProfile.userData.userName = name;
        localStorage.setItem('userData', JSON.stringify(userProfile.userData));
        setUserProperties();
    }
};

// Debug functions for testing
window.cookieDebug = {
    showBanner: () => {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.display = 'block';
            banner.classList.remove('hide');
            banner.classList.add('show');
            console.log('Debug: Banner shown');
        } else {
            console.log('Debug: Banner element not found');
        }
    },
    hideBanner: () => {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.classList.add('hide');
            banner.classList.remove('show');
            console.log('Debug: Banner hidden');
        }
    },
    resetConsent: () => {
        localStorage.removeItem('cookieConsent');
        console.log('Debug: Consent reset');
    },
    checkElements: () => {
        const banner = document.getElementById('cookie-consent-banner');
        const settingsLink = document.getElementById('cookie-settings-link');
        const settingsLinks = document.querySelectorAll('#cookie-settings-link');
        console.log('Debug: Banner found:', !!banner);
        console.log('Debug: Settings link found:', !!settingsLink);
        console.log('Debug: Total settings links:', settingsLinks.length);
        return { banner: !!banner, settingsLink: !!settingsLink, totalLinks: settingsLinks.length };
    }
};