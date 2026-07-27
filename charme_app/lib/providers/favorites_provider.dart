import 'package:flutter/foundation.dart';
import '../models/fragrance.dart';

class FavoritesProvider extends ChangeNotifier {
  final Set<String> _favoriteIds = {};

  Set<String> get favoriteIds => Set.unmodifiable(_favoriteIds);

  int get count => _favoriteIds.length;

  bool isFavorite(Fragrance fragrance) => _favoriteIds.contains(fragrance.id);

  void toggle(Fragrance fragrance) {
    if (_favoriteIds.contains(fragrance.id)) {
      _favoriteIds.remove(fragrance.id);
    } else {
      _favoriteIds.add(fragrance.id);
    }
    notifyListeners();
  }

  void remove(Fragrance fragrance) {
    _favoriteIds.remove(fragrance.id);
    notifyListeners();
  }

  void clear() {
    _favoriteIds.clear();
    notifyListeners();
  }
}
