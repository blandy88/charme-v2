/**
 * AI Fragrance Finder
 * Advanced questionnaire system with AI-powered fragrance recommendations
 */

class AIFragranceFinder {
  constructor() {
    this.currentQuestion = 0;
    this.answers = {};
    this.questions = [
      {
        id: "time_preference",
        title: "What time of day do you usually wear fragrance?",
        type: "single",
        options: [
          {
            value: "morning",
            text: "Morning & Daytime",
            weight: { fresh: 3, citrus: 3, light: 2 },
          },
          {
            value: "evening",
            text: "Evening & Night",
            weight: { oriental: 3, spicy: 3, heavy: 2 },
          },
          {
            value: "both",
            text: "All day long",
            weight: { versatile: 3, moderate: 2 },
          },
          {
            value: "special",
            text: "Special occasions only",
            weight: { luxury: 3, sophisticated: 2 },
          },
        ],
      },
      {
        id: "season_preference",
        title: "Which season do you prefer for wearing fragrances?",
        type: "single",
        options: [
          {
            value: "spring",
            text: "Spring - Fresh & Floral",
            weight: { floral: 3, fresh: 2, green: 2 },
          },
          {
            value: "summer",
            text: "Summer - Light & Citrusy",
            weight: { citrus: 3, aquatic: 2, fresh: 2 },
          },
          {
            value: "autumn",
            text: "Autumn - Warm & Spicy",
            weight: { spicy: 3, woody: 2, amber: 2 },
          },
          {
            value: "winter",
            text: "Winter - Rich & Deep",
            weight: { oriental: 3, vanilla: 2, musk: 2 },
          },
          {
            value: "year_round",
            text: "All seasons",
            weight: { versatile: 3, balanced: 2 },
          },
        ],
      },
      {
        id: "personality_type",
        title: "How would you describe your personality?",
        type: "single",
        options: [
          {
            value: "confident",
            text: "Confident & Bold",
            weight: { bold: 3, statement: 2, strong: 2 },
          },
          {
            value: "romantic",
            text: "Romantic & Dreamy",
            weight: { floral: 3, soft: 2, feminine: 2 },
          },
          {
            value: "sophisticated",
            text: "Sophisticated & Elegant",
            weight: { luxury: 3, refined: 2, classic: 2 },
          },
          {
            value: "adventurous",
            text: "Adventurous & Energetic",
            weight: { dynamic: 3, fresh: 2, sporty: 2 },
          },
          {
            value: "mysterious",
            text: "Mysterious & Intriguing",
            weight: { dark: 3, complex: 2, enigmatic: 2 },
          },
        ],
      },
      {
        id: "scent_intensity",
        title: "What intensity do you prefer in fragrances?",
        type: "single",
        options: [
          {
            value: "subtle",
            text: "Subtle & Close to skin",
            weight: { light: 3, intimate: 2, soft: 2 },
          },
          {
            value: "moderate",
            text: "Moderate & Noticeable",
            weight: { moderate: 3, balanced: 2, wearable: 2 },
          },
          {
            value: "strong",
            text: "Strong & Long-lasting",
            weight: { powerful: 3, projection: 2, statement: 2 },
          },
          {
            value: "variable",
            text: "Depends on the occasion",
            weight: { versatile: 3, adaptable: 2 },
          },
        ],
      },
      {
        id: "scent_families",
        title: "Which scent families appeal to you most?",
        type: "multiple",
        options: [
          {
            value: "floral",
            text: "🌸 Floral (Rose, Jasmine, Lily)",
            weight: { floral: 3, feminine: 2 },
          },
          {
            value: "citrus",
            text: "🍋 Citrus (Bergamot, Lemon, Orange)",
            weight: { citrus: 3, fresh: 2 },
          },
          {
            value: "woody",
            text: "🌲 Woody (Sandalwood, Cedar, Oak)",
            weight: { woody: 3, masculine: 2 },
          },
          {
            value: "oriental",
            text: "🌟 Oriental (Vanilla, Amber, Spices)",
            weight: { oriental: 3, warm: 2 },
          },
          {
            value: "fresh",
            text: "💨 Fresh (Marine, Green, Ozonic)",
            weight: { fresh: 3, clean: 2 },
          },
          {
            value: "gourmand",
            text: "🍰 Gourmand (Vanilla, Caramel, Coffee)",
            weight: { sweet: 3, comforting: 2 },
          },
        ],
      },
      {
        id: "lifestyle",
        title: "What best describes your lifestyle?",
        type: "single",
        options: [
          {
            value: "professional",
            text: "Professional & Business-focused",
            weight: { professional: 3, clean: 2, sophisticated: 2 },
          },
          {
            value: "creative",
            text: "Creative & Artistic",
            weight: { unique: 3, artistic: 2, unconventional: 2 },
          },
          {
            value: "social",
            text: "Social & Outgoing",
            weight: { appealing: 3, charming: 2, magnetic: 2 },
          },
          {
            value: "active",
            text: "Active & Sporty",
            weight: { energetic: 3, fresh: 2, dynamic: 2 },
          },
          {
            value: "relaxed",
            text: "Relaxed & Laid-back",
            weight: { comfortable: 3, easy: 2, casual: 2 },
          },
        ],
      },
      {
        id: "budget_range",
        title: "What's your preferred price range?",
        type: "single",
        options: [
          {
            value: "luxury",
            text: "$200+ - Luxury & Niche",
            weight: { luxury: 3, niche: 2, premium: 2 },
          },
          {
            value: "premium",
            text: "$100-200 - Premium Designer",
            weight: { designer: 3, quality: 2, reliable: 2 },
          },
          {
            value: "mid_range",
            text: "$50-100 - Mid-range",
            weight: { accessible: 3, balanced: 2, practical: 2 },
          },
          {
            value: "budget",
            text: "Under $50 - Budget-friendly",
            weight: { affordable: 3, everyday: 2, simple: 2 },
          },
        ],
      },
      {
        id: "inspiration",
        title: "What inspires you to choose a fragrance?",
        type: "single",
        options: [
          {
            value: "memories",
            text: "Memories & Emotions",
            weight: { nostalgic: 3, emotional: 2, personal: 2 },
          },
          {
            value: "attraction",
            text: "To attract others",
            weight: { seductive: 3, magnetic: 2, alluring: 2 },
          },
          {
            value: "confidence",
            text: "To boost confidence",
            weight: { empowering: 3, bold: 2, strong: 2 },
          },
          {
            value: "mood",
            text: "To match my mood",
            weight: { expressive: 3, versatile: 2, adaptive: 2 },
          },
          {
            value: "artistry",
            text: "The artistry & craftsmanship",
            weight: { artistic: 3, refined: 2, appreciative: 2 },
          },
        ],
      },
    ];

    this.fragranceService = new FragranceAPIService();
    this.fragranceDatabase = this.generateDatabaseFromService();

    this.init();
  }

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  buildFallbackFragranceImage(name, brand, accent = "#c9a94e") {
    const safeName = this.escapeHtml(name || "Fragrance");
    const safeBrand = this.escapeHtml(brand || "Charme");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 560">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#090909"/>
            <stop offset="1" stop-color="#211a10"/>
          </linearGradient>
          <linearGradient id="bottle" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="${accent}" stop-opacity="0.96"/>
            <stop offset="1" stop-color="#fff4cf" stop-opacity="0.56"/>
          </linearGradient>
        </defs>
        <rect width="420" height="560" rx="34" fill="url(#bg)"/>
        <circle cx="210" cy="172" r="134" fill="${accent}" opacity="0.14"/>
        <rect x="160" y="94" width="100" height="40" rx="12" fill="${accent}" opacity="0.84"/>
        <rect x="126" y="132" width="168" height="268" rx="34" fill="#111" stroke="${accent}" stroke-width="4"/>
        <rect x="146" y="156" width="128" height="198" rx="22" fill="url(#bottle)" opacity="0.9"/>
        <text x="210" y="430" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#f5efdf">${safeBrand}</text>
        <text x="210" y="466" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#d0b66f">${safeName}</text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
  }

  fragranceImage(profile = {}, fragranceName = "Fragrance") {
    const validated =
      window.getValidatedFragranceImage?.(`${profile.brand || ""} ${fragranceName}`) ||
      window.getValidatedFragranceImage?.(fragranceName) ||
      "";
    if (validated) return validated;
    const provided = String(profile.image || "").trim();
    if (provided && provided !== "default-fragrance.png") return provided;
    return this.buildFallbackFragranceImage(fragranceName, profile.brand || "Charme");
  }

  generateDatabaseFromService() {
    const db = this.fragranceService.comprehensiveDatabase;
    return Object.entries(db).map(([name, profile]) => {
      // Generate match profile based on family and ingredients
      const match_profile = {};
      const best_for = [];
      const personality = [];
      
      // Basic mapping based on family
      const family = (profile.family || '').toLowerCase();
      if (family.includes('oriental') || family.includes('spicy')) {
        match_profile.oriental = 5;
        match_profile.warm = 4;
        match_profile.winter = 4;
        match_profile.evening = 4;
        best_for.push('evening', 'winter', 'autumn');
        personality.push('confident', 'mysterious');
      }
      if (family.includes('floral')) {
        match_profile.floral = 5;
        match_profile.romantic = 4;
        match_profile.spring = 4;
        best_for.push('daytime', 'spring');
        personality.push('romantic', 'elegant');
      }
      if (family.includes('citrus') || family.includes('fresh')) {
        match_profile.citrus = 5;
        match_profile.fresh = 5;
        match_profile.summer = 4;
        best_for.push('daytime', 'summer');
        personality.push('active', 'energetic');
      }
      if (family.includes('woody')) {
        match_profile.woody = 5;
        match_profile.sophisticated = 4;
        match_profile.autumn = 4;
        best_for.push('evening', 'autumn');
        personality.push('sophisticated', 'confident');
      }
      if (family.includes('gourmand') || family.includes('sweet')) {
        match_profile.gourmand = 5;
        match_profile.sweet = 5;
        match_profile.comforting = 4;
        best_for.push('evening', 'winter');
        personality.push('romantic', 'playful');
      }
      if (family.includes('aquatic') || family.includes('marine')) {
        match_profile.aquatic = 5;
        match_profile.fresh = 4;
        match_profile.summer = 4;
        best_for.push('daytime', 'summer');
        personality.push('active', 'adventurous');
      }

      // Add ingredient-based weights
      if (profile.ingredients) {
        profile.ingredients.forEach(ing => {
          const i = ing.toLowerCase();
          if (i.includes('vanilla') || i.includes('caramel') || i.includes('praline')) {
            match_profile.sweet = (match_profile.sweet || 0) + 2;
            match_profile.gourmand = (match_profile.gourmand || 0) + 2;
          }
          if (i.includes('oud') || i.includes('leather') || i.includes('tobacco')) {
            match_profile.luxury = (match_profile.luxury || 0) + 2;
            match_profile.bold = (match_profile.bold || 0) + 2;
            personality.push('bold', 'sophisticated');
          }
          if (i.includes('rose') || i.includes('jasmine') || i.includes('iris')) {
            match_profile.floral = (match_profile.floral || 0) + 2;
            match_profile.romantic = (match_profile.romantic || 0) + 2;
          }
          if (i.includes('lemon') || i.includes('bergamot') || i.includes('orange')) {
            match_profile.citrus = (match_profile.citrus || 0) + 2;
            match_profile.fresh = (match_profile.fresh || 0) + 2;
          }
        });
      }

      // Ensure unique values
      const uniqueBestFor = [...new Set(best_for)];
      const uniquePersonality = [...new Set(personality)];

      // Default values if empty
      if (uniqueBestFor.length === 0) uniqueBestFor.push('daytime', 'year_round');
      if (uniquePersonality.length === 0) uniquePersonality.push('versatile', 'approachable');
      if (Object.keys(match_profile).length === 0) {
        match_profile.versatile = 5;
        match_profile.balanced = 4;
      }

      // Determine price range based on brand
      let price_range = 'mid_range';
      const brand = (profile.brand || '').toLowerCase();
      if (brand.includes('creed') || brand.includes('marly') || brand.includes('roja') || brand.includes('amouage') || brand.includes('kurkdjian') || brand.includes('tom ford') || brand.includes('xerjoff') || brand.includes('initio') || brand.includes('clive christian')) {
        price_range = 'luxury';
      } else if (brand.includes('dior') || brand.includes('chanel') || brand.includes('tom ford') || brand.includes('kilian') || brand.includes('le labo') || brand.includes('byredo') || brand.includes('penhaligon')) {
        price_range = 'premium';
      } else if (brand.includes('zara') || brand.includes('h&m') || brand.includes('bath & body')) {
        price_range = 'budget';
      }

      return {
        name: name,
        brand: profile.brand || 'Unknown Brand',
        description: profile.description || `A beautiful ${profile.family || 'fragrance'} by ${profile.brand || 'Unknown Brand'}.`,
        match_profile: match_profile,
        price_range: price_range,
        best_for: uniqueBestFor,
        personality: uniquePersonality,
        image: this.fragranceImage(profile, name)
      };
    });
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Set up the start button with retry logic
    const setupButtonListener = (attempt = 1) => {
      const aiStartBtn = document.getElementById("aiStartBtn");

      if (aiStartBtn) {
        // Remove any existing listeners first
        const newButton = aiStartBtn.cloneNode(true);
        aiStartBtn.parentNode.replaceChild(newButton, aiStartBtn);

        // Add click event listener
        newButton.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.startAIAnalysis();
        });

        // Add visual feedback
        newButton.addEventListener("mouseenter", () => {
          newButton.style.transform = "scale(1.05)";
        });

        newButton.addEventListener("mouseleave", () => {
          newButton.style.transform = "scale(1)";
        });

        return true;
      } else if (attempt < 5) {
        setTimeout(() => setupButtonListener(attempt + 1), attempt * 500);
        return false;
      }
    };

    // Set up navigation buttons
    const aiNextBtn = document.getElementById("aiNextBtn");
    const aiBackBtn = document.getElementById("aiBackBtn");
    const aiRetakeQuiz = document.getElementById("aiRetakeQuiz");
    const aiViewFragrance = document.getElementById("aiViewFragrance");

    if (aiNextBtn) {
      aiNextBtn.addEventListener("click", () => this.nextQuestion());
    }

    if (aiBackBtn) {
      aiBackBtn.addEventListener("click", () => this.previousQuestion());
    }

    if (aiRetakeQuiz) {
      aiRetakeQuiz.addEventListener("click", () => this.resetQuestionnaire());
    }

    if (aiViewFragrance) {
      aiViewFragrance.addEventListener("click", () =>
        this.viewRecommendedFragrance(),
      );
    }

    // Initialize button listeners
    setupButtonListener();
    setTimeout(() => setupButtonListener(), 500);

    // Add click listener to the AI finder icon to ensure dropdown visibility
    const aiFinderIcon = document.getElementById("aiFinderIcon");
    if (aiFinderIcon) {
      let dropdownVisible = false;

      aiFinderIcon.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const dropdown = document.getElementById("aiFinderDropdown");
        if (dropdown) {
          dropdownVisible = !dropdownVisible;

          if (dropdownVisible) {
            dropdown.classList.add("show");
            dropdown.style.opacity = "1";
            dropdown.style.visibility = "visible";
            dropdown.style.transform = "translateY(0) scale(1)";
          } else {
            // Hide the dropdown
            dropdown.classList.remove("show");
            dropdown.style.opacity = "0";
            dropdown.style.visibility = "hidden";
            dropdown.style.transform = "translateY(-10px) scale(0.95)";
          }
        }
      });

      // Also add mouse events for hover functionality
      const aiFinderContainer = document.getElementById("aiFragranceFinder");
      if (aiFinderContainer) {
        aiFinderContainer.addEventListener("mouseenter", () => {
          if (!dropdownVisible) {
            const dropdown = document.getElementById("aiFinderDropdown");
            if (dropdown) {
              dropdown.style.opacity = "1";
              dropdown.style.visibility = "visible";
              dropdown.style.transform = "translateY(0) scale(1)";
            }
          }
        });

        aiFinderContainer.addEventListener("mouseleave", () => {
          if (!dropdownVisible) {
            const dropdown = document.getElementById("aiFinderDropdown");
            if (dropdown) {
              setTimeout(() => {
                if (!dropdownVisible) {
                  dropdown.style.opacity = "0";
                  dropdown.style.visibility = "hidden";
                  dropdown.style.transform = "translateY(-10px) scale(0.95)";
                }
              }, 300);
            }
          }
        });
      }
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      const aiFinderContainer = document.getElementById("aiFragranceFinder");
      if (aiFinderContainer && !aiFinderContainer.contains(e.target)) {
        const dropdown = document.getElementById("aiFinderDropdown");
        if (dropdown) {
          dropdown.classList.remove("show");
          dropdown.style.opacity = "0";
          dropdown.style.visibility = "hidden";
          dropdown.style.transform = "translateY(-10px) scale(0.95)";
        }
      }
    });
  }

  startQuestionnaire() {
    try {
      this.showState("question");
      this.currentQuestion = 0;
      this.answers = {};
      this.displayQuestion();
    } catch (error) {
      console.error("Error starting questionnaire:", error);

      // Fallback: try to at least show an alert
      alert("Scent Profiler is starting...");
    }
  }

  displayQuestion() {
    const question = this.questions[this.currentQuestion];
    const progressFill = document.getElementById("aiProgressFill");
    const progressText = document.getElementById("aiProgressText");
    const questionTitle = document.getElementById("aiQuestionTitle");
    const questionOptions = document.getElementById("aiQuestionOptions");
    const backBtn = document.getElementById("aiBackBtn");
    const nextBtn = document.getElementById("aiNextBtn");

    // Update progress
    const progress = ((this.currentQuestion + 1) / this.questions.length) * 100;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText)
      progressText.textContent = `Question ${this.currentQuestion + 1} of ${this.questions.length}`;

    // Update question
    if (questionTitle) questionTitle.textContent = question.title;

    // Clear and populate options
    if (questionOptions) {
      questionOptions.innerHTML = "";

      question.options.forEach((option, index) => {
        const optionEl = document.createElement("div");
        optionEl.className = "ai-option";
        optionEl.textContent = option.text;
        optionEl.dataset.value = option.value;

        // Handle selection
        optionEl.addEventListener("click", () => {
          if (question.type === "single") {
            // Single selection - clear others
            questionOptions
              .querySelectorAll(".ai-option")
              .forEach((el) => el.classList.remove("selected"));
            optionEl.classList.add("selected");
            this.answers[question.id] = [option.value];
          } else {
            // Multiple selection
            optionEl.classList.toggle("selected");
            if (!this.answers[question.id]) this.answers[question.id] = [];

            const answerIndex = this.answers[question.id].indexOf(option.value);
            if (answerIndex > -1) {
              this.answers[question.id].splice(answerIndex, 1);
            } else {
              this.answers[question.id].push(option.value);
            }
          }

          this.updateNavigationButtons();
        });

        questionOptions.appendChild(optionEl);
      });
    }

    // Update navigation buttons
    if (backBtn) {
      backBtn.style.display = this.currentQuestion > 0 ? "inline-flex" : "none";
    }

    this.updateNavigationButtons();
  }

  updateNavigationButtons() {
    const nextBtn = document.getElementById("aiNextBtn");
    const question = this.questions[this.currentQuestion];
    const hasAnswer =
      this.answers[question.id] && this.answers[question.id].length > 0;

    if (nextBtn) {
      nextBtn.disabled = !hasAnswer;
      nextBtn.textContent =
        this.currentQuestion === this.questions.length - 1
          ? "Get Results"
          : "Next";
    }
  }

  nextQuestion() {
    if (this.currentQuestion < this.questions.length - 1) {
      this.currentQuestion++;
      this.displayQuestion();
    } else {
      this.analyzeAnswers();
    }
  }

  previousQuestion() {
    if (this.currentQuestion > 0) {
      this.currentQuestion--;
      this.displayQuestion();
    }
  }

  analyzeAnswers() {
    this.showState("loading");

    // Simulate AI processing time
    setTimeout(() => {
      const recommendation = this.calculateRecommendation();
      this.displayResults(recommendation);
    }, 2500);
  }

  calculateRecommendation() {
    const userProfile = {};
    const preferences = {
      timeOfDay: this.answers["time_preference"] || [],
      season: this.answers["season_preference"] || [],
      personality: this.answers["personality_type"] || [],
      intensity: this.answers["scent_intensity"] || [],
      families: this.answers["scent_families"] || [],
      lifestyle: this.answers["lifestyle"] || [],
      budget: this.answers["budget_range"] || [],
      inspiration: this.answers["inspiration"] || [],
    };

    // Calculate user preference weights
    this.questions.forEach((question) => {
      const userAnswers = this.answers[question.id] || [];

      userAnswers.forEach((answerValue) => {
        const option = question.options.find(
          (opt) => opt.value === answerValue,
        );
        if (option && option.weight) {
          Object.keys(option.weight).forEach((trait) => {
            userProfile[trait] =
              (userProfile[trait] || 0) + option.weight[trait];
          });
        }
      });
    });

    // Enhanced scoring algorithm
    const fragranceScores = this.fragranceDatabase.map((fragrance) => {
      let totalScore = 0;
      let matchingFactors = 0;
      const scoreBreakdown = {};

      // 1. Profile matching (40% weight)
      let profileScore = 0;
      let profileMatches = 0;
      Object.keys(fragrance.match_profile).forEach((trait) => {
        if (userProfile[trait]) {
          const score = fragrance.match_profile[trait] * userProfile[trait];
          profileScore += score;
          profileMatches++;
          scoreBreakdown[`profile_${trait}`] = score;
        }
      });
      if (profileMatches > 0) {
        profileScore = (profileScore / profileMatches) * 0.4;
        totalScore += profileScore;
        matchingFactors++;
      }

      // 2. Personality matching (25% weight)
      let personalityScore = 0;
      if (preferences.personality.length > 0 && fragrance.personality) {
        const matches = preferences.personality.filter((p) =>
          fragrance.personality.includes(p),
        ).length;
        personalityScore = (matches / preferences.personality.length) * 25;
        totalScore += personalityScore;
        matchingFactors++;
        scoreBreakdown.personality = personalityScore;
      }

      // 3. Time/Season matching (20% weight)
      let timeSeasonScore = 0;
      const timeMatches = preferences.timeOfDay.filter(
        (t) => fragrance.best_for && fragrance.best_for.includes(t),
      ).length;
      const seasonMatches = preferences.season.filter(
        (s) => fragrance.best_for && fragrance.best_for.includes(s),
      ).length;
      if (timeMatches > 0 || seasonMatches > 0) {
        timeSeasonScore =
          ((timeMatches + seasonMatches) /
            (preferences.timeOfDay.length + preferences.season.length)) *
          20;
        totalScore += timeSeasonScore;
        matchingFactors++;
        scoreBreakdown.timeSeason = timeSeasonScore;
      }

      // 4. Budget compatibility (10% weight)
      let budgetScore = 0;
      if (preferences.budget.length > 0) {
        const budgetMatch = preferences.budget.includes(fragrance.price_range);
        budgetScore = budgetMatch ? 10 : 5; // Partial score if budget doesn't match exactly
        totalScore += budgetScore;
        matchingFactors++;
        scoreBreakdown.budget = budgetScore;
      }

      // 5. Scent family preferences (5% weight)
      let familyScore = 0;
      if (preferences.families.length > 0) {
        // Check if any of the user's preferred families align with fragrance characteristics
        const familyAlignment = preferences.families.some((family) => {
          return Object.keys(fragrance.match_profile).some(
            (trait) =>
              trait.toLowerCase().includes(family) ||
              family.includes(trait.toLowerCase()),
          );
        });
        familyScore = familyAlignment ? 5 : 0;
        totalScore += familyScore;
        matchingFactors++;
        scoreBreakdown.family = familyScore;
      }

      // Add some randomization for variety (but keep it minimal)
      const randomVariance = (Math.random() - 0.5) * 5; // ±2.5% variance
      totalScore += randomVariance;

      // Normalize the score
      const normalizedScore =
        matchingFactors > 0 ? totalScore / matchingFactors : 0;

      return {
        fragrance,
        score: normalizedScore,
        breakdown: scoreBreakdown,
        matchingFactors,
      };
    });

    // Sort by score and get the best match
    fragranceScores.sort((a, b) => b.score - a.score);
    const bestMatch = fragranceScores[0];

    // Calculate a more realistic match percentage
    const rawPercentage = Math.min(Math.max(bestMatch.score * 2.5, 0), 100);
    const matchPercentage = Math.round(
      Math.max(rawPercentage, 70) * (0.85 + Math.random() * 0.13),
    );

    // Determine personality type
    const personalityType = this.determinePersonalityType();

    const recommendation = {
      fragrance: bestMatch.fragrance,
      matchPercentage: Math.min(matchPercentage, 98),
      personalityType,
      userProfile,
      scoreBreakdown: bestMatch.breakdown,
      alternativeOptions: fragranceScores.slice(1, 4).map((item) => ({
        fragrance: item.fragrance,
        score: Math.round(item.score),
      })),
    };

    return recommendation;
  }

  determinePersonalityType() {
    const personalityAnswers = this.answers["personality_type"] || [];
    const lifestyleAnswers = this.answers["lifestyle"] || [];

    const personalityMap = {
      confident: "Bold & Confident",
      romantic: "Romantic & Dreamy",
      sophisticated: "Sophisticated & Elegant",
      adventurous: "Adventurous & Dynamic",
      mysterious: "Mysterious & Intriguing",
      professional: "Professional & Polished",
      creative: "Creative & Artistic",
      social: "Social & Charming",
      active: "Active & Energetic",
      relaxed: "Relaxed & Easy-going",
    };

    const primaryTrait =
      personalityAnswers[0] || lifestyleAnswers[0] || "sophisticated";
    return personalityMap[primaryTrait] || "Sophisticated & Elegant";
  }

  displayResults(recommendation) {
    this.showState("results");

    const personalityType = document.getElementById("aiPersonalityType");
    const recommendedFragrance = document.getElementById(
      "aiRecommendedFragrance",
    );
    const viewFragranceBtn = document.getElementById("aiViewFragrance");

    if (personalityType) {
      personalityType.textContent = recommendation.personalityType;
    }

    if (recommendedFragrance) {
      recommendedFragrance.innerHTML = `
                <div class="ai-fragrance-name">${recommendation.fragrance.name}</div>
                <div class="ai-fragrance-brand">by ${recommendation.fragrance.brand}</div>
                <div class="ai-fragrance-description">${recommendation.fragrance.description}</div>
                <div class="ai-match-percentage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    ${recommendation.matchPercentage}% Match
                </div>
                ${
                  recommendation.alternativeOptions
                    ? `
                    <div class="ai-alternatives">
                        <h5>Alternative Recommendations:</h5>
                        <div class="ai-alt-list">
                            ${recommendation.alternativeOptions
                              .map(
                                (alt) => `
                                <div class="ai-alt-item">
                                    <span class="alt-name">${alt.fragrance.name}</span>
                                    <span class="alt-brand">by ${alt.fragrance.brand}</span>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                `
                    : ""
                }
            `;
    }

    if (viewFragranceBtn) {
      viewFragranceBtn.dataset.fragrance =
        recommendation.fragrance.name.toLowerCase();
    }

    // Store recommendation for later use
    this.lastRecommendation = recommendation;
  }

  viewRecommendedFragrance() {
    if (this.lastRecommendation) {
      const fragrance = this.lastRecommendation.fragrance;

      // Scroll to the fragrance section if it exists
      const fragranceSection =
        document.querySelector(
          `[data-fragrance="${fragrance.name.toLowerCase()}"]`,
        ) ||
        document.querySelector(`.${fragrance.name.toLowerCase()}-section`) ||
        document.querySelector(`.content`);

      if (fragranceSection) {
        fragranceSection.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add highlight effect
        fragranceSection.style.transition = "all 0.5s ease";
        fragranceSection.style.boxShadow = "0 0 30px rgba(212, 175, 55, 0.3)";
        fragranceSection.style.transform = "scale(1.02)";

        setTimeout(() => {
          fragranceSection.style.boxShadow = "";
          fragranceSection.style.transform = "";
        }, 2000);
      }

      // Hide the AI finder dropdown
      this.closeDropdown();
    }
  }

  resetQuestionnaire() {
    this.currentQuestion = 0;
    this.answers = {};
    this.lastRecommendation = null;
    this.showState("welcome");
  }

  showState(state) {
    const states = ["welcome", "question", "loading", "results"];

    states.forEach((s) => {
      const elementId = `aiFinder${s.charAt(0).toUpperCase() + s.slice(1)}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = s === state ? "block" : "none";
      }
    });
  }

  closeDropdown() {
    const dropdown = document.getElementById("aiFinderDropdown");
    if (dropdown) {
      dropdown.style.opacity = "0";
      dropdown.style.visibility = "hidden";
      dropdown.style.transform = "translateY(-10px) scale(0.95)";
    }
  }
}

// Initialize Scent Profiler when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  try {
    if (typeof window.aiFragranceFinder === "undefined") {
      window.aiFragranceFinder = new AIFragranceFinder();
    }
  } catch (error) {
    console.error("Error creating AIFragranceFinder:", error);
  }

  // Global function to start the analysis
  window.startAIAnalysis = function () {
    if (
      window.aiFragranceFinder &&
      typeof window.aiFragranceFinder.startQuestionnaire === "function"
    ) {
      window.aiFragranceFinder.startQuestionnaire();
    } else {
      // Try to create a new instance
      try {
        window.aiFragranceFinder = new AIFragranceFinder();
        window.aiFragranceFinder.startQuestionnaire();
      } catch (error) {
        console.error("Error initializing Scent Profiler:", error);
        alert("Scent Profiler could not be initialized. Please refresh the page.");
      }
    }
  };

  // Ensure button is clickable
  setTimeout(() => {
    const btn = document.getElementById("aiStartBtn");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.startAIAnalysis();
      });
    }
  }, 500);
});

// Export for use in other scripts
window.AIFragranceFinder = AIFragranceFinder;
