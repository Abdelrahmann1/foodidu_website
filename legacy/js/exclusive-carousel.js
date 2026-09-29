// Exclusive Deals Carousel Functionality
import { AppState } from './state.js';
import { showRabbitNotification } from './utils.js';

// Initialize exclusive carousel
export function initExclusiveCarousel() {
    console.log('Initializing exclusive carousel...');
    const slides = document.querySelectorAll('.exclusive-slide');
    const indicators = document.querySelectorAll('.exclusive-indicator');
    
    if (slides.length > 0) {
        console.log(`Found ${slides.length} slides`);
        // Ensure first slide is active
        slides[0].classList.add('active');
        if (indicators.length > 0) {
            indicators[0].classList.add('active');
        }
        startExclusiveAutoSlide();
    } else {
        console.log('No exclusive slides found');
    }
}

// Start auto-sliding
export function startExclusiveAutoSlide() {
    console.log('Starting auto-slide...');
    AppState.exclusiveSlideInterval = setInterval(() => {
        changeExclusiveSlide(1);
    }, 15000); // Change slide every 15 seconds
}

// Stop auto-sliding
export function stopExclusiveAutoSlide() {
    console.log('Stopping auto-slide...');
    if (AppState.exclusiveSlideInterval) {
        clearInterval(AppState.exclusiveSlideInterval);
    }
}

// Change slide function
export function changeExclusiveSlide(direction) {
    // Pause auto-slide temporarily
    stopExclusiveAutoSlide();
    const slides = document.querySelectorAll('.exclusive-slide');
    const indicators = document.querySelectorAll('.exclusive-indicator');
    
    if (slides.length === 0) {
        console.log('No slides found for changing');
        return;
    }
    
    console.log(`Changing slide from ${AppState.currentExclusiveSlide} with direction ${direction}`);
    
    // Add transition classes for smooth animation
    const currentSlide = slides[AppState.currentExclusiveSlide];
    
    // Set current slide to exit
    if (direction > 0) {
        currentSlide.classList.add('prev');
    } else {
        currentSlide.classList.add('next');
    }
    
    // Remove active class from current slide and indicator
    currentSlide.classList.remove('active');
    if (indicators[AppState.currentExclusiveSlide]) {
        indicators[AppState.currentExclusiveSlide].classList.remove('active');
    }
    
    // Calculate next slide
    AppState.currentExclusiveSlide += direction;
    
    if (AppState.currentExclusiveSlide >= slides.length) {
        AppState.currentExclusiveSlide = 0;
    } else if (AppState.currentExclusiveSlide < 0) {
        AppState.currentExclusiveSlide = slides.length - 1;
    }
    
    console.log(`New slide index: ${AppState.currentExclusiveSlide}`);
    
    // Clean up all slides first
    slides.forEach(slide => {
        slide.classList.remove('active', 'prev', 'next');
    });
    
    // Add active class to new slide and indicator
    setTimeout(() => {
        slides[AppState.currentExclusiveSlide].classList.add('active');
        if (indicators[AppState.currentExclusiveSlide]) {
            indicators[AppState.currentExclusiveSlide].classList.add('active');
        }
    }, 50);
    
    // Restart auto-slide after 3 seconds
    setTimeout(startExclusiveAutoSlide, 3000);
}

// Go to specific slide (for indicator clicks)
export function goToExclusiveSlide(slideIndex) {
    const slides = document.querySelectorAll('.exclusive-slide');
    const indicators = document.querySelectorAll('.exclusive-indicator');
    
    if (slideIndex < 0 || slideIndex >= slides.length) return;
    
    console.log(`Going to slide ${slideIndex}`);
    
    // Remove active class from current slide and indicator
    slides[AppState.currentExclusiveSlide].classList.remove('active');
    if (indicators[AppState.currentExclusiveSlide]) {
        indicators[AppState.currentExclusiveSlide].classList.remove('active');
    }
    
    // Set new slide
    AppState.currentExclusiveSlide = slideIndex;
    
    // Add active class to new slide and indicator
    slides[AppState.currentExclusiveSlide].classList.add('active');
    if (indicators[AppState.currentExclusiveSlide]) {
        indicators[AppState.currentExclusiveSlide].classList.add('active');
    }
    
    // Restart auto-slide timer
    stopExclusiveAutoSlide();
    setTimeout(startExclusiveAutoSlide, 1000); // Restart after 1 second
}

// Copy exclusive code function
export function copyExclusiveCode(code, vendor, event) {
    // Store the button reference
    const copyBtn = event ? event.target : document.querySelector('.quick-copy');
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function() {
            handleCopySuccess(code, vendor, copyBtn);
        }).catch(function(err) {
            console.error('Clipboard API failed, trying fallback: ', err);
            fallbackCopy(code, vendor, copyBtn);
        });
    } else {
        // Fallback for older browsers
        fallbackCopy(code, vendor, copyBtn);
    }
}

// Fallback copy method (same as home promo codes)
function fallbackCopy(code, vendor, copyBtn) {
    try {
        // Create a temporary text area to copy the code
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        handleCopySuccess(code, vendor, copyBtn);
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        showRabbitNotification('Failed to copy code. Please try again.', 'error');
    }
}

// Handle successful copy (same styling as home promo codes)
function handleCopySuccess(code, vendor, copyBtn) {
    if (!copyBtn) {
        console.error('Copy button not found');
        return;
    }
    
    const originalText = copyBtn.textContent;
    const originalBackground = copyBtn.style.background;
    
    // Update button appearance (same as home promo codes)
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#10b981'; // Green color like home promo codes
    copyBtn.classList.add('copied');
    
    // Reset button after 2 seconds
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = originalBackground || '#7EB143'; // Reset to green theme
        copyBtn.classList.remove('copied');
    }, 2000);
    
    // Show notification with vendor-specific message (same as home promo codes)
    const vendorName = vendor === 'rabbit' ? 'Rabbit' : vendor === 'senem' ? 'Senem' : vendor === 'noon' ? 'Noon' : 'Vendor';
    showRabbitNotification(`${vendorName} promo code "${code}" copied to clipboard! 🎉`, 'success');
    
    // Track the copy event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'exclusive_promo_copied', {
            'event_category': 'engagement',
            'event_label': code,
            'vendor': vendor
        });
    }
}