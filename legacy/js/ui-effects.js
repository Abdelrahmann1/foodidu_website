// Enhanced Interactive Features and UI Effects
import { AppState } from './state.js';
import { changeSlide } from './carousel.js';
import { closeDrawer } from './navigation.js';
import { searchRestaurants } from './discovery.js';

export function addRippleEffect(element) {
    element.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Smooth scrolling for anchor links
export function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Prevent invalid selector for href="#"
            if (href && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Navbar background on scroll
export function initializeNavbarEffects() {
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = "url('images/BG.svg') center center/cover no-repeat, rgba(255, 255, 255, 0.98)";
            navbar.style.boxShadow = 'none';
        } else {
            navbar.style.background = "url('images/BG.svg') center center/cover no-repeat, rgba(255, 255, 255, 0.95)";
            navbar.style.boxShadow = 'none';
        }
    });
}

// Feature card hover effects
export function initializeFeatureCardEffects() {
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Initialize testimonial highlights
export function initializeTestimonials() {
    const testimonials = document.querySelectorAll('.testimonial');
    let currentTestimonial = 0;

    function highlightTestimonial() {
        testimonials.forEach((testimonial, index) => {
            if (index === currentTestimonial) {
                testimonial.style.transform = 'scale(1.05)';
                testimonial.style.boxShadow = '0 10px 30px rgba(234, 179, 8, 0.2)';
            } else {
                testimonial.style.transform = 'scale(1)';
                testimonial.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
            }
        });
        
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    }

    if (testimonials.length > 0) {
        setInterval(highlightTestimonial, 4000);
    }
}

// Screenshots carousel touch/swipe support
export function initializeScreenshotsCarousel() {
    const screenshotsCarousel = document.querySelector('.screenshots-carousel');
    if (!screenshotsCarousel) return;

    let isScrolling = false;
    let startX = 0;
    let scrollLeft = 0;

    screenshotsCarousel.addEventListener('mousedown', (e) => {
        isScrolling = true;
        startX = e.pageX - screenshotsCarousel.offsetLeft;
        scrollLeft = screenshotsCarousel.scrollLeft;
        screenshotsCarousel.style.cursor = 'grabbing';
    });

    screenshotsCarousel.addEventListener('mouseleave', () => {
        isScrolling = false;
        screenshotsCarousel.style.cursor = 'grab';
    });

    screenshotsCarousel.addEventListener('mouseup', () => {
        isScrolling = false;
        screenshotsCarousel.style.cursor = 'grab';
    });

    screenshotsCarousel.addEventListener('mousemove', (e) => {
        if (!isScrolling) return;
        e.preventDefault();
        const x = e.pageX - screenshotsCarousel.offsetLeft;
        const walk = (x - startX) * 2;
        screenshotsCarousel.scrollLeft = scrollLeft - walk;
    });

    // Touch events for mobile
    screenshotsCarousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - screenshotsCarousel.offsetLeft;
        scrollLeft = screenshotsCarousel.scrollLeft;
    });

    screenshotsCarousel.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - screenshotsCarousel.offsetLeft;
        const walk = (x - startX) * 2;
        screenshotsCarousel.scrollLeft = scrollLeft - walk;
    });
}

// Add CSS for ripple animation
export function addRippleStyles() {
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            .specialty-tag {
                background: rgba(234, 179, 8, 0.1);
                color: #eab308;
                padding: 0.2rem 0.5rem;
                border-radius: 12px;
                font-size: 0.8rem;
                margin-right: 0.5rem;
                margin-bottom: 0.5rem;
                display: inline-block;
            }
            .restaurant-specialties {
                margin-bottom: 1rem;
            }
            .no-results {
                grid-column: 1 / -1;
                text-align: center;
                padding: 3rem;
                background: white;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .retry-btn {
                background: linear-gradient(135deg, #eab308, #facc15);
                color: white;
                padding: 0.8rem 1.5rem;
                border: none;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 1rem;
                transition: all 0.3s ease;
            }
            .retry-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(234, 179, 8, 0.3);
            }
            .promo-description {
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 1rem;
                font-style: italic;
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .rabbit-notification .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);
    }
}



// Search input enter key support
export function initializeSearchInput() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchRestaurants();
            }
        });
    }
}

// Intersection Observer for animations
export function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements with data-aos attribute
    document.querySelectorAll('[data-aos]').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Keyboard navigation for carousel
export function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        if (AppState.currentPage === 'home') {
            if (e.key === 'ArrowLeft') {
                changeSlide(-1);
            } else if (e.key === 'ArrowRight') {
                changeSlide(1);
            }
        }
    });
}

// Handle window resize
export function initializeWindowResize() {
    window.addEventListener('resize', function() {
        // Close mobile menu on resize
        if (window.innerWidth > 768) {
            closeDrawer();
        }
    });
}