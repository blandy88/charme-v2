import 'package:flutter/foundation.dart';
import '../models/fragrance.dart';
import '../models/cart_item.dart';

class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);

  int get lineItemCount => _items.length;

  double get total => _items.fold(0, (sum, item) => sum + item.total);

  void addItem(Fragrance fragrance, String size, double price) {
    if (!fragrance.available) return;

    final existingIndex = _items.indexWhere(
      (item) => item.fragranceId == fragrance.id && item.selectedSize == size,
    );

    if (existingIndex >= 0) {
      _items[existingIndex].quantity++;
    } else {
      _items.add(CartItem(
        fragranceId: fragrance.id,
        fragranceName: fragrance.name,
        brand: fragrance.brand,
        selectedSize: size,
        price: price,
      ));
    }
    notifyListeners();
  }

  void removeItem(int index) {
    _items.removeAt(index);
    notifyListeners();
  }

  void updateQuantity(int index, int quantity) {
    if (quantity <= 0) {
      removeItem(index);
    } else {
      _items[index].quantity = quantity;
      notifyListeners();
    }
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}
