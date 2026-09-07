/**
 * @format
 * Un soignant sans offre — chantier 65, 07/09/2026 (CU-05-01/05).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **« Sur devis » était un mensonge.** Quand un soignant n'a aucune offre active, la fiche
 * affichait « Sur devis » et proposait quand même « Initier la consultation ». Or :
 *
 *   • il n'existe **aucun mécanisme de devis** dans ULAMU — un prix est une offre active, ou rien ;
 *   • le bouton menait à une impasse : le serveur exige un `offerId`.
 *
 * Mesuré en production le 07/09/2026 : le **seul** soignant de l'annuaire est dans ce cas, ses deux
 * offres étant désactivées. C'est donc ce que voyait tout patient ouvrant l'application.
 *
 * On éprouve ici la fonction qui décide de tout cela : celle qui traduit la fiche servie par
 * l'annuaire en ce que l'écran affiche.
 */
import {describe, expect, it} from '@jest/globals';
import {toDoctorProfileVM} from '../src/services/directory';
import {DirectoryProfile} from '../src/lib/contracts';

const BASE: DirectoryProfile = {
  professionalId: 'pro-1',
  displayName: 'Armel Konaté',
  category: 'GENERAL_PRACTITIONER',
  specialty: null,
  district: 'Brazzaville',
  badgeVerified: true,
  rating: {avg: 3, count: 1},
  reactivity: {confirmRatePct: 100, avgConfirmDelayS: 42},
  presence: 'OFFLINE',
  availableNow: false,
  lastSeenSeconds: 3600,
  cheapestOffer: null,
  relevanceScore: 0,
  biography: null,
  offers: [],
  ratingDistribution: {},
  latestComments: [],
};

const OFFRE_STANDARD = {id: 'off-1', label: 'Consultation', durationMin: 30, priceXaf: 5000, kind: 'STANDARD' as const};

describe('Un soignant SANS offre active', () => {
  /*
    LE test de ce chantier. Sans offre, il n'y a pas de prix — et surtout pas de prix « à négocier ».
    L'écran doit pouvoir dire « pas de consultation », ce qu'il ne peut faire que si le modèle le dit.
  */
  it('n’a ni prix ni offre à proposer', () => {
    const vm = toDoctorProfileVM({...BASE, offers: []});
    expect(vm.consultOfferId).toBeNull();
    expect(vm.consultPrice).toBeNull();
  });

  it('reste affichable : on ne le fait pas disparaître', () => {
    const vm = toDoctorProfileVM({...BASE, offers: []});
    expect(vm.name).toBe('Armel Konaté');
    expect(vm.id).toBe('pro-1');
  });
});

describe('Un soignant AVEC une offre active', () => {
  it('porte son offre et son prix', () => {
    const vm = toDoctorProfileVM({...BASE, offers: [OFFRE_STANDARD], cheapestOffer: OFFRE_STANDARD});
    expect(vm.consultOfferId).toBe('off-1');
    expect(vm.consultPrice).toBe(5000);
  });

  /*
    Une offre de SUIVI n'est pas une consultation : elle ne rend pas le soignant réservable pour une
    première consultation, et l'annoncer comme telle enverrait le patient sur un mur.
  */
  it('n’est pas rendu réservable par une simple offre de suivi', () => {
    const suivi = {id: 'off-2', label: 'Suivi', durationMin: 30, priceXaf: 2500, kind: 'FOLLOW_UP' as const};
    const vm = toDoctorProfileVM({...BASE, offers: [suivi], cheapestOffer: suivi});
    expect(vm.consultOfferId).toBeNull();
    expect(vm.followOfferId).toBe('off-2');
  });
});
