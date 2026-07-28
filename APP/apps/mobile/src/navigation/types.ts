import type {NavigatorScreenParams} from '@react-navigation/native';

/** Param lists de navigation. Auth = username + mot de passe + TOTP. */
export type AuthStackParamList = {
  Welcome: undefined; // écran Bienvenue (1er lancement)
  Login: {startOpen?: boolean} | undefined; // username + mot de passe ; startOpen : arrivée depuis Register/Forgot, tiroir déjà ouvert
  Register: undefined; // inscription multi-étapes (identité+username → tél+mdp → OTP)
  Forgot: undefined; // mot de passe oublié (email → OTP → nouveau mot de passe)
  LoginOtp: {username: string; password: string; debugCode?: string}; // 2e facteur à la connexion : code par email (2FA du mobile)
  TotpChallenge: {username: string; password: string}; // 2e facteur TOTP — web uniquement, jamais atteint sur mobile
  Success: {context: 'register' | 'login'};
};

/** Onglets patient (coque de navigation — maquette tabs.jsx). */
export type PatientTabParamList = {
  Accueil: undefined;
  Consultations: undefined;
  Espace: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<PatientTabParamList> | undefined;
  Doctor: {id: string}; // fiche publique d'un soignant (M05)
  Handshake: {handshakeId: string; professionalName: string; amountXaf: number}; // attente de confirmation (M06)
  Pay: {handshakeId: string; professionalName: string; amountXaf: number}; // paiement Mobile Money (M06/M13)
  Session: {sessionId: string}; // session de soin chronométrée (M06)
  Carnet: {subProfileId?: string; title?: string} | undefined; // dossier médical à vie (M07) — soi ou personne à charge
  EditProfile: undefined; // mise à jour du profil (CRUD compte)
  Family: undefined; // carnet familial / personnes à charge (M07)
  Reminders: undefined; // rappels de médicaments (M14)
  Ordonnance: {prescriptionId: string}; // ordonnance + QR de délivrance (M09)
  Meds: undefined; // recherche & dévoilement-réservation de médicaments (M12)
  Notifications: undefined; // centre de notifications (M14)
  Payments: undefined; // reçus de paiement (M13)
  Settings: undefined; // réglages compte & sécurité (M01)
  PhoneChange: undefined; // changement de numéro (OTP ancien + nouveau)
  CloseAccount: undefined; // clôture de compte
};
