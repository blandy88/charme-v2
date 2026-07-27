import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';
import '../models/cart_item.dart';

class CartScreen extends StatelessWidget {
  final VoidCallback? onExplore;

  const CartScreen({super.key, this.onExplore});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        title: Text(
          'MY BAG',
          style: GoogleFonts.playfairDisplay(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
            letterSpacing: 2,
          ),
        ),
        actions: [
          if (cart.items.isNotEmpty)
            TextButton(
              onPressed: () => _confirmClear(context, cart),
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
      body: cart.items.isEmpty ? _buildEmptyState(context) : _buildCartContent(context, cart),
    );
  }

  // ── Empty State ──────────────────────────────────────────────

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Shopping bag icon
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
                '🛍️',
                style: TextStyle(fontSize: 80),
              ),
            ),
          )
              .animate()
              .fadeIn(duration: 600.ms, curve: Curves.easeOut)
              .scale(begin: const Offset(0.8, 0.8), end: const Offset(1, 1), duration: 600.ms),
          const SizedBox(height: 24),
          Text(
            'Your bag is empty',
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
            'Discover our collection',
            style: GoogleFonts.dmSans(
              fontSize: 14,
              color: AppTheme.textMuted,
              letterSpacing: 0.3,
            ),
          )
              .animate(delay: 350.ms)
              .fadeIn(duration: 500.ms),
          const SizedBox(height: 32),
          // Explore button
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
                onTap: onExplore ?? () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
                  child: Text(
                    'EXPLORE',
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

  // ── Cart Content ─────────────────────────────────────────────

  Widget _buildCartContent(BuildContext context, CartProvider cart) {
    return Column(
      children: [
        // Items list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            itemCount: cart.items.length,
            itemBuilder: (context, index) {
              final item = cart.items[index];
              return _buildCartItem(context, cart, item, index)
                  .animate(delay: Duration(milliseconds: 80 * index))
                  .fadeIn(duration: 400.ms, curve: Curves.easeOut)
                  .slideX(begin: 0.05, end: 0, duration: 400.ms);
            },
          ),
        ),

        // Order summary + checkout
        _buildOrderSummary(context, cart),
      ],
    );
  }

  // ── Cart Item Card ───────────────────────────────────────────

  Widget _buildCartItem(BuildContext context, CartProvider cart, CartItem item, int index) {
    return Dismissible(
      key: Key('${item.fragranceId}_${item.selectedSize}_$index'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.red.shade900.withValues(alpha: 0.0),
              Colors.red.shade900.withValues(alpha: 0.3),
            ],
          ),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Icon(Icons.delete_outline, color: Colors.red.shade300, size: 24),
      ),
      onDismissed: (_) => cart.removeItem(index),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceGlass,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: AppTheme.borderColor,
                  width: 0.5,
                ),
              ),
              child: Row(
                children: [
                  // Perfume icon
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppTheme.gold.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppTheme.borderGold,
                        width: 0.5,
                      ),
                    ),
                    child: const Center(
                      child: Text('✨', style: TextStyle(fontSize: 26)),
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.brand.toUpperCase(),
                          style: GoogleFonts.dmSans(
                            color: AppTheme.gold,
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.8,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          item.fragranceName,
                          style: GoogleFonts.playfairDisplay(
                            color: AppTheme.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceRaised,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppTheme.borderColor, width: 0.5),
                              ),
                              child: Text(
                                item.selectedSize,
                                style: GoogleFonts.dmSans(
                                  color: AppTheme.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '\$${item.price.toStringAsFixed(0)}',
                              style: GoogleFonts.dmSans(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Quantity & Price
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '\$${item.total.toStringAsFixed(0)}',
                        style: GoogleFonts.dmSans(
                          color: AppTheme.textPrimary,
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _buildQuantityControls(cart, index, item),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Quantity Controls ────────────────────────────────────────

  Widget _buildQuantityControls(CartProvider cart, int index, CartItem item) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceRaised,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderColor, width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _quantityButton(
            Icons.remove,
            () => cart.updateQuantity(index, item.quantity - 1),
          ),
          Container(
            constraints: const BoxConstraints(minWidth: 32),
            alignment: Alignment.center,
            child: Text(
              '${item.quantity}',
              style: GoogleFonts.dmSans(
                color: AppTheme.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          _quantityButton(
            Icons.add,
            () => cart.updateQuantity(index, item.quantity + 1),
          ),
        ],
      ),
    );
  }

  Widget _quantityButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 14, color: AppTheme.gold),
        ),
      ),
    );
  }

  // ── Order Summary ────────────────────────────────────────────

  Widget _buildOrderSummary(BuildContext context, CartProvider cart) {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(context).padding.bottom + 20,
          ),
          decoration: BoxDecoration(
            color: AppTheme.surfaceRaised.withValues(alpha: 0.9),
            border: const Border(
              top: BorderSide(color: AppTheme.borderColor, width: 0.5),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Subtotal row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Subtotal',
                    style: GoogleFonts.dmSans(
                      color: AppTheme.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    '\$${cart.total.toStringAsFixed(0)}',
                    style: GoogleFonts.dmSans(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              // Items count
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Items',
                    style: GoogleFonts.dmSans(
                      color: AppTheme.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    '${cart.itemCount}',
                    style: GoogleFonts.dmSans(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Divider
              Container(
                height: 0.5,
                color: AppTheme.borderGold,
              ),
              const SizedBox(height: 12),
              // Total row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Total',
                    style: GoogleFonts.playfairDisplay(
                      color: AppTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '\$${cart.total.toStringAsFixed(0)}',
                    style: GoogleFonts.playfairDisplay(
                      color: AppTheme.gold,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              // Checkout button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: AppTheme.goldGradient,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.gold.withValues(alpha: 0.25),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Coming soon',
                              style: GoogleFonts.dmSans(
                                color: AppTheme.textPrimary,
                                fontSize: 14,
                              ),
                            ),
                            backgroundColor: AppTheme.surfaceCard,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: AppTheme.borderGold, width: 0.5),
                            ),
                            margin: const EdgeInsets.all(16),
                          ),
                        );
                      },
                      child: Center(
                        child: Text(
                          'PROCEED TO CHECKOUT',
                          style: GoogleFonts.dmSans(
                            color: AppTheme.surface,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 2,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms)
        .slideY(begin: 0.1, end: 0, duration: 500.ms);
  }

  // ── Clear Cart Dialog ────────────────────────────────────────

  void _confirmClear(BuildContext context, CartProvider cart) {
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
            'Clear Bag?',
            style: GoogleFonts.playfairDisplay(
              color: AppTheme.textPrimary,
              fontSize: 20,
            ),
          ),
          content: Text(
            'This will remove all items from your bag.',
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
                cart.clear();
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
