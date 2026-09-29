// Hero Carousel Functions
import { AppState } from './state.js';
import { CONFIG } from './config.js';

export function initializeCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0) return;
    
    // Start auto-play
    startCarouselAutoPlay();
    
    // Initialize first slide
    updateCarousel();
}

export function changeSlide(direction) {
    const slides = document.querySelectorAll('.carousel-slide');
    const totalSlides = slides.length;
    
    AppState.currentSlide += direction;
    
    if (AppState.currentSlide >= totalSlides) {
        AppState.currentSlide = 0;
    } else if (AppState.currentSlide < 0) {
        AppState.currentSlide = totalSlides - 1;
    }
    
    updateCarousel();
    restartCarouselAutoPlay();
}

export function goToSlide(slideIndex) {
    AppState.currentSlide = slideIndex;
    updateCarousel();
    restartCarouselAutoPlay();
}

function updateCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    slides.forEach((slide, index) => {
        slide.classList.remove('active', 'prev');
        if (index === AppState.currentSlide) {
            slide.classList.add('active');
        } else if (index === AppState.currentSlide - 1 || (AppState.currentSlide === 0 && index === slides.length - 1)) {
            slide.classList.add('prev');
        }
    });
    
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === AppState.currentSlide);
    });
}

function startCarouselAutoPlay() {
    AppState.slideInterval = setInterval(() => {
        changeSlide(1);
    }, CONFIG.CAROUSEL_INTERVAL);
}

function restartCarouselAutoPlay() {
    clearInterval(AppState.slideInterval);
    startCarouselAutoPlay();
}