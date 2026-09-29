// Simple Navigation for Vendor Pages - Exact copy from main site
// This is the EXACT same code that works on the main site

function toggleMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.drawer-overlay');
    
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeDrawer() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.drawer-overlay');
    
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    overlay.classList.remove('active');
}

function downloadApp() {
    if (typeof window.showComingSoonModal === 'function') {
        window.showComingSoonModal();
    } else {
        alert('📱 Foodidu App is coming soon!');
    }
}

// Copy promo code function
function copyPromoCode(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function() {
            // Update button to show success
            const copyBtn = document.querySelector('.copy-btn');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.classList.add('copied');
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }
        }).catch(function(err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                const copyBtn = document.querySelector('.copy-btn');
                if (copyBtn) {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    copyBtn.classList.add('copied');
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                }
            } catch (err) {
                alert('Promo code: ' + code);
            }
            
            document.body.removeChild(textArea);
        });
    }
}

// Vendor app download function
function openVendorApp(vendor, platform) {
    // For now, show coming soon modal since most vendor apps aren't available
    if (typeof window.showComingSoonModal === 'function') {
        window.showComingSoonModal();
    } else {
        alert('📱 ' + vendor.charAt(0).toUpperCase() + vendor.slice(1) + ' app coming soon!');
    }
}

// Vendor website function
function openVendorWebsite(vendor) {
    const vendorWebsites = {
        'rabbit': 'https://www.rabbitmart.com/us/',
        'senem': 'https://www.senem-eg.com/',
        'noon': 'https://www.noon.com/',
        'breadfast': 'https://breadfast.com/',
        'pizza-hut': 'https://www.pizzahut.me/',
        'kfc': 'https://www.kfc-me.com/',
        'just-smash-burger': '#',
        'butchers-burger': '#',
        'mini-beirut': '#',
        'my-buffalo': '#',
        'abu-auf': 'https://www.abuauf.com.eg/'
    };
    
    const website = vendorWebsites[vendor];
    if (website && website !== '#') {
        window.open(website, '_blank');
    } else {
        if (typeof window.showComingSoonModal === 'function') {
            window.showComingSoonModal();
        } else {
            alert('🌐 ' + vendor.charAt(0).toUpperCase() + vendor.slice(1) + ' website coming soon!');
        }
    }
}

// Make functions globally available (same as main site)
window.toggleMenu = toggleMenu;
window.closeDrawer = closeDrawer;
window.downloadApp = downloadApp;
window.copyPromoCode = copyPromoCode;
window.openVendorApp = openVendorApp;
window.openVendorWebsite = openVendorWebsite;