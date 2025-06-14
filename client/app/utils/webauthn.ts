/**
 * WebAuthn utility functions for registration and authentication
 */
import { api } from "./api";

// Helper to convert base64url to ArrayBuffer
export function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i);
  }

  return buffer.buffer;
}

// Helper to convert ArrayBuffer to base64url
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Start WebAuthn registration
export async function startRegistration(
  username: string,
  firstName: string = "",
  lastName: string = "",
  email: string = ""
): Promise<any> {
  try {
    // 1. Request challenge from server
    const challengeData = await api.getRegistrationChallenge({
      username,
      first_name: firstName,
      last_name: lastName,
      email,
    });

    // 2. Create credential options
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64UrlToArrayBuffer(challengeData.challenge),
      rp: {
        name: challengeData.rp.name,
        id: challengeData.rp.id,
      },
      user: {
        id: base64UrlToArrayBuffer(challengeData.user.id),
        name: challengeData.user.name,
        displayName: challengeData.user.displayName,
      },
      pubKeyCredParams: challengeData.pubKeyCredParams,
      timeout: challengeData.timeout || 60000,
      authenticatorSelection: {
        authenticatorAttachment: "cross-platform", // This ensures YubiKey support
        userVerification: "preferred",
        requireResidentKey: false,
      },
      attestation: "direct",
    };

    // 3. Create credential using WebAuthn API
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error("Failed to create credential");
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    // 4. Prepare data for verification
    const verificationData = {
      username,
      credential_id: arrayBufferToBase64Url(credential.rawId),
      client_data_json: arrayBufferToBase64Url(response.clientDataJSON),
      attestation_object: arrayBufferToBase64Url(response.attestationObject),
    };

    // 5. Send to server for verification
    const verificationResult = await api.verifyRegistration(verificationData);

    return verificationResult;
  } catch (error: any) {
    console.error("WebAuthn registration error:", error);
    
    // Handle specific WebAuthn errors
    if (error.name === "NotSupportedError") {
      throw new Error("WebAuthn is not supported on this device");
    } else if (error.name === "SecurityError") {
      throw new Error("Security error: Please ensure you're using HTTPS");
    } else if (error.name === "NotAllowedError") {
      throw new Error("Registration was cancelled or timed out");
    } else if (error.name === "InvalidStateError") {
      throw new Error("This authenticator is already registered");
    } else if (error.name === "ConstraintError") {
      throw new Error("The authenticator doesn't meet the requirements");
    }
    
    throw error;
  }
}

// Start WebAuthn authentication
export async function startAuthentication(username?: string): Promise<any> {
  try {
    // 1. Request challenge from server
    const challengeData = await api.getAuthenticationChallenge({ username });

    // 2. Create assertion options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64UrlToArrayBuffer(challengeData.challenge),
      timeout: challengeData.timeout || 60000,
      rpId: challengeData.rpId,
      allowCredentials: challengeData.allowCredentials?.map((cred: any) => ({
        id: base64UrlToArrayBuffer(cred.id),
        type: cred.type,
        transports: cred.transports,
      })),
      userVerification: "preferred",
    };

    // 3. Get assertion using WebAuthn API
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!assertion) {
      throw new Error("Failed to get assertion");
    }

    const response = assertion.response as AuthenticatorAssertionResponse;

    // 4. Prepare data for verification
    const verificationData = {
      credential_id: arrayBufferToBase64Url(assertion.rawId),
      authenticator_data: arrayBufferToBase64Url(response.authenticatorData),
      client_data_json: arrayBufferToBase64Url(response.clientDataJSON),
      signature: arrayBufferToBase64Url(response.signature),
      user_handle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : undefined,
    };

    // 5. Send to server for verification
    const verificationResult = await api.verifyAuthentication(verificationData);

    return verificationResult;
  } catch (error: any) {
    console.error("WebAuthn authentication error:", error);
    
    // Handle specific WebAuthn errors
    if (error.name === "NotSupportedError") {
      throw new Error("WebAuthn is not supported on this device");
    } else if (error.name === "SecurityError") {
      throw new Error("Security error: Please ensure you're using HTTPS");
    } else if (error.name === "NotAllowedError") {
      throw new Error("Authentication was cancelled or timed out");
    } else if (error.name === "InvalidStateError") {
      throw new Error("No registered authenticator found");
    }
    
    throw error;
  }
}
