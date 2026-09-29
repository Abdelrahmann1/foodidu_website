// Coming Soon Modal for Foodidu App
function showComingSoonModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('coming-soon-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML (no inline onclick)
    const modalHTML = `
        <div id="coming-soon-modal" class="coming-soon-modal show">
            <div class="coming-soon-overlay" onclick="closeComingSoonModal()"></div>
            <div class="coming-soon-content">
                <button type="button" class="coming-soon-close" aria-label="Close" onclick="closeComingSoonModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="coming-soon-icon">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <h2>Foodidu App Coming Soon!</h2>
                <p>We're working hard to bring you the best food delivery experience. Our mobile app will be available soon with exclusive features and deals!</p>
                <div class="coming-soon-features">
                    <div class="feature-item">
                        <i class="fas fa-rocket"></i>
                        <span>Faster Ordering</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-gift"></i>
                        <span>Exclusive Deals</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-bell"></i>
                        <span>Push Notifications</span>
                    </div>
                </div>
                <div class="coming-soon-buttons">
                    <button class="notify-btn" onclick="notifyWhenReady()">
                        <i class="fas fa-envelope"></i>
                        Notify Me When Ready
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    // Lock background scroll
    try { document.body.classList.add('modal-open'); } catch (_) {}
    
    // Attach event listeners after modal is added to DOM
    const modal = document.getElementById('coming-soon-modal');
    const overlay = modal.querySelector('.coming-soon-overlay');
    const closeBtn = modal.querySelector('.coming-soon-close');
    const notifyBtn = modal.querySelector('.notify-btn');
    
    // Close modal when clicking overlay
    overlay.addEventListener('click', closeComingSoonModal);
    
    // Close modal when clicking close button
    closeBtn.addEventListener('click', closeComingSoonModal);
    
    // Handle notify button click
    notifyBtn.addEventListener('click', notifyWhenReady);

    // Last-resort: close on any click/touch while modal is open (capture-phase)
    const anyClickClose = (e) => {
        const m = document.getElementById('coming-soon-modal');
        if (!m) return;
        try { e.stopPropagation(); } catch (_) {}
        try { if (e.cancelable) e.preventDefault(); } catch (_) {}
        closeComingSoonModal();
    };
    window.addEventListener('click', anyClickClose, true);
    window.addEventListener('touchend', anyClickClose, { capture: true, passive: false });
    // store handler reference to remove later
    modal.__anyClickClose = anyClickClose;
}

function closeComingSoonModal() {
    const modal = document.getElementById('coming-soon-modal');
    if (modal) {
        try { modal.classList.remove('show'); } catch (_) {}
        // Remove immediately to avoid any interference on vendor pages
        try { modal.remove(); } catch (_) {
            // Hard fallback
            try { modal.parentNode && modal.parentNode.removeChild(modal); } catch (_) {}
        }
        // remove global handlers if present
        const h = modal.__anyClickClose;
        if (h) {
            try { window.removeEventListener('click', h, true); } catch (_) {}
            try { window.removeEventListener('touchend', h, { capture: true }); } catch (_) {}
        }
    }
    // Unlock background scroll
    try { document.body.classList.remove('modal-open'); } catch (_) {}
}

function notifyWhenReady() {
    // Show success message
    const notifyBtn = document.querySelector('.notify-btn');
    if (notifyBtn) {
        notifyBtn.innerHTML = '<i class="fas fa-check"></i> We\'ll notify you!';
        notifyBtn.style.background = '#10b981';
        notifyBtn.disabled = true;
        
        setTimeout(() => {
            closeComingSoonModal();
        }, 1500);
    }
}

// Make functions globally available
window.showComingSoonModal = showComingSoonModal;
window.closeComingSoonModal = closeComingSoonModal;
window.notifyWhenReady = notifyWhenReady;

// Safety: Event delegation to ensure close/notify always work
document.addEventListener('click', (e) => {
    const overlay = e.target.closest('.coming-soon-overlay');
    const closeBtn = e.target.closest('.coming-soon-close');
    const notify = e.target.closest('.notify-btn');
    if (overlay || closeBtn) {
        closeComingSoonModal();
    } else if (notify) {
        notifyWhenReady();
    }
});

// Capture-phase listener to handle cases where other scripts stop propagation
document.addEventListener('click', (e) => {
    const overlay = e.target.closest && e.target.closest('.coming-soon-overlay');
    const closeBtn = e.target.closest && e.target.closest('.coming-soon-close');
    if (overlay || closeBtn) {
        // prevent other handlers from interfering
        try { e.stopPropagation(); } catch (_) {}
        closeComingSoonModal();
    }
}, true);

// Close if clicking anywhere outside modal content (capture-phase)
function handleGlobalCloseCapture(e) {
    const modal = document.getElementById('coming-soon-modal');
    if (!modal) return;
    const content = modal.querySelector('.coming-soon-content');
    if (!content) return;
    const insideContent = content.contains(e.target);
    // If click/touch is outside content, close
    if (!insideContent) {
        try { e.stopPropagation(); } catch (_) {}
        closeComingSoonModal();
    }
}
document.addEventListener('mousedown', handleGlobalCloseCapture, true);
document.addEventListener('touchstart', handleGlobalCloseCapture, { capture: true, passive: true });

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeComingSoonModal();
    }
});