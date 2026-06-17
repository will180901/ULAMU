/**
 * @format
 * Tests de la logique PURE vendorée (sans rendu RN) : validation + machine d'auth.
 * (Le rendu d'écrans sera couvert par des tests de composants ultérieurement.)
 */
import {it, expect, describe} from '@jest/globals';
import {isAcceptablePassword, isValidOtp, normalizePhone} from '../src/lib/validation';
import {authReducer, initialAuthState} from '../src/lib/auth-state';

describe('validation (vendorée)', () => {
  it('normalise un numéro congolais', () => {
    expect(normalizePhone('061234567')).toBe('+242061234567');
    expect(normalizePhone('xxx')).toBeNull();
  });
  it('contrôle mot de passe et OTP', () => {
    expect(isAcceptablePassword('motdepasse1')).toBe(true);
    expect(isAcceptablePassword('court1')).toBe(false);
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12')).toBe(false);
  });
});

describe('authReducer (vendoré)', () => {
  it('RESTORED null → anonyme ; SUCCESS → authentifié', () => {
    expect(authReducer(initialAuthState, {type: 'RESTORED', session: null})).toEqual({status: 'anonymous'});
    const session = {accountId: 'a', accountType: 'PATIENT' as const, sessionToken: 't'};
    expect(authReducer({status: 'authenticating'}, {type: 'AUTH_SUCCESS', session})).toEqual({
      status: 'authenticated',
      session,
    });
  });
});
