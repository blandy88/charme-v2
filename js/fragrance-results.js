/**
 * Fragrance Results Display & Interaction Handler
 * Manages the display and interactions for fragrance search results
 */

class FragranceResultsHandler {
    constructor(containerId = 'fragrance-results') {
        this.container = document.getElementById(containerId);
        this.results = [];
        this.favorites = this.loadFavorites();
        this.currentPage = 1;
        this.resultsPerPage = 12;
        this.isLoading = false;

        // Map audience codes to display labels
        this.audienceLabels = {
            men: 'man',
            women: 'woman',
            unisex: 'unisex'
        };

        // Initialize event handlers
        this.initializeEventHandlers();

        // Check if user is logged in for favorites functionality
        this.userLoggedIn = this.checkUserLoginStatus();

        console.log('FragranceResultsHandler initialized');
    }

    /**
     * Initialize global event handlers
     */
    initializeEventHandlers() {
        // Handle clicks on result cards
        document.addEventListener('click', (e) => {
            // Handle favorite button clicks
            if (e.target.closest('.favorite-button')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleFavoriteClick(e.target.closest('.favorite-button'));
            }

            // Handle share button clicks
            if (e.target.closest('.share-button')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleShareClick(e.target.closest('.share-button'));
            }

            // Handle view details button clicks
            if (e.target.closest('.view-details-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleViewDetailsClick(e.target.closest('.view-details-btn'));
            }

            // Handle note tag clicks
            if (e.target.closest('.note-tag')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleNoteTagClick(e.target.closest('.note-tag'));
            }
        });
    }

    /**
     * Display search results
     * @param {Array} results - Array of fragrance results
     * @param {Object} options - Display options
     */
    displayResults(results, options = {}) {
        this.results = results || [];
        this.currentPage = 1;

        if (!this.container) {
            console.error('Results container not found');
            return;
        }

        // Show loading state if specified
        if (options.showLoading) {
            this.showLoadingState();
            return;
        }

        // Clear existing results
        this.container.innerHTML = '';

        // Handle empty results
        if (!this.results || this.results.length === 0) {
            this.showEmptyState(options.emptyMessage);
            return;
        }

        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'fragrance-results-container';

        // Display results with pagination
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = Math.min(startIndex + this.resultsPerPage, this.results.length);
        const resultsToShow = this.results.slice(startIndex, endIndex);

        resultsToShow.forEach((result, index) => {
            const resultCard = this.createResultCard(result, startIndex + index);
            resultsContainer.appendChild(resultCard);
        });

        this.container.appendChild(resultsContainer);

        // Add pagination if needed
        if (this.results.length > this.resultsPerPage) {
            this.addPaginationControls();
        }

        // Add results summary
        this.addResultsSummary();

        // Trigger animations
        this.animateResults();
    }

    /**
     * Create a result card element
     * @param {Object} result - Fragrance result data
     * @param {number} index - Card index for animation delay
     * @returns {HTMLElement} Result card element
     */
    createResultCard(result, index) {
        const card = document.createElement('div');
        card.className = 'fragrance-result';
        card.style.animationDelay = `${index * 0.1}s`;
        card.setAttribute('data-fragrance-id', result.fragrance || result.name);

        // Check if this fragrance is favorited
        const isFavorited = this.favorites.includes(result.fragrance || result.name);

        card.innerHTML = `
            <div class="result-header">
                <h3 class="fragrance-title">${this.escapeHtml(result.fragrance || result.name)} ${result.audience ? `<span class="audience-label">${this.audienceLabels[result.audience] || result.audience}</span>` : ''}</h3>
                <div class="result-actions-top">
                    <button class="action-button favorite-button ${isFavorited ? 'active' : ''}"
                            data-fragrance="${this.escapeHtml(result.fragrance || result.name)}"
                            aria-label="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}"
                            title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                        ${this.getFavoriteIcon(isFavorited)}
                    </button>
                    <button class="action-button share-button"
                            data-fragrance="${this.escapeHtml(result.fragrance || result.name)}"
                            aria-label="Share fragrance"
                            title="Share fragrance">
                        ${this.getShareIcon()}
                    </button>
                </div>
            </div>

            <div class="fragrance-details">
                ${result.profile?.brand ? `<div class="fragrance-brand">${this.escapeHtml(result.profile.brand)}</div>` : ''}

                ${this.createFragranceSpecs(result)}

                ${result.profile?.description ? `
                    <div class="fragrance-description">
                        ${this.escapeHtml(this.truncateText(result.profile.description, 120))}
                    </div>
                ` : ''}

                ${this.createMatchInfo(result)}

                ${this.createNotesDisplay(result)}
            </div>

            <div class="result-actions-bottom">
                <button class="action-button view-details-btn"
                        data-fragrance="${this.escapeHtml(result.fragrance || result.name)}">
                    ${this.getViewIcon()}
                    View Details
                </button>
            </div>
        `;

        return card;
    }

    /**
     * Create fragrance specifications display (concentration & sizes)
     * @param {Object} result - Fragrance result data
     * @returns {string} Fragrance specs HTML
     */
    createFragranceSpecs(result) {
        const profile = result.profile || {};
        
        if (!profile.concentration && !profile.sizes) {
            return '';
        }

        let specsHTML = '<div class="fragrance-specs">';
        
        // Add concentration badge
        if (profile.concentration) {
            const concentrationClass = this.getConcentrationClass(profile.concentration);
            specsHTML += `
                <div class="spec-item concentration-spec">
                    <span class="concentration-badge ${concentrationClass}">
                        ${this.escapeHtml(profile.concentration)}
                    </span>
                </div>
            `;
        }
        
        // Add sizes
        if (profile.sizes && Array.isArray(profile.sizes) && profile.sizes.length > 0) {
            specsHTML += `
                <div class="spec-item sizes-spec">
                    <span class="spec-label">Available:</span>
                    <div class="sizes-container">
                        ${profile.sizes.map(size => `
                            <span class="size-badge">${this.escapeHtml(size)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        specsHTML += '</div>';
        
        return specsHTML;
    }

    /**
     * Get CSS class for concentration type
     * @param {string} concentration - Concentration type (EDT, EDP, Parfum, etc.)
     * @returns {string} CSS class name
     */
    getConcentrationClass(concentration) {
        switch (concentration.toLowerCase()) {
            case 'edt':
                return 'conc-edt';
            case 'edp':
                return 'conc-edp';
            case 'parfum':
            case 'extrait':
                return 'conc-parfum';
            case 'elixir':
                return 'conc-elixir';
            default:
                return 'conc-default';
        }
    }

    /**
     * Create match information display
     * @param {Object} result - Fragrance result data
     * @returns {string} Match info HTML
     */
    createMatchInfo(result) {
        if (!result.percentage && !result.matchCount) {
            return '';
        }

        return `
            <div class="match-info">
                ${result.percentage ? `<span class="match-percentage">${result.percentage}% match</span>` : ''}
                ${result.matchCount && result.matchedIngredients ? `
                    <span class="match-count">
                        ${result.matchCount} of ${result.matchedIngredients.length} ingredients
                    </span>
                ` : ''}
            </div>
        `;
    }

    /**
     * Create notes display
     * @param {Object} result - Fragrance result data
     * @returns {string} Notes display HTML
     */
    createNotesDisplay(result) {
        let notes = [];

        // Get notes from different possible sources
        if (result.matchedIngredients && result.matchedIngredients.length > 0) {
            notes = result.matchedIngredients;
        } else if (result.profile?.notes) {
            if (Array.isArray(result.profile.notes)) {
                notes = result.profile.notes;
            } else if (typeof result.profile.notes === 'object') {
                // Handle notes object with top/heart/base structure
                notes = [
                    ...(result.profile.notes.top || []),
                    ...(result.profile.notes.heart || []),
                    ...(result.profile.notes.base || [])
                ];
            }
        }

        if (notes.length === 0) {
            return '';
        }

        // Limit to first 6 notes
        const displayNotes = notes.slice(0, 6);

        return `
            <div class="fragrance-notes">
                ${displayNotes.map(note => `
                    <span class="note-tag" data-note="${this.escapeHtml(note)}">
                        ${this.escapeHtml(note)}
                    </span>
                `).join('')}
                ${notes.length > 6 ? `
                    <span class="note-tag more-notes" title="View all ${notes.length} notes">
                        +${notes.length - 6} more
                    </span>
                ` : ''}
            </div>
        `;
    }

    /**
     * Handle favorite button click
     * @param {HTMLElement} button - Favorite button element
     */
    async handleFavoriteClick(button) {
        if (!this.userLoggedIn) {
            this.showLoginPrompt();
            return;
        }

        const fragranceName = button.getAttribute('data-fragrance');
        const isCurrentlyFavorited = button.classList.contains('active');

        // Add loading state
        button.classList.add('loading');
        button.disabled = true;

        try {
            if (isCurrentlyFavorited) {
                await this.removeFromFavorites(fragranceName);
                button.classList.remove('active');
                button.innerHTML = this.getFavoriteIcon(false);
                button.setAttribute('aria-label', 'Add to favorites');
                button.setAttribute('title', 'Add to favorites');
                this.showNotification(`Removed ${fragranceName} from favorites`, 'success');
            } else {
                await this.addToFavorites(fragranceName);
                button.classList.add('active');
                button.innerHTML = this.getFavoriteIcon(true);
                button.setAttribute('aria-label', 'Remove from favorites');
                button.setAttribute('title', 'Remove from favorites');
                this.showNotification(`Added ${fragranceName} to favorites`, 'success');
            }

            // Add animation effect
            button.classList.add('animate');
            setTimeout(() => button.classList.remove('animate'), 300);

        } catch (error) {
            console.error('Error updating favorites:', error);
            this.showNotification('Failed to update favorites. Please try again.', 'error');
        } finally {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * Handle share button click
     * @param {HTMLElement} button - Share button element
     */
    async handleShareClick(button) {
        const fragranceName = button.getAttribute('data-fragrance');

        try {
            if (navigator.share) {
                // Use native sharing API if available
                await navigator.share({
                    title: `${fragranceName} - Fragrance`,
                    text: `Check out this fragrance: ${fragranceName}`,
                    url: `${window.location.origin}#fragrance=${encodeURIComponent(fragranceName)}`
                });
            } else {
                // Fallback to clipboard
                const shareUrl = `${window.location.origin}#fragrance=${encodeURIComponent(fragranceName)}`;
                await navigator.clipboard.writeText(shareUrl);
                this.showNotification('Link copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            // Fallback: copy to clipboard
            try {
                const shareUrl = `${window.location.origin}#fragrance=${encodeURIComponent(fragranceName)}`;
                await navigator.clipboard.writeText(shareUrl);
                this.showNotification('Link copied to clipboard!', 'success');
            } catch (clipboardError) {
                this.showNotification('Sharing failed. Please try again.', 'error');
            }
        }
    }

    /**
     * Handle view details button click
     * @param {HTMLElement} button - View details button element
     */
    handleViewDetailsClick(button) {
        const fragranceName = button.getAttribute('data-fragrance');

        // Find the fragrance data
        const fragranceData = this.results.find(r =>
            (r.fragrance || r.name) === fragranceName
        );

        if (fragranceData && fragranceData.profile) {
            // Navigate to fragrance section or open modal
            this.navigateToFragrance(fragranceName, fragranceData.profile);
        } else {
            // If no detailed data available, try to search for it
            this.searchAndNavigateToFragrance(fragranceName);
        }
    }

    /**
     * Handle note tag click
     * @param {HTMLElement} tag - Note tag element
     */
    handleNoteTagClick(tag) {
        const noteName = tag.getAttribute('data-note');
        if (noteName) {
            // Trigger search by ingredient
            this.searchByIngredient(noteName);
        }
    }

    /**
     * Navigate to fragrance details
     * @param {string} fragranceName - Fragrance name
     * @param {Object} profile - Fragrance profile data
     */
    navigateToFragrance(fragranceName, profile) {
        // This would typically navigate to a detailed view
        // For now, we'll scroll to the appropriate section or show detailed modal

        // Try to find existing fragrance section on page
        const sections = ['layton', 'haltane', 'pegasus', 'greenley'];
        const matchingSection = sections.find(section =>
            fragranceName.toLowerCase().includes(section)
        );

        if (matchingSection) {
            // Scroll to existing section
            const sectionElement = document.querySelector(`.${matchingSection}-section, .${matchingSection}-image, #${matchingSection}`);
            if (sectionElement) {
                sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight effect
                sectionElement.style.animation = 'highlight 2s ease-out';
                setTimeout(() => {
                    sectionElement.style.animation = '';
                }, 2000);
                return;
            }
        }

        // Fallback: show detailed modal or navigate to search
        this.showFragranceModal(fragranceName, profile);
    }

    /**
     * Search and navigate to fragrance
     * @param {string} fragranceName - Fragrance name
     */
    async searchAndNavigateToFragrance(fragranceName) {
        try {
            // Use fragrance service to get more details
            if (typeof FragranceAPIService !== 'undefined') {
                const service = new FragranceAPIService();
                const profile = service.getFragranceByName(fragranceName);

                if (profile) {
                    this.showFragranceModal(fragranceName, profile);
                } else {
                    // Open search modal with this fragrance
                    this.openSearchWithQuery(fragranceName);
                }
            } else {
                this.openSearchWithQuery(fragranceName);
            }
        } catch (error) {
            console.error('Error fetching fragrance details:', error);
            this.openSearchWithQuery(fragranceName);
        }
    }

    /**
     * Search by ingredient
     * @param {string} ingredient - Ingredient name
     */
    searchByIngredient(ingredient) {
        // Trigger ingredient search
        if (typeof window.searchByIngredients === 'function') {
            window.searchByIngredients([ingredient]);
        } else {
            // Fallback: open search modal with ingredient
            this.openSearchWithQuery(ingredient);
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="fragrance-results-loading">
                <div class="loading-spinner"></div>
                <h3>Searching fragrances...</h3>
                <p>Please wait while we find the perfect matches for you.</p>
            </div>
        `;
    }

    /**
     * Show empty state
     * @param {string} message - Custom empty message
     */
    showEmptyState(message) {
        if (!this.container) return;

        const defaultMessage = 'No fragrances found matching your criteria.';

        this.container.innerHTML = `
            <div class="no-results">
                <div class="empty-icon">🔍</div>
                <h3>No Results Found</h3>
                <p>${message || defaultMessage}</p>
                <p>Try adjusting your search criteria or explore our featured fragrances.</p>
            </div>
        `;
    }

    /**
     * Add results summary
     */
    addResultsSummary() {
        if (!this.container || !this.results.length) return;

        const summary = document.createElement('div');
        summary.className = 'results-summary';
        summary.innerHTML = `
            <p>Showing ${Math.min(this.resultsPerPage, this.results.length)} of ${this.results.length} results</p>
        `;

        this.container.insertBefore(summary, this.container.firstChild);
    }

    /**
     * Add pagination controls
     */
    addPaginationControls() {
        if (!this.container) return;

        const totalPages = Math.ceil(this.results.length / this.resultsPerPage);

        const pagination = document.createElement('div');
        pagination.className = 'pagination-controls';

        let paginationHTML = '<div class="pagination-buttons">';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn prev-btn" ${this.currentPage === 1 ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
                Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `
                <button class="pagination-btn page-btn ${isActive ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (totalPages > 5) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
            paginationHTML += `
                <button class="pagination-btn page-btn" data-page="${totalPages}">
                    ${totalPages}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn next-btn" ${this.currentPage === totalPages ? 'disabled' : ''}>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
            </button>
        `;

        paginationHTML += '</div>';

        pagination.innerHTML = paginationHTML;

        // Add event listeners
        pagination.addEventListener('click', (e) => {
            if (e.target.classList.contains('prev-btn') && this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            } else if (e.target.classList.contains('next-btn') && this.currentPage < totalPages) {
                this.goToPage(this.currentPage + 1);
            } else if (e.target.classList.contains('page-btn') && e.target.dataset.page) {
                this.goToPage(parseInt(e.target.dataset.page));
            }
        });

        this.container.appendChild(pagination);
    }

    /**
     * Go to specific page
     * @param {number} page - Page number
     */
    goToPage(page) {
        this.currentPage = page;
        this.displayResults(this.results);

        // Scroll to top of results
        if (this.container) {
            this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Animate results entrance
     */
    animateResults() {
        const cards = this.container.querySelectorAll('.fragrance-result');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';

            setTimeout(() => {
                card.style.transition = 'all 0.4s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Utility Functions
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    getFavoriteIcon(isFavorited) {
        if (isFavorited) {
            return `
                <svg class="heart-filled" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            `;
        } else {
            return `
                <svg class="heart-outline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            `;
        }
    }

    getShareIcon() {
        return `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
        `;
    }

    getViewIcon() {
        return `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
    }

    /**
     * Favorites Management
     */
    loadFavorites() {
        try {
            const stored = localStorage.getItem('fragranceFavorites');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Could not load favorites from localStorage:', error);
            return [];
        }
    }

    saveFavorites() {
        try {
            localStorage.setItem('fragranceFavorites', JSON.stringify(this.favorites));
        } catch (error) {
            console.warn('Could not save favorites to localStorage:', error);
        }
    }

    async addToFavorites(fragranceName) {
        if (!this.favorites.includes(fragranceName)) {
            this.favorites.push(fragranceName);
            this.saveFavorites();

            // If connected to a backend, sync with server
            if (this.userLoggedIn) {
                try {
                    await this.syncFavoritesWithServer();
                } catch (error) {
                    console.warn('Could not sync favorites with server:', error);
                }
            }
        }
    }

    async removeFromFavorites(fragranceName) {
        const index = this.favorites.indexOf(fragranceName);
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.saveFavorites();

            // If connected to a backend, sync with server
            if (this.userLoggedIn) {
                try {
                    await this.syncFavoritesWithServer();
                } catch (error) {
                    console.warn('Could not sync favorites with server:', error);
                }
            }
        }
    }

    async syncFavoritesWithServer() {
        // Implement server synchronization if needed
        // This would make API calls to sync favorites with user account
    }

    /**
     * User Authentication Check
     */
    checkUserLoginStatus() {
        // Check if user is logged in
        // This should integrate with your authentication system
        return localStorage.getItem('userToken') ||
               sessionStorage.getItem('userToken') ||
               document.body.classList.contains('user-logged-in');
    }

    /**
     * Show login prompt
     */
    showLoginPrompt() {
        // Show login modal or redirect to login page
        if (typeof window.showLoginModal === 'function') {
            window.showLoginModal();
        } else {
            this.showNotification('Please log in to save favorites', 'info');
        }
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fragrance-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${this.escapeHtml(message)}</span>
                <button class="notification-close" aria-label="Close notification">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show with animation
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto hide after 5 seconds
        const hideTimer = setTimeout(() => {
            this.hideNotification(notification);
        }, 5000);

        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(hideTimer);
            this.hideNotification(notification);
        });
    }

    hideNotification(notification) {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Modal and Navigation Helpers
     */
    showFragranceModal(fragranceName, profile) {
        // Implementation would depend on your modal system
        console.log('Show fragrance modal for:', fragranceName, profile);
    }

    openSearchWithQuery(query) {
        // Implementation would depend on your search system
        console.log('Open search with query:', query);
    }

    /**
     * Clear results
     */
    clearResults() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.results = [];
        this.currentPage = 1;
    }

    /**
     * Filter results
     * @param {Function} filterFn - Filter function
     */
    filterResults(filterFn) {
        const filteredResults = this.results.filter(filterFn);
        this.displayResults(filteredResults);
    }

    /**
     * Sort results
     * @param {string} sortBy - Sort criteria
     * @param {string} order - Sort order (asc/desc)
     */
    sortResults(sortBy = 'percentage', order = 'desc') {
        const sortedResults = [...this.results].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (order === 'desc') {
                return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
            } else {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            }
        });

        this.displayResults(sortedResults);
    }

    /**
     * Get current results
     * @returns {Array} Current results array
     */
    getResults() {
        return this.results;
    }

    /**
     * Update results per page
     * @param {number} count - Results per page count
     */
    setResultsPerPage(count) {
        this.resultsPerPage = Math.max(1, Math.min(50, count));
        this.currentPage = 1;
        this.displayResults(this.results);
    }
}

// Initialize global instance
window.fragranceResultsHandler = null;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if results container exists
    const resultsContainer = document.getElementById('fragrance-results') ||
                           document.querySelector('.fragrance-results-container') ||
                           document.querySelector('[data-fragrance-results]');

    if (resultsContainer) {
        window.fragranceResultsHandler = new FragranceResultsHandler(resultsContainer.id);
        console.log('FragranceResultsHandler auto-initialized');
    }
});

//
