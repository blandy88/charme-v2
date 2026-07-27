import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:video_player/video_player.dart';
import '../data/fragrance_database.dart';
import '../models/fragrance.dart';
import '../theme/app_theme.dart';
import 'fragrance_detail_screen.dart';
import 'search_screen.dart';

// ═══════════════════════════════════════════════════════════════════════════
// HOME SCREEN — Charme Parfumerie
// A hand-crafted luxury experience with unique editorial-style sections
// ═══════════════════════════════════════════════════════════════════════════

class HomeScreen extends StatefulWidget {
  final bool isActive;

  const HomeScreen({super.key, this.isActive = true});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final _db = FragranceDatabase();
  final _scrollController = ScrollController();
  late final AnimationController _pulseController;
  late final AnimationController _shimmerController;
  late final PageController _spotlightController;
  int _spotlightPage = 0;
  late List<Fragrance> _discoveryPicks;
  bool _showNight = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
    _spotlightController = PageController(viewportFraction: 0.82);
    _discoveryPicks = _db.getRandomDiscovery(count: 10);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _pulseController.dispose();
    _shimmerController.dispose();
    _spotlightController.dispose();
    super.dispose();
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 6) return 'Bonsoir';
    if (h < 12) return 'Bonjour';
    if (h < 17) return 'Bon après-midi';
    if (h < 21) return 'Bonsoir';
    return 'Bonne nuit';
  }

  String get _currentSeason {
    final m = DateTime.now().month;
    if (m >= 3 && m <= 5) return 'Spring';
    if (m >= 6 && m <= 8) return 'Summer';
    if (m >= 9 && m <= 11) return 'Autumn';
    return 'Winter';
  }

  void _openDetail(Fragrance f) {
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (_, a1, _) => FragranceDetailScreen(fragrance: f),
        transitionsBuilder: (_, anim, _, child) => FadeTransition(
          opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut),
          child: child,
        ),
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  void _openSearch({String? query, String? brand, String? family, String? mood}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SearchScreen(
          initialQuery: query,
          initialBrand: brand,
          initialFamily: family,
          initialMood: mood,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final popular = _db.popular;
    final seasonFragrances = _db.getBySeason(_currentSeason.toLowerCase());
    final newReleases =
        _db.newestFirst.where((f) => f.year >= 2020).take(14).toList();
    final topBrands = _db.topBrands.take(12).toList();
    final dayPicks = _db.getByTimeOfDay('day').take(8).toList();
    final nightPicks = _db.getByTimeOfDay('night').take(8).toList();

    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: SingleChildScrollView(
        controller: _scrollController,
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHero(),
            const SizedBox(height: 38),
            _buildMoodRing(),
            const SizedBox(height: 46),
            _buildSpotlightCarousel(popular),
            const SizedBox(height: 46),
            _buildDiscoveryEngine(),
            const SizedBox(height: 46),
            _buildScentFamilies(),
            const SizedBox(height: 46),
            _buildDayNightToggle(dayPicks, nightPicks),
            const SizedBox(height: 46),
            _sectionHeader('New Arrivals', sub: 'Fresh releases'),
            const SizedBox(height: 18),
            _buildNewReleases(newReleases),
            const SizedBox(height: 46),
            _buildSeasonalCuration(seasonFragrances),
            const SizedBox(height: 46),
            _sectionHeader('Maisons', sub: '${_db.allBrands.length} houses'),
            const SizedBox(height: 18),
            _buildBrandMosaic(topBrands),
            const SizedBox(height: 46),
            _buildStats(),
            const SizedBox(height: 46),
            _sectionHeader('The Collection',
                sub: '${_db.totalCount} fragrances'),
            const SizedBox(height: 18),
            _buildCollectionGrid(),
            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  HERO SECTION
  // ═══════════════════════════════════════════
  Widget _buildHero() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
      color: AppTheme.surface,
      child: Stack(
        children: [
          Positioned.fill(child: _HeroBackgroundVideos(isActive: widget.isActive)),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF1A1508).withValues(alpha: 0.72),
                    const Color(0xFF0D0B06).withValues(alpha: 0.82),
                    AppTheme.surface.withValues(alpha: 0.96),
                  ],
                  stops: const [0.0, 0.55, 1.0],
                ),
              ),
            ),
          ),
          // Animated gold orb top‑right
          AnimatedBuilder(
            animation: _pulseController,
            builder: (_, _) => Positioned(
              top: -30 + _pulseController.value * 10,
              right: -40,
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.gold.withValues(
                          alpha: 0.06 + _pulseController.value * 0.03),
                      AppTheme.gold.withValues(alpha: 0.01),
                      Colors.transparent,
                    ],
                    stops: const [0, 0.4, 1],
                  ),
                ),
              ),
            ),
          ),
          // Rose orb bottom‑left
          AnimatedBuilder(
            animation: _pulseController,
            builder: (_, _) => Positioned(
              bottom: 20,
              left: -60,
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.rose.withValues(
                          alpha: 0.04 + _pulseController.value * 0.02),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 44, 28, 36),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: AppTheme.gold.withValues(alpha: 0.7),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _greeting,
                      style: GoogleFonts.dmSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: AppTheme.textMuted,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Charme title with shader mask
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [AppTheme.textPrimary, AppTheme.champagne],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ).createShader(bounds),
                  child: Text(
                    'CHARME',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 56,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      letterSpacing: 16,
                      height: 1.0,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // Shimmer subtitle
                AnimatedBuilder(
                  animation: _shimmerController,
                  builder: (_, _) {
                    final dx = _shimmerController.value * 3 - 1;
                    return ShaderMask(
                      shaderCallback: (bounds) => LinearGradient(
                        begin: Alignment(dx, 0),
                        end: Alignment(dx + 1, 0),
                        colors: [
                          AppTheme.textMuted,
                          AppTheme.gold.withValues(alpha: 0.8),
                          AppTheme.textMuted,
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ).createShader(bounds),
                      child: Text(
                        'P A R F U M E R I E',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Colors.white,
                          letterSpacing: 6.0,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 28),
                // Stats pills
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    _heroPill('${_db.totalCount}', 'Fragrances'),
                    _heroPill('${_db.allBrands.length}', 'Houses'),
                    _heroPill('${_db.allFamilies.length}', 'Families'),
                  ],
                ),
                const SizedBox(height: 24),
                // Search bar
                GestureDetector(
                  onTap: () => _openSearch(),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 15),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.04),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.07)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.search_rounded,
                                color: AppTheme.textMuted, size: 20),
                            const SizedBox(width: 12),
                            Text(
                              'Search ${_db.totalCount} fragrances...',
                              style: GoogleFonts.dmSans(
                                  color: AppTheme.textMuted, fontSize: 13),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.gold.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Icon(Icons.tune_rounded,
                                  size: 14,
                                  color: AppTheme.gold.withValues(alpha: 0.6)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroPill(String value, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: AppTheme.gold.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.gold.withValues(alpha: 0.15)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value,
              style: GoogleFonts.dmSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.gold)),
          const SizedBox(width: 5),
          Text(label,
              style: GoogleFonts.dmSans(
                  fontSize: 11,
                  color: AppTheme.textMuted,
                  letterSpacing: 0.3)),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  MOOD RING — emotional discovery
  // ═══════════════════════════════════════════
  Widget _buildMoodRing() {
    const moods = [
      ('Romantic', '💕', [Color(0xFF3D1020), Color(0xFF1A0810)]),
      ('Confident', '🔥', [Color(0xFF2A1A08), Color(0xFF140D04)]),
      ('Fresh', '🌿', [Color(0xFF0A2010), Color(0xFF061208)]),
      ('Mysterious', '🌙', [Color(0xFF10082A), Color(0xFF080418)]),
      ('Cozy', '☕', [Color(0xFF201810), Color(0xFF100C06)]),
      ('Energetic', '⚡', [Color(0xFF2A2008), Color(0xFF181204)]),
      ('Sensual', '🌹', [Color(0xFF2A0A14), Color(0xFF18060C)]),
      ('Elegant', '✨', [Color(0xFF14141E), Color(0xFF0A0A10)]),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader('How are you feeling?', sub: 'Discover by mood'),
        const SizedBox(height: 16),
        SizedBox(
          height: 100,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            itemCount: moods.length,
            itemBuilder: (context, i) {
              final (mood, icon, colors) = moods[i];
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: GestureDetector(
                  onTap: () => _openSearch(mood: mood),
                  child: Container(
                    width: 90,
                    height: 100,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: colors,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.06)),
                      boxShadow: [
                        BoxShadow(
                          color: colors[0].withValues(alpha: 0.3),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(icon, style: const TextStyle(fontSize: 28)),
                        const SizedBox(height: 8),
                        Text(mood,
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textSecondary,
                              letterSpacing: 0.3,
                            )),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════
  //  SPOTLIGHT CAROUSEL
  // ═══════════════════════════════════════════
  Widget _buildSpotlightCarousel(List<Fragrance> popular) {
    final items = popular.take(8).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader('In The Spotlight', sub: 'Curated icons'),
        const SizedBox(height: 20),
        SizedBox(
          height: 340,
          child: PageView.builder(
            controller: _spotlightController,
            onPageChanged: (i) => setState(() => _spotlightPage = i),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final f = items[index];
              return AnimatedBuilder(
                animation: _spotlightController,
                builder: (_, child) {
                  double value = 1.0;
                  if (_spotlightController.position.haveDimensions) {
                    value = (_spotlightController.page! - index)
                        .abs()
                        .clamp(0.0, 1.0);
                  }
                  final scale = 1.0 - (value * 0.08);
                  final opacity = 1.0 - (value * 0.3);
                  return Transform.scale(
                    scale: scale,
                    child: Opacity(opacity: opacity, child: child),
                  );
                },
                child: GestureDetector(
                  onTap: () => _openDetail(f),
                  child: _SpotlightCard(fragrance: f),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        // Page indicator
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            items.length,
            (i) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: i == _spotlightPage ? 24 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: i == _spotlightPage
                    ? AppTheme.gold
                    : AppTheme.gold.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════
  //  DISCOVERY ENGINE — refreshable for-you
  // ═══════════════════════════════════════════
  Widget _buildDiscoveryEngine() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [
                    AppTheme.gold.withValues(alpha: 0.2),
                    AppTheme.gold.withValues(alpha: 0.05),
                  ]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.auto_awesome,
                    color: AppTheme.gold, size: 18),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Discovery Mix',
                      style: GoogleFonts.playfairDisplay(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary)),
                  Text('Refreshed just for you',
                      style: GoogleFonts.dmSans(
                          fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() {
                  _discoveryPicks = _db.getRandomDiscovery(count: 10);
                }),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.gold.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                        color: AppTheme.gold.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.refresh_rounded,
                          color: AppTheme.gold, size: 14),
                      const SizedBox(width: 4),
                      Text('Refresh',
                          style: GoogleFonts.dmSans(
                              fontSize: 11,
                              color: AppTheme.gold,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        SizedBox(
          height: 220,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            itemCount: _discoveryPicks.length,
            itemBuilder: (context, i) {
              final f = _discoveryPicks[i];
              return Padding(
                padding: const EdgeInsets.only(right: 14),
                child: GestureDetector(
                  onTap: () => _openDetail(f),
                  child: _DiscoveryCard(fragrance: f, index: i),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════
  //  SCENT FAMILIES
  // ═══════════════════════════════════════════
  Widget _buildScentFamilies() {
    const families = [
      ('Woody', '🌲', Color(0xFF2A1E0E)),
      ('Floral', '🌸', Color(0xFF2A0E1E)),
      ('Oriental', '🌙', Color(0xFF1E0E2A)),
      ('Citrus', '🍋', Color(0xFF2A2A0E)),
      ('Aquatic', '🌊', Color(0xFF0E1E2A)),
      ('Gourmand', '🍫', Color(0xFF2A1A0E)),
      ('Aromatic', '🌿', Color(0xFF0E2A14)),
      ('Leather', '🖤', Color(0xFF1E1410)),
      ('Spicy', '🌶️', Color(0xFF2A100E)),
      ('Fougere', '🍃', Color(0xFF142A0E)),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader('Scent Families',
            sub: 'Explore your olfactory world'),
        const SizedBox(height: 18),
        SizedBox(
          height: 130,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            itemCount: families.length,
            itemBuilder: (context, i) {
              final (name, icon, color) = families[i];
              final count = _db.getByFamily(name).length;
              return Padding(
                padding: const EdgeInsets.only(right: 14),
                child: GestureDetector(
                  onTap: () => _openSearch(family: name),
                  child: Container(
                    width: 110,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [color, color.withValues(alpha: 0.3)],
                      ),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.06)),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(icon, style: const TextStyle(fontSize: 32)),
                        const SizedBox(height: 8),
                        Text(name,
                            style: GoogleFonts.dmSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary)),
                        const SizedBox(height: 3),
                        Text('$count',
                            style: GoogleFonts.dmSans(
                                fontSize: 11, color: AppTheme.textMuted)),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════
  //  DAY / NIGHT TOGGLE
  // ═══════════════════════════════════════════
  Widget _buildDayNightToggle(
      List<Fragrance> dayPicks, List<Fragrance> nightPicks) {
    final picks = _showNight ? nightPicks : dayPicks;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Row(
            children: [
              Text(
                _showNight ? 'Night Scents  🌙' : 'Day Scents  ☀️',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const Spacer(),
              // Toggle pill
              GestureDetector(
                onTap: () => setState(() => _showNight = !_showNight),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 350),
                  curve: Curves.easeInOutCubic,
                  width: 60,
                  height: 30,
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(15),
                    gradient: LinearGradient(colors: _showNight
                        ? [const Color(0xFF14101E), const Color(0xFF1E1830)]
                        : [const Color(0xFF1E2418), const Color(0xFF2A3020)]),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.08)),
                  ),
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 350),
                    curve: Curves.easeInOutCubic,
                    alignment: _showNight
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _showNight
                            ? const Color(0xFF3A2E50)
                            : const Color(0xFF3A4030),
                        boxShadow: [
                          BoxShadow(
                            color: (_showNight
                                    ? const Color(0xFF6040A0)
                                    : const Color(0xFF80A040))
                                .withValues(alpha: 0.3),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(_showNight ? '🌙' : '☀️',
                            style: const TextStyle(fontSize: 12)),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Text(
            _showNight
                ? 'Rich, deep scents for evening'
                : 'Light, fresh scents for daytime',
            style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
          ),
        ),
        const SizedBox(height: 18),
        SizedBox(
          height: 155,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 400),
            child: ListView.builder(
              key: ValueKey(_showNight),
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              itemCount: picks.length,
              itemBuilder: (context, i) {
                final f = picks[i];
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: GestureDetector(
                    onTap: () => _openDetail(f),
                    child: _TimeCard(fragrance: f, isDay: !_showNight),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════
  //  NEW RELEASES
  // ═══════════════════════════════════════════
  Widget _buildNewReleases(List<Fragrance> releases) {
    return SizedBox(
      height: 230,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        itemCount: releases.length,
        itemBuilder: (context, i) {
          final f = releases[i];
          return Padding(
            padding: const EdgeInsets.only(right: 14),
            child: GestureDetector(
              onTap: () => _openDetail(f),
              child: _NewReleaseCard(fragrance: f),
            ),
          );
        },
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  SEASONAL CURATION
  // ═══════════════════════════════════════════
  Widget _buildSeasonalCuration(List<Fragrance> list) {
    const seasonColors = {
      'Spring': [Color(0xFF1A2A10), Color(0xFF0E180A)],
      'Summer': [Color(0xFF0E2030), Color(0xFF081418)],
      'Autumn': [Color(0xFF2A1A0A), Color(0xFF181008)],
      'Winter': [Color(0xFF141828), Color(0xFF0A0E18)],
    };
    const seasonIcons = {
      'Spring': '🌷',
      'Summer': '☀️',
      'Autumn': '🍂',
      'Winter': '❄️',
    };
    final colors =
        seasonColors[_currentSeason] ?? [AppTheme.surfaceCard, AppTheme.surface];
    final icon = seasonIcons[_currentSeason] ?? '✨';
    final picks = list.take(6).toList();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 24)),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('$_currentSeason Collection',
                      style: GoogleFonts.playfairDisplay(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary)),
                  Text('Scents for the season',
                      style: GoogleFonts.dmSans(
                          fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...picks.map((f) => GestureDetector(
                onTap: () => _openDetail(f),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.04)),
                  ),
                  child: Row(
                    children: [
                      Text(f.familyIcon,
                          style: const TextStyle(fontSize: 22)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(f.name,
                                style: GoogleFonts.playfairDisplay(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                            Text(f.brand,
                                style: GoogleFonts.dmSans(
                                    fontSize: 11, color: AppTheme.textMuted)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.gold.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(f.family,
                            style: GoogleFonts.dmSans(
                                fontSize: 10, color: AppTheme.gold)),
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  BRAND MOSAIC
  // ═══════════════════════════════════════════
  Widget _buildBrandMosaic(List<MapEntry<String, int>> brands) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: brands.map((brand) {
          final isLarge = brand.value > 15;
          return GestureDetector(
            onTap: () => _openSearch(brand: brand.key),
            child: Container(
              width: isLarge
                  ? double.infinity
                  : (MediaQuery.of(context).size.width - 58) / 2,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withValues(alpha: 0.04),
                    Colors.white.withValues(alpha: 0.01),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border:
                    Border.all(color: AppTheme.gold.withValues(alpha: 0.1)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(brand.key,
                            style: GoogleFonts.playfairDisplay(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text('${brand.value} fragrances',
                            style: GoogleFonts.dmSans(
                                fontSize: 11,
                                color:
                                    AppTheme.gold.withValues(alpha: 0.7))),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded,
                      color: AppTheme.textMuted, size: 14),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  STATS BAR
  // ═══════════════════════════════════════════
  Widget _buildStats() {
    final available = _db.available.length;
    final decades = _db.byDecade;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [
          AppTheme.gold.withValues(alpha: 0.06),
          AppTheme.gold.withValues(alpha: 0.02),
        ]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.gold.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statCol('$available', 'Available'),
          Container(
              width: 1,
              height: 30,
              color: AppTheme.gold.withValues(alpha: 0.15)),
          _statCol('${decades.length}', 'Decades'),
          Container(
              width: 1,
              height: 30,
              color: AppTheme.gold.withValues(alpha: 0.15)),
          _statCol('${_db.allIngredients.length}', 'Notes'),
        ],
      ),
    );
  }

  Widget _statCol(String value, String label) {
    return Column(
      children: [
        Text(value,
            style: GoogleFonts.playfairDisplay(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppTheme.gold)),
        const SizedBox(height: 4),
        Text(label,
            style:
                GoogleFonts.dmSans(fontSize: 11, color: AppTheme.textMuted)),
      ],
    );
  }

  // ═══════════════════════════════════════════
  //  COLLECTION GRID
  // ═══════════════════════════════════════════
  Widget _buildCollectionGrid() {
    final preview = _db.all.take(8).toList();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.78,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: preview.length,
            itemBuilder: (context, i) {
              final f = preview[i];
              return GestureDetector(
                onTap: () => _openDetail(f),
                child: _CollectionCard(fragrance: f),
              );
            },
          ),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: () => _openSearch(),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [
                  AppTheme.gold.withValues(alpha: 0.12),
                  AppTheme.gold.withValues(alpha: 0.04),
                ]),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: AppTheme.gold.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Explore All ${_db.all.length} Fragrances',
                      style: GoogleFonts.dmSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.gold)),
                  const SizedBox(width: 8),
                  Icon(Icons.arrow_forward_rounded,
                      color: AppTheme.gold, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  SECTION HEADER
  // ═══════════════════════════════════════════
  Widget _sectionHeader(String title, {String? sub}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 18,
                height: 1.5,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [
                    AppTheme.gold,
                    AppTheme.gold.withValues(alpha: 0),
                  ]),
                ),
              ),
              const SizedBox(width: 10),
              Text(title,
                  style: GoogleFonts.playfairDisplay(
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                      letterSpacing: 0.3)),
            ],
          ),
          if (sub != null)
            Padding(
              padding: const EdgeInsets.only(left: 28, top: 5),
              child: Text(sub,
                  style: GoogleFonts.dmSans(
                      fontSize: 12, color: AppTheme.textMuted)),
            ),
        ],
      ),
    );
  }
}

class _HeroBackgroundVideos extends StatefulWidget {
  final bool isActive;

  const _HeroBackgroundVideos({required this.isActive});

  @override
  State<_HeroBackgroundVideos> createState() => _HeroBackgroundVideosState();
}

class _HeroBackgroundVideosState extends State<_HeroBackgroundVideos>
    with WidgetsBindingObserver {
  static const _fadeDuration = Duration(milliseconds: 1000);
  static const _switchEvery = Duration(seconds: 15);
  static const _assetPaths = <String>[
    'assets/videos/background.mp4',
    'assets/videos/background2.mp4',
    'assets/videos/background3.mp4',
  ];

  late final List<VideoPlayerController> _controllers;
  Timer? _rotationTimer;
  bool _initialized = false;
  int _activeIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controllers = _assetPaths.map(VideoPlayerController.asset).toList();
    _initVideos();
  }

  @override
  void didUpdateWidget(covariant _HeroBackgroundVideos oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_initialized || oldWidget.isActive == widget.isActive) return;
    if (widget.isActive) {
      _controllers[_activeIndex].play();
    } else {
      for (final controller in _controllers) {
        controller.pause();
      }
    }
  }

  Future<void> _initVideos() async {
    try {
      for (final controller in _controllers) {
        await controller.initialize();
        await controller.setLooping(true);
        await controller.setVolume(0);
      }

      if (!mounted) return;

      if (widget.isActive) {
        await _controllers[_activeIndex].play();
      }
      setState(() => _initialized = true);

      if (_controllers.length > 1) {
        _rotationTimer = Timer.periodic(
          _switchEvery,
          (_) => _switchTo((_activeIndex + 1) % _controllers.length),
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _initialized = false);
    }
  }

  void _switchTo(int nextIndex) {
    if (!_initialized || !widget.isActive) return;
    if (nextIndex == _activeIndex) return;

    final previousIndex = _activeIndex;
    _controllers[nextIndex].play();

    setState(() => _activeIndex = nextIndex);

    Future<void>.delayed(_fadeDuration, () {
      if (!mounted) return;
      _controllers[previousIndex].pause();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_initialized) return;
    final active = _controllers[_activeIndex];

    switch (state) {
      case AppLifecycleState.resumed:
        if (widget.isActive) active.play();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        active.pause();
        break;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _rotationTimer?.cancel();
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) return const SizedBox.expand();

    return ClipRect(
      child: Stack(
        fit: StackFit.expand,
        children: [
          for (var i = 0; i < _controllers.length; i++)
            Positioned.fill(
              child: AnimatedOpacity(
                opacity: i == _activeIndex ? 1 : 0,
                duration: _fadeDuration,
                curve: Curves.easeOut,
                child: RepaintBoundary(
                  child: _CoverVideo(controller: _controllers[i]),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CoverVideo extends StatelessWidget {
  const _CoverVideo({required this.controller});

  final VideoPlayerController controller;

  @override
  Widget build(BuildContext context) {
    final size = controller.value.size;

    return FittedBox(
      fit: BoxFit.cover,
      child: SizedBox(
        width: size.width,
        height: size.height,
        child: VideoPlayer(controller),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════
//  SPOTLIGHT CARD
// ═══════════════════════════════════════════════════════
class _SpotlightCard extends StatelessWidget {
  final Fragrance fragrance;
  const _SpotlightCard({required this.fragrance});

  Color _familyAccent() {
    final f = fragrance.family.toLowerCase();
    if (f.contains('oriental')) return const Color(0xFF6B3FA0);
    if (f.contains('woody')) return const Color(0xFF5C7A4A);
    if (f.contains('floral')) return const Color(0xFFA05070);
    if (f.contains('citrus') || f.contains('fresh')) {
      return const Color(0xFF7A9B4A);
    }
    if (f.contains('aquatic')) return const Color(0xFF4A7A9B);
    if (f.contains('gourmand')) return const Color(0xFF9B7A4A);
    if (f.contains('leather')) return const Color(0xFF6B4A3A);
    if (f.contains('spicy')) return const Color(0xFF9B4A4A);
    return const Color(0xFF6B6B6B);
  }

  @override
  Widget build(BuildContext context) {
    final f = fragrance;
    final accent = _familyAccent();
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(accent, Colors.black, 0.82)!,
            const Color(0xFF0A0908),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: accent.withValues(alpha: 0.15)),
        boxShadow: [
          BoxShadow(
              color: accent.withValues(alpha: 0.12),
              blurRadius: 30,
              offset: const Offset(0, 10)),
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.5),
              blurRadius: 20,
              offset: const Offset(0, 8)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Accent glow
            Positioned(
              top: -40,
              right: -40,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [accent.withValues(alpha: 0.12), Colors.transparent],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child:
                            Text(f.familyIcon, style: const TextStyle(fontSize: 28)),
                      ),
                      const Spacer(),
                      if (f.available)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppTheme.success.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: AppTheme.success.withValues(alpha: 0.3)),
                          ),
                          child: Text('IN STOCK',
                              style: GoogleFonts.dmSans(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.success,
                                  letterSpacing: 1)),
                        ),
                    ],
                  ),
                  const Spacer(),
                  // Brand
                  Text(f.brand.toUpperCase(),
                      style: GoogleFonts.dmSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color.lerp(accent, Colors.white, 0.6),
                          letterSpacing: 2.5)),
                  const SizedBox(height: 8),
                  // Name
                  Text(f.name,
                      style: GoogleFonts.playfairDisplay(
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                          height: 1.15),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 14),
                  // Bottom row
                  Row(
                    children: [
                      _spotlightTag(f.family, accent),
                      const SizedBox(width: 8),
                      _spotlightTag(f.concentration ?? 'EDP', accent),
                      const Spacer(),
                      Text(f.priceRange,
                          style: GoogleFonts.dmSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.champagne)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _spotlightTag(String text, Color accent) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: accent.withValues(alpha: 0.15)),
      ),
      child: Text(text,
          style: GoogleFonts.dmSans(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: AppTheme.textSecondary,
              letterSpacing: 0.3)),
    );
  }
}

// ═══════════════════════════════════════════════════════
//  DISCOVERY CARD
// ═══════════════════════════════════════════════════════
class _DiscoveryCard extends StatelessWidget {
  final Fragrance fragrance;
  final int index;
  const _DiscoveryCard({required this.fragrance, required this.index});

  @override
  Widget build(BuildContext context) {
    final f = fragrance;
    final hue = (index * 37.0) % 360;
    final accent = HSLColor.fromAHSL(1, hue, 0.25, 0.2).toColor();
    return Container(
      width: 165,
      height: 220,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [accent, accent.withValues(alpha: 0.3)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.auto_awesome,
                    color: AppTheme.gold, size: 14),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(f.familyIcon, style: const TextStyle(fontSize: 30)),
                  const Spacer(),
                  Text(f.brand.toUpperCase(),
                      style: GoogleFonts.dmSans(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.gold,
                          letterSpacing: 1.5)),
                  const SizedBox(height: 5),
                  Text(f.name,
                      style: GoogleFonts.playfairDisplay(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                          height: 1.2),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(f.family,
                          style: GoogleFonts.dmSans(
                              fontSize: 10, color: AppTheme.textMuted)),
                      const Spacer(),
                      Text('${f.year}',
                          style: GoogleFonts.dmSans(
                              fontSize: 10, color: AppTheme.textMuted)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════
//  TIME CARD (Day / Night)
// ═══════════════════════════════════════════════════════
class _TimeCard extends StatelessWidget {
  final Fragrance fragrance;
  final bool isDay;
  const _TimeCard({required this.fragrance, required this.isDay});

  @override
  Widget build(BuildContext context) {
    final f = fragrance;
    return Container(
      width: 150,
      height: 155,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDay
              ? [const Color(0xFF1E2418), const Color(0xFF101408)]
              : [const Color(0xFF14101E), const Color(0xFF0A080E)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(f.familyIcon, style: const TextStyle(fontSize: 22)),
                const Spacer(),
                Text(isDay ? '☀️' : '🌙',
                    style: const TextStyle(fontSize: 14)),
              ],
            ),
            const Spacer(),
            Text(f.brand.toUpperCase(),
                style: GoogleFonts.dmSans(
                    fontSize: 8,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.gold.withValues(alpha: 0.7),
                    letterSpacing: 1.2)),
            const SizedBox(height: 3),
            Text(f.name,
                style: GoogleFonts.playfairDisplay(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                    height: 1.2),
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Text(f.family,
                style:
                    GoogleFonts.dmSans(fontSize: 9, color: AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════
//  NEW RELEASE CARD
// ═══════════════════════════════════════════════════════
class _NewReleaseCard extends StatelessWidget {
  final Fragrance fragrance;
  const _NewReleaseCard({required this.fragrance});

  @override
  Widget build(BuildContext context) {
    final f = fragrance;
    return Container(
      width: 175,
      height: 230,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF161210), Color(0xFF0A0908)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.gold.withValues(alpha: 0.1)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.gold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                      color: AppTheme.gold.withValues(alpha: 0.3)),
                ),
                child: Text('NEW ${f.year}',
                    style: GoogleFonts.dmSans(
                        fontSize: 8,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.gold,
                        letterSpacing: 0.5)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(f.familyIcon, style: const TextStyle(fontSize: 30)),
                  const Spacer(),
                  Text(f.brand.toUpperCase(),
                      style: GoogleFonts.dmSans(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.gold,
                          letterSpacing: 1.8)),
                  const SizedBox(height: 5),
                  Text(f.name,
                      style: GoogleFonts.playfairDisplay(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                          height: 1.2),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 8),
                  Text(f.family,
                      style: GoogleFonts.dmSans(
                          fontSize: 10, color: AppTheme.textMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════
//  COLLECTION CARD
// ═══════════════════════════════════════════════════════
class _CollectionCard extends StatelessWidget {
  final Fragrance fragrance;
  const _CollectionCard({required this.fragrance});

  @override
  Widget build(BuildContext context) {
    final f = fragrance;
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF141210), Color(0xFF0B0A08)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(f.familyIcon, style: const TextStyle(fontSize: 24)),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('${f.year}',
                      style: GoogleFonts.dmSans(
                          fontSize: 10, color: AppTheme.textMuted)),
                ),
              ],
            ),
            const Spacer(),
            Text(f.brand.toUpperCase(),
                style: GoogleFonts.dmSans(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.gold.withValues(alpha: 0.7),
                    letterSpacing: 1.5)),
            const SizedBox(height: 4),
            Text(f.name,
                style: GoogleFonts.playfairDisplay(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                    height: 1.2),
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Text(f.family,
                style: GoogleFonts.dmSans(
                    fontSize: 10, color: AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}
