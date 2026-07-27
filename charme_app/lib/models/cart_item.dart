class CartItem {
  final String fragranceId;
  final String fragranceName;
  final String brand;
  final String selectedSize;
  final double price;
  int quantity;

  CartItem({
    required this.fragranceId,
    required this.fragranceName,
    required this.brand,
    required this.selectedSize,
    required this.price,
    this.quantity = 1,
  });

  double get total => price * quantity;
}
