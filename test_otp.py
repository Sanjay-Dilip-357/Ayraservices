# test_otp.py - Test OTP Service independently

from otp_service import OTPService
import sys

def test_otp_flow():
    """Interactive test for OTP flow"""
    
    print("\n" + "=" * 60)
    print("   KSP OTP Service - Interactive Test")
    print("=" * 60)
    
    # Step 1: Get phone number
    print("\n📱 STEP 1: Enter Phone Number")
    print("-" * 40)
    
    phone = input("Enter 10-digit mobile number: ").strip()
    
    # Validate phone
    is_valid, result = OTPService.validate_phone(phone)
    if not is_valid:
        print(f"\n❌ Error: {result}")
        return False
    
    phone = result
    print(f"✅ Valid phone number: {phone}")
    
    # Step 2: Send OTP
    print("\n📤 STEP 2: Sending OTP...")
    print("-" * 40)
    
    send_result = OTPService.send_otp(phone)
    
    print(f"\n📋 Send Response:")
    print(f"   Success: {send_result['success']}")
    print(f"   Message: {send_result['message']}")
    if send_result.get('data'):
        print(f"   Data: {send_result['data']}")
    
    if not send_result['success']:
        print(f"\n❌ Failed to send OTP!")
        return False
    
    print(f"\n✅ OTP sent to {phone}")
    print("   (Check your phone for the 5-digit OTP)")
    
    # Step 3: Enter OTP
    print("\n🔢 STEP 3: Enter OTP")
    print("-" * 40)
    
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        print(f"\nAttempt {attempt}/{max_attempts}")
        otp = input("Enter 5-digit OTP: ").strip()
        
        # Validate OTP format
        is_valid, result = OTPService.validate_otp(otp)
        if not is_valid:
            print(f"⚠️  {result}")
            continue
        
        otp = result
        
        # Step 4: Verify OTP
        print("\n🔐 STEP 4: Verifying OTP...")
        print("-" * 40)
        
        verify_result = OTPService.verify_otp(phone, otp)
        
        print(f"\n📋 Verify Response:")
        print(f"   Success: {verify_result['success']}")
        print(f"   Message: {verify_result['message']}")
        print(f"   Verified: {verify_result.get('verified', False)}")
        if verify_result.get('data'):
            print(f"   Data: {verify_result['data']}")
        
        if verify_result.get('verified'):
            print("\n" + "=" * 60)
            print("   ✅ OTP VERIFICATION SUCCESSFUL!")
            print("=" * 60)
            return True
        else:
            print(f"\n⚠️  OTP verification failed: {verify_result['message']}")
            
            if attempt < max_attempts:
                retry = input("\nTry again? (y/n): ").strip().lower()
                if retry != 'y':
                    break
    
    print("\n" + "=" * 60)
    print("   ❌ OTP VERIFICATION FAILED")
    print("=" * 60)
    return False


def test_send_only():
    """Test only sending OTP"""
    print("\n📤 Testing OTP Send...")
    
    phone = input("Enter 10-digit mobile number: ").strip()
    result = OTPService.send_otp(phone)
    
    print(f"\nResult: {result}")
    return result['success']


def test_verify_only():
    """Test only verifying OTP (for debugging)"""
    print("\n🔐 Testing OTP Verify...")
    
    phone = input("Enter 10-digit mobile number: ").strip()
    otp = input("Enter 5-digit OTP: ").strip()
    
    result = OTPService.verify_otp(phone, otp)
    
    print(f"\nResult: {result}")
    return result.get('verified', False)


if __name__ == '__main__':
    print("\nSelect test mode:")
    print("1. Full OTP flow (send + verify)")
    print("2. Send OTP only")
    print("3. Verify OTP only")
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == '1':
        success = test_otp_flow()
    elif choice == '2':
        success = test_send_only()
    elif choice == '3':
        success = test_verify_only()
    else:
        print("Invalid choice!")
        sys.exit(1)
    
    sys.exit(0 if success else 1)