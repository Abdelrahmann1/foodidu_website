// Component Loader - Handles loading HTML components
function ComponentLoader() {
  this.loadedComponents = new Set();
  this.isLoading = false; // Prevent multiple simultaneous loads

  // Load a single component
  this.loadComponent = function (componentPath, targetSelector, callback, position, forceReload) {
    if (this.loadedComponents.has(componentPath) && !forceReload) {
      if (callback) callback();
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", componentPath, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var targetElement = document.querySelector(targetSelector);
          if (targetElement) {
            if (targetSelector === "body") {
              // Use position parameter to determine where to insert
              var insertPosition = position || "afterbegin";
              targetElement.insertAdjacentHTML(insertPosition, xhr.responseText);
            } else {
              if (forceReload) {
                // For force reload, replace content instead of appending
                targetElement.innerHTML = xhr.responseText;
              } else {
                // Use insertAdjacentHTML to avoid innerHTML issues
                targetElement.insertAdjacentHTML('beforeend', xhr.responseText);
              }
            }
            this.loadedComponents.add(componentPath);
          }
          if (callback) callback();
        } else {
          console.error("Failed to load component:", componentPath);
          if (callback) callback();
        }
      }
    }.bind(this);
    xhr.send();
  };

  // Load multiple components in parallel for faster loading
  this.loadMultipleComponents = function (components, callback) {
    var loadedCount = 0;
    var totalComponents = components.length;
    var self = this;

    if (totalComponents === 0) {
      if (callback) callback();
      return;
    }

    function onComponentLoaded() {
      loadedCount++;
      if (loadedCount === totalComponents) {
        if (callback) callback();
      }
    }

    // Load all components in parallel
    components.forEach(function(component) {
      self.loadComponent(component.path, component.target, onComponentLoaded, component.position);
    });
  };

  // Load all components in the correct order
  this.loadAllComponents = function (callback) {
    var self = this;
    
    // Prevent multiple simultaneous loads
    if (self.isLoading) {
      console.log('Components already loading, skipping...');
      return;
    }
    
    self.isLoading = true;
    console.log('Starting loadAllComponents...');

    // Clear loaded components set to ensure fresh loading
    self.loadedComponents.clear();

    // Load critical components first
    var criticalComponents = [
      { path: "components/navigation.html", target: "body" },
      { path: "components/hero-carousel.html", target: "#home-components" },
    ];

    self.loadMultipleComponents(criticalComponents, function () {
      console.log('Critical components loaded');
      
      // Show the page once critical components are loaded
      const homePage = document.getElementById('home');
      if (homePage) {
        homePage.classList.add('ready');
      }
      
      // Load home components in the correct order (sequentially)
      var homeComponents = [
        { path: "components/exclusive-deals.html", target: "#home-components" },
        { path: "components/hot-promos.html", target: "#home-components" },
        { path: "components/features.html", target: "#home-components" },
        { path: "components/how-it-works.html", target: "#home-components" },
        { path: "components/vendor-invitation.html", target: "#home-components" },
        { path: "components/app-screenshots.html", target: "#home-components" },
        { path: "components/testimonials.html", target: "#home-components" },
        { path: "components/cta-section.html", target: "#home-components" }
      ];
      
      console.log('Loading home components sequentially...');
      // Load home components sequentially to maintain order
      self.loadComponentsSequentially(homeComponents, 0, function() {
        console.log('Home components loaded, loading other components...');
        
        // Load other components in parallel
        var otherComponents = [
          { path: "components/cookie-consent.html", target: "body" },
          { path: "pages/deals-page.html", target: "#pages-container" },
          { path: "pages/discovery-page.html", target: "#pages-container" },
          { path: "pages/promo-page.html", target: "#pages-container" },
          { path: "pages/vendors-page.html", target: "#pages-container" },
          { path: "components/footer.html", target: "body", position: "beforeend" },
        ];

        self.loadMultipleComponents(otherComponents, function() {
          console.log('All components loaded');
          
          // Show home components once loaded
          const homeComponentsContainer = document.getElementById('home-components');
          if (homeComponentsContainer) {
            homeComponentsContainer.classList.add('loaded');
            
            // Force visibility of all home components
            setTimeout(function() {
              self.makeHomeComponentsVisible();
            }, 100);
          }
          
          // Reset loading state
          self.isLoading = false;
          
          if (callback) callback();
        });
      });
    });
  };

  // Make home components visible (utility function)
  this.makeHomeComponentsVisible = function() {
    const homeComponents = document.getElementById('home-components');
    if (!homeComponents) return;
    
    const allSections = [
      '.hero-carousel',
      '.exclusive-deals',
      '.hot-promos',
      '.features', 
      '.how-it-works',
      '.vendor-invitation',
      '.app-screenshots',
      '.testimonials',
      '.cta-section'
    ];
    
    allSections.forEach(function(selector) {
      const section = homeComponents.querySelector(selector);
      if (section) {
        section.style.display = 'block';
        section.style.opacity = '1';
        section.style.visibility = 'visible';
        console.log('Made visible:', selector);
      } else {
        console.log('Missing section:', selector);
      }
    });
  };

  // Load components sequentially to maintain order
  this.loadComponentsSequentially = function(components, index, callback) {
    var self = this;
    
    if (index >= components.length) {
      console.log('Sequential loading complete');
      if (callback) callback();
      return;
    }
    
    var component = components[index];
    console.log('Loading component', index + 1, 'of', components.length, ':', component.path);
    
    self.loadComponent(component.path, component.target, function() {
      // Small delay to ensure DOM is updated before loading next component
      setTimeout(function() {
        self.loadComponentsSequentially(components, index + 1, callback);
      }, 50);
    }, component.position);
  };

  // Force reload a component (useful for ensuring components are always visible)
  this.forceReloadComponent = function(componentPath, targetSelector, callback) {
    // Remove from loaded components set to force reload
    this.loadedComponents.delete(componentPath);
    this.loadComponent(componentPath, targetSelector, callback, null, true);
  };


}

// Initialize component loader
var componentLoader = new ComponentLoader();

// Export for use in other files
window.componentLoader = componentLoader;
