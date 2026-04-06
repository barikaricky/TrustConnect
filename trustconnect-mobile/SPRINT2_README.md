# TrustConnect Mobile - Sprint 2 Navigation Structure

## Sprint Status: ✅ COMPLETE

### What Was Built

Sprint 2 establishes the foundation for role-based navigation and professional UI styling.

## Architecture Overview

### 1. Three Separate User Flows

```
TrustConnect App
├── Authentication Flow (Not logged in)
│   ├── Login Screen
│   └── Register Screen
│
├── Customer Flow (Service Requesters)
│   └── Customer Home Screen
│
└── Artisan Flow (Service Providers)
    └── Artisan Home Screen
```

### 2. Navigation Structure

```
src/
├── navigation/
│   ├── RootNavigator.tsx      # Main routing logic
│   ├── AuthNavigator.tsx       # Auth flow screens
│   ├── CustomerNavigator.tsx   # Customer flow screens
│   └── ArtisanNavigator.tsx    # Artisan flow screens
│
├── screens/
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── CustomerHomeScreen.tsx
│   └── ArtisanHomeScreen.tsx
│
├── services/
│   └── AuthContext.tsx         # Mock auth state (temporary)
│
├── components/
│   └── RoleSwitcher.tsx        # Dev tool for testing (remove in production)
│
└── config/
    ├── theme.ts                # Design system tokens
    └── styles.ts               # Global styles
```

## Design System

### Color Palette
- **Primary**: Dark blue tones (#1a2742, #2c3e67, #3d5a9b)
- **Neutral**: Clean grays and whites
- **Text**: High contrast for readability

### Typography
- System fonts only
- Clear hierarchy (Display > Heading > Body > Caption)
- Professional weight distribution

### Spacing
- Consistent 8px base unit
- Standardized margins and padding

## How Navigation Works

### Flow Logic
1. **Not Authenticated** → Shows Login/Register screens
2. **Authenticated as Customer** → Shows Customer Dashboard
3. **Authenticated as Artisan** → Shows Artisan Workspace

### Role Switching (Development Only)
- Use the Role Switcher at bottom of screen
- Switch between Customer/Artisan views
- Logout to return to auth screens
- **This tool will be removed in production**

## What's NOT Implemented (By Design)

✗ Real authentication logic  
✗ API calls  
✗ Form validation  
✗ OTP handling  
✗ Backend integration  
✗ Business logic  
✗ Feature functionality  

**Why?** This sprint is about structure, not features. Clean foundation = easier development later.

## Running the App

```bash
# Start Metro bundler
npm start

# Run on Android
# Press 'a' or run:
npm run android

# Run on iOS (macOS only)
npm run ios
```

## Verification Checklist

- ✅ App runs without errors on Android emulator
- ✅ Navigation separates Auth, Customer, Artisan flows
- ✅ All placeholder screens exist
- ✅ Visual style is consistent and professional
- ✅ No feature logic implemented
- ✅ Code follows best practices
- ✅ Committed to Git

## Next Steps (Sprint 3+)

- Implement real authentication with backend
- Add OTP verification
- Build feature screens (job posting, searching, etc.)
- Add form validation
- Implement API integration
- Remove development tools

## File Structure Best Practices

### Why This Structure?
- **Scalability**: Easy to add new screens/features
- **Maintainability**: Clear separation of concerns
- **Team Friendly**: New developers can navigate quickly
- **Professional**: Industry-standard patterns

### Adding New Screens
1. Create screen in `src/screens/`
2. Add to appropriate navigator
3. Update TypeScript types
4. Follow existing design patterns

---

**Sprint 2 Complete** | Structure First, Features Second
