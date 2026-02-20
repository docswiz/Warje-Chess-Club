// Design tokens for Instagram-style design
// Use these throughout your app for consistency

export const Colors = {
  // Instagram-inspired colors
  primary: '#E1306C',        // Instagram pink
  secondary: '#833AB4',      // Instagram purple  
  accent: '#FD1D1D',         // Instagram red
  gradient: ['#833AB4', '#E1306C', '#FD1D1D'], // Instagram gradient
  
  // Neutrals
  background: '#FAFAFA',     // Light gray background
  surface: '#FFFFFF',        // White cards
  border: '#DBDBDB',         // Light borders
  
  // Text
  textPrimary: '#262626',    // Almost black
  textSecondary: '#8E8E8E',  // Gray
  textTertiary: '#C7C7C7',   // Light gray
  
  // Status
  success: '#00C853',        // Green
  error: '#F44336',          // Red
  warning: '#FF9800',        // Orange
  info: '#2196F3',           // Blue
  
  // Chess-specific (keep your theme)
  gold: '#FFD700',           // For puzzles
  chessBoard: '#8B4513',     // Brown
};

export const Typography = {
  // Font sizes
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  body: 16,
  caption: 14,
  small: 12,
  
  // Font weights
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const Spacing = {
  // 8px base unit (Instagram style)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

// Common component styles
export const CommonStyles = {
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.medium,
  },
  
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
  },
};
