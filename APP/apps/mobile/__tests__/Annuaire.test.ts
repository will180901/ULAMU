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
    expect(vm.consultOffers).toEqual([]);
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
    expect(vm.consultOffers).toHaveLength(1);
    expect(vm.consultOffers[0].id).toBe('off-1');
    expect(vm.consultOffers[0].priceXaf).toBe(5000);
  });

  /*
    Une offre de SUIVI n'est pas une consultation : elle ne rend pas le soignant réservable pour une
    première consultation, et l'annoncer comme telle enverrait le patient sur un mur.
  */
  it('n’est pas rendu réservable par une simple offre de suivi', () => {
    const suivi = {id: 'off-2', label: 'Suivi', durationMin: 30, priceXaf: 2500, kind: 'FOLLOW_UP' as const};
    const vm = toDoctorProfileVM({...BASE, offers: [suivi], cheapestOffer: suivi});
    expect(vm.consultOffers).toEqual([]);
    expect(vm.followOfferId).toBe('off-2');
  });
});

/*
  ── Le patient choisit son offre — chantier 120, 15/09/2026 ────────────────────────────────────

  ⚠️ **Le téléphone imposait la première offre standard rencontrée.** Un soignant qui publie une
  consultation courte, une longue et une de nuit — PM-25 lui en permet cinq — n'en voyait proposer
  qu'une, et c'est celle-là que le patient payait. *Choisir à la place de quelqu'un ce qu'il va
  payer, c'est décider pour lui de ce dont il a besoin.*

  Ce que ces tests tiennent : la LISTE est complète, elle est ORDONNÉE (l'ordre décide de ce qui est
  coché par défaut), et le SUIVI n'y entre pas.
*/
describe('Le choix de l’offre (chantier 120)', () => {
  const COURTE = {id: 'off-c', label: 'Consultation express', durationMin: 15, priceXaf: 3000, kind: 'STANDARD' as const};
  const LONGUE = {id: 'off-l', label: 'Consultation approfondie', durationMin: 60, priceXaf: 12000, kind: 'STANDARD' as const};
  const SUIVI = {id: 'off-s', label: 'Suivi', durationMin: 20, priceXaf: 2500, kind: 'FOLLOW_UP' as const};

  it('rend TOUTES les offres de consultation, pas seulement la première', () => {
    const vm = toDoctorProfileVM({...BASE, offers: [OFFRE_STANDARD, LONGUE, COURTE]});
    expect(vm.consultOffers.map(o => o.id)).toEqual(['off-c', 'off-1', 'off-l']);
  });

  /*
    L'ordre n'est pas cosmétique : la première de la liste est celle que l'écran coche d'office.
    Elle doit donc être la MOINS CHÈRE — un défaut qui pousse vers la dépense n'est pas un défaut,
    c'est une vente. Et on ne s'en remet pas au tri du serveur : il le fait aujourd'hui, rien ne
    l'oblige à le faire demain.
  */
  it('les trie du moins cher au plus cher, quel que soit l’ordre reçu', () => {
    const vm = toDoctorProfileVM({...BASE, offers: [LONGUE, COURTE, OFFRE_STANDARD]});
    expect(vm.consultOffers.map(o => o.priceXaf)).toEqual([3000, 5000, 12000]);
  });

  it('n’en fait entrer AUCUNE de suivi dans le choix', () => {
    const vm = toDoctorProfileVM({...BASE, offers: [SUIVI, COURTE, LONGUE]});
    expect(vm.consultOffers.every(o => o.kind === 'STANDARD')).toBe(true);
    expect(vm.consultOffers).toHaveLength(2);
  });

  /*
    Le suivi reste ANNONCÉ, avec son prix et sa durée : le taire laisserait croire qu'un second
    rendez-vous se repaie plein tarif, et c'est ce qui fait renoncer à revenir.
  */
  it('annonce quand même le tarif de suivi, hors du choix', () => {
    const vm = toDoctorProfileVM({...BASE, offers: [COURTE, SUIVI]});
    expect(vm.followOfferId).toBe('off-s');
    expect(vm.followPrice).toBe(2500);
    expect(vm.followDurationMin).toBe(20);
  });

  it('ne se laisse pas remplir par une offre de suivi moins chère que tout le reste', () => {
    const vm = toDoctorProfileVM({...BASE, offers: [SUIVI], cheapestOffer: SUIVI});
    expect(vm.consultOffers).toEqual([]);
  });
});
