// Promo Codes Page Functions
import { AppState } from "./state.js";
import { promoCodesData } from "./data.js";
import { showNotification } from "./utils.js";

export function loadPromoCodes() {
  const promoGrid = document.getElementById("promo-grid");
  if (!promoGrid) return;

  let filteredPromos = promoCodesData;

  if (AppState.currentPromoCategory !== "all") {
    filteredPromos = filteredPromos.filter(
      (promo) => promo.category === AppState.currentPromoCategory
    );
  }

  // Sort to ensure featured cards always appear first
  filteredPromos.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  promoGrid.innerHTML = filteredPromos
    .map(
      (promo) => `
        <div class="promo-card ${
          promo.featured
            ? promo.brand.toLowerCase() === "rabbit"
              ? "rabbit-featured-card"
              : promo.brand.toLowerCase() === "senem"
              ? "senem-featured-card"
              : promo.brand.toLowerCase() === "noon"
              ? "noon-featured-card"
              : promo.brand.toLowerCase() === "noon egypt"
              ? "noon-egypt-featured-card"
              : promo.brand.toLowerCase() === "just smash burger"
              ? "rabbit-featured-card"
              : promo.brand.toLowerCase() === "butcher's burger"
              ? "senem-featured-card"
              : promo.brand.toLowerCase() === "mini beirut"
              ? "noon-featured-card"
              : promo.brand.toLowerCase() === "my buffalo"
              ? "rabbit-featured-card"
              : promo.brand.toLowerCase() === "abu auf"
              ? "senem-featured-card"
              : ""
            : ""
        }" data-aos="fade-up">
            ${
              promo.featured
                ? `
                <div class="featured-badge">
                    <img src="${promo.logo}" alt="${promo.brand}" class="badge-logo"> FEATURED
                </div>
            `
                : ""
            }
            <div class="promo-header">
                <div class="promo-logo">
                    ${
                      promo.logo.includes("images/")
                        ? `<img src="${promo.logo}" alt="${promo.brand} Logo" class="vendor-logo">`
                        : promo.logo
                    }
                </div>
                <div class="promo-brand">${promo.brand}</div>
            </div>
            <div class="promo-code-section">
                <div class="promo-discount">${promo.discount}</div>
                <div class="promo-code" id="code-${promo.id}">${
        promo.code
      }</div>
                <div class="promo-description">${promo.description}</div>
                <div class="promo-expiry">Expires: ${promo.expiry}</div>
                <button class="copy-btn ${
                  promo.brand.toLowerCase() === "rabbit"
                    ? "rabbit-copy-btn"
                    : promo.brand.toLowerCase() === "senem"
                    ? "senem-copy-btn"
                    : promo.brand.toLowerCase() === "noon"
                    ? "noon-copy-btn"
                    : promo.brand.toLowerCase() === "noon egypt"
                    ? "noon-egypt-copy-btn"
                    : promo.brand.toLowerCase() === "just smash burger"
                    ? "rabbit-copy-btn"
                    : promo.brand.toLowerCase() === "butcher's burger"
                    ? "senem-copy-btn"
                    : promo.brand.toLowerCase() === "mini beirut"
                    ? "noon-copy-btn"
                    : promo.brand.toLowerCase() === "my buffalo"
                    ? "rabbit-copy-btn"
                    : promo.brand.toLowerCase() === "abu auf"
                    ? "senem-copy-btn"
                    : ""
                }" onclick="window.copyPromoCode('${promo.code}', ${
        promo.id
      })">Copy Code</button>
            </div>
            ${
              promo.featured
                ? `
                <div class="featured-cta">
                    <a href="${
                      promo.brand.toLowerCase() === "rabbit"
                        ? "Rabbit-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "senem"
                        ? "Senem-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "noon"
                        ? "Noon-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "noon egypt"
                        ? "Noon-EG-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "just smash burger"
                        ? "Just-Smash-Burger-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "butcher's burger"
                        ? "Butchers-Burger-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "mini beirut"
                        ? "Mini-Beirut-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "my buffalo"
                        ? "My-Buffalo-PromoCode/index.html"
                        : promo.brand.toLowerCase() === "abu auf"
                        ? "Abu-Auf-PromoCode/index.html"
                        : `${promo.brand}-PromoCode/index.html`
                    }" class="view-details-btn">
                        <i class="fas fa-external-link-alt"></i>
                        View Full Details
                    </a>
                </div>
            `
                : ""
            }
        </div>
    `
    )
    .join("");
}

export function filterPromos(element, category) {
  // Remove active class from all categories
  document.querySelectorAll(".promo-category").forEach((cat) => {
    cat.classList.remove("active");
  });

  // Add active class to clicked category
  element.classList.add("active");

  AppState.currentPromoCategory = category;
  loadPromoCodes();
}

export function copyPromoCode(code, promoId) {
  // Create a temporary text area to copy the code
  const textArea = document.createElement("textarea");
  textArea.value = code;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);

  // Show success message
  showNotification(`Promo code "${code}" copied to clipboard! 🎉`);

  // Update button text temporarily
  const button = event.target;
  const originalText = button.textContent;
  button.textContent = "Copied!";
  button.style.background = "#10b981";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "#7EB143";
  }, 2000);
}

// Enhanced Promo Code Copy Function
export function copyPromoCodeEnhanced(code, vendor) {
  navigator.clipboard
    .writeText(code)
    .then(function () {
      // Find the specific copy button
      let copyBtn;
      if (vendor === "rabbit") {
        copyBtn = document.querySelector(".rabbit-copy-btn");
      } else {
        copyBtn = event.target;
      }

      const originalText = copyBtn.innerHTML;

      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      copyBtn.classList.add("copied");

      // Reset button after 2 seconds
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove("copied");
      }, 2000);

      // Show notification with vendor-specific message
      const vendorName = vendor === "rabbit" ? "Rabbit" : "Vendor";
      showNotification(`${vendorName} promo code copied! 🎉`);

      // Track the copy event
      if (typeof gtag !== "undefined") {
        gtag("event", "promo_code_copied", {
          event_category: "engagement",
          event_label: code,
          vendor: vendor || "unknown",
        });
      }
    })
    .catch(function (err) {
      console.error("Failed to copy: ", err);
      showNotification("Failed to copy code. Please try again.", "error");
    });
}

// Rabbit Quick Copy Function (for banner)
export function copyRabbitCode() {
  const code = "RABBIT25";

  navigator.clipboard
    .writeText(code)
    .then(function () {
      // Update button to show success
      const copyBtn = document.querySelector(".quick-copy");
      const originalText = copyBtn.innerHTML;

      copyBtn.innerHTML = "✓ Copied!";
      copyBtn.classList.add("copied");

      // Reset button after 2 seconds
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove("copied");
      }, 2000);

      // Show notification
      showNotification("Rabbit promo code copied! 🎉");

      // Track the copy event (if analytics is available)
      if (typeof gtag !== "undefined") {
        gtag("event", "rabbit_promo_copied", {
          event_category: "engagement",
          event_label: "homepage_banner",
          value: 1,
        });
      }
    })
    .catch(function (err) {
      console.error("Failed to copy: ", err);
      showNotification("Failed to copy code. Please try again.", "error");
    });
}
