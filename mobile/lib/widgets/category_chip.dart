import 'package:flutter/material.dart';
import '../models/quiz.dart';

class CategoryChip extends StatelessWidget {
  const CategoryChip({super.key, required this.category, this.selected = false, this.onTap});

  final String category;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = Color(categoryColorsHex[category] ?? 0xFF666666);
    final label = categoryLabels[category] ?? category;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: dark ? const Color(0xFF181A20) : Colors.white,
          border: Border(
            top: BorderSide(color: selected ? color : const Color(0xFFE5E5E5)),
            right: BorderSide(color: selected ? color : const Color(0xFFE5E5E5)),
            bottom: BorderSide(color: selected ? color : const Color(0xFFE5E5E5)),
            left: BorderSide(color: color, width: 4),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? color : (dark ? Colors.white70 : const Color(0xFF525252)),
          ),
        ),
      ),
    );
  }
}
