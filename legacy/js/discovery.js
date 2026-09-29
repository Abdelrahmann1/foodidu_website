// Discovery Page Functions
import { AppState } from './state.js';
import { restaurantsData } from './data.js';
import { showNotification } from './utils.js';
import { showPage } from './navigation.js';

export function loadRestaurants() {
    const restaurantsGrid = document.getElementById('restaurants-grid');
    if (!restaurantsGrid) return;
    
    let filteredRestaurants = restaurantsData;
    
    if (AppState.currentCategory !== 'all') {
        filteredRestaurants = filteredRestaurants.filter(restaurant => 
            restaurant.category === AppState.currentCategory
        );
    }
    
    restaurantsGrid.innerHTML = filteredRestaurants.map(restaurant => `
        <div class="restaurant-card" data-aos="fade-up">
            <div class="restaurant-image">
                ${restaurant.icon}
            </div>
            <div class="restaurant-content">
                <div class="restaurant-name">${restaurant.name}</div>
                <div class="restaurant-cuisine">${restaurant.cuisine}</div>
                <div class="restaurant-rating">
                    <div class="stars">${'★'.repeat(Math.floor(restaurant.rating))}${'☆'.repeat(5-Math.floor(restaurant.rating))}</div>
                    <span>${restaurant.rating}</span>
                </div>
                <div class="restaurant-specialties">
                    ${restaurant.specialties.slice(0, 2).map(specialty => 
                        `<span class="specialty-tag">${specialty}</span>`
                    ).join('')}
                </div>
                <button class="restaurant-btn" onclick="window.seeRestaurantDeals(${restaurant.id})">See Deals</button>
            </div>
        </div>
    `).join('');
}

export function filterCategory(element, category) {
    // Remove active class from all chips
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    // Add active class to clicked chip
    element.classList.add('active');
    
    AppState.currentCategory = category;
    loadRestaurants();
}

export function searchRestaurants() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        loadRestaurants();
        return;
    }
    
    const filteredRestaurants = restaurantsData.filter(restaurant => 
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.location.toLowerCase().includes(query) ||
        restaurant.specialties.some(specialty => specialty.toLowerCase().includes(query))
    );
    
    const restaurantsGrid = document.getElementById('restaurants-grid');
    restaurantsGrid.innerHTML = filteredRestaurants.map(restaurant => `
        <div class="restaurant-card" data-aos="fade-up">
            <div class="restaurant-image">
                ${restaurant.icon}
            </div>
            <div class="restaurant-content">
                <div class="restaurant-name">${restaurant.name}</div>
                <div class="restaurant-cuisine">${restaurant.cuisine}</div>
                <div class="restaurant-rating">
                    <div class="stars">${'★'.repeat(Math.floor(restaurant.rating))}${'☆'.repeat(5-Math.floor(restaurant.rating))}</div>
                    <span>${restaurant.rating}</span>
                </div>
                <div class="restaurant-specialties">
                    ${restaurant.specialties.slice(0, 2).map(specialty => 
                        `<span class="specialty-tag">${specialty}</span>`
                    ).join('')}
                </div>
                <button class="restaurant-btn" onclick="window.seeRestaurantDeals(${restaurant.id})">See Deals</button>
            </div>
        </div>
    `).join('');
    
    if (filteredRestaurants.length === 0) {
        restaurantsGrid.innerHTML = '<div class="no-results"><p>No restaurants found matching your search.</p><button onclick="window.loadRestaurants()" class="retry-btn">Show All Restaurants</button></div>';
    }
}

export function seeRestaurantDeals(restaurantId) {
    const restaurant = restaurantsData.find(r => r.id === restaurantId);
    showNotification(`Finding deals for ${restaurant.name}...`);
    
    setTimeout(() => {
        showPage('deals');
    }, 1000);
}