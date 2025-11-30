# STARS Login Page

A beautiful and responsive login page built with React, TypeScript, and Tailwind CSS featuring hot toast notifications and cream blue to dark blue branding.

## Features

- **Modern Design**: Clean and professional UI with gradient backgrounds
- **Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **Hot Toast Notifications**: Real-time feedback for user actions
- **Form Validation**: Client-side validation for username and password
- **Loading States**: Visual feedback during authentication process
- **Accessibility**: Proper labels, focus states, and keyboard navigation
- **Demo Credentials**: Built-in demo account for testing

## Design System

### Colors
- **Primary**: Dark Blue (`blue-950`) - Used for main text, buttons, and branding
- **Background**: Cream Blue (`blue-50`) gradient - Light, welcoming background
- **Accents**: Various blue shades for consistency
- **Interactive**: Hover and focus states with smooth transitions

### Typography
- **Headings**: Bold, dark blue (`blue-950`) for strong hierarchy
- **Body Text**: Blue-700/800 for good contrast and readability
- **Placeholders**: Light blue for subtle guidance

## Components Structure

```
login.tsx
├── Brand Section (Logo + Title)
├── Login Form
│   ├── Username Input
│   ├── Password Input
│   ├── Remember Me Checkbox
│   ├── Forgot Password Link
│   └── Submit Button
├── Demo Credentials Box
├── Sign Up Link
└── Footer
```

## Toast Notifications

The page includes several types of toast notifications:

- **Success**: Green background for successful login
- **Error**: Red background for validation errors or login failures
- **Info**: Blue background for general information

## Demo Credentials

For testing purposes, the login page includes demo credentials:
- **Username**: `admin`
- **Password**: `password`

## Form Validation

- Username: Required field
- Password: Required, minimum 6 characters
- Real-time validation with helpful error messages

## Usage

1. Navigate to the login page
2. Enter your credentials or use the demo credentials
3. Watch for toast notifications providing feedback
4. Experience smooth loading states and transitions

## Technical Implementation

### Dependencies
- `react`: Core React library
- `react-hot-toast`: Toast notification system
- `tailwindcss`: Utility-first CSS framework

### Key Features
- TypeScript for type safety
- React hooks for state management
- Responsive design with Tailwind CSS
- Accessible form controls
- Smooth animations and transitions

## Customization

The color scheme and branding can be easily customized by modifying the Tailwind CSS classes:

```tsx
// Change primary brand color
className="text-blue-950" // Change to your brand color

// Modify background gradient
className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200"

// Update button styling
className="bg-blue-950 hover:bg-blue-900"
```

## Future Enhancements

- Integration with authentication providers (Auth0, Firebase, etc.)
- Social login options (Google, GitHub, etc.)
- Two-factor authentication support
- Password strength indicator
- Animated success/error states
- Dark mode support