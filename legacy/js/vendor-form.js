// Vendor Application Functions
import { CONFIG } from './config.js';
import { showNotification } from './utils.js';

export function initializeVendorForm() {
    console.log('Initializing vendor form...');
    const form = document.getElementById('vendor-application-form');
    if (form) {
        console.log('Found vendor form, adding submit handler');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submit triggered');
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }
            
            const formData = new FormData(form);
            const loadingMessage = document.createElement('div');
            loadingMessage.textContent = 'Submitting your application...';
            loadingMessage.style.color = '#eab308';
            loadingMessage.style.marginTop = '1rem';
            loadingMessage.style.textAlign = 'center';
            form.appendChild(loadingMessage);

            // Convert FormData to URLSearchParams for proper submission
            const params = new URLSearchParams();
            for (let [key, value] of formData) {
                params.append(key, value);
            }

            fetch(CONFIG.VENDOR_FORM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            })
            .then(response => response.text())
            .then(result => {
                console.log('Success:', result);
                showNotification('🎉 Thank you! Your vendor application has been submitted successfully. We\'ll contact you within 24 hours.');
                form.reset();
            })
            .catch(error => {
                console.error('Error!', error.message);
                showNotification('Submission failed. Please try again later.', 'error');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Application';
                }
                if (loadingMessage) loadingMessage.remove();
            });
        });
    } else {
        console.error('Vendor form not found in the DOM');
    }
}

export function handleVendorSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const formData = new FormData(form);
    const params = new URLSearchParams();
    for (let [key, value] of formData) {
        params.append(key, value);
    }

    fetch(CONFIG.VENDOR_FORM_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
    })
    .then(response => response.text())
    .then(result => {
        console.log('Success:', result);
        showNotification('🎉 Thank you! Your vendor application has been submitted successfully.');
        form.reset();
    })
    .catch(error => {
        console.error('Error!', error.message);
        showNotification('Submission failed. Please try again later.', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
    });
}