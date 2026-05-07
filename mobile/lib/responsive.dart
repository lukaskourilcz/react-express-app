import 'package:flutter/material.dart';

/// Layout breakpoints. `phone` covers iPhone SE through iPhone Pro Max,
/// `tablet` covers iPad mini/iPad portrait, anything wider gets the desktop
/// layout (iPad Pro landscape, web).
class Breakpoints {
  static const double phone = 600;
  static const double tablet = 900;
  static const double desktop = 1200;
}

bool isPhone(BuildContext c) => MediaQuery.sizeOf(c).width < Breakpoints.phone;
bool isTablet(BuildContext c) =>
    MediaQuery.sizeOf(c).width >= Breakpoints.phone &&
    MediaQuery.sizeOf(c).width < Breakpoints.tablet;
bool isWide(BuildContext c) => MediaQuery.sizeOf(c).width >= Breakpoints.tablet;

/// Max width the readable content area should occupy. Lets phones use the
/// full width, tablets center at a comfortable line length.
double contentMaxWidth(BuildContext c) {
  final w = MediaQuery.sizeOf(c).width;
  if (w < Breakpoints.phone) return double.infinity;
  if (w < Breakpoints.tablet) return 600;
  return 720;
}

/// Horizontal padding that adapts to screen width.
EdgeInsets pagePadding(BuildContext c) {
  final w = MediaQuery.sizeOf(c).width;
  if (w < Breakpoints.phone) return const EdgeInsets.all(16);
  if (w < Breakpoints.tablet) return const EdgeInsets.fromLTRB(24, 20, 24, 20);
  return const EdgeInsets.fromLTRB(32, 24, 32, 24);
}

/// Wraps a child in a SafeArea + horizontal-centered ConstrainedBox so the
/// content has a comfortable maximum line length on tablets / desktop.
class ResponsiveBody extends StatelessWidget {
  const ResponsiveBody({super.key, required this.child, this.padding});

  final Widget child;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
          child: Padding(
            padding: padding ?? pagePadding(context),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Wrap a ListView's contents with the right max-width for tablets.
class ResponsiveListView extends StatelessWidget {
  const ResponsiveListView({super.key, required this.children, this.padding});

  final List<Widget> children;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
          child: ListView(
            padding: padding ?? pagePadding(context),
            children: children,
          ),
        ),
      ),
    );
  }
}

/// Number of columns for tile / chip grids.
int gridColumns(BuildContext c) {
  final w = MediaQuery.sizeOf(c).width;
  if (w < Breakpoints.phone) return 2;
  if (w < Breakpoints.tablet) return 3;
  return 4;
}
