// Load shared sidebar and header templates
async function loadTemplate(elementId, templatePath) {
  try {
    const response = await fetch(templatePath);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;
  } catch (error) {
    console.error(`Failed to load template: ${templatePath}`, error);
  }
}

// Initialize shared layouts
async function initLayout() {
  const modelHeader = document.getElementById('model-header-container');
  
  await Promise.all([
    loadTemplate('sidebar-container', '/templates/sidebar.html'),
    loadTemplate('header-container', '/templates/header.html'),
    modelHeader ? loadTemplate('model-header-container', '/templates/model-header.html') : null
  ]);
  
  if (modelHeader) {
    const activeTab = modelHeader.dataset.activeTab;
    const activeLink = modelHeader.querySelector(`.tab-link[data-tab="${activeTab}"]`);
    if (activeLink) activeLink.classList.add('active');
  }
  
  // After loading templates, initialize components
  initActiveNavigation();
  initBreadcrumbs();
  initDropdowns();
}

// Highlight active navigation item
function initActiveNavigation() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.sidebar-menu-link');
  
  navLinks.forEach(link => {
    // Placeholder "#" links resolve to the current path, so skip them
    if (link.getAttribute('href') === '#') return;
    const linkPath = new URL(link.href, window.location.origin).pathname;
    if (currentPath === linkPath) {
      link.classList.add('active');
    }
    
    // Also check for section matches (e.g., /pages/users/anything should highlight users)
    const pageAttr = link.getAttribute('data-page');
    if (pageAttr && currentPath.includes(`/pages/${pageAttr}/`)) {
      link.classList.add('active');
    }
    const match = link.getAttribute('data-match');
    if (match && currentPath.startsWith(match)) {
      link.classList.add('active');
    }
  });
  
  // A more specific match (e.g. Orders under the tracker) wins over its section link
  const specific = [...navLinks].filter(l => l.classList.contains('active') && l.getAttribute('data-match'));
  if (specific.length) navLinks.forEach(l => { if (!specific.includes(l) && l.getAttribute('data-page')) l.classList.remove('active'); });
}

// Generate breadcrumbs from current path
function initBreadcrumbs() {
  const breadcrumbsContainer = document.getElementById('breadcrumbs');
  if (!breadcrumbsContainer) return;
  
  // Pages with their own breadcrumbs show them in the header instead
  const customBreadcrumbs = document.querySelector('.breadcrumbs-custom');
  if (customBreadcrumbs) {
    breadcrumbsContainer.innerHTML = customBreadcrumbs.innerHTML;
    customBreadcrumbs.remove();
    return;
  }
  
  const pathSegments = window.location.pathname.split('/').filter(segment => segment);
  
  // Start with Home
  let breadcrumbsHTML = '<a href="/" class="breadcrumb-link">Home</a>';
  
  if (pathSegments.length > 0) {
    // Build breadcrumbs from path
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += '/' + segment;
      const isLast = index === pathSegments.length - 1;
      const label = segment
        .replace('.html', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
      
      breadcrumbsHTML += ' <span class="breadcrumb-separator">/</span> ';
      
      if (isLast) {
        breadcrumbsHTML += `<span class="breadcrumb-current">${label}</span>`;
      } else {
        breadcrumbsHTML += `<a href="${currentPath}" class="breadcrumb-link">${label}</a>`;
      }
    });
  }
  
  breadcrumbsContainer.innerHTML = breadcrumbsHTML;
}

// Initialize dropdown menus
function initDropdowns() {
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = toggle.parentElement;
      const menu = dropdown.querySelector('.dropdown-menu');
      
      // Close other dropdowns
      document.querySelectorAll('.dropdown-menu.show').forEach(otherMenu => {
        if (otherMenu !== menu) {
          otherMenu.classList.remove('show');
        }
      });
      
      // Toggle current dropdown
      menu.classList.toggle('show');
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLayout);
} else {
  initLayout();
}
