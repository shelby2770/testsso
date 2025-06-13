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
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
      {
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
        timeout: challengeData.timeout,
        authenticatorSelection: challengeData.authenticatorSelection,
        attestation:
          challengeData.attestation as AttestationConveyancePreference,
      };

    // 3. Create credentials using WebAuthn API
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;

    // 4. Parse response
    const response = credential.response as AuthenticatorAttestationResponse;

    // 5. Send verification to server
    const verificationResponse = await api.verifyRegistration({
      username,
      credential_id: arrayBufferToBase64Url(credential.rawId),
      client_data_json: arrayBufferToBase64Url(response.clientDataJSON),
      attestation_object: arrayBufferToBase64Url(response.attestationObject),
    });

    return verificationResponse;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

// Start WebAuthn authentication
export async function startAuthentication(username?: string): Promise<any> {
  try {
    // 1. Request challenge from server
    const challengeData = await api.getAuthenticationChallenge({ username });

    // 2. Create credential request options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
      {
        challenge: base64UrlToArrayBuffer(challengeData.challenge),
        rpId: challengeData.rpId,
        timeout: challengeData.timeout,
        userVerification:
          challengeData.userVerification as UserVerificationRequirement,
        allowCredentials:
          challengeData.allowCredentials?.map((cred: any) => ({
            id: base64UrlToArrayBuffer(cred.id),
            type: cred.type,
            transports: cred.transports,
          })) || [],
      };

    // 3. Get credentials using WebAuthn API
    const credential = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential;

    // 4. Parse response
    const response = credential.response as AuthenticatorAssertionResponse;

    // 5. Send verification to server
    const verificationResponse = await api.verifyAuthentication({
      credential_id: arrayBufferToBase64Url(credential.rawId),
      authenticator_data: arrayBufferToBase64Url(response.authenticatorData),
      client_data_json: arrayBufferToBase64Url(response.clientDataJSON),
      signature: arrayBufferToBase64Url(response.signature),
      user_handle: response.userHandle
        ? arrayBufferToBase64Url(response.userHandle)
        : undefined,
    });

    return verificationResponse;
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}

// Verify SSO token
export async function verifySSOToken(token: string): Promise<any> {
  try {
    return await api.verifyToken(token);
  } catch (error) {
    console.error("Token verification error:", error);
    throw error;
  }
}
