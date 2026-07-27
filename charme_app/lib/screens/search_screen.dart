import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../data/fragrance_database.dart';
import '../models/fragrance.dart';
import '../theme/app_theme.dart';
import 'fragrance_detail_screen.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH / EXPLORE SCREEN — Charme Luxury Fragrance App
// ─────────────────────────────────────────────────────────────────────────────

class SearchScreen extends StatefulWidget {
  final String? initialQuery;
  final String? initialBrand;
  final String? initialFamily;
  final String? initialMood;
  final bool showBackButton;
  final VoidCallback? onBack;

  const SearchScreen({
    super.key,
    this.initialQuery,
    this.initialBrand,
    this.initialFamily,
    this.initialMood,
    this.showBackButton = true,
    this.onBack,
  });

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen>
    with SingleTickerProviderStateMixin {
  // ── Controllers ──
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  final _scrollController = ScrollController();

  // ── Database ──
  final _db = FragranceDatabase();

  // ── State ──
  List<Fragrance> _results = [];
  String _sortBy = 'all';
  String? _activeFamily;
  String? _activeBrand;
  String? _activeMood;
  bool _isGridView = true;
  bool _searchFocused = false;

  // ── Mood metadata ──
  static const _moodDescriptions = <String, String>{
    'romantic':
        'Soft, warm, and intoxicating — fragrances that speak of intimacy and passion.',
    'confident':
        'Bold and commanding — scents that project power and assurance.',
    'fresh':
        'Crisp and invigorating — fragrances that feel like a cool breeze.',
    'mysterious':
        'Dark and alluring — enigmatic scents wrapped in shadow and smoke.',
    'cozy':
        'Warm and comforting — like being wrapped in cashmere by a fireplace.',
    'energetic':
        'Vibrant and alive — fragrances that spark and electrify.',
    'sensual':
        'Skin-close and magnetic — scents designed to captivate.',
    'elegant':
        'Refined and effortless — timeless sophistication in a bottle.',
  };

  // ── Suggestion tags for empty state ──
  static const _suggestionTags = [
    'Tom Ford',
    'Creed',
    'Woody',
    'Oriental',
    'Oud',
    'Fresh',
    'Rose',
    'Vanilla',
    'Dior',
    'Niche',
    'Citrus',
    'Leather',
    'Amber',
    'Musk',
    'Chanel',
  ];

  // ─────────────────────────── Lifecycle ──────────────────────────────

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);

    // Apply initial parameters
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) {
      _searchController.text = widget.initialQuery!;
    }
    _activeBrand = widget.initialBrand;
    _activeFamily = widget.initialFamily;
    _activeMood = widget.initialMood;

    _applyFilters();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    setState(() => _searchFocused = _focusNode.hasFocus);
  }

  // ─────────────────────────── Filtering ──────────────────────────────

  void _applyFilters() {
    final query = _searchController.text.trim();

    // Start with base set
    List<Fragrance> base;
    if (_activeMood != null) {
      base = _db.getByMood(_activeMood!);
    } else if (_activeBrand != null) {
      base = _db.getByBrand(_activeBrand!);
    } else if (query.isNotEmpty) {
      base = _db.search(query);
    } else {
      base = List<Fragrance>.from(_db.all);
    }

    // Apply family filter on top
    if (_activeFamily != null) {
      base = base
          .where(
              (f) => f.family.toLowerCase().contains(_activeFamily!.toLowerCase()))
          .toList();
    }

    // Apply brand filter if we also have a query
    if (_activeBrand != null && query.isNotEmpty) {
      final q = query.toLowerCase();
      base = base.where((f) {
        return f.name.toLowerCase().contains(q) ||
            f.brand.toLowerCase().contains(q) ||
            f.family.toLowerCase().contains(q) ||
            f.description.toLowerCase().contains(q) ||
            f.perfumer.toLowerCase().contains(q) ||
            f.ingredients.any((i) => i.toLowerCase().contains(q));
      }).toList();
    }

    // Apply search query on top of mood
    if (query.isNotEmpty && _activeMood != null && _activeBrand == null) {
      final q = query.toLowerCase();
      base = base.where((f) {
        return f.name.toLowerCase().contains(q) ||
            f.brand.toLowerCase().contains(q) ||
            f.family.toLowerCase().contains(q) ||
            f.description.toLowerCase().contains(q) ||
            f.perfumer.toLowerCase().contains(q) ||
            f.ingredients.any((i) => i.toLowerCase().contains(q));
      }).toList();
    }

    // Sort
    switch (_sortBy) {
      case 'newest':
        base.sort((a, b) => b.year.compareTo(a.year));
        break;
      case 'az':
        base.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'brand':
        base.sort((a, b) {
          final c = a.brand.compareTo(b.brand);
          return c != 0 ? c : a.name.compareTo(b.name);
        });
        break;
      default:
        break;
    }

    setState(() => _results = base);
  }

  void _onSearchChanged(String _) => _applyFilters();

  void _setSortBy(String sort) {
    setState(() => _sortBy = sort);
    _applyFilters();
  }

  void _setFamilyFilter(String? family) {
    setState(() => _activeFamily = family);
    _applyFilters();
  }

  void _clearBrand() {
    setState(() => _activeBrand = null);
    _applyFilters();
  }

  void _clearMood() {
    setState(() => _activeMood = null);
    _applyFilters();
  }

  void _clearAllFilters() {
    setState(() {
      _searchController.clear();
      _sortBy = 'all';
      _activeFamily = null;
      _activeBrand = null;
      _activeMood = null;
    });
    _applyFilters();
  }

  bool get _hasActiveFilters =>
      _activeFamily != null ||
      _activeBrand != null ||
      _activeMood != null ||
      _searchController.text.trim().isNotEmpty;

  void _onSuggestionTap(String tag) {
    _searchController.text = tag;
    _applyFilters();
  }

  void _openFragrance(Fragrance f) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => FragranceDetailScreen(fragrance: f)),
    );
  }

  // ─────────────────────────── BUILD ──────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final screenW = MediaQuery.of(context).size.width;
    final families = _db.allFamilies;
    final showSuggestions =
        _searchController.text.trim().isEmpty && !_hasActiveFilters;
    final totalCount = _db.totalCount;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // ── Sticky Header ──
            _buildHeader(),
            // ── Filter Row ──
            _buildFilterRow(families),
            // ── Active Filters ──
            if (_hasActiveFilters) _buildActiveFilters(),
            // ── Results Counter + View Toggle ──
            _buildResultsBar(totalCount),
            // ── Body ──
            Expanded(
              child: showSuggestions
                  ? _buildSuggestions()
                  : _results.isEmpty
                      ? _buildEmptyState()
                      : _isGridView
                          ? _buildGridView(screenW)
                          : _buildListView(),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HEADER — Back button + Glassmorphism Search Bar
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 16, 4),
      child: Row(
        children: [
          if (widget.showBackButton) ...[
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded,
                  size: 18, color: AppTheme.textSecondary),
              onPressed: widget.onBack ?? () {
                if (Navigator.of(context).canPop()) {
                  Navigator.pop(context);
                }
              },
              splashRadius: 22,
            ),
            const SizedBox(width: 4),
          ],
          // Search bar
          Expanded(child: _buildSearchBar()),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.15, end: 0);
  }

  Widget _buildSearchBar() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _searchFocused
                  ? AppTheme.gold.withValues(alpha: 0.45)
                  : AppTheme.borderColor,
              width: _searchFocused ? 1.0 : 0.5,
            ),
            boxShadow: _searchFocused ? AppTheme.goldGlow : null,
          ),
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            onChanged: _onSearchChanged,
            style: GoogleFonts.dmSans(
                color: AppTheme.textPrimary, fontSize: 15, letterSpacing: 0.2),
            cursorColor: AppTheme.gold,
            decoration: InputDecoration(
              hintText: 'Search fragrances, brands, notes…',
              hintStyle: GoogleFonts.dmSans(
                  color: AppTheme.textMuted, fontSize: 14.5),
              prefixIcon: Padding(
                padding: const EdgeInsets.only(left: 14, right: 10),
                child: Icon(Icons.search_rounded,
                    size: 20,
                    color: _searchFocused
                        ? AppTheme.gold
                        : AppTheme.textMuted),
              ),
              prefixIconConstraints:
                  const BoxConstraints(minWidth: 40, minHeight: 40),
              suffixIcon: _searchController.text.isNotEmpty
                  ? GestureDetector(
                      onTap: () {
                        _searchController.clear();
                        _applyFilters();
                      },
                      child: Container(
                        margin: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceGlass,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.close_rounded,
                            size: 16, color: AppTheme.textMuted),
                      ),
                    )
                  : null,
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 0, vertical: 14),
            ),
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  FILTER CHIPS ROW
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildFilterRow(List<String> families) {
    // Top 8 families
    final displayFamilies =
        families.length > 8 ? families.sublist(0, 8) : families;
    final hasMore = families.length > 8;

    return Container(
      height: 48,
      margin: const EdgeInsets.only(top: 4),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        physics: const BouncingScrollPhysics(),
        children: [
          _filterChip('All', isSelected: _sortBy == 'all' && _activeFamily == null,
              onTap: () {
            _setSortBy('all');
            _setFamilyFilter(null);
          }),
          const SizedBox(width: 8),
          _filterChip('Newest',
              isSelected: _sortBy == 'newest',
              onTap: () => _setSortBy('newest')),
          const SizedBox(width: 8),
          _filterChip('A–Z',
              isSelected: _sortBy == 'az',
              onTap: () => _setSortBy('az')),
          const SizedBox(width: 8),
          _filterChip('Brand',
              isSelected: _sortBy == 'brand',
              onTap: () => _setSortBy('brand')),
          const SizedBox(width: 12),
          // Divider
          Container(
            width: 1,
            height: 24,
            margin: const EdgeInsets.symmetric(vertical: 12),
            color: AppTheme.borderColor,
          ),
          const SizedBox(width: 12),
          ...displayFamilies.map((fam) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _filterChip(fam,
                  isSelected: _activeFamily == fam,
                  onTap: () =>
                      _setFamilyFilter(_activeFamily == fam ? null : fam)),
            );
          }),
          if (hasMore)
            _filterChip('More…', isSelected: false, onTap: () {
              _showAllFamiliesSheet(families);
            }),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms, delay: 100.ms);
  }

  Widget _filterChip(String label,
      {required bool isSelected, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOut,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppTheme.gold.withValues(alpha: 0.12)
                  : AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? AppTheme.gold.withValues(alpha: 0.5)
                    : AppTheme.borderColor,
                width: isSelected ? 1.0 : 0.5,
              ),
            ),
            child: Text(
              label,
              style: GoogleFonts.dmSans(
                color: isSelected ? AppTheme.gold : AppTheme.textSecondary,
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                letterSpacing: 0.3,
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showAllFamiliesSheet(List<String> families) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return ClipRRect(
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(24)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
            child: Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.55,
              ),
              decoration: BoxDecoration(
                color: AppTheme.surfaceCard.withValues(alpha: 0.95),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
                border: Border.all(color: AppTheme.borderColor, width: 0.5),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 12),
                  Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.textMuted,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('All Families',
                      style: GoogleFonts.playfairDisplay(
                          color: AppTheme.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  Flexible(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      shrinkWrap: true,
                      itemCount: families.length,
                      itemBuilder: (_, i) {
                        final fam = families[i];
                        final selected = _activeFamily == fam;
                        return ListTile(
                          dense: true,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          tileColor: selected
                              ? AppTheme.gold.withValues(alpha: 0.08)
                              : Colors.transparent,
                          leading: Text(
                            _familyEmoji(fam),
                            style: const TextStyle(fontSize: 20),
                          ),
                          title: Text(fam,
                              style: GoogleFonts.dmSans(
                                  color: selected
                                      ? AppTheme.gold
                                      : AppTheme.textPrimary,
                                  fontSize: 15,
                                  fontWeight: selected
                                      ? FontWeight.w600
                                      : FontWeight.w400)),
                          trailing: Text(
                            '${_db.getByFamily(fam).length}',
                            style: GoogleFonts.dmSans(
                                color: AppTheme.textMuted, fontSize: 13),
                          ),
                          onTap: () {
                            _setFamilyFilter(
                                _activeFamily == fam ? null : fam);
                            Navigator.pop(ctx);
                          },
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _familyEmoji(String family) {
    final f = family.toLowerCase();
    if (f.contains('oriental')) return '🌙';
    if (f.contains('woody')) return '🌲';
    if (f.contains('floral')) return '🌸';
    if (f.contains('citrus') || f.contains('fresh')) return '🍋';
    if (f.contains('aquatic')) return '🌊';
    if (f.contains('gourmand')) return '🍫';
    if (f.contains('aromatic')) return '🌿';
    if (f.contains('leather')) return '🖤';
    if (f.contains('spicy')) return '🌶️';
    if (f.contains('fougere') || f.contains('fougère')) return '🍃';
    return '✨';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ACTIVE FILTERS DISPLAY
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildActiveFilters() {
    final pills = <Widget>[];

    if (_searchController.text.trim().isNotEmpty) {
      pills.add(_activeFilterPill(
        '"${_searchController.text.trim()}"',
        onRemove: () {
          _searchController.clear();
          _applyFilters();
        },
      ));
    }
    if (_activeBrand != null) {
      pills.add(_activeFilterPill('Brand: $_activeBrand',
          onRemove: _clearBrand));
    }
    if (_activeFamily != null) {
      pills.add(_activeFilterPill('Family: $_activeFamily',
          onRemove: () => _setFamilyFilter(null)));
    }
    if (_activeMood != null) {
      pills.add(_activeFilterPill('Mood: $_activeMood',
          onRemove: _clearMood));
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: pills
                    .map((p) => Padding(
                        padding: const EdgeInsets.only(right: 8), child: p))
                    .toList(),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _clearAllFilters,
            child: Text('Clear all',
                style: GoogleFonts.dmSans(
                    color: AppTheme.gold,
                    fontSize: 12,
                    fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 250.ms).slideY(begin: -0.1);
  }

  Widget _activeFilterPill(String label, {required VoidCallback onRemove}) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 6, 6, 6),
      decoration: BoxDecoration(
        color: AppTheme.gold.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderGold, width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label,
              style: GoogleFonts.dmSans(
                  color: AppTheme.goldLight,
                  fontSize: 12,
                  fontWeight: FontWeight.w500)),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: AppTheme.gold.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(Icons.close_rounded,
                  size: 13, color: AppTheme.goldLight),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  RESULTS BAR — Count + View Toggle
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildResultsBar(int totalCount) {
    final showing = _results.length;
    final filtered = _hasActiveFilters;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 16, 6),
      child: Row(
        children: [
          // Mood description or counter
          Expanded(
            child: _activeMood != null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_activeMood![0].toUpperCase()}${_activeMood!.substring(1)} fragrances',
                        style: GoogleFonts.playfairDisplay(
                            color: AppTheme.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _moodDescriptions[_activeMood!.toLowerCase()] ?? '',
                        style: GoogleFonts.dmSans(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                            fontStyle: FontStyle.italic),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  )
                : Text(
                    filtered
                        ? '$showing of $totalCount fragrances'
                        : 'Showing $showing fragrances',
                    style: GoogleFonts.dmSans(
                        color: AppTheme.textMuted,
                        fontSize: 13,
                        letterSpacing: 0.2),
                  ),
          ),
          // View toggle
          _buildViewToggle(),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms, delay: 150.ms);
  }

  Widget _buildViewToggle() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceGlass,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderColor, width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _viewToggleBtn(Icons.grid_view_rounded, true, _isGridView),
          _viewToggleBtn(Icons.view_list_rounded, false, !_isGridView),
        ],
      ),
    );
  }

  Widget _viewToggleBtn(IconData icon, bool gridMode, bool active) {
    return GestureDetector(
      onTap: () => setState(() => _isGridView = gridMode),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(7),
        decoration: BoxDecoration(
          color:
              active ? AppTheme.gold.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon,
            size: 17, color: active ? AppTheme.gold : AppTheme.textMuted),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SUGGESTION TAGS — shown when search is empty & no filters
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildSuggestions() {
    final topBrands = _db.topBrands.take(6).map((e) => e.key).toList();
    final families = _db.allFamilies.take(6).toList();

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Editorial heading
          Text('Explore',
                  style: GoogleFonts.playfairDisplay(
                      color: AppTheme.textPrimary,
                      fontSize: 28,
                      fontWeight: FontWeight.w700))
              .animate()
              .fadeIn(duration: 500.ms)
              .slideX(begin: -0.08),
          const SizedBox(height: 4),
          Text('Discover your signature scent',
                  style: GoogleFonts.dmSans(
                      color: AppTheme.textMuted,
                      fontSize: 14,
                      letterSpacing: 0.3))
              .animate()
              .fadeIn(duration: 500.ms, delay: 80.ms),
          const SizedBox(height: 28),

          // ── Try searching for… ──
          Text('TRY SEARCHING FOR',
                  style: GoogleFonts.dmSans(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.6))
              .animate()
              .fadeIn(duration: 400.ms, delay: 150.ms),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _suggestionTags.asMap().entries.map((entry) {
              return _suggestionPill(entry.value)
                  .animate()
                  .fadeIn(
                      duration: 350.ms,
                      delay: Duration(milliseconds: 180 + entry.key * 40))
                  .scale(begin: const Offset(0.92, 0.92));
            }).toList(),
          ),

          const SizedBox(height: 36),

          // ── Top Brands ──
          Text('TOP BRANDS',
                  style: GoogleFonts.dmSans(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.6))
              .animate()
              .fadeIn(duration: 400.ms, delay: 250.ms),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: topBrands.asMap().entries.map((entry) {
              return _brandPill(entry.value)
                  .animate()
                  .fadeIn(
                      duration: 350.ms,
                      delay: Duration(milliseconds: 300 + entry.key * 50))
                  .scale(begin: const Offset(0.92, 0.92));
            }).toList(),
          ),

          const SizedBox(height: 36),

          // ── Browse by Family ──
          Text('BROWSE BY FAMILY',
                  style: GoogleFonts.dmSans(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.6))
              .animate()
              .fadeIn(duration: 400.ms, delay: 350.ms),
          const SizedBox(height: 12),
          ...families.asMap().entries.map((entry) {
            return _familyRow(entry.value)
                .animate()
                .fadeIn(
                    duration: 350.ms,
                    delay: Duration(milliseconds: 400 + entry.key * 60))
                .slideX(begin: 0.05);
          }),
        ],
      ),
    );
  }

  Widget _suggestionPill(String label) {
    return GestureDetector(
      onTap: () => _onSuggestionTap(label),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderColor, width: 0.5),
            ),
            child: Text(label,
                style: GoogleFonts.dmSans(
                    color: AppTheme.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500)),
          ),
        ),
      ),
    );
  }

  Widget _brandPill(String brand) {
    final count = _db.getByBrand(brand).length;
    return GestureDetector(
      onTap: () {
        setState(() => _activeBrand = brand);
        _applyFilters();
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: AppTheme.gold.withValues(alpha: 0.15), width: 0.5),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(brand,
                    style: GoogleFonts.dmSans(
                        color: AppTheme.goldLight,
                        fontSize: 13,
                        fontWeight: FontWeight.w600)),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.gold.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('$count',
                      style: GoogleFonts.dmSans(
                          color: AppTheme.textMuted, fontSize: 11)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _familyRow(String family) {
    final count = _db.getByFamily(family).length;
    return GestureDetector(
      onTap: () => _setFamilyFilter(family),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceGlass,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderColor, width: 0.5),
        ),
        child: Row(
          children: [
            Text(_familyEmoji(family), style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 14),
            Expanded(
              child: Text(family,
                  style: GoogleFonts.dmSans(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w500)),
            ),
            Text('$count',
                style: GoogleFonts.dmSans(
                    color: AppTheme.textMuted, fontSize: 13)),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded,
                size: 18, color: AppTheme.textMuted),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppTheme.gold.withValues(alpha: 0.08),
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.borderGold, width: 0.6),
              ),
              child: const Icon(Icons.search_off_rounded,
                  size: 32, color: AppTheme.goldMuted),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .scale(
                    begin: const Offset(1, 1),
                    end: const Offset(1.06, 1.06),
                    duration: 2000.ms,
                    curve: Curves.easeInOut),
            const SizedBox(height: 24),
            Text('No fragrances found',
                style: GoogleFonts.playfairDisplay(
                    color: AppTheme.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(
              'Try adjusting your search or filters to discover something new.',
              textAlign: TextAlign.center,
              style: GoogleFonts.dmSans(
                  color: AppTheme.textMuted, fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: _clearAllFilters,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.gold.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderGold, width: 0.6),
                ),
                child: Text('Clear all filters',
                    style: GoogleFonts.dmSans(
                        color: AppTheme.gold,
                        fontSize: 13,
                        fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms)
        .scale(begin: const Offset(0.95, 0.95));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GRID VIEW
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildGridView(double screenW) {
    final crossAxisCount = screenW > 600 ? 3 : 2;
    final aspect = screenW > 600 ? 0.68 : 0.62;

    return GridView.builder(
      key: const ValueKey('grid'),
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      physics: const BouncingScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        childAspectRatio: aspect,
      ),
      itemCount: _results.length,
      itemBuilder: (_, i) {
        final f = _results[i];
        return _gridCard(f, i);
      },
    );
  }

  Widget _gridCard(Fragrance f, int index) {
    // First price from sizes map
    String? priceLabel;
    if (f.sizes.isNotEmpty) {
      final firstEntry = f.sizes.entries.first;
      priceLabel = '\$${firstEntry.value.toStringAsFixed(0)}';
    }

    return GestureDetector(
      onTap: () => _openFragrance(f),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
          child: Container(
            decoration: BoxDecoration(
              gradient: AppTheme.cardGradient,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                  color: AppTheme.borderGold.withValues(alpha: 0.2),
                  width: 0.5),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Brand
                Text(
                  f.brand.toUpperCase(),
                  style: GoogleFonts.dmSans(
                    color: AppTheme.gold.withValues(alpha: 0.8),
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.8,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),

                // Name
                Expanded(
                  child: Text(
                    f.name,
                    style: GoogleFonts.playfairDisplay(
                      color: AppTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

                const Spacer(),

                // Family chip
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceGlass,
                    borderRadius: BorderRadius.circular(8),
                    border:
                        Border.all(color: AppTheme.borderColor, width: 0.4),
                  ),
                  child: Text(
                    '${f.familyIcon} ${f.family}',
                    style: GoogleFonts.dmSans(
                        color: AppTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(height: 8),

                // Bottom row: concentration + availability + price
                Row(
                  children: [
                    // Availability dot
                    if (f.available)
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: const BoxDecoration(
                          color: AppTheme.success,
                          shape: BoxShape.circle,
                        ),
                      ),
                    // Concentration
                    if (f.concentration != null)
                      Flexible(
                        child: Text(
                          f.concentration!,
                          style: GoogleFonts.dmSans(
                              color: AppTheme.textMuted,
                              fontSize: 10,
                              fontWeight: FontWeight.w400),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    const Spacer(),
                    // Price
                    if (priceLabel != null)
                      Text(
                        priceLabel,
                        style: GoogleFonts.dmSans(
                            color: AppTheme.goldLight,
                            fontSize: 13,
                            fontWeight: FontWeight.w700),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: 400.ms,
          delay: Duration(milliseconds: (index % 10) * 50),
        )
        .slideY(
          begin: 0.08,
          end: 0,
          duration: 400.ms,
          delay: Duration(milliseconds: (index % 10) * 50),
          curve: Curves.easeOut,
        );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildListView() {
    return ListView.builder(
      key: const ValueKey('list'),
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      physics: const BouncingScrollPhysics(),
      itemCount: _results.length,
      itemBuilder: (_, i) => _listCard(_results[i], i),
    );
  }

  Widget _listCard(Fragrance f, int index) {
    String? priceLabel;
    if (f.sizes.isNotEmpty) {
      final firstEntry = f.sizes.entries.first;
      priceLabel = '\$${firstEntry.value.toStringAsFixed(0)}';
    }

    return GestureDetector(
      onTap: () => _openFragrance(f),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: AppTheme.cardGradient,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: AppTheme.borderGold.withValues(alpha: 0.15),
                    width: 0.5),
              ),
              child: Row(
                children: [
                  // Left — Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Brand
                        Text(
                          f.brand.toUpperCase(),
                          style: GoogleFonts.dmSans(
                            color: AppTheme.gold.withValues(alpha: 0.8),
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.8,
                          ),
                        ),
                        const SizedBox(height: 4),
                        // Name
                        Text(
                          f.name,
                          style: GoogleFonts.playfairDisplay(
                            color: AppTheme.textPrimary,
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        // Family + Year
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceGlass,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                    color: AppTheme.borderColor, width: 0.4),
                              ),
                              child: Text(
                                '${f.familyIcon} ${f.family}',
                                style: GoogleFonts.dmSans(
                                    color: AppTheme.textMuted,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w500),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${f.year}',
                              style: GoogleFonts.dmSans(
                                  color: AppTheme.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w400),
                            ),
                            if (f.available) ...[
                              const SizedBox(width: 8),
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  color: AppTheme.success,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Right — Price + Chevron
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (priceLabel != null)
                        Text(
                          priceLabel,
                          style: GoogleFonts.dmSans(
                              color: AppTheme.goldLight,
                              fontSize: 16,
                              fontWeight: FontWeight.w700),
                        ),
                      if (f.concentration != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          f.concentration!,
                          style: GoogleFonts.dmSans(
                              color: AppTheme.textMuted, fontSize: 10),
                        ),
                      ],
                      const SizedBox(height: 4),
                      const Icon(Icons.chevron_right_rounded,
                          size: 20, color: AppTheme.textMuted),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: 350.ms,
          delay: Duration(milliseconds: (index % 12) * 45),
        )
        .slideX(
          begin: 0.04,
          end: 0,
          duration: 350.ms,
          delay: Duration(milliseconds: (index % 12) * 45),
          curve: Curves.easeOut,
        );
  }
}
