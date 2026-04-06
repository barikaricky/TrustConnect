# Artisan Registration Flow

## Overview
A complete 4-step registration process for artisans to create professional profiles on TrustConnect. The flow includes phone verification, government ID verification, business details, and bank account setup.

## Features

### Step 1: Contact & Security
- **Phone Verification**: Nigerian phone number (+234) with OTP verification
- **Email (Optional)**: For receipts and earnings reports
- **Password Creation**: Secure password with visibility toggle
- **Terms & Conditions**: Agreement to TrustConnect Quality Guarantee

### Step 2: Legal Identity
- **ID Type Selection**: NIN or BVN
- **Government ID Verification**: 11-digit ID number verification
- **Live Selfie**: Camera-based identity verification
- **Name Matching**: Auto-filled legal name from ID verification

### Step 3: Business Details
- **Trade Selection**: Dropdown with multiple trades (Plumber, Electrician, AC Technician, etc.)
- **Experience Level**: Years of experience selection
- **Work Location**: GPS-based current location or manual entry
- **Portfolio Upload**: 3-5 photos of previous work

### Step 4: Bank Details
- **Bank Selection**: List of all Nigerian banks (GTB, Zenith, OPay, Moniepoint, etc.)
- **Account Verification**: Auto-fetch account name from bank
- **Name Matching**: Verifies account name matches ID name
- **Security Check**: Prevents mismatched account names

### Success Screen
- **Confirmation Message**: Application submitted successfully
- **Next Steps**: 24-hour verification timeline
- **Benefits Preview**: What artisans can expect after approval

## Technical Implementation

### File Structure
```
src/screens/ArtisanRegistration/
├── ArtisanRegistrationCoordinator.tsx  # Main coordinator managing flow state
├── Step1ContactSecurity.tsx            # Phone, email, password setup
├── Step2LegalIdentity.tsx              # ID and selfie verification
├── Step3BusinessDetails.tsx            # Trade, experience, location, portfolio
├── Step4BankDetails.tsx                # Bank account verification
└── SuccessScreen.tsx                   # Completion screen
```

### Services
```
src/services/
└── artisanRegistrationService.ts       # Backend API integration
```

### API Integration
The registration flow integrates with the following backend endpoints:

#### Authentication
- **POST /api/auth/register**: Create user account
  - Body: `{ phone, name, role }`
  - Returns: User ID and OTP

- **POST /api/auth/send-otp**: Send OTP verification code
  - Body: `{ phone }`
  
- **POST /api/auth/verify-otp**: Verify OTP code
  - Body: `{ phone, otp }`
  - Returns: Authentication token

#### Verification
- **POST /api/verification/verify-id**: Verify NIN/BVN
  - Body: `{ idType, idNumber }`
  - Returns: Legal name

- **POST /api/verification/upload-selfie**: Upload selfie for verification
  - Body: FormData with selfie image
  - Returns: Image URL

#### Artisan Profile
- **POST /api/artisan/upload-portfolio**: Upload portfolio photos
  - Body: FormData with multiple photos
  - Returns: Array of image URLs

- **POST /api/payment/verify-account**: Verify bank account
  - Body: `{ bankName, accountNumber }`
  - Returns: Account name

- **POST /api/artisan/registration/complete**: Complete registration
  - Body: Complete registration data
  - Returns: Profile ID and status

### Data Model
```typescript
interface RegistrationData {
  // Step 1
  phone: string;
  email?: string;
  password: string;
  agreedToTerms: boolean;
  
  // Step 2
  idType: 'NIN' | 'BVN';
  idNumber: string;
  fullName: string;
  selfieUrl: string;
  
  // Step 3
  primaryTrade: string;
  yearsExperience: string;
  workLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  portfolioPhotos: string[];
  
  // Step 4
  bankName: string;
  accountNumber: string;
  accountName: string;
}
```

## Validation Rules

### Step 1
- Phone number must be 10 digits (Nigerian format)
- OTP must be verified before proceeding
- Password minimum 6 characters
- Terms must be accepted

### Step 2
- ID number must be exactly 11 digits
- ID must be verified through backend
- Selfie photo required
- Legal name must match ID

### Step 3
- Trade selection required
- Experience level required
- Work location required (GPS or manual)
- Minimum 1 portfolio photo (3-5 recommended)

### Step 4
- Bank selection required
- Account number must be 10 digits
- Account must be verified through backend
- Account name MUST match verified ID name

## User Experience

### Progress Indicator
- 4 dots at the top showing current step
- Completed steps shown in green
- Current step shown in navy blue
- Upcoming steps shown in gray

### Validation Feedback
- Red border on required empty fields
- Error messages below invalid inputs
- Green checkmarks for verified items
- Helper text for guidance

### Animation
- Smooth fade-in transitions between steps
- Press feedback on buttons
- Loading indicators during verification
- Success animations on completion

## Security Features

1. **OTP Verification**: Phone number ownership verified
2. **Government ID Check**: NIN/BVN verified through official channels
3. **Live Selfie**: Prevents fake ID submission
4. **Name Matching**: Bank account must match ID name
5. **Encrypted Storage**: Sensitive data encrypted in transit

## Navigation

### Entry Point
From Welcome Screen → Click "I Want to Work" → Registration starts

### Route
```
app/artisan-registration.tsx → ArtisanRegistrationCoordinator
```

### Back Navigation
- Each step has a "Back" button
- Progress is saved when going back
- Can resume from any previous step

## Environment Setup

### Required Packages
```bash
npm install axios expo-image-picker expo-location @react-native-picker/picker
```

### Environment Variables
Create `.env` file:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For production:
```
EXPO_PUBLIC_API_URL=https://api.trustconnect.ng/api
```

## Testing

### Mock Data
For testing, the backend returns mock OTP: `123456`

### Test Flow
1. Start from Welcome Screen
2. Click "I Want to Work"
3. Enter phone: `8012345678`
4. Enter OTP: `123456`
5. Fill remaining steps with test data
6. Submit and verify success screen

## Error Handling

### Network Errors
- Graceful degradation with user-friendly messages
- Retry mechanisms for failed requests
- Timeout handling (30 seconds)

### Validation Errors
- Real-time validation feedback
- Clear error messages
- Prevention of incomplete submissions

### Backend Errors
- Specific error messages from API
- Fallback to generic messages
- User guidance on how to fix issues

## Future Enhancements

1. **ID Document Upload**: Add separate ID card/document photo
2. **Video Verification**: Record short verification video
3. **Skills Assessment**: Quick quiz to verify expertise
4. **References**: Add professional references
5. **Portfolio Video**: Allow video portfolio uploads
6. **Multi-language**: Support for multiple Nigerian languages
7. **Offline Mode**: Save progress locally if no connection
8. **Auto-save**: Automatic progress saving every step

## Troubleshooting

### Common Issues

**OTP not received**
- Check phone number format
- Verify network connection
- Check backend logs for SMS provider errors

**ID verification fails**
- Ensure ID number is correct 11 digits
- Verify ID is active/valid
- Check backend ID verification service

**Bank account verification fails**
- Verify account number is correct
- Ensure bank is selected
- Check if account name matches ID

**Portfolio upload fails**
- Check image file sizes (max 5MB each)
- Verify internet connection
- Ensure sufficient storage space

## Support
For issues or questions, contact: support@trustconnect.ng
