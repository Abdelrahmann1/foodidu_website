/**
 * Foodidu Performance Diagnostics
 * Specialized performance analysis for Foodidu website
 */

class FoodiduPerformanceDiagnostics {
    constructor() {
        this.isEnabled = this.checkIfEnabled();
        this.metrics = {};
        this.suggestions = [];
        this.foodiduSpecificChecks = true;
        
        if (this.isEnabled) {
            this.init();
        }
    }
    
    checkIfEnabled() {
        // Enable if URL contains ?performance=true or localStorage flag is set
        const urlParams = new URLSearchParams(window.location.search);
        const isAdmin = localStorage.getItem('foodidu-admin') === 'true';
        return urlParams.get('performance') === 'true' || isAdmin;
    }
    
    async init() {
        console.log('🍽️ Foodidu Performance Diagnostics Enabled');
        
        // Add performance panel to page
        this.createPerformancePanel();
        
        // Run initial analysis after page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.runFoodiduAnalysis();
            }, 2000);
        });
        
        // Monitor navigation changes
        this.monitorNavigation();
    }
    
    createPerformancePanel() {
        const panel = document.createElement('div');
        panel.id = 'foodidu-performance-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: linear-gradient(135deg, #ffe082 0%, #ffb74d 100%);
                color: #1a202c;
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: 'Segoe UI', sans-serif;
                font-size: 12px;
                max-width: 300px;
                cursor: move;
            ">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                    <strong>🍽️ Foodidu Performance</strong>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        background: none;
                        border: none;
                        font-size: 16px;
                        cursor: pointer;
                        margin-left: 10px;
                    ">×</button>
                </div>
                <div id="performance-metrics">
                    <div>📊 Initializing analysis...</div>
                </div>
                <div style="margin-top: 10px;">
                    <button onclick="window.foodiduPerf.runFoodiduAnalysis()" style="
                        background: #059669;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 11px;
                        margin-right: 5px;
                    ">🔄 Refresh</button>
                    <button onclick="window.foodiduPerf.exportReport()" style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 11px;
                    ">📊 Export</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Make panel draggable
        this.makeDraggable(panel.firstElementChild);
    }
    
    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.right = 'auto';
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    async runFoodiduAnalysis() {
        const metricsDiv = document.getElementById('performance-metrics');
        if (metricsDiv) {
            metricsDiv.innerHTML = '<div>🔄 Analyzing Foodidu performance...</div>';
        }
        
        try {
            // Collect Foodidu-specific metrics
            const metrics = await this.collectFoodiduMetrics();
            this.metrics = metrics;
            
            // Generate Foodidu-specific suggestions
            this.suggestions = this.generateFoodiduSuggestions(metrics);
            
            // Calculate Foodidu performance score
            const score = this.calculateFoodiduScore(metrics, this.suggestions);
            
            // Update display
            this.updatePerformanceDisplay(metrics, score);
            
            // Log detailed results to console
            this.logDetailedResults(metrics, score);
            
        } catch (error) {
            console.error('Foodidu performance analysis failed:', error);
            if (metricsDiv) {
                metricsDiv.innerHTML = '<div style="color: #dc2626;">❌ Analysis failed</div>';
            }
        }
    }
    
    async collectFoodiduMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            page: {
                url: window.location.href,
                title: document.title,
                currentPage: window.AppState?.currentPage || 'unknown'
            },
            memory: this.measureMemory(),
            dom: this.analyzeFoodiduDOM(),
            network: await this.analyzeFoodiduNetwork(),
            rendering: this.measureRendering(),
            foodiduSpecific: this.analyzeFoodiduFeatures()
        };
        
        return metrics;
    }
    
    measureMemory() {
        const memory = {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            memoryUsagePercentage: 0,
            domNodes: document.querySelectorAll('*').length,
            eventListeners: this.estimateEventListeners()
        };
        
        if (performance.memory) {
            memory.usedJSHeapSize = performance.memory.usedJSHeapSize;
            memory.totalJSHeapSize = performance.memory.totalJSHeapSize;
            memory.memoryUsagePercentage = (memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        }
        
        return memory;
    }
    
    analyzeFoodiduDOM() {
        return {
            totalElements: document.querySelectorAll('*').length,
            images: document.querySelectorAll('img').length,
            lazyImages: document.querySelectorAll('img[loading="lazy"]').length,
            promoCards: document.querySelectorAll('.promo-card, .deal-card').length,
            vendorCards: document.querySelectorAll('.vendor-card').length,
            buttons: document.querySelectorAll('button').length,
            forms: document.querySelectorAll('form').length,
            modals: document.querySelectorAll('.modal').length,
            carousels: document.querySelectorAll('.carousel, .slider').length
        };
    }
    
    async analyzeFoodiduNetwork() {
        const network = {
            totalRequests: 0,
            totalTransferSize: 0,
            imageRequests: 0,
            scriptRequests: 0,
            cssRequests: 0,
            apiRequests: 0,
            resourceTypes: {}
        };
        
        try {
            const resources = performance.getEntriesByType('resource');
            network.totalRequests = resources.length;
            
            resources.forEach(resource => {
                if (resource.transferSize) {
                    network.totalTransferSize += resource.transferSize;
                }
                
                const type = this.getResourceType(resource.name);
                network.resourceTypes[type] = (network.resourceTypes[type] || 0) + 1;
                
                if (type === 'image') network.imageRequests++;
                else if (type === 'script') network.scriptRequests++;
                else if (type === 'stylesheet') network.cssRequests++;
                else if (resource.name.includes('api') || resource.name.includes('firebase')) {
                    network.apiRequests++;
                }
            });
        } catch (error) {
            console.warn('Network analysis failed:', error);
        }
        
        return network;
    }
    
    measureRendering() {
        const rendering = {
            firstPaint: 0,
            firstContentfulPaint: 0,
            domContentLoaded: 0,
            loadComplete: 0
        };
        
        try {
            const paintEntries = performance.getEntriesByType('paint');
            paintEntries.forEach(entry => {
                if (entry.name === 'first-paint') {
                    rendering.firstPaint = entry.startTime;
                } else if (entry.name === 'first-contentful-paint') {
                    rendering.firstContentfulPaint = entry.startTime;
                }
            });
            
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                const nav = navEntries[0];
                rendering.domContentLoaded = nav.domContentLoadedEventEnd - nav.navigationStart;
                rendering.loadComplete = nav.loadEventEnd - nav.navigationStart;
            }
        } catch (error) {
            console.warn('Rendering measurement failed:', error);
        }
        
        return rendering;
    }
    
    analyzeFoodiduFeatures() {
        return {
            homeComponentsLoaded: !!document.querySelector('#home-components .hero-carousel'),
            navigationWorking: !!document.querySelector('.navbar'),
            modalSystem: !!document.querySelector('#coming-soon-modal'),
            cookieConsent: !!document.querySelector('.cookie-consent'),
            mobileMenu: !!document.querySelector('.mobile-menu'),
            searchFunctionality: !!document.querySelector('.search-container'),
            filterSystem: !!document.querySelector('.filters'),
            loadingSpinner: !!document.querySelector('#loading-spinner'),
            errorHandling: typeof window.showNotification === 'function',
            stateManagement: !!window.AppState
        };
    }
    
    generateFoodiduSuggestions(metrics) {
        const suggestions = [];
        
        // Memory suggestions
        if (metrics.memory.memoryUsagePercentage > 80) {
            suggestions.push({
                category: 'Memory',
                severity: 'high',
                issue: 'High memory usage detected',
                suggestion: 'Consider optimizing image loading and reducing DOM complexity for better mobile performance'
            });
        }
        
        // DOM suggestions
        if (metrics.dom.totalElements > 2000) {
            suggestions.push({
                category: 'DOM',
                severity: 'medium',
                issue: 'Large DOM size',
                suggestion: 'Consider virtual scrolling for restaurant lists and lazy loading for deal cards'
            });
        }
        
        if (metrics.dom.images > metrics.dom.lazyImages && metrics.dom.images > 10) {
            suggestions.push({
                category: 'Images',
                severity: 'medium',
                issue: 'Images without lazy loading',
                suggestion: `${metrics.dom.images - metrics.dom.lazyImages} images could benefit from lazy loading for faster initial page load`
            });
        }
        
        // Network suggestions
        if (metrics.network.totalTransferSize > 2097152) { // 2MB
            suggestions.push({
                category: 'Network',
                severity: 'high',
                issue: 'Large total transfer size',
                suggestion: 'Optimize images, enable compression, and consider using WebP format for restaurant photos'
            });
        }
        
        if (metrics.network.totalRequests > 50) {
            suggestions.push({
                category: 'Network',
                severity: 'medium',
                issue: 'Many HTTP requests',
                suggestion: 'Bundle CSS/JS files and use CSS sprites for icons to reduce requests'
            });
        }
        
        // Rendering suggestions
        if (metrics.rendering.firstContentfulPaint > 2500) {
            suggestions.push({
                category: 'Rendering',
                severity: 'high',
                issue: 'Slow First Contentful Paint',
                suggestion: 'Optimize critical rendering path and consider inlining critical CSS for faster food discovery'
            });
        }
        
        // Foodidu-specific suggestions
        if (!metrics.foodiduSpecific.homeComponentsLoaded) {
            suggestions.push({
                category: 'Foodidu',
                severity: 'high',
                issue: 'Home components not loaded',
                suggestion: 'Check component loader - users may not see deals and restaurants'
            });
        }
        
        if (metrics.dom.promoCards > 20) {
            suggestions.push({
                category: 'Foodidu',
                severity: 'low',
                issue: 'Many promo cards',
                suggestion: 'Consider pagination or infinite scroll for better performance with many deals'
            });
        }
        
        if (!metrics.foodiduSpecific.errorHandling) {
            suggestions.push({
                category: 'Foodidu',
                severity: 'medium',
                issue: 'Error handling not detected',
                suggestion: 'Ensure proper error handling for API failures and network issues'
            });
        }
        
        return suggestions;
    }
    
    calculateFoodiduScore(metrics, suggestions) {
        let score = 100;
        
        // Deduct points based on suggestions
        suggestions.forEach(suggestion => {
            switch (suggestion.severity) {
                case 'high': score -= 15; break;
                case 'medium': score -= 8; break;
                case 'low': score -= 3; break;
            }
        });
        
        // Foodidu-specific scoring
        if (!metrics.foodiduSpecific.homeComponentsLoaded) score -= 20;
        if (!metrics.foodiduSpecific.stateManagement) score -= 10;
        if (metrics.rendering.firstContentfulPaint > 3000) score -= 15;
        if (metrics.memory.memoryUsagePercentage > 90) score -= 20;
        
        return Math.max(0, score);
    }
    
    updatePerformanceDisplay(metrics, score) {
        const metricsDiv = document.getElementById('performance-metrics');
        if (!metricsDiv) return;
        
        const scoreColor = score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626';
        
        metricsDiv.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong style="color: ${scoreColor};">Score: ${Math.round(score)}/100</strong>
            </div>
            <div style="font-size: 11px; line-height: 1.3;">
                <div>📱 Memory: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
                <div>🏗️ DOM: ${metrics.dom.totalElements} elements</div>
                <div>🌐 Requests: ${metrics.network.totalRequests}</div>
                <div>🖼️ Images: ${metrics.dom.images} (${metrics.dom.lazyImages} lazy)</div>
                <div>🎯 Page: ${metrics.page.currentPage}</div>
                <div>⚠️ Issues: ${this.suggestions.length}</div>
            </div>
        `;
    }
    
    logDetailedResults(metrics, score) {
        console.group('🍽️ Foodidu Performance Analysis');
        console.log('📊 Overall Score:', Math.round(score));
        console.log('📱 Current Page:', metrics.page.currentPage);
        console.log('🧠 Memory Usage:', (metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
        console.log('🏗️ DOM Elements:', metrics.dom.totalElements);
        console.log('🌐 Network Requests:', metrics.network.totalRequests);
        console.log('📦 Transfer Size:', (metrics.network.totalTransferSize / 1024).toFixed(1), 'KB');
        console.log('🎨 First Contentful Paint:', metrics.rendering.firstContentfulPaint?.toFixed(0) || 'N/A', 'ms');
        
        console.group('🍽️ Foodidu Features');
        Object.entries(metrics.foodiduSpecific).forEach(([key, value]) => {
            console.log(`${value ? '✅' : '❌'} ${key}:`, value);
        });
        console.groupEnd();
        
        if (this.suggestions.length > 0) {
            console.group('💡 Optimization Suggestions');
            this.suggestions.forEach(suggestion => {
                const icon = suggestion.severity === 'high' ? '🔴' : 
                           suggestion.severity === 'medium' ? '🟡' : '🟢';
                console.log(`${icon} [${suggestion.category}] ${suggestion.issue}`);
                console.log(`   → ${suggestion.suggestion}`);
            });
            console.groupEnd();
        }
        
        console.groupEnd();
    }
    
    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            score: this.calculateFoodiduScore(this.metrics, this.suggestions),
            metrics: this.metrics,
            suggestions: this.suggestions,
            foodiduVersion: '1.0',
            userAgent: navigator.userAgent
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `foodidu-performance-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📊 Foodidu performance report exported');
    }
    
    monitorNavigation() {
        // Monitor page changes
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            setTimeout(() => window.foodiduPerf?.runFoodiduAnalysis(), 1000);
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            setTimeout(() => window.foodiduPerf?.runFoodiduAnalysis(), 1000);
        };
        
        window.addEventListener('popstate', () => {
            setTimeout(() => window.foodiduPerf?.runFoodiduAnalysis(), 1000);
        });
    }
    
    // Helper methods
    estimateEventListeners() {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [onclick], [onchange]');
        return interactiveElements.length;
    }
    
    getResourceType(url) {
        const extension = url.split('.').pop().toLowerCase().split('?')[0];
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(extension)) {
            return 'image';
        } else if (['js', 'mjs'].includes(extension)) {
            return 'script';
        } else if (['css'].includes(extension)) {
            return 'stylesheet';
        } else if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) {
            return 'font';
        } else {
            return 'other';
        }
    }
}

// Initialize Foodidu Performance Diagnostics
if (typeof window !== 'undefined') {
    window.foodiduPerf = new FoodiduPerformanceDiagnostics();
    
    // Global functions for easy access
    window.runFoodiduPerformanceAnalysis = () => {
        if (window.foodiduPerf) {
            window.foodiduPerf.runFoodiduAnalysis();
        } else {
            console.log('Foodidu Performance Diagnostics not enabled. Add ?performance=true to URL');
        }
    };
    
    // Enable admin mode
    window.enableFoodiduAdmin = () => {
        localStorage.setItem('foodidu-admin', 'true');
        location.reload();
    };
    
    window.disableFoodiduAdmin = () => {
        localStorage.removeItem('foodidu-admin');
        location.reload();
    };
}