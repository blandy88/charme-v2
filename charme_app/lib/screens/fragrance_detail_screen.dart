import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../data/fragrance_database.dart';
import '../models/fragrance.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';
import '../providers/favorites_provider.dart';

class FragranceDetailScreen extends StatefulWidget {
  final Fragrance fragrance;
  const FragranceDetailScreen({super.key, required this.fragrance});

  @override
  State<FragranceDetailScreen> createState() => _FragranceDetailScreenState();
}

class _FragranceDetailScreenState extends State<FragranceDetailScreen> {
  late String? _selectedSize;
  late final ScrollController _scrollController;

  Fragrance get f => widget.fragrance;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _selectedSize = f.sizes.isNotEmpty ? f.sizes.keys.first : null;
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  // ── Note categorization ──

  static const _topNoteKeywords = [
    'bergamot', 'lemon', 'lime', 'grapefruit', 'orange', 'mandarin',
    'citron', 'yuzu', 'neroli', 'petitgrain', 'green apple', 'pear',
    'mint', 'basil', 'ginger', 'pink pepper', 'black pepper', 'cardamom',
    'aldehyde', 'ozone', 'cucumber', 'apple', 'lavender', 'galbanum',
  ];

  static const _heartNoteKeywords = [
    'rose', 'jasmine', 'iris', 'violet', 'tuberose', 'ylang-ylang',
    'geranium', 'peony', 'lily', 'orchid', 'magnolia', 'osmanthus',
    'freesia', 'carnation', 'heliotrope', 'cinnamon', 'nutmeg', 'clove',
    'saffron', 'pepper', 'sage', 'thyme', 'rosemary', 'tea',
    'honey', 'davana',
  ];

  static const _baseNoteKeywords = [
    'sandalwood', 'cedar', 'vetiver', 'patchouli', 'oud', 'oakmoss',
    'guaiac', 'birch', 'teak', 'driftwood', 'cypress', 'pine',
    'musk', 'amber', 'ambergris', 'vanilla', 'tonka', 'benzoin',
    'labdanum', 'incense', 'myrrh', 'frankincense', 'leather',
    'tobacco', 'suede', 'caramel', 'chocolate', 'coffee', 'praline',
    'coconut', 'cashmeran', 'coumarin', 'woodsy',
  ];

  List<String> _categorize(List<String> ingredients, List<String> keywords) {
    return ingredients
        .where((i) => keywords.any((k) => i.toLowerCase().contains(k)))
        .toList();
  }

  Map<String, List<String>> _getScentProfile() {
    final top = _categorize(f.ingredients, _topNoteKeywords);
    final heart = _categorize(f.ingredients, _heartNoteKeywords);
    final base = _categorize(f.ingredients, _baseNoteKeywords);

    // Anything uncategorized goes into the heart
    final categorized = {...top, ...heart, ...base};
    final uncategorized =
        f.ingredients.where((i) => !categorized.contains(i)).toList();
    heart.addAll(uncategorized);

    return {'Top': top, 'Heart': heart, 'Base': base};
  }

  double _getPrice(String size) {
    return f.sizes[size] ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final favorites = context.watch<FavoritesProvider>();
    final isFavorite = favorites.isFavorite(f);
    final scentProfile = _getScentProfile();
    final similarFragrances = FragranceDatabase().getSimilar(f, limit: 8);
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          CustomScrollView(
            controller: _scrollController,
            physics: const BouncingScrollPhysics(),
            slivers: [
              // ═══════════════════════════════════════
              // 1. HERO AREA
              // ═══════════════════════════════════════
              SliverAppBar(
                expandedHeight: 360,
                pinned: true,
                backgroundColor: AppTheme.surface,
                elevation: 0,
                leading: Padding(
                  padding: const EdgeInsets.all(8),
                  child: _GlassCircleButton(
                    icon: Icons.arrow_back_ios_new_rounded,
                    onTap: () => Navigator.pop(context),
                  ),
                ),
                actions: [
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: _GlassCircleButton(
                      icon: Icons.ios_share_rounded,
                      onTap: () {},
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: _HeroBackground(fragrance: f),
                ),
              ),

              // ═══════════════════════════════════════
              // 2. QUICK INFO ROW
              // ═══════════════════════════════════════
              SliverToBoxAdapter(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  child: Row(
                    children: [
                      _InfoPill(
                        icon: f.familyIcon,
                        label: f.family,
                        isEmoji: true,
                      ),
                      const SizedBox(width: 10),
                      _InfoPill(
                        icon: '📅',
                        label: '${f.year}',
                        isEmoji: true,
                      ),
                      if (f.concentration != null) ...[
                        const SizedBox(width: 10),
                        _InfoPill(
                          icon: '💧',
                          label: f.concentration!,
                          isEmoji: true,
                        ),
                      ],
                      if (f.perfumer.isNotEmpty) ...[
                        const SizedBox(width: 10),
                        Flexible(
                          child: _InfoPill(
                            icon: '✨',
                            label: f.perfumer,
                            isEmoji: true,
                          ),
                        ),
                      ],
                    ],
                  )
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 200.ms)
                      .slideY(begin: 0.1, end: 0),
                ),
              ),

              // ═══════════════════════════════════════
              // 3. DESCRIPTION — "THE STORY"
              // ═══════════════════════════════════════
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _SectionTitle(title: 'THE STORY'),
                      const SizedBox(height: 16),
                      Text(
                        f.description,
                        style: GoogleFonts.dmSans(
                          color: AppTheme.textSecondary,
                          fontSize: 16,
                          height: 1.75,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  )
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 300.ms)
                      .slideY(begin: 0.05, end: 0),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 36)),

              // ═══════════════════════════════════════
              // 4. SCENT PROFILE — "SCENT DNA"
              // ═══════════════════════════════════════
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _SectionTitle(title: 'SCENT DNA'),
                      const SizedBox(height: 16),
                      _ScentDNACard(profile: scentProfile),
                    ],
                  )
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 400.ms)
                      .slideY(begin: 0.05, end: 0),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 36)),

              // ═══════════════════════════════════════
              // 5. KEY INGREDIENTS — "KEY NOTES"
              // ═══════════════════════════════════════
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _SectionTitle(title: 'KEY NOTES'),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 10,
                        children: f.ingredients.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final ingredient = entry.value;
                          final isTop = _topNoteKeywords.any(
                              (k) => ingredient.toLowerCase().contains(k));
                          return _IngredientChip(
                            label: ingredient,
                            isPrimary: isTop,
                          )
                              .animate()
                              .fadeIn(
                                duration: 400.ms,
                                delay: (500 + idx * 60).ms,
                              )
                              .slideX(begin: 0.1, end: 0);
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 36)),

              // ═══════════════════════════════════════
              // 6. SIZE SELECTION — "SELECT SIZE"
              // ═══════════════════════════════════════
              if (f.sizes.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionTitle(title: 'SELECT SIZE'),
                        const SizedBox(height: 16),
                        Row(
                          children: f.sizes.entries.map((entry) {
                            final size = entry.key;
                            final price = entry.value;
                            final isSelected = _selectedSize == size;
                            return Expanded(
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 5),
                                child: GestureDetector(
                                  onTap: () =>
                                      setState(() => _selectedSize = size),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    curve: Curves.easeOutCubic,
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 20),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppTheme.goldMuted
                                          : AppTheme.surfaceGlass,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: isSelected
                                            ? AppTheme.gold
                                            : AppTheme.borderColor,
                                        width: isSelected ? 1.5 : 0.5,
                                      ),
                                      boxShadow: isSelected
                                          ? [
                                              BoxShadow(
                                                color: AppTheme.gold
                                                    .withValues(alpha: 0.15),
                                                blurRadius: 20,
                                                spreadRadius: 2,
                                              ),
                                            ]
                                          : null,
                                    ),
                                    child: Column(
                                      children: [
                                        Text(
                                          size,
                                          style: GoogleFonts.dmSans(
                                            color: isSelected
                                                ? AppTheme.gold
                                                : AppTheme.textPrimary,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          '\$${price.toStringAsFixed(0)}',
                                          style: GoogleFonts.playfairDisplay(
                                            color: isSelected
                                                ? AppTheme.champagne
                                                : AppTheme.textSecondary,
                                            fontSize: 20,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 500.ms)
                        .slideY(begin: 0.05, end: 0),
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 36)),

              // ═══════════════════════════════════════
              // 7. SIMILAR FRAGRANCES — "YOU MAY ALSO LOVE"
              // ═══════════════════════════════════════
              if (similarFragrances.isNotEmpty)
                SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 24),
                        child: _SectionTitle(title: 'YOU MAY ALSO LOVE'),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        height: 200,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          itemCount: similarFragrances.length,
                          separatorBuilder: (context2, i) =>
                              const SizedBox(width: 14),
                          itemBuilder: (context, index) {
                            final similar = similarFragrances[index];
                            return _SimilarFragranceCard(
                              fragrance: similar,
                              onTap: () {
                                Navigator.pushReplacement(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => FragranceDetailScreen(
                                      fragrance: similar,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
                    ],
                  )
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 600.ms)
                      .slideY(begin: 0.05, end: 0),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 36)),

              // ═══════════════════════════════════════
              // 8. THE NOSE — Perfumer Credit
              // ═══════════════════════════════════════
              if (f.perfumer.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionTitle(title: 'THE NOSE'),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceGlass,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: AppTheme.borderGold, width: 0.5),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Perfumer',
                                    style: GoogleFonts.dmSans(
                                      color: AppTheme.textMuted,
                                      fontSize: 12,
                                      letterSpacing: 1.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    f.perfumer,
                                    style: GoogleFonts.playfairDisplay(
                                      color: AppTheme.champagne,
                                      fontSize: 22,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    width: 40,
                                    height: 2,
                                    decoration: BoxDecoration(
                                      gradient: AppTheme.goldGradient,
                                      borderRadius: BorderRadius.circular(1),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 700.ms)
                        .slideY(begin: 0.05, end: 0),
                  ),
                ),

              // Bottom spacing for action bar
              SliverToBoxAdapter(
                child: SizedBox(height: 120 + bottomPadding),
              ),
            ],
          ),

          // ═══════════════════════════════════════
          // 9. BOTTOM ACTION BAR
          // ═══════════════════════════════════════
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: ClipRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                child: Container(
                  padding:
                      EdgeInsets.fromLTRB(20, 16, 20, bottomPadding + 16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface.withValues(alpha: 0.85),
                    border: const Border(
                      top: BorderSide(
                          color: AppTheme.borderColor, width: 0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Favorite button
                      GestureDetector(
                        onTap: () => favorites.toggle(f),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: isFavorite
                                ? AppTheme.gold.withValues(alpha: 0.12)
                                : AppTheme.surfaceGlass,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isFavorite
                                  ? AppTheme.borderGold
                                  : AppTheme.borderColor,
                              width: 0.5,
                            ),
                          ),
                          child: Icon(
                            isFavorite
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            color: isFavorite
                                ? AppTheme.gold
                                : AppTheme.textSecondary,
                            size: 22,
                          ),
                        ),
                      ),

                      const SizedBox(width: 14),

                      // Price + size display
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_selectedSize != null) ...[
                              Text(
                                '\$${_getPrice(_selectedSize!).toStringAsFixed(0)}',
                                style: GoogleFonts.playfairDisplay(
                                  color: AppTheme.textPrimary,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                _selectedSize!,
                                style: GoogleFonts.dmSans(
                                  color: AppTheme.textMuted,
                                  fontSize: 12,
                                ),
                              ),
                            ] else
                              Text(
                                f.priceRange,
                                style: GoogleFonts.dmSans(
                                  color: AppTheme.textPrimary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                      ),

                      // ADD TO BAG button
                      GestureDetector(
                        onTap: () {
                          if (_selectedSize == null || !f.available) return;
                          context.read<CartProvider>().addItem(
                                f,
                                _selectedSize!,
                                _getPrice(_selectedSize!),
                              );
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                '${f.name} added to bag',
                                style: GoogleFonts.dmSans(
                                    color: AppTheme.textPrimary),
                              ),
                              backgroundColor: AppTheme.surfaceRaised,
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 28, vertical: 14),
                          decoration: BoxDecoration(
                            gradient: f.available ? AppTheme.goldGradient : null,
                            color: f.available ? null : AppTheme.surfaceRaised,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: (f.available ? AppTheme.gold : AppTheme.textMuted).withValues(alpha: 0.3),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Text(
                            f.available ? 'ADD TO BAG' : 'UNAVAILABLE',
                            style: GoogleFonts.dmSans(
                              color: f.available ? Colors.black : AppTheme.textMuted,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// HERO BACKGROUND
// ═══════════════════════════════════════════════════════════════

class _HeroBackground extends StatelessWidget {
  final Fragrance fragrance;
  const _HeroBackground({required this.fragrance});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF161208),
            Color(0xFF0D0B08),
            Color(0xFF080706),
            Color(0xFF060606),
          ],
          stops: [0.0, 0.4, 0.75, 1.0],
        ),
      ),
      child: Stack(
        children: [
          // Subtle gold radial glow
          Positioned(
            top: 80,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.gold.withValues(alpha: 0.08),
                      AppTheme.gold.withValues(alpha: 0.02),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              ),
            ),
          ),

          // Content
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 50),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Family emoji
                  Text(
                    fragrance.familyIcon,
                    style: const TextStyle(fontSize: 80),
                  )
                      .animate()
                      .fadeIn(duration: 800.ms)
                      .scale(
                          begin: const Offset(0.7, 0.7),
                          end: const Offset(1.0, 1.0),
                          curve: Curves.easeOutBack,
                          duration: 800.ms),

                  const SizedBox(height: 20),

                  // Brand name
                  Text(
                    fragrance.brand.toUpperCase(),
                    style: GoogleFonts.dmSans(
                      color: AppTheme.gold,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 3.5,
                    ),
                  ).animate().fadeIn(duration: 600.ms, delay: 200.ms),

                  const SizedBox(height: 10),

                  // Fragrance name
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: Text(
                      fragrance.name,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.playfairDisplay(
                        color: AppTheme.textPrimary,
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                        height: 1.15,
                      ),
                    ).animate().fadeIn(duration: 600.ms, delay: 300.ms),
                  ),

                  const SizedBox(height: 14),

                  // Badges row
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (fragrance.concentration != null)
                        _HeroBadge(label: fragrance.concentration!),
                      const SizedBox(width: 8),
                      _HeroBadge(label: '${fragrance.year}'),
                    ],
                  )
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 400.ms)
                      .slideY(begin: 0.15, end: 0),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// REUSABLE WIDGETS
// ═══════════════════════════════════════════════════════════════

class _HeroBadge extends StatelessWidget {
  final String label;
  const _HeroBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.goldMuted,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderGold, width: 0.5),
      ),
      child: Text(
        label.toUpperCase(),
        style: GoogleFonts.dmSans(
          color: AppTheme.gold,
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}

class _GlassCircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _GlassCircleButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipOval(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.surface.withValues(alpha: 0.6),
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.borderColor, width: 0.5),
            ),
            child: Icon(icon, size: 18, color: AppTheme.textPrimary),
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 18,
          decoration: BoxDecoration(
            gradient: AppTheme.goldGradient,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: GoogleFonts.dmSans(
            color: AppTheme.gold,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 2.5,
          ),
        ),
      ],
    );
  }
}

class _InfoPill extends StatelessWidget {
  final String icon;
  final String label;
  final bool isEmoji;
  const _InfoPill({
    required this.icon,
    required this.label,
    this.isEmoji = false,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppTheme.borderColor, width: 0.5),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isEmoji)
                Text(icon, style: const TextStyle(fontSize: 14))
              else
                Icon(Icons.info, size: 14, color: AppTheme.textMuted),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SCENT DNA CARD
// ═══════════════════════════════════════════════════════════════

class _ScentDNACard extends StatelessWidget {
  final Map<String, List<String>> profile;
  const _ScentDNACard({required this.profile});

  @override
  Widget build(BuildContext context) {
    final maxCount = profile.values
        .map((v) => v.length)
        .fold(1, (a, b) => a > b ? a : b);

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.borderColor, width: 0.5),
          ),
          child: Column(
            children: profile.entries.map((entry) {
              final fraction =
                  entry.value.isEmpty ? 0.0 : entry.value.length / maxCount;
              return Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: _ScentBar(
                  label: entry.key,
                  notes: entry.value,
                  fraction: fraction,
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

class _ScentBar extends StatelessWidget {
  final String label;
  final List<String> notes;
  final double fraction;
  const _ScentBar({
    required this.label,
    required this.notes,
    required this.fraction,
  });

  String get _labelEmoji {
    return switch (label) {
      'Top' => '☀️',
      'Heart' => '🌹',
      'Base' => '🌑',
      _ => '•',
    };
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(_labelEmoji, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text(
              '$label Notes',
              style: GoogleFonts.dmSans(
                color: AppTheme.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Text(
              '${notes.length}',
              style: GoogleFonts.dmSans(
                color: AppTheme.textMuted,
                fontSize: 12,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Progress bar
        Container(
          height: 6,
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(3),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: fraction.clamp(0.05, 1.0),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.gold.withValues(alpha: 0.6),
                    AppTheme.gold,
                    AppTheme.goldLight,
                  ],
                ),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),

        const SizedBox(height: 10),

        // Ingredient chips
        if (notes.isNotEmpty)
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: notes.map((note) {
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.goldMuted,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.borderGold,
                    width: 0.5,
                  ),
                ),
                child: Text(
                  note,
                  style: GoogleFonts.dmSans(
                    color: AppTheme.champagne,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// INGREDIENT CHIP
// ═══════════════════════════════════════════════════════════════

class _IngredientChip extends StatelessWidget {
  final String label;
  final bool isPrimary;
  const _IngredientChip({required this.label, this.isPrimary = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: isPrimary ? AppTheme.goldMuted : AppTheme.surfaceGlass,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isPrimary ? AppTheme.gold : AppTheme.borderColor,
          width: isPrimary ? 1.0 : 0.5,
        ),
      ),
      child: Text(
        label,
        style: GoogleFonts.dmSans(
          color: isPrimary ? AppTheme.champagne : AppTheme.textSecondary,
          fontSize: 13,
          fontWeight: isPrimary ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SIMILAR FRAGRANCE CARD
// ═══════════════════════════════════════════════════════════════

class _SimilarFragranceCard extends StatelessWidget {
  final Fragrance fragrance;
  final VoidCallback onTap;
  const _SimilarFragranceCard({
    required this.fragrance,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 145,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surfaceCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.borderColor, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Text(
                fragrance.familyIcon,
                style: const TextStyle(fontSize: 40),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              fragrance.brand.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.dmSans(
                color: AppTheme.gold,
                fontSize: 9,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              fragrance.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.playfairDisplay(
                color: AppTheme.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                height: 1.2,
              ),
            ),
            const Spacer(),
            Text(
              fragrance.family,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.dmSans(
                color: AppTheme.textMuted,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
