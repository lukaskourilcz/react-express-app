import 'package:flutter/material.dart';
import '../lib/achievements.dart';
import '../theme.dart';

class AchievementsGrid extends StatelessWidget {
  const AchievementsGrid({super.key, required this.achievements});
  final List<Achievement> achievements;

  @override
  Widget build(BuildContext context) {
    final earned = achievements.where((a) => a.earned).length;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('ACHIEVEMENTS ($earned/${achievements.length})',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: achievements
                .map((a) => Tooltip(
                      message: a.description,
                      child: Container(
                        width: 88,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          border: Border.all(
                              color: a.earned ? BrandColors.green : const Color(0xFFE5E5E5)),
                          borderRadius: BorderRadius.circular(8),
                          color: a.earned ? BrandColors.greenSoft : null,
                        ),
                        child: Opacity(
                          opacity: a.earned ? 1 : 0.45,
                          child: Column(children: [
                            Text(a.emoji, style: const TextStyle(fontSize: 28)),
                            const SizedBox(height: 4),
                            Text(a.label,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    fontSize: 11, fontWeight: FontWeight.w700, height: 1.2)),
                          ]),
                        ),
                      ),
                    ))
                .toList(),
          ),
        ]),
      ),
    );
  }
}
