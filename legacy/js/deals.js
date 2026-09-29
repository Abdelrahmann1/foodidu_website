// Deals Page Functions
import { AppState } from "./state.js";
import { dealsData } from "./data.js";
import { showNotification, downloadApp } from "./utils.js";

export function loadDeals() {
  const dealsGrid = document.getElementById("deals-grid");
  if (!dealsGrid) return;

  // Ensure Load More button is visible by default
  const loadMoreContainer = document.querySelector(".load-more-container");
  if (loadMoreContainer) {
    loadMoreContainer.style.display = "block";
  }

  let filteredDeals = dealsData;

  // Apply filters
  if (AppState.currentDealsFilter.cuisine) {
    filteredDeals = filteredDeals.filter(
      (deal) => deal.cuisine === AppState.currentDealsFilter.cuisine
    );
  }

  if (AppState.currentDealsFilter.location) {
    filteredDeals = filteredDeals.filter((deal) =>
      deal.location
        .toLowerCase()
        .includes(AppState.currentDealsFilter.location.toLowerCase())
    );
  }

  // Apply sorting
  if (AppState.currentDealsFilter.price === "low") {
    filteredDeals.sort((a, b) => a.price - b.price);
  } else if (AppState.currentDealsFilter.price === "high") {
    filteredDeals.sort((a, b) => b.price - a.price);
  }

  if (AppState.currentDealsFilter.discount === "highest") {
    filteredDeals.sort((a, b) => {
      const aDiscount = parseInt(a.discount) || 0;
      const bDiscount = parseInt(b.discount) || 0;
      return bDiscount - aDiscount;
    });
  }

  // Show deals with pagination
  const dealsPerPage = 6;
  const startIndex = 0;
  const endIndex = dealsPerPage * AppState.dealsPage;
  const visibleDeals = filteredDeals.slice(startIndex, endIndex);

  dealsGrid.innerHTML = visibleDeals
    .map(
      (deal) => `
        <div class="deal-card" data-aos="fade-up">
            <div class="deal-image">
                ${deal.icon}
            </div>
            <div class="deal-content">
                <div class="deal-title">${deal.restaurant}</div>
                <div class="deal-description">${deal.title}</div>
                <p>${deal.description}</p>
                <div class="deal-meta">
                    <span class="deal-discount">${deal.discount} OFF</span>
                    <span class="deal-validity">${deal.validity}</span>
                </div>
                <button class="deal-btn" onclick="window.getDeal(${deal.id})">Get Deal</button>
            </div>
        </div>
    `
    )
    .join("");

  // Show/hide load more button
  if (loadMoreContainer) {
    loadMoreContainer.style.display =
      endIndex < filteredDeals.length ? "block" : "none";
  }
}

export function loadMoreDeals() {
  if (AppState.isLoading) return;

  AppState.isLoading = true;
  AppState.dealsPage++;

  const loadMoreBtn = document.querySelector(".load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.textContent = "Loading...";
    loadMoreBtn.disabled = true;
  }

  setTimeout(() => {
    loadDeals();
    AppState.isLoading = false;

    if (loadMoreBtn) {
      loadMoreBtn.textContent = "Load More Deals";
      loadMoreBtn.disabled = false;
    }
  }, 1000);
}

export function filterDeals(value, type) {
  AppState.currentDealsFilter[type] = value;
  AppState.dealsPage = 1;
  loadDeals();
}

export function getDeal(dealId) {
  const deal = dealsData.find((d) => d.id === dealId);
  showNotification(`🎉 Great choice! Redirecting to ${deal.restaurant}...`);

  setTimeout(() => {
    downloadApp();
  }, 1500);
}

export function filterDealsChip(element, value, type) {
  // Remove active class from chips of the same type
  const parentSection = element.parentElement;
  parentSection.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.remove("active");
  });

  // Add active class to clicked chip
  element.classList.add("active");

  // Apply filter
  AppState.currentDealsFilter[type] = value;
  AppState.dealsPage = 1;
  loadDeals();
}
// Dropdown filter functions
export function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  const btn = dropdown.previousElementSibling;
  
  // Close all other dropdowns
  document.querySelectorAll('.dropdown-content').forEach(content => {
    if (content.id !== dropdownId) {
      content.classList.remove('show');
      content.previousElementSibling.classList.remove('active');
    }
  });
  
  // Toggle current dropdown
  dropdown.classList.toggle('show');
  btn.classList.toggle('active');
}

export function selectFilter(element, value, type, displayText) {
  // Update the button text
  const selectedSpan = document.getElementById(type + '-selected');
  selectedSpan.textContent = displayText;
  
  // Update active state
  const dropdown = element.parentElement;
  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.classList.remove('active');
  });
  element.classList.add('active');
  
  // Close dropdown
  dropdown.classList.remove('show');
  dropdown.previousElementSibling.classList.remove('active');
  
  // Apply filter
  AppState.currentDealsFilter[type] = value;
  AppState.dealsPage = 1;
  loadDeals();
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.filter-dropdown')) {
    document.querySelectorAll('.dropdown-content').forEach(content => {
      content.classList.remove('show');
      content.previousElementSibling.classList.remove('active');
    });
  }
});