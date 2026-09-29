// Global State Management
export const AppState = {
    currentPage: 'home',
    currentSlide: 0,
    slideInterval: null,
    currentDealsFilter: { cuisine: '', price: '', discount: '', location: '' },
    currentCategory: 'all',
    currentPromoCategory: 'all',
    dealsPage: 1,
    isLoading: false,
    currentExclusiveSlide: 0,
    exclusiveSlideInterval: null
};