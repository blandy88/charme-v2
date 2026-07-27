import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../data/fragrance_database.dart';
import '../models/fragrance.dart';
import '../theme/app_theme.dart';
import '../providers/favorites_provider.dart';
import 'fragrance_detail_screen.dart';

class FavoritesScreen extends StatelessWidget {
  final VoidCallback? onDiscover;

  const FavoritesScreen({super.key, this.onDiscover});

  @override
  Widget build(BuildContext context) {
    final favorites = context.watch<FavoritesProvider>();
    final db = FragranceDatabase();
    final favoriteFragrances = db.all
        .where(favorites.isFavorite)
        .toList();

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        title: Text(
          'FAVORITES',
          style: GoogleFonts.playfairDisplay(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
            letterSpacing: 2,
          ),
        ),
        actions: [
          if (favoriteFragrances.isNotEmpty)
            TextButton(
              onPressed: () => _confirmClear(context, favorites),
              child: Text(
                'Clear All',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: AppTheme.textMuted,
                  letterSpacing: 0.5,
                ),
              ),
            ),
        ],
      ),
      body: favoriteFragrances.isEmpty
          ? _buildEmptyState(context)
          : _buildFavoritesList(context, favorites, favoriteFragrances),
    );
  }

  // ── Empty State ──────────────────────────────────────────────

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Heart icon
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppTheme.gold.withValues(alpha: 0.12),
                  AppTheme.gold.withValues(alpha: 0.03),
                  Colors.transparent,
                ],
              ),
            ),
            child: const Center(
              child: Text(
                '❤️',
                style: TextStyle(fontSize: 80),
              ),
            ),
          )
              .animate()
              .fadeIn(duration: 600.ms, curve: Curves.easeOut)
              .scale(begin: const Offset(0.8, 0.8), end: const Offset(1, 1), duration: 600.ms),
          const SizedBox(height: 24),
          Text(
            'No favorites yet',
            style: GoogleFonts.playfairDisplay(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          )
              .animate(delay: 200.ms)
              .fadeIn(duration: 500.ms)
              .slideY(begin: 0.2, end: 0),
          const SizedBox(height: 8),
          Text(
            'Save fragrances you love',
            style: GoogleFonts.dmSans(
              fontSize: 14,
              color: AppTheme.textMuted,
              letterSpacing: 0.3,
            ),
          )
              .animate(delay: 350.ms)
              .fadeIn(duration: 500.ms),
          const SizedBox(height: 32),
          // Discover button
          Container(
            decoration: BoxDecoration(
              gradient: AppTheme.goldGradient,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.gold.withValues(alpha: 0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: onDiscover ?? () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
                  child: Text(
                    'DISCOVER',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.surface,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
            ),
          )
              .animate(delay: 500.ms)
              .fadeIn(duration: 500.ms)
              .slideY(begin: 0.3, end: 0),
        ],
      ),
    );
  }

  // ── Favorites Content ────────────────────────────────────────

  Widget _buildFavoritesList(
    BuildContext context,
    FavoritesProvider favorites,
    List<Fragrance> favoriteFragrances,
  ) {
    return Column(
      children: [
        // Header stats
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.gold.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.borderGold, width: 0.5),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.favorite,
                      size: 14,
                      color: AppTheme.gold,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${favorites.count} Favorite${favorites.count != 1 ? 's' : ''}',
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.gold,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(duration: 400.ms),

        // Grid
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.68,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: favoriteFragrances.length,
            itemBuilder: (context, index) {
              final fragrance = favoriteFragrances[index];
              return _buildFavoriteCard(context, fragrance, favorites, index);
            },
          ),
        ),
      ],
    );
  }

  // ── Favorite Card ────────────────────────────────────────────

  Widget _buildFavoriteCard(
    BuildContext context,
    Fragrance fragrance,
    FavoritesProvider favorites,
    int index,
  ) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => FragranceDetailScreen(fragrance: fragrance),
          ),
        );
      },
      onLongPress: () => _confirmRemove(context, fragrance, favorites),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: AppTheme.borderColor,
                width: 0.5,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top row: icon area + heart
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Perfume icon
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppTheme.gold.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppTheme.borderGold,
                            width: 0.5,
                          ),
                        ),
                        child: const Center(
                          child: Text('✨', style: TextStyle(fontSize: 22)),
                        ),
                      ),
                      // Heart icon
                      GestureDetector(
                        onTap: () => favorites.toggle(fragrance),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppTheme.gold.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.favorite,
                            size: 18,
                            color: AppTheme.gold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  // Brand
                  Text(
                    fragrance.brand.toUpperCase(),
                    style: GoogleFonts.dmSans(
                      color: AppTheme.gold,
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.8,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  // Name
                  Text(
                    fragrance.name,
                    style: GoogleFonts.playfairDisplay(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.2,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  // Family chip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceRaised,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppTheme.borderColor, width: 0.5),
                    ),
                    child: Text(
                      fragrance.family,
                      style: GoogleFonts.dmSans(
                        color: AppTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: 100 * index))
        .fadeIn(duration: 450.ms, curve: Curves.easeOut)
        .scale(
          begin: const Offset(0.92, 0.92),
          end: const Offset(1, 1),
          duration: 450.ms,
          curve: Curves.easeOut,
        );
  }

  // ── Remove Confirmation ──────────────────────────────────────

  void _confirmRemove(
    BuildContext context,
    Fragrance fragrance,
    FavoritesProvider favorites,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: AlertDialog(
          backgroundColor: AppTheme.surfaceCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppTheme.borderColor, width: 0.5),
          ),
          title: Text(
            'Remove Favorite?',
            style: GoogleFonts.playfairDisplay(
              color: AppTheme.textPrimary,
              fontSize: 20,
            ),
          ),
          content: Text(
            'Remove ${fragrance.name} from your favorites?',
            style: GoogleFonts.dmSans(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                'Cancel',
                style: GoogleFonts.dmSans(color: AppTheme.textMuted),
              ),
            ),
            TextButton(
              onPressed: () {
                favorites.remove(fragrance);
                Navigator.pop(ctx);
              },
              child: Text(
                'Remove',
                style: GoogleFonts.dmSans(
                  color: AppTheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Clear All Confirmation ───────────────────────────────────

  void _confirmClear(BuildContext context, FavoritesProvider favorites) {
    showDialog(
      context: context,
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: AlertDialog(
          backgroundColor: AppTheme.surfaceCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppTheme.borderColor, width: 0.5),
          ),
          title: Text(
            'Clear All Favorites?',
            style: GoogleFonts.playfairDisplay(
              color: AppTheme.textPrimary,
              fontSize: 20,
            ),
          ),
          content: Text(
            'This will remove all fragrances from your favorites.',
            style: GoogleFonts.dmSans(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                'Cancel',
                style: GoogleFonts.dmSans(color: AppTheme.textMuted),
              ),
            ),
            TextButton(
              onPressed: () {
                favorites.clear();
                Navigator.pop(ctx);
              },
              child: Text(
                'Clear All',
                style: GoogleFonts.dmSans(
                  color: AppTheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
