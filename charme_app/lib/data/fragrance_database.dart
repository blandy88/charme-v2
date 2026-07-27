import '../models/fragrance.dart';
import 'fragrances_pdm.dart';
import 'fragrances_niche.dart';
import 'fragrances_designer_a.dart';
import 'fragrances_designer_b.dart';
import 'fragrances_affordable.dart';
import 'fragrances_extra.dart';
import 'fragrances_expansion.dart';

class FragranceDatabase {
  static final FragranceDatabase _instance = FragranceDatabase._internal();
  factory FragranceDatabase() => _instance;
  FragranceDatabase._internal();

  late final List<Fragrance> _all = _dedupe([
    ...pdmFragrances,
    ...nicheFragrances,
    ...designerAFragrances,
    ...designerBFragrances,
    ...affordableFragrances,
    ...extraFragrances,
    ...expansionFragrances,
  ]);

  List<Fragrance> _dedupe(List<Fragrance> fragrances) {
    final byId = <String, Fragrance>{};
    for (final fragrance in fragrances) {
      byId.putIfAbsent(fragrance.id, () => fragrance);
    }
    return List.unmodifiable(byId.values);
  }

  List<Fragrance> get all => _all;
  int get totalCount => _all.length;

  List<String> get allBrands {
    final brands = _all.map((f) => f.brand).toSet().toList()..sort();
    return brands;
  }

  List<String> get allFamilies {
    final families = _all.map((f) => f.family).toSet().toList()..sort();
    return families;
  }

  String _canonicalConcentration(String value) {
    final normalized = value.toLowerCase().trim();
    if (normalized == 'edp' || normalized.contains('eau de parfum')) {
      return 'edp';
    }
    if (normalized == 'edt' || normalized.contains('eau de toilette')) {
      return 'edt';
    }
    if (normalized.contains('parfum') || normalized.contains('extrait')) {
      return 'parfum';
    }
    return normalized;
  }

  List<String> get allConcentrations {
    final c = _all
        .where((f) => f.concentration != null)
        .map((f) => _canonicalConcentration(f.concentration!))
        .toSet()
        .toList()
      ..sort();
    return c;
  }

  List<String> get allIngredients {
    final ingredients = <String>{};
    for (final f in _all) {
      for (final i in f.ingredients) {
        ingredients.add(i.toLowerCase());
      }
    }
    final list = ingredients.toList()..sort();
    return list;
  }

  Map<String, int> get brandCounts {
    final map = <String, int>{};
    for (final f in _all) {
      map[f.brand] = (map[f.brand] ?? 0) + 1;
    }
    return map;
  }

  Map<String, int> get familyCounts {
    final map = <String, int>{};
    for (final f in _all) {
      map[f.family] = (map[f.family] ?? 0) + 1;
    }
    return map;
  }

  List<Fragrance> getByBrand(String brand) =>
      _all.where((f) => f.brand.toLowerCase() == brand.toLowerCase()).toList();

  List<Fragrance> getByFamily(String family) => _all
      .where((f) => f.family.toLowerCase().contains(family.toLowerCase()))
      .toList();

  List<Fragrance> getByConcentration(String concentration) => _all
      .where((f) =>
          f.concentration != null &&
          _canonicalConcentration(f.concentration!) ==
              _canonicalConcentration(concentration))
      .toList();

  List<Fragrance> getByYear(int year) =>
      _all.where((f) => f.year == year).toList();

  List<Fragrance> getByYearRange(int startYear, int endYear) =>
      _all.where((f) => f.year >= startYear && f.year <= endYear).toList();

  List<Fragrance> getByIngredient(String ingredient) {
    final q = ingredient.toLowerCase();
    return _all
        .where((f) => f.ingredients.any((i) => i.toLowerCase().contains(q)))
        .toList();
  }

  List<Fragrance> get newestFirst {
    final list = List<Fragrance>.from(_all);
    list.sort((a, b) => b.year.compareTo(a.year));
    return list;
  }

  List<Fragrance> get available => _all.where((f) => f.available).toList();

  List<Fragrance> search(String query) {
    final q = query.toLowerCase().trim();
    if (q.isEmpty) return _all;
    return _all.where((f) {
      return f.name.toLowerCase().contains(q) ||
          f.brand.toLowerCase().contains(q) ||
          f.family.toLowerCase().contains(q) ||
          f.description.toLowerCase().contains(q) ||
          (f.perfumer.toLowerCase().contains(q)) ||
          f.ingredients.any((i) => i.toLowerCase().contains(q));
    }).toList();
  }

  List<Fragrance> get featured => _all.where((f) => f.available).take(8).toList();

  List<Fragrance> get popular {
    const names = [
      'Layton', 'Aventus', 'Dior Sauvage', 'Black Orchid',
      'Baccarat Rouge 540', 'Bleu de Chanel', 'Eros',
      'Tobacco Vanille', 'Santal 33', '1 Million',
      'Acqua di Gio', 'La Nuit de l\'Homme', 'Hacivat',
      'Cool Water', 'Le Male', 'Interlude Man',
    ];
    final results = <Fragrance>[];
    for (final n in names) {
      final match = _all.where((f) => f.name == n);
      if (match.isNotEmpty) results.add(match.first);
    }
    return results;
  }

  /// Find similar fragrances by matching family and ingredients
  List<Fragrance> getSimilar(Fragrance fragrance, {int limit = 8}) {
    final scores = <Fragrance, int>{};
    final targetIngredients =
        fragrance.ingredients.map((i) => i.toLowerCase()).toSet();

    for (final f in _all) {
      if (f.name == fragrance.name && f.brand == fragrance.brand) continue;
      int score = 0;
      if (f.family.toLowerCase() == fragrance.family.toLowerCase()) score += 5;
      final fWords = f.family.toLowerCase().split(' ').toSet();
      final tWords = fragrance.family.toLowerCase().split(' ').toSet();
      score += fWords.intersection(tWords).length * 2;
      final fIngredients = f.ingredients.map((i) => i.toLowerCase()).toSet();
      score += fIngredients.intersection(targetIngredients).length;
      if (f.brand == fragrance.brand) score += 1;
      if (f.concentration == fragrance.concentration) score += 1;
      if (score > 0) scores[f] = score;
    }

    final sorted = scores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(limit).map((e) => e.key).toList();
  }

  /// Get fragrances for a specific mood
  List<Fragrance> getByMood(String mood) {
    final moodKeywords = <String, List<String>>{
      'romantic': ['rose', 'jasmine', 'vanilla', 'musk', 'ylang-ylang', 'tuberose'],
      'confident': ['oud', 'leather', 'cedar', 'sandalwood', 'vetiver', 'patchouli'],
      'fresh': ['bergamot', 'lemon', 'mint', 'grapefruit', 'lime', 'cucumber'],
      'mysterious': ['oud', 'incense', 'amber', 'smoke', 'saffron', 'myrrh'],
      'cozy': ['vanilla', 'chocolate', 'coffee', 'caramel', 'honey', 'tonka bean'],
      'energetic': ['ginger', 'pepper', 'cardamom', 'mandarin', 'grapefruit', 'bergamot'],
      'sensual': ['musk', 'amber', 'vanilla', 'sandalwood', 'rose', 'jasmine'],
      'elegant': ['iris', 'violet', 'neroli', 'bergamot', 'cedar', 'vetiver'],
    };
    final keywords = moodKeywords[mood.toLowerCase()] ?? [];
    if (keywords.isEmpty) return _all.take(12).toList();

    final scored = <Fragrance, int>{};
    for (final f in _all) {
      int score = 0;
      for (final i in f.ingredients) {
        if (keywords.any((k) => i.toLowerCase().contains(k))) score++;
      }
      if (score > 0) scored[f] = score;
    }
    final sorted = scored.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(16).map((e) => e.key).toList();
  }

  /// Get fragrances suited for a season
  List<Fragrance> getBySeason(String season) {
    final seasonFamilies = <String, List<String>>{
      'spring': ['floral', 'green', 'citrus', 'fresh'],
      'summer': ['aquatic', 'citrus', 'fresh', 'aromatic'],
      'autumn': ['woody', 'spicy', 'leather', 'tobacco'],
      'winter': ['oriental', 'gourmand', 'amber', 'oud'],
    };
    final families = seasonFamilies[season.toLowerCase()] ?? [];
    if (families.isEmpty) return _all.take(12).toList();

    return _all
        .where((f) =>
            families.any((fam) => f.family.toLowerCase().contains(fam)))
        .take(16)
        .toList();
  }

  /// Get fragrances suited for day or night
  List<Fragrance> getByTimeOfDay(String time) {
    if (time.toLowerCase() == 'day') {
      return _all
          .where((f) {
            final fam = f.family.toLowerCase();
            return fam.contains('fresh') ||
                fam.contains('citrus') ||
                fam.contains('aquatic') ||
                fam.contains('aromatic') ||
                fam.contains('green');
          })
          .take(16)
          .toList();
    } else {
      return _all
          .where((f) {
            final fam = f.family.toLowerCase();
            return fam.contains('oriental') ||
                fam.contains('woody') ||
                fam.contains('gourmand') ||
                fam.contains('leather') ||
                fam.contains('spicy');
          })
          .take(16)
          .toList();
    }
  }

  /// Get top brands sorted by fragrance count
  List<MapEntry<String, int>> get topBrands {
    final entries = brandCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return entries;
  }

  /// Get random discovery fragrances
  List<Fragrance> getRandomDiscovery({int count = 6}) {
    final shuffled = List<Fragrance>.from(_all)..shuffle();
    return shuffled.take(count).toList();
  }

  /// Get decades for browsing
  Map<String, List<Fragrance>> get byDecade {
    final map = <String, List<Fragrance>>{};
    for (final f in _all) {
      final decade = '${(f.year ~/ 10) * 10}s';
      map.putIfAbsent(decade, () => []).add(f);
    }
    return Map.fromEntries(
      map.entries.toList()..sort((a, b) => b.key.compareTo(a.key)),
    );
  }
}
