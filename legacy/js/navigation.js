// Navigation Functions
import { AppState } from './state.js';
import { showLoadingSpinner, hideLoadingSpinner } from './utils.js';
import { initializeCarousel } from './carousel.js';
import { loadDeals } from './deals.js';
import { loadRestaurants } from './discovery.js';
import { loadPromoCodes } from './promo-codes.js';
import { animateCounters } from './utils.js';

export function showPage(pageId) {
    showLoadingSpinner();
    
    setTimeout(() => {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        document.getElementById(pageId).classList.add('active');
        AppState.currentPage = pageId;
        
        // Close mobile menu
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const overlay = document.querySelector('.drawer-overlay');
        
        if (hamburger) hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        // Initialize page-specific content
        initializePage(pageId);
        

        
        // Scroll to top
        window.scrollTo(0, 0);
        
        hideLoadingSpinner();
    }, 500);
}

function initializePage(pageId) {
    switch(pageId) {
        case 'home':
            // Always ensure home components are loaded and visible
            ensureHomeComponentsLoaded();
            initializeCarousel();
            animateCounters();
            break;
        case 'deals':
            loadDeals();
            animateCounters();
            break;
        case 'discover':
            loadRestaurants();
            break;
        case 'promo':
            loadPromoCodes();
            animateCounters();
            break;
        case 'vendors':
            animateCounters();
            break;
    }
}

// Simplified - only ensure visibility, no reloading during navigation
function ensureHomeComponentsLoaded() {
    const homeComponents = document.getElementById('home-components');
    if (!homeComponents) return;
    
    console.log('Ensuring home components are visible...');
    
    // Just make sure existing components are visible
    makeAllHomeComponentsVisible();
}

// Reload all home components in the correct order
function reloadAllHomeComponentsInOrder() {
    const homeComponents = document.getElementById('home-components');
    if (!homeComponents) return;
    
    // Preserve hero carousel if it exists
    const heroCarousel = homeComponents.querySelector('.hero-carousel');
    let heroHTML = '';
    if (heroCarousel) {
        heroHTML = heroCarousel.outerHTML;
    }
    
    // Clear the container and add back hero carousel
    homeComponents.innerHTML = heroHTML;
    
    // Load components in the correct order (sequentially to maintain order)
    const componentsInOrder = [
        'components/exclusive-deals.html',
        'components/hot-promos.html', 
        'components/features.html',
        'components/how-it-works.html',
        'components/vendor-invitation.html',
        'components/app-screenshots.html',
        'components/testimonials.html',
        'components/cta-section.html'
    ];
    
    loadComponentsSequentially(componentsInOrder, 0);
}

// Load components one by one to maintain order
function loadComponentsSequentially(components, index) {
    if (index >= components.length) {
        // All components loaded, make them visible and initialize features
        makeAllHomeComponentsVisible();
        setTimeout(() => {
            initializeCarousel();
            if (window.initExclusiveCarousel) {
                window.initExclusiveCarousel();
            }
        }, 100);
        return;
    }
    
    const componentPath = components[index];
    fetch(componentPath)
        .then(response => response.text())
        .then(html => {
            const homeComponents = document.getElementById('home-components');
            if (homeComponents) {
                homeComponents.insertAdjacentHTML('beforeend', html);
            }
            // Load next component
            loadComponentsSequentially(components, index + 1);
        })
        .catch(error => {
            console.error('Failed to load component:', componentPath, error);
            // Continue with next component even if one fails
            loadComponentsSequentially(components, index + 1);
        });
}

// Make all home components visible
function makeAllHomeComponentsVisible() {
    const homeComponents = document.getElementById('home-components');
    if (!homeComponents) return;
    
    const allSections = [
        '.hero-carousel',
        '.exclusive-deals',
        '.hot-promos',
        '.features', 
        '.how-it-works',
        '.vendor-invitation',
        '.app-screenshots',
        '.testimonials',
        '.cta-section'
    ];
    
    allSections.forEach(selector => {
        const section = homeComponents.querySelector(selector);
        if (section) {
            section.style.display = 'block';
            section.style.opacity = '1';
            section.style.visibility = 'visible';
        }
    });
}



// Mobile Navigation
export function toggleMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.drawer-overlay');
    
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    overlay.classList.toggle('active');
}

export function closeDrawer() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.drawer-overlay');
    
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    overlay.classList.remove('active');
}

// Export the component loading function
export { ensureHomeComponentsLoaded, makeAllHomeComponentsVisible };