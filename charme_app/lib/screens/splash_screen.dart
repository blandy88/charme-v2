import 'package:flutter/material.dart';
import 'dart:async';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// A luxury animated splash screen for Charme parfumerie.
/// Shows a gold shimmer logo with fade‑in animation for 2.4 seconds,
/// then triggers [onComplete] callback.
class SplashScreen extends StatefulWidget {
  final VoidCallback onComplete;
  const SplashScreen({super.key, required this.onComplete});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _fadeController;
  late final AnimationController _shimmerController;
  late final AnimationController _pulseController;
  late final Animation<double> _fadeAnim;
  late final Animation<double> _scaleAnim;
  late final Animation<double> _subtitleFade;
  late final Animation<double> _taglineFade;
  Timer? _completionTimer;

  @override
  void initState() {
    super.initState();

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _fadeAnim = CurvedAnimation(
      parent: _fadeController,
      curve: const Interval(0.0, 0.4, curve: Curves.easeOut),
    );

    _scaleAnim = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _fadeController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
      ),
    );

    _subtitleFade = CurvedAnimation(
      parent: _fadeController,
      curve: const Interval(0.3, 0.6, curve: Curves.easeOut),
    );

    _taglineFade = CurvedAnimation(
      parent: _fadeController,
      curve: const Interval(0.5, 0.8, curve: Curves.easeOut),
    );

    _fadeController.forward();

    // Transition after splash duration
    _completionTimer = Timer(const Duration(milliseconds: 2800), () {
      if (mounted) widget.onComplete();
    });
  }

  @override
  void dispose() {
    _completionTimer?.cancel();
    _fadeController.dispose();
    _shimmerController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: Stack(
        children: [
          // Background glow orbs
          AnimatedBuilder(
            animation: _pulseController,
            builder: (_, _) => Center(
              child: Container(
                width: 300 + _pulseController.value * 30,
                height: 300 + _pulseController.value * 30,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.gold.withValues(
                          alpha: 0.05 + _pulseController.value * 0.03),
                      AppTheme.gold.withValues(alpha: 0.01),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              ),
            ),
          ),
          // Main content
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo
                FadeTransition(
                  opacity: _fadeAnim,
                  child: ScaleTransition(
                    scale: _scaleAnim,
                    child: AnimatedBuilder(
                      animation: _shimmerController,
                      builder: (_, _) {
                        final dx = _shimmerController.value * 3 - 1;
                        return ShaderMask(
                          shaderCallback: (bounds) => LinearGradient(
                            begin: Alignment(dx, 0),
                            end: Alignment(dx + 1, 0),
                            colors: [
                              AppTheme.textPrimary,
                              AppTheme.gold,
                              AppTheme.champagne,
                              AppTheme.gold,
                              AppTheme.textPrimary,
                            ],
                            stops: const [0.0, 0.3, 0.5, 0.7, 1.0],
                          ).createShader(bounds),
                          child: Text(
                            'CHARME',
                            style: GoogleFonts.playfairDisplay(
                              fontSize: 52,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                              letterSpacing: 18,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Subtitle
                FadeTransition(
                  opacity: _subtitleFade,
                  child: Text(
                    'P A R F U M E R I E',
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textMuted,
                      letterSpacing: 7,
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                // Gold divider
                FadeTransition(
                  opacity: _subtitleFade,
                  child: Container(
                    width: 50,
                    height: 1,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          AppTheme.gold.withValues(alpha: 0.5),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                // Tagline
                FadeTransition(
                  opacity: _taglineFade,
                  child: Text(
                    'The Art of Fragrance',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 14,
                      fontStyle: FontStyle.italic,
                      color: AppTheme.textMuted,
                      letterSpacing: 1,
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
}
