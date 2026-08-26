/**
 * Scent Profiler — Full-Screen Modal with Note-Based Matching
 * Matches users to fragrances based on ingredient preferences, not abstract traits.
 */
class AIFragranceFinder {
  constructor() {
    this.currentQuestion = 0;
    this.answers = {};
    this.modal = null;
    this.catalog = [];
    this.noteCategories = {
      fresh: ["bergamot", "lemon", "orange", "lime", "grapefruit", "mint", "aldehydes"],
      floral: ["rose", "jasmine", "lily", "iris", "peony", "geranium", "lavender", "violet"],
      woody: ["cedarwood", "sandalwood", "vetiver", "patchouli", "oakmoss"],
      oriental: ["amber", "vanilla", "oud", "resin", "frankincense", "myrrh"],
      spicy: ["cardamom", "cinnamon", "ginger", "clove", "nutmeg", "saffron"],
      sweet: ["praline", "honey", "caramel", "tonka", "chocolate", "cotton candy"],
      gourmand: ["coffee", "hazelnut", "almond", "pistachio", "rum"],
      green: ["galbanum", "fig", "bamboo", "grass", "leaf"],
      aquatic: ["sea salt", "driftwood", "marine"],
      smoky: ["tobacco", "leather", "birch", "smoke"]
    };
    
    this.questions = [
      {
        id: "gender",
        title: "Who is this fragrance for?",
        type: "single",
        options: [
          { label: "For Him", value: "homme", icon: "♂" },
          { label: "For Her", value: "femme", icon: "♀" },
          { label: "Unisex", value: "mixte", icon: "∞" }
        ]
      },
      {
        id: "notes",
        title: "Which notes do you love? (Select up to 3)",
        type: "multi",
        max: 3,
        options: [
          { label: "Vanilla", value: "vanilla", emoji: "🍦" },
          { label: "Rose", value: "rose", emoji: "🌹" },
          { label: "Oud", value: "oud", emoji: "🪵" },
          { label: "Bergamot", value: "bergamot", emoji: "🍊" },
          { label: "Leather", value: "leather", emoji: "🧥" },
          { label: "Sandalwood", value: "sandalwood", emoji: "🪵" },
          { label: "Jasmine", value: "jasmine", emoji: "🌸" },
          { label: "Amber", value: "amber", emoji: "✨" },
          { label: "Cedarwood", value: "cedarwood", emoji: "🌲" },
          { label: "Vetiver", value: "vetiver", emoji: "🌿" },
          { label: "Spices", value: "cardamom", emoji: "🌶️" },
          { label: "Citrus", value: "lemon", emoji: "🍋" }
        ]
      },
      {
        id: "family",
        title: "What scent family draws you in?",
        type: "single",
        options: [
          { label: "Fresh & Aquatic", value: "fresh", emoji: "💧" },
          { label: "Woody & Earthy", value: "woody", emoji: "🌲" },
          { label: "Oriental & Warm", value: "oriental", emoji: "🔥" },
          { label: "Floral & Romantic", value: "floral", emoji: "🌸" },
          { label: "Sweet & Gourmand", value: "sweet", emoji: "🍫" },
          { label: "No Preference", value: "any", emoji: "✨" }
        ]
      },
      {
        id: "season",
        title: "Which season do you wear it in?",
        type: "single",
        options: [
          { label: "Spring", value: "spring", emoji: "🌸" },
          { label: "Summer", value: "summer", emoji: "☀️" },
          { label: "Autumn", value: "autumn", emoji: "🍂" },
          { label: "Winter", value: "winter", emoji: "❄️" },
          { label: "All Year", value: "any", emoji: "🔄" }
        ]
      },
      {
        id: "intensity",
        title: "How bold do you like it?",
        type: "single",
        options: [
          { label: "Light & Airy", value: "light", emoji: "💨" },
          { label: "Moderate", value: "moderate", emoji: "⚖️" },
          { label: "Bold & Powerful", value: "bold", emoji: "💪" },
          { label: "No Preference", value: "any", emoji: "✨" }
        ]
      },
      {
        id: "occasion",
        title: "When will you wear it?",
        type: "single",
        options: [
          { label: "Daily Wear", value: "daily", emoji: "📅" },
          { label: "Date Night", value: "date", emoji: "💕" },
          { label: "Special Events", value: "special", emoji: "🎉" },
          { label: "Office", value: "office", emoji: "💼" },
          { label: "No Preference", value: "any", emoji: "✨" }
        ]
      },
      {
        id: "budget",
        title: "Your budget range?",
        type: "single",
        options: [
          { label: "Under 20dt", value: "budget", emoji: "💰" },
          { label: "20-50dt", value: "mid", emoji: "💵" },
          { label: "50-100dt", value: "premium", emoji: "💎" },
          { label: "No Limit", value: "any", emoji: "✨" }
        ]
      },
      {
        id: "dislikes",
        title: "Any notes you dislike? (Select all that apply)",
        type: "multi",
        max: 5,
        options: [
          { label: "None", value: "none", emoji: "✨" },
          { label: "Sweet / Candy", value: "sweet", emoji: "🍬" },
          { label: "Heavy Smoke", value: "smoke", emoji: "💨" },
          { label: "Powdery Floral", value: "powdery", emoji: "🌸" },
          { label: "Animalic / Musk", value: "musk", emoji: "🐾" },
          { label: "Green / Herbal", value: "green", emoji: "🌿" },
          { label: "Aqua / Marine", value: "aqua", emoji: "🌊" },
          { label: "Coffee / Nutty", value: "gourmand", emoji: "☕" }
        ]
      }
    ];
    
    this.init();
  }
  
  init() {
    this.loadCatalog();
    this.createModal();
    this.bindEvents();
  }
  
  loadCatalog() {
    if (window.FRAGRANCE_CATALOG_DATA) {
      this.catalog = window.FRAGRANCE_CATALOG_DATA;
    } else if (window.FRAGRANCE_CATALOG) {
      this.catalog = window.FRAGRANCE_CATALOG;
    } else {
      this.catalog = [];
    }
  }
  
  createModal() {
    this.modal = document.createElement('div');
    this.modal.id = 'scent-profiler-modal';
    this.modal.className = 'sp-modal hidden';
    this.modal.innerHTML = `
      <div class="sp-backdrop"></div>
      <div class="sp-container">
        <button class="sp-close-btn" id="spCloseBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        <div class="sp-content">
          <!-- Welcome State -->
          <div class="sp-state sp-welcome" id="spWelcome">
            <div class="sp-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
            </div>
            <h1 class="sp-title">Find Your Signature</h1>
            <p class="sp-subtitle">Answer 8 quick questions and discover fragrances that match your taste.</p>
            <button class="sp-start-btn" id="spStartBtn">
              Start Profiling
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </div>
          
          <!-- Question State -->
          <div class="sp-state sp-question hidden" id="spQuestion">
            <div class="sp-progress">
              <div class="sp-progress-bar">
                <div class="sp-progress-fill" id="spProgressFill"></div>
              </div>
              <span class="sp-progress-text" id="spProgressText">Question 1 of 8</span>
            </div>
            
            <h2 class="sp-question-title" id="spQuestionTitle"></h2>
            <div class="sp-options" id="spOptions"></div>
            
            <div class="sp-nav">
              <button class="sp-nav-btn sp-back" id="spBackBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15,18 9,12 15,6"/>
                </svg>
                Back
              </button>
              <button class="sp-nav-btn sp-next" id="spNextBtn" disabled>
                Next
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Results State -->
          <div class="sp-state sp-results hidden" id="spResults">
            <div class="sp-results-header">
              <div class="sp-results-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h2 class="sp-results-title">Your Perfect Matches</h2>
              <p class="sp-results-subtitle">Based on your preferences, we recommend these fragrances:</p>
            </div>
            
            <div class="sp-results-grid" id="spResultsGrid"></div>
            
            <div class="sp-results-actions">
              <button class="sp-action-btn sp-restart" id="spRestartBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
  }
  
  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#aiFinderIcon') || e.target.closest('.ai-finder-icon')) {
        this.open();
      }
      if (e.target.closest('#spCloseBtn')) {
        this.close();
      }
      if (e.target.closest('.sp-backdrop')) {
        this.close();
      }
      if (e.target.closest('#spStartBtn')) {
        this.start();
      }
      if (e.target.closest('#spBackBtn')) {
        this.prev();
      }
      if (e.target.closest('#spNextBtn')) {
        this.next();
      }
      if (e.target.closest('#spRestartBtn')) {
        this.reset();
      }
      if (e.target.closest('.sp-option')) {
        this.selectOption(e.target.closest('.sp-option'));
      }
      if (e.target.closest('.sp-result-card')) {
        this.scrollToPerfume(e.target.closest('.sp-result-card'));
      }
    });
  }
  
  open() {
    this.loadCatalog();
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  
  close() {
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
  
  start() {
    this.currentQuestion = 0;
    this.answers = {};
    this.showState('question');
  }
  
  reset() {
    this.currentQuestion = 0;
    this.answers = {};
    this.showState('welcome');
  }
  
  showState(state) {
    this.modal.querySelectorAll('.sp-state').forEach(el => el.classList.add('hidden'));
    const target = this.modal.querySelector(`.sp-${state}`);
    if (target) {
      target.classList.remove('hidden');
    }
    if (state === 'question') {
      this.renderQuestion();
    }
  }
  
  renderQuestion() {
    const q = this.questions[this.currentQuestion];
    const title = this.modal.querySelector('#spQuestionTitle');
    const options = this.modal.querySelector('#spOptions');
    const progress = this.modal.querySelector('#spProgressFill');
    const progressText = this.modal.querySelector('#spProgressText');
    const backBtn = this.modal.querySelector('#spBackBtn');
    const nextBtn = this.modal.querySelector('#spNextBtn');
    
    title.textContent = q.title;
    progress.style.width = `${((this.currentQuestion + 1) / this.questions.length) * 100}%`;
    progressText.textContent = `Question ${this.currentQuestion + 1} of ${this.questions.length}`;
    
    backBtn.style.display = this.currentQuestion > 0 ? 'flex' : 'none';
    
    const selected = this.answers[q.id] || (q.type === 'multi' ? [] : null);
    const isLast = this.currentQuestion === this.questions.length - 1;
    
    nextBtn.textContent = isLast ? 'Get Results' : 'Next';
    nextBtn.innerHTML = isLast 
      ? `Get Results <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
      : `Next <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>`;
    
    nextBtn.disabled = !selected || (q.type === 'multi' && selected.length === 0);
    
    options.innerHTML = q.options.map(opt => {
      const isSelected = q.type === 'multi' 
        ? selected.includes(opt.value)
        : selected === opt.value;
      return `
        <button class="sp-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}">
          <span class="sp-option-emoji">${opt.emoji || ''}</span>
          <span class="sp-option-label">${opt.label}</span>
        </button>
      `;
    }).join('');
  }
  
  selectOption(el) {
    const q = this.questions[this.currentQuestion];
    const value = el.dataset.value;
    
    if (q.type === 'multi') {
      if (!this.answers[q.id]) this.answers[q.id] = [];
      const idx = this.answers[q.id].indexOf(value);
      if (idx > -1) {
        this.answers[q.id].splice(idx, 1);
      } else {
        if (value === 'none') {
          this.answers[q.id] = ['none'];
        } else {
          this.answers[q.id] = this.answers[q.id].filter(v => v !== 'none');
          if (this.answers[q.id].length < q.max) {
            this.answers[q.id].push(value);
          }
        }
      }
    } else {
      this.answers[q.id] = value;
    }
    
    this.renderQuestion();
  }
  
  next() {
    const q = this.questions[this.currentQuestion];
    if (q.type === 'multi' && (!this.answers[q.id] || this.answers[q.id].length === 0)) {
      return;
    }
    
    if (this.currentQuestion < this.questions.length - 1) {
      this.currentQuestion++;
      this.renderQuestion();
    } else {
      this.calculateResults();
    }
  }
  
  prev() {
    if (this.currentQuestion > 0) {
      this.currentQuestion--;
      this.renderQuestion();
    }
  }
  
  calculateResults() {
    const gender = this.answers.gender || 'any';
    const preferredNotes = this.answers.notes || [];
    const family = this.answers.family || 'any';
    const season = this.answers.season || 'any';
    const intensity = this.answers.intensity || 'any';
    const occasion = this.answers.occasion || 'any';
    const budget = this.answers.budget || 'any';
    const dislikes = this.answers.dislikes || ['none'];
    
    const scored = this.catalog.map(perfume => {
      let score = 0;
      const notes = (perfume.ingredients || []).map(n => n.toLowerCase());
      const name = (perfume.name || '').toLowerCase();
      const desc = (perfume.description || '').toLowerCase();
      const allText = notes.join(' ') + ' ' + name + ' ' + desc;
      
      // 40% — Note matching (weighted: more matches = exponentially better)
      let noteHits = 0;
      const matchedNoteNames = [];
      preferredNotes.forEach(pref => {
        if (notes.some(n => n.includes(pref) || pref.includes(n))) {
          noteHits++;
          matchedNoteNames.push(pref);
        }
      });
      const noteRatio = preferredNotes.length > 0 ? noteHits / preferredNotes.length : 0;
      // Exponential weighting: 1/3 = 0.5, 2/3 = 0.85, 3/3 = 1.0
      const noteScore = Math.pow(noteRatio, 0.6);
      score += noteScore * 40;
      
      // 25% — Family matching (strict field match + ingredient hints)
      let familyScore = 0;
      const pf = (perfume.family || '').toLowerCase();
      const familyMap = {
        oriental: ['amber', 'oriental', 'vanilla', 'spicy warm', 'woody oriental'],
        woody: ['woody', 'wood', 'oud', 'vetiver'],
        floral: ['floral', 'rose', 'jasmine'],
        fresh: ['fresh', 'citrus', 'aquatic', 'aromatic'],
        sweet: ['sweet', 'gourmand', 'vanilla']
      };
      if (family !== 'any') {
        if (pf.includes(family)) {
          familyScore = 1;
        } else {
          const hints = familyMap[family] || [];
          const hintMatch = hints.some(h => pf.includes(h) || allText.includes(h));
          familyScore = hintMatch ? 0.5 : 0;
        }
      } else {
        familyScore = 0.4;
      }
      score += familyScore * 25;
      
      // 15% — Season matching (use family field as primary signal)
      let seasonScore = 0;
      if (season !== 'any') {
        const warmSeasons = ['winter', 'autumn'];
        const coolSeasons = ['summer', 'spring'];
        const isWarmPerfume = pf.includes('woody') || pf.includes('oriental') || pf.includes('amber') || pf.includes('warm') || pf.includes('sweet');
        const isCoolPerfume = pf.includes('fresh') || pf.includes('citrus') || pf.includes('aquatic') || pf.includes('aromatic');
        const isLightPerfume = pf.includes('fresh') || pf.includes('floral');
        
        if (warmSeasons.includes(season) && isWarmPerfume) seasonScore = 1;
        else if (coolSeasons.includes(season) && isCoolPerfume) seasonScore = 1;
        else if (season === 'autumn' && isWarmPerfume) seasonScore = 0.8;
        else if (season === 'spring' && isLightPerfume) seasonScore = 0.7;
        else if (season === 'spring' && isCoolPerfume) seasonScore = 0.5;
        else seasonScore = 0.15;
      } else {
        seasonScore = 0.4;
      }
      score += seasonScore * 15;
      
      // 10% — Gender matching
      let genderScore = 0;
      const pg = (perfume.gender || '').toLowerCase();
      const pa = (perfume.audience || '').toLowerCase();
      if (gender === 'any' || gender === 'mixte') {
        genderScore = 0.6;
      } else if (pg.includes(gender) || pa.includes(gender)) {
        genderScore = 1;
      } else if (pg.includes('mixte') || pa.includes('mixte')) {
        genderScore = 0.5;
      } else {
        genderScore = 0;
      }
      score += genderScore * 10;
      
      // 10% — Dislike exclusion (strong penalty)
      let dislikeScore = 1;
      if (!dislikes.includes('none')) {
        dislikes.forEach(dislike => {
          if (allText.includes(dislike)) dislikeScore -= 0.4;
        });
        dislikeScore = Math.max(0, dislikeScore);
      }
      score += dislikeScore * 10;
      
      // Normalize to 0-100 with meaningful spread
      const matchPct = Math.min(98, Math.max(20, Math.round(score)));
      
      return {
        perfume,
        score,
        notes,
        matchedNoteNames,
        matchPct
      };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const top6 = scored.slice(0, 6);
    
    this.displayResults(top6);
  }
  
  displayResults(results) {
    this.showState('results');
    
    const grid = this.modal.querySelector('#spResultsGrid');
    grid.innerHTML = results.map((r, i) => {
      const perfume = r.perfume;
      const image = this.getPerfumeImage(perfume.name);
      const topNotes = (perfume.ingredients || []).slice(0, 3).join(', ');
      
      return `
        <div class="sp-result-card" data-perfume="${perfume.name.toLowerCase()}" style="--delay: ${i * 0.1}s">
          <div class="sp-result-image">
            ${image ? `<img src="${image}" alt="${perfume.name}">` : `<div class="sp-result-placeholder">${perfume.name.charAt(0)}</div>`}
            <div class="sp-result-badge">${r.matchPct}% Match</div>
          </div>
          <div class="sp-result-info">
            <h3 class="sp-result-name">${perfume.name}</h3>
            <p class="sp-result-brand">${perfume.brand}</p>
            <p class="sp-result-notes">${topNotes}</p>
          </div>
        </div>
      `;
    }).join('');
  }
  
  getPerfumeImage(name) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const possibleImages = [
      `images/${cleanName}.jpg`,
      `images/${cleanName}.png`,
      `images/${cleanName}.webp`,
      `images/bottle-${cleanName}.jpg`,
      `images/bottle-${cleanName}.png`
    ];
    return possibleImages[0] || null;
  }
  
  scrollToPerfume(card) {
    const perfumeName = card.dataset.perfume;
    const section = document.querySelector(`[data-fragrance="${perfumeName}"]`) ||
                    document.querySelector(`.${perfumeName}-section`);
    
    if (section) {
      this.close();
      setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        section.style.transition = 'all 0.5s ease';
        section.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.3)';
        section.style.transform = 'scale(1.02)';
        setTimeout(() => {
          section.style.boxShadow = '';
          section.style.transform = '';
        }, 2000);
      }, 300);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScentProfiler);
} else {
  initScentProfiler();
}

function initScentProfiler() {
  try {
    if (!(window.scentProfiler instanceof AIFragranceFinder)) {
      window.scentProfiler = new AIFragranceFinder();
    }
  } catch (e) {
    console.error('Error creating Scent Profiler:', e);
  }
}

window.AIFragranceFinder = AIFragranceFinder;
