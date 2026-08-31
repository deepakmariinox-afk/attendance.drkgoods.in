// DRK Goods Enterprise - Staff PIN & Authentication Service

/**
 * Verify an entered 4-digit Security PIN against employee record
 */
export function verifySecurityPin(
  enteredPin: string,
  phone?: string,
  fallbackPin?: string
): { isValid: boolean; message: string } {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const cleanEntered = enteredPin.trim();

  // 1. Calculate expected PIN (last 4 digits of registered phone)
  const expectedPhonePin = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : (fallbackPin || '1234');

  // 2. Direct match with phone's last 4 digits
  if (cleanEntered === expectedPhonePin) {
    return { isValid: true, message: 'Security PIN verified successfully.' };
  }

  // 3. Match with standard onboarding PINs (1234 or 0000)
  if (cleanEntered === '1234' || cleanEntered === '0000') {
    return { isValid: true, message: 'Security PIN verified successfully.' };
  }

  // 4. Match with provided custom fallback PIN
  if (fallbackPin && cleanEntered === fallbackPin.trim()) {
    return { isValid: true, message: 'Security PIN verified successfully.' };
  }

  // 5. Master Admin override codes for Deepak Yadav
  if (cleanEntered === '7788' || cleanEntered === '6707' || cleanEntered === '9971') {
    return { isValid: true, message: 'Administrator master PIN authorized.' };
  }

  return {
    isValid: false,
    message: `Incorrect 4-digit PIN. Please enter the last 4 digits of your registered mobile number (${expectedPhonePin}) or default PIN (1234).`,
  };
}

// Backward compatibility alias
export const verifyOtp = (
  enteredOtp: string,
  phone?: string,
  _employeeId?: string,
  fallbackPin?: string
) => verifySecurityPin(enteredOtp, phone, fallbackPin);

