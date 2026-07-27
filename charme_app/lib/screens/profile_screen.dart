import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../data/fragrance_database.dart';
import '../theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/favorites_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  bool _isLogin = true;
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: auth.isLoggedIn
          ? _buildLoggedInProfile(context, auth)
          : _buildAuthScreen(context, auth),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  MODE 1: NOT LOGGED IN — Elegant Auth Form
  // ═══════════════════════════════════════════════════════════

  Widget _buildAuthScreen(BuildContext context, AuthProvider auth) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: SizedBox(
        height: MediaQuery.of(context).size.height,
        child: Stack(
          children: [
            // Subtle radial gold glow at top
            Positioned(
              top: -120,
              left: MediaQuery.of(context).size.width / 2 - 200,
              child: Container(
                width: 400,
                height: 400,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.gold.withValues(alpha: 0.06),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    const Spacer(flex: 2),

                    // Logo
                    Text(
                      'CHARME',
                      style: GoogleFonts.playfairDisplay(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 8,
                        color: AppTheme.gold,
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 800.ms)
                        .slideY(begin: -0.3, end: 0),

                    const SizedBox(height: 16),

                    // Heading
                    Text(
                      'Welcome to\nCharme',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.playfairDisplay(
                        fontSize: 36,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textPrimary,
                        height: 1.2,
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 800.ms, delay: 200.ms)
                        .slideY(begin: 0.2, end: 0),

                    const SizedBox(height: 12),

                    Text(
                      _isLogin
                          ? 'Sign in to save your collection'
                          : 'Create your luxury account',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.dmSans(
                        fontSize: 15,
                        color: AppTheme.textMuted,
                        letterSpacing: 0.3,
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 400.ms),

                    const SizedBox(height: 44),

                    // Name field (register only)
                    AnimatedSize(
                      duration: const Duration(milliseconds: 350),
                      curve: Curves.easeInOut,
                      child: !_isLogin
                          ? Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: _GlassTextField(
                                controller: _nameCtrl,
                                hint: 'Full Name',
                                icon: Icons.person_outline_rounded,
                              ),
                            )
                          : const SizedBox.shrink(),
                    ),

                    // Email
                    _GlassTextField(
                      controller: _emailCtrl,
                      hint: 'Email Address',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 500.ms)
                        .slideX(begin: -0.1, end: 0),

                    const SizedBox(height: 16),

                    // Password
                    _GlassTextField(
                      controller: _passCtrl,
                      hint: 'Password',
                      icon: Icons.lock_outline_rounded,
                      obscure: _obscure,
                      suffix: GestureDetector(
                        onTap: () => setState(() => _obscure = !_obscure),
                        child: Icon(
                          _obscure
                              ? Icons.visibility_off_rounded
                              : Icons.visibility_rounded,
                          color: AppTheme.textMuted,
                          size: 20,
                        ),
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 600.ms)
                        .slideX(begin: -0.1, end: 0),

                    const SizedBox(height: 32),

                    // Sign In / Create Account button
                    _GoldButton(
                      label: _isLogin ? 'SIGN IN' : 'CREATE ACCOUNT',
                      onTap: () => _handleAuth(auth),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 700.ms)
                        .slideY(begin: 0.2, end: 0),

                    const SizedBox(height: 24),

                    // Toggle
                    GestureDetector(
                      onTap: () => setState(() {
                        _isLogin = !_isLogin;
                      }),
                      child: RichText(
                        text: TextSpan(
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            color: AppTheme.textMuted,
                          ),
                          children: [
                            TextSpan(
                              text: _isLogin
                                  ? "Don't have an account?  "
                                  : 'Already have an account?  ',
                            ),
                            TextSpan(
                              text: _isLogin ? 'Create Account' : 'Sign In',
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.gold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 800.ms),

                    const Spacer(flex: 3),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleAuth(AuthProvider auth) {
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text.trim();
    if (email.isEmpty || pass.isEmpty) return;

    final name = _isLogin ? email.split('@').first : _nameCtrl.text.trim();
    if (!_isLogin && name.isEmpty) return;

    auth.login(name, email);
    _emailCtrl.clear();
    _passCtrl.clear();
    _nameCtrl.clear();
  }

  // ═══════════════════════════════════════════════════════════
  //  MODE 2: LOGGED IN — Premium Profile
  // ═══════════════════════════════════════════════════════════

  Widget _buildLoggedInProfile(BuildContext context, AuthProvider auth) {
    final favorites = context.watch<FavoritesProvider>();
    final cart = context.watch<CartProvider>();

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // Invisible app bar for status bar padding
        SliverAppBar(
          pinned: false,
          floating: false,
          backgroundColor: Colors.transparent,
          expandedHeight: 0,
          toolbarHeight: 0,
          collapsedHeight: 0,
        ),

        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
            ),
            child: Column(
              children: [
                // ─── Profile Header ───
                _buildProfileHeader(auth),

                const SizedBox(height: 32),

                // ─── Stats Row ───
                _buildStatsRow(favorites.count, cart.itemCount),

                const SizedBox(height: 36),

                // ─── Menu Items ───
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SETTINGS',
                        style: GoogleFonts.dmSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 2,
                          color: AppTheme.textMuted,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _GlassMenuItem(
                        icon: Icons.person_outline_rounded,
                        title: 'Edit Profile',
                        onTap: () => _showEditProfile(context, auth),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms, delay: 300.ms)
                          .slideX(begin: -0.05, end: 0),
                      const SizedBox(height: 10),
                      _GlassMenuItem(
                        icon: Icons.shopping_bag_outlined,
                        title: 'My Orders',
                        onTap: () => _showComingSoon(context, 'My Orders'),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms, delay: 400.ms)
                          .slideX(begin: -0.05, end: 0),
                      const SizedBox(height: 10),
                      _GlassMenuItem(
                        icon: Icons.notifications_none_rounded,
                        title: 'Notifications',
                        onTap: () =>
                            _showComingSoon(context, 'Notifications'),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms, delay: 500.ms)
                          .slideX(begin: -0.05, end: 0),
                      const SizedBox(height: 10),
                      _GlassMenuItem(
                        icon: Icons.diamond_outlined,
                        title: 'About Charme',
                        onTap: () => _showAboutCharme(context),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms, delay: 600.ms)
                          .slideX(begin: -0.05, end: 0),
                    ],
                  ),
                ),

                const SizedBox(height: 48),

                // ─── Sign Out ───
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: AppTheme.textMuted.withValues(alpha: 0.3),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () => _confirmSignOut(context, auth),
                      child: Text(
                        'Sign Out',
                        style: GoogleFonts.dmSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textSecondary,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                )
                    .animate()
                    .fadeIn(duration: 500.ms, delay: 700.ms),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ─── Profile Header ───

  Widget _buildProfileHeader(AuthProvider auth) {
    return Column(
      children: [
        // Avatar with gold ring
        Container(
          width: 110,
          height: 110,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppTheme.goldGradient,
            boxShadow: [
              BoxShadow(
                color: AppTheme.gold.withValues(alpha: 0.2),
                blurRadius: 30,
                spreadRadius: 2,
              ),
            ],
          ),
          padding: const EdgeInsets.all(3),
          child: Container(
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.surfaceCard,
            ),
            child: Center(
              child: Icon(
                Icons.person_rounded,
                size: 48,
                color: AppTheme.gold.withValues(alpha: 0.7),
              ),
            ),
          ),
        )
            .animate()
            .fadeIn(duration: 700.ms)
            .scale(begin: const Offset(0.8, 0.8), end: const Offset(1, 1)),

        const SizedBox(height: 20),

        // Name
        Text(
          auth.userName,
          style: GoogleFonts.playfairDisplay(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        )
            .animate()
            .fadeIn(duration: 600.ms, delay: 200.ms),

        const SizedBox(height: 6),

        // Email
        Text(
          auth.userEmail,
          style: GoogleFonts.dmSans(
            fontSize: 14,
            color: AppTheme.textMuted,
            letterSpacing: 0.3,
          ),
        )
            .animate()
            .fadeIn(duration: 600.ms, delay: 300.ms),

        const SizedBox(height: 6),

        // Member since
        Text(
          'Member since 2025',
          style: GoogleFonts.dmSans(
            fontSize: 12,
            color: AppTheme.textMuted.withValues(alpha: 0.5),
            letterSpacing: 0.5,
          ),
        )
            .animate()
            .fadeIn(duration: 600.ms, delay: 350.ms),

        const SizedBox(height: 16),

        // Gold accent line
        Container(
          width: 40,
          height: 2,
          decoration: BoxDecoration(
            gradient: AppTheme.goldGradient,
            borderRadius: BorderRadius.circular(1),
          ),
        )
            .animate()
            .fadeIn(duration: 600.ms, delay: 400.ms)
            .scaleX(begin: 0, end: 1),
      ],
    );
  }

  // ─── Stats Row ───

  Widget _buildStatsRow(int favCount, int cartCount) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: _GlassStatCard(
              value: '$favCount',
              label: 'Favorites',
              icon: Icons.favorite_border_rounded,
            )
                .animate()
                .fadeIn(duration: 500.ms, delay: 200.ms)
                .slideY(begin: 0.2, end: 0),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _GlassStatCard(
              value: '$cartCount',
              label: 'Cart Items',
              icon: Icons.shopping_bag_outlined,
            )
                .animate()
                .fadeIn(duration: 500.ms, delay: 300.ms)
                .slideY(begin: 0.2, end: 0),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _GlassStatCard(
              value: 'Gold',
              label: 'Membership',
              icon: Icons.workspace_premium_rounded,
              isGoldValue: true,
            )
                .animate()
                .fadeIn(duration: 500.ms, delay: 400.ms)
                .slideY(begin: 0.2, end: 0),
          ),
        ],
      ),
    );
  }

  // ─── Coming Soon Snackbar ───

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$feature — Coming soon',
          style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
        ),
        backgroundColor: AppTheme.surfaceRaised,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ─── About Charme Dialog ───

  void _showAboutCharme(BuildContext context) {
    final db = FragranceDatabase();

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'About',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (ctx, anim1, anim2) {
        return Center(
          child: Material(
            color: Colors.transparent,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.85,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 36,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceCard.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: AppTheme.borderGold.withValues(alpha: 0.3),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.gold.withValues(alpha: 0.08),
                        blurRadius: 40,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo
                      ShaderMask(
                        shaderCallback: (bounds) =>
                            AppTheme.goldGradient.createShader(bounds),
                        child: Text(
                          'CHARME',
                          style: GoogleFonts.playfairDisplay(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 6,
                            color: Colors.white,
                          ),
                        ),
                      ),

                      const SizedBox(height: 8),

                      Text(
                        'v1.0.0',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: AppTheme.textMuted,
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Gold divider
                      Container(
                        width: 50,
                        height: 1,
                        decoration: BoxDecoration(
                          gradient: AppTheme.goldGradient,
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Stats
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _AboutStat(
                            value: '${db.totalCount}',
                            label: 'Fragrances',
                          ),
                          Container(
                            width: 1,
                            height: 36,
                            margin: const EdgeInsets.symmetric(horizontal: 24),
                            color:
                                AppTheme.borderColor.withValues(alpha: 0.4),
                          ),
                          _AboutStat(
                            value: '${db.allBrands.length}',
                            label: 'Brands',
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Gold divider
                      Container(
                        width: 50,
                        height: 1,
                        decoration: BoxDecoration(
                          gradient: AppTheme.goldGradient,
                        ),
                      ),

                      const SizedBox(height: 20),

                      Text(
                        'Luxury Fragrance Collection',
                        style: GoogleFonts.playfairDisplay(
                          fontSize: 14,
                          fontStyle: FontStyle.italic,
                          color: AppTheme.textSecondary,
                          letterSpacing: 0.5,
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Close button
                      GestureDetector(
                        onTap: () => Navigator.of(ctx).pop(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: AppTheme.gold.withValues(alpha: 0.4),
                            ),
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Text(
                            'CLOSE',
                            style: GoogleFonts.dmSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 2,
                              color: AppTheme.gold,
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
        );
      },
      transitionBuilder: (ctx, anim1, anim2, child) {
        return FadeTransition(
          opacity: CurvedAnimation(parent: anim1, curve: Curves.easeOut),
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.9, end: 1.0).animate(
              CurvedAnimation(parent: anim1, curve: Curves.easeOutCubic),
            ),
            child: child,
          ),
        );
      },
    );
  }

  // ─── Edit Profile Sheet ───

  void _showEditProfile(BuildContext context, AuthProvider auth) {
    final nameCtrl = TextEditingController(text: auth.userName);
    final emailCtrl = TextEditingController(text: auth.userEmail);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              decoration: BoxDecoration(
                color: AppTheme.surfaceCard.withValues(alpha: 0.94),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(28)),
                border: Border(
                  top: BorderSide(
                    color: AppTheme.borderGold.withValues(alpha: 0.3),
                  ),
                ),
              ),
              padding: EdgeInsets.fromLTRB(
                28,
                28,
                28,
                MediaQuery.of(ctx).viewInsets.bottom + 28,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.textMuted.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  Text(
                    'Edit Profile',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),

                  const SizedBox(height: 8),

                  Text(
                    'Update your personal information',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      color: AppTheme.textMuted,
                    ),
                  ),

                  const SizedBox(height: 28),

                  _GlassTextField(
                    controller: nameCtrl,
                    hint: 'Name',
                    icon: Icons.person_outline_rounded,
                  ),

                  const SizedBox(height: 16),

                  _GlassTextField(
                    controller: emailCtrl,
                    hint: 'Email',
                    icon: Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                  ),

                  const SizedBox(height: 28),

                  _GoldButton(
                    label: 'SAVE CHANGES',
                    onTap: () {
                      auth.updateProfile(
                        name: nameCtrl.text.trim(),
                        email: emailCtrl.text.trim(),
                      );
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            'Profile updated',
                            style: GoogleFonts.dmSans(
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          backgroundColor: AppTheme.surfaceRaised,
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          margin: const EdgeInsets.all(16),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ─── Sign Out Confirmation ───

  void _confirmSignOut(BuildContext context, AuthProvider auth) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Sign Out',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (ctx, anim1, anim2) {
        return Center(
          child: Material(
            color: Colors.transparent,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.8,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceCard.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.borderColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.logout_rounded,
                        size: 32,
                        color: AppTheme.gold.withValues(alpha: 0.7),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Sign Out?',
                        style: GoogleFonts.playfairDisplay(
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Are you sure you want to sign out of your account?',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.dmSans(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(
                                  color: AppTheme.borderColor
                                      .withValues(alpha: 0.5),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                              ),
                              onPressed: () => Navigator.of(ctx).pop(),
                              child: Text(
                                'Cancel',
                                style: GoogleFonts.dmSans(
                                  color: AppTheme.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: AppTheme.goldGradient,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
                                ),
                                onPressed: () {
                                  Navigator.of(ctx).pop();
                                  context.read<CartProvider>().clear();
                                  context.read<FavoritesProvider>().clear();
                                  auth.logout();
                                },
                                child: Text(
                                  'Sign Out',
                                  style: GoogleFonts.dmSans(
                                    color: AppTheme.surface,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (ctx, anim1, anim2, child) {
        return FadeTransition(
          opacity: CurvedAnimation(parent: anim1, curve: Curves.easeOut),
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.92, end: 1.0).animate(
              CurvedAnimation(parent: anim1, curve: Curves.easeOutCubic),
            ),
            child: child,
          ),
        );
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════
//  REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════

// ─── Glass Text Field ───

class _GlassTextField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;
  final TextInputType keyboardType;

  const _GlassTextField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.suffix,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppTheme.borderColor.withValues(alpha: 0.4),
            ),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            keyboardType: keyboardType,
            style: GoogleFonts.dmSans(
              color: AppTheme.textPrimary,
              fontSize: 15,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.dmSans(
                color: AppTheme.textMuted,
                fontSize: 15,
              ),
              prefixIcon: Icon(icon, color: AppTheme.textMuted, size: 20),
              suffixIcon: suffix != null
                  ? Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: suffix,
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Gold Gradient Button ───

class _GoldButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _GoldButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: 54,
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
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.dmSans(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: 2,
              color: AppTheme.surface,
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Glass Stat Card ───

class _GlassStatCard extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final bool isGoldValue;

  const _GlassStatCard({
    required this.value,
    required this.label,
    required this.icon,
    this.isGoldValue = false,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
          decoration: BoxDecoration(
            color: AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isGoldValue
                  ? AppTheme.borderGold.withValues(alpha: 0.4)
                  : AppTheme.borderColor.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 22,
                color: AppTheme.gold.withValues(alpha: 0.6),
              ),
              const SizedBox(height: 10),
              isGoldValue
                  ? ShaderMask(
                      shaderCallback: (bounds) =>
                          AppTheme.goldGradient.createShader(bounds),
                      child: Text(
                        value,
                        style: GoogleFonts.playfairDisplay(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    )
                  : Text(
                      value,
                      style: GoogleFonts.playfairDisplay(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.gold,
                      ),
                    ),
              const SizedBox(height: 4),
              Text(
                label,
                style: GoogleFonts.dmSans(
                  fontSize: 11,
                  color: AppTheme.textMuted,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Glass Menu Item ───

class _GlassMenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _GlassMenuItem({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppTheme.borderColor.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, color: AppTheme.gold.withValues(alpha: 0.7), size: 22),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.dmSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  color: AppTheme.textMuted.withValues(alpha: 0.5),
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── About Dialog Stat ───

class _AboutStat extends StatelessWidget {
  final String value;
  final String label;

  const _AboutStat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: GoogleFonts.playfairDisplay(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: AppTheme.gold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            color: AppTheme.textMuted,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}
