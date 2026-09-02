/**
 * M14 — Catalogue des modèles de notification (EF-14-03).
 * Spec : docs/cahier_des_charges/02_modules/M14_notifications_rappels.md
 *
 * RM-14-01 : service aveugle au métier — les modules émetteurs n'envoient JAMAIS de
 * texte libre, seulement une clé de modèle + données ; M14 livre des modèles remplis.
 * RM-14-03 / EF-14-06 : aucun gabarit ne contient ni ne rend de contenu médical —
 * les payloads C4 n'en transportent pas, et les gabarits n'ajoutent rien.
 * Pilule empoisonnée interdite : un modèle inconnu retombe sur un gabarit générique
 * (catégorie "system") — on ne jette JAMAIS, l'outbox ne doit pas rejouer à l'infini.
 */

/** Les 5 catégories de préférence (EF-14-04) — alignées sur Notification.category (schéma D8). */
export const NOTIFICATION_CATEGORIES = ["care", "money", "reminder", "system", "critical"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Données C4 jointes à la demande — opaques pour M14 (RM-14-01). */
export type TemplatePayload = Record<string, unknown>;

export interface NotificationTemplate {
  category: NotificationCategory;
  title: (payload: TemplatePayload) => string;
  body: (payload: TemplatePayload) => string;
}

/** Valeur de payload rendue en texte sûr — repli si absente ou d'un type inattendu. */
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

/** Gabarit de repli (modèle inconnu) : générique, catégorie "system" — jamais d'échec. */
export const GENERIC_TEMPLATE: NotificationTemplate = {
  category: "system",
  title: () => "Notification ULAMU",
  body: () => "Vous avez une nouvelle notification. Ouvrez votre espace ULAMU pour en prendre connaissance.",
};

/**
 * Catalogue versionné (EF-14-03) — UNE entrée par modèle émis via C4 par M01–M13.
 * Source de vérité : les `outbox.emit({ type: "notify.request", ... })` des modules.
 * Tout en FRANÇAIS (langue de référence du produit) ; jamais de contenu médical (RM-14-03).
 */
export const TEMPLATE_CATALOG: Record<string, NotificationTemplate> = {
  // ── M02 — Rôles & Structures ───────────────────────────────────────────────
  "m02.member.rights_updated": {
    category: "system",
    title: () => "Vos droits ont été mis à jour",
    body: () =>
      "Vos droits d'accès dans votre structure ont été modifiés par le titulaire. Consultez votre espace pour voir le détail de vos droits actuels.",
  },
  "m02.member.suspended": {
    category: "system",
    title: () => "Votre accès a été suspendu",
    body: () =>
      "Votre accès à la structure a été suspendu par le titulaire. Rapprochez-vous de votre structure pour en connaître la raison.",
  },
  "m02.ownership.transferred.from": {
    category: "system",
    title: () => "Transfert de titularité effectué",
    body: () =>
      "Le transfert de titularité de votre structure est effectif : vous n'en êtes plus le titulaire. Vos autres droits restent inchangés.",
  },
  "m02.ownership.transferred.to": {
    category: "system",
    title: () => "Vous êtes le nouveau titulaire",
    body: () =>
      "La titularité de la structure vous a été transférée. Vous disposez désormais de l'ensemble des droits de gestion.",
  },

  // ── M03 — Vérification & Contrats ──────────────────────────────────────────
  "m03.case.submitted": {
    category: "system",
    title: () => "Dossier de vérification reçu",
    body: (p) => {
      const delay = str(p.announcedDelayHours);
      return delay
        ? `Votre dossier de vérification a bien été reçu. Délai d'examen annoncé : ${delay} heures.`
        : "Votre dossier de vérification a bien été reçu. Il sera examiné dans les délais annoncés.";
    },
  },
  "m03.case.decided": {
    category: "system",
    title: () => "Décision sur votre dossier de vérification",
    body: (p) => {
      // Valeurs émises par M03 : VERIFIED | REJECTED | NEEDS_INFO (m03.dto.ts).
      switch (str(p.decision)) {
        case "VERIFIED":
          return "Bonne nouvelle : votre dossier de vérification a été approuvé. Votre badge vérifié est actif.";
        case "REJECTED":
          return "Votre dossier de vérification a été refusé. Consultez votre espace pour les motifs détaillés et les démarches possibles.";
        case "NEEDS_INFO":
          return "Votre dossier de vérification nécessite des informations complémentaires. Consultez votre espace pour voir ce qui est demandé.";
        default:
          return "Une décision a été rendue sur votre dossier de vérification. Consultez votre espace pour le détail motivé.";
      }
    },
  },
  "m03.case.revoked": {
    category: "system",
    title: () => "Vérification révoquée",
    body: () =>
      "Votre badge de vérification a été révoqué avec effet immédiat. Consultez votre espace pour les motifs et les démarches possibles.",
  },
  "m03.agreement.reissued": {
    category: "money",
    title: () => "Nouveau contrat d'adhésion disponible",
    body: (p) => {
      const pct = str(p.commissionPct);
      return pct
        ? `Votre contrat d'adhésion a été réédité (commission de ${pct} %). Consultez la nouvelle version dans votre espace.`
        : "Votre contrat d'adhésion a été réédité. Consultez la nouvelle version dans votre espace.";
    },
  },

  // ── M04 — Audit & Signalements ─────────────────────────────────────────────
  "m04.report.resolved": {
    category: "system",
    title: () => "Votre signalement a été traité",
    body: (p) => {
      // Issues finales M04 : DISMISSED | ACTION_TAKEN (m04.policies.ts) — jamais le détail des sanctions.
      switch (str(p.outcome)) {
        case "DISMISSED":
          return "Après examen, votre signalement a été classé sans suite. Merci d'avoir contribué à la sécurité de la communauté.";
        case "ACTION_TAKEN":
          return "Après examen, votre signalement a donné lieu à des mesures. Merci d'avoir contribué à la sécurité de la communauté.";
        default:
          return "Votre signalement a été examiné par notre équipe. Merci d'avoir contribué à la sécurité de la communauté.";
      }
    },
  },
  "m04.report.warning": {
    category: "system",
    title: () => "Avertissement de modération",
    body: () =>
      "Un signalement vous concernant a donné lieu à un avertissement après examen. Consultez les règles de la plateforme dans votre espace.",
  },
  "m04.integrity.broken": {
    // EF-04-02 : rupture de la chaîne d'audit → alerte critique au Super Admin (RM-14-02 : jamais désactivable).
    category: "critical",
    title: () => "Alerte critique : intégrité du journal d'audit",
    body: (p) => {
      const seq = str(p.brokenAtSeq);
      return seq
        ? `Une rupture de la chaîne d'audit a été détectée (séquence ${seq}). Intervention immédiate requise.`
        : "Une rupture de la chaîne d'audit a été détectée. Intervention immédiate requise.";
    },
  },

  // ── M13 — Paiements & Reçus ────────────────────────────────────────────────
  // RM-14-03/EF-14-03 : failReason/reason des payloads M13 ne sont JAMAIS rendus
  // tels quels — le texte affiché vient exclusivement du catalogue.
  "m13.receipt": {
    category: "money",
    title: () => "Reçu de paiement disponible",
    body: (p) => {
      const amount = str(p.amountXaf);
      const num = str(p.receiptNumber);
      const head = amount
        ? `Votre paiement de ${amount} FCFA a été confirmé.`
        : "Votre paiement a été confirmé.";
      return num
        ? `${head} Votre reçu ${num} est disponible dans votre espace.`
        : `${head} Votre reçu est disponible dans votre espace.`;
    },
  },
  "m13.payment.failed": {
    category: "money",
    title: () => "Paiement non abouti",
    body: (p) => {
      const amount = str(p.amountXaf);
      return amount
        ? `Votre paiement de ${amount} FCFA n'a pas abouti. Aucun montant n'a été encaissé : vous pouvez réessayer depuis votre espace.`
        : "Votre paiement n'a pas abouti. Aucun montant n'a été encaissé : vous pouvez réessayer depuis votre espace.";
    },
  },
  "m13.refund": {
    // EF-14-04 : le remboursement fait partie des critiques — jamais désactivable (RM-14-02).
    category: "critical",
    title: () => "Remboursement effectué",
    body: (p) => {
      const amount = str(p.amountXaf);
      return amount
        ? `Un remboursement de ${amount} FCFA a été émis vers votre compte Mobile Money. Le détail est disponible dans votre espace.`
        : "Un remboursement a été émis vers votre compte Mobile Money. Le détail est disponible dans votre espace.";
    },
  },
  "m13.earnings.credited": {
    category: "money",
    title: () => "Gains crédités",
    body: (p) => {
      const amount = str(p.amountXaf);
      return amount
        ? `Votre compte de gains a été crédité de ${amount} FCFA. Le détail est disponible dans votre espace.`
        : "Votre compte de gains a été crédité. Le détail est disponible dans votre espace.";
    },
  },
  "m13.withdrawal.executed": {
    category: "money",
    title: () => "Retrait effectué",
    body: (p) => {
      const net = str(p.netXaf);
      return net
        ? `Votre retrait a été exécuté : ${net} FCFA nets envoyés vers votre compte Mobile Money.`
        : "Votre retrait a été exécuté vers votre compte Mobile Money. Le détail est disponible dans votre espace.";
    },
  },
  "m13.withdrawal.failed": {
    category: "money",
    title: () => "Retrait non abouti",
    body: (p) => {
      const amount = str(p.amountXaf);
      return amount
        ? `Votre retrait de ${amount} FCFA n'a pas abouti. Vos gains restent disponibles : vous pouvez réessayer depuis votre espace.`
        : "Votre retrait n'a pas abouti. Vos gains restent disponibles : vous pouvez réessayer depuis votre espace.";
    },
  },
  // Alertes finance (EF-13-09, CU-13-04/05) — destinées aux admins, émises en priorité critique.
  "m13.refund.gateway_failed": {
    category: "critical",
    title: () => "Alerte finance : remboursement en échec",
    body: () =>
      "Un remboursement automatique a échoué côté agrégateur et requiert un traitement manuel. Consultez la console finance.",
  },
  "m13.reconciliation.gap": {
    category: "critical",
    title: () => "Alerte finance : écart de réconciliation",
    body: () =>
      "Des écarts ont été détectés entre l'agrégateur et la plateforme lors de la réconciliation. Consultez la console finance pour le détail.",
  },

  // ── M05 — Annuaire (cloche de disponibilité, CU-05-05) ─────────────────────
  "m05.pro.available": {
    category: "care",
    title: () => "Un professionnel est de nouveau disponible",
    body: (p) => {
      const name = str(p.displayName);
      return name
        ? `${name}, que vous suivez, est de nouveau disponible. Vous pouvez initier une consultation depuis l'annuaire.`
        : "Un professionnel que vous suivez est de nouveau disponible. Vous pouvez initier une consultation depuis l'annuaire.";
    },
  },

  // ── M07 — Carnet (entrées, transfert du Carnet familial) ───────────────────
  "m07.entry.added": {
    category: "care",
    title: () => "Nouvelle entrée dans votre carnet",
    body: () =>
      "Une nouvelle entrée a été ajoutée à votre carnet de santé. Ouvrez votre espace pour la consulter — son contenu n'est jamais affiché dans les notifications.",
  },
  "m07.record.transferred.to": {
    category: "care",
    title: () => "Votre carnet de santé vous a été transféré",
    body: () =>
      "Le carnet de santé géré jusqu'ici par votre tuteur vous appartient désormais : tout son historique vous suit sur votre compte.",
  },
  "m07.record.transferred.from": {
    category: "care",
    title: () => "Carnet d'un proche transféré",
    body: () =>
      "Le carnet de santé d'un proche que vous suiviez a été transféré à son titulaire devenu majeur. Vous n'y avez plus accès.",
  },

  // ── M06 — Poignée de main & Session ⭐ ──────────────────────────────────────
  // Les notifications « urgentes » (poignée, démarrage, remboursement) portent
  // priority "critical" dans leur payload émis par M06 — livrées quoi qu'il arrive (RM-14-02).
  "m06.handshake.initiated": {
    category: "care",
    title: () => "Nouvelle demande de consultation",
    body: (p) => {
      const name = str(p.patientFirstName);
      const age = str(p.patientAge);
      const who = name && age ? `${name} (${age} ans)` : name || "Un patient";
      return `${who} souhaite vous consulter et attend votre confirmation. Confirmez votre disponibilité pour ouvrir le paiement.`;
    },
  },
  "m06.handshake.confirmed": {
    category: "care",
    title: () => "Le professionnel a confirmé",
    body: () =>
      "Le professionnel est prêt à vous recevoir. Vous pouvez maintenant régler la consultation pour ouvrir la session — la fenêtre de paiement est limitée dans le temps.",
  },
  "m06.handshake.refused": {
    category: "care",
    title: () => "Demande déclinée",
    body: (p) => {
      const reason = str(p.reason);
      return reason
        ? `Votre demande de consultation a été déclinée. Motif indiqué : ${reason}. Vous pouvez choisir un autre professionnel dans l'annuaire.`
        : "Votre demande de consultation a été déclinée. Vous pouvez choisir un autre professionnel dans l'annuaire.";
    },
  },
  "m06.handshake.expired": {
    category: "care",
    title: () => "Demande expirée",
    body: () =>
      "Votre demande de consultation a expiré faute de suite dans le délai imparti. Aucun montant n'a été débité — vous pouvez réinitier quand vous le souhaitez.",
  },
  "m06.session.preparing.patient": {
    category: "care",
    title: () => "Paiement confirmé — préparez votre consultation",
    body: () =>
      "Votre paiement est confirmé. Renseignez votre pré-consultation (motif, depuis quand, photos) : la session démarre dès que vous la transmettez.",
  },
  "m06.session.preparing.professional": {
    category: "care",
    title: () => "Consultation réglée — patient en préparation",
    body: () =>
      "Une consultation vient d'être réglée. Le patient prépare ses informations ; la session s'ouvrira à leur transmission.",
  },
  "m06.session.started": {
    category: "care",
    title: () => "La session a démarré",
    body: () =>
      "Votre session de consultation est ouverte : le décompteur tourne. Échangez dans la conversation jusqu'à la fin du temps imparti.",
  },
  "m06.message.received": {
    category: "care",
    title: () => "Nouveau message",
    body: () =>
      "Vous avez reçu un nouveau message dans votre session de consultation. Ouvrez la conversation pour le lire.",
  },
  "m06.session.extended": {
    category: "care",
    title: () => "Session prolongée",
    body: (p) => {
      const min = str(p.minutes);
      return min
        ? `Le professionnel a prolongé gratuitement votre session de ${min} minutes.`
        : "Le professionnel a prolongé gratuitement votre session.";
    },
  },
  "m06.session.cancelled": {
    category: "care",
    title: () => "Consultation annulée",
    body: () =>
      "Le patient a annulé la consultation avant le début des échanges. Le montant lui a été intégralement remboursé.",
  },
  "m06.session.refunded": {
    // CU-06-04 : remboursement automatique (argent) — critique, jamais désactivable.
    category: "critical",
    title: () => "Consultation remboursée",
    body: () =>
      "Le professionnel n'a pas répondu pendant votre session : vous êtes intégralement remboursé. Toutes nos excuses pour ce désagrément.",
  },
  "m06.payment.failed": {
    category: "money",
    title: () => "Paiement non abouti",
    body: () =>
      "Votre paiement de la consultation n'a pas abouti. Aucun montant n'a été débité : vous pouvez réessayer tant que la confirmation du professionnel est valide.",
  },
  "m06.report.deposited": {
    category: "care",
    title: () => "Compte-rendu disponible",
    body: () =>
      "Le professionnel a déposé le compte-rendu de votre consultation dans votre carnet. Vous pouvez maintenant noter la consultation.",
  },
  "m06.followup.offered": {
    category: "care",
    title: () => "Consultation de suivi proposée",
    body: () =>
      "Le professionnel vous propose une consultation de suivi. Retrouvez son offre dans l'annuaire pour la réserver si vous le souhaitez.",
  },
  "m06.report.reminder": {
    category: "system",
    title: () => "Compte-rendu en attente",
    body: (p) => {
      const h = str(p.hoursLeft);
      return h
        ? `Une session terminée attend son compte-rendu. Il vous reste environ ${h} heures pour le déposer et débloquer vos gains.`
        : "Une session terminée attend son compte-rendu. Déposez-le pour débloquer vos gains.";
    },
  },
  "m06.report.overdue": {
    category: "critical",
    title: () => "Délai de compte-rendu dépassé",
    body: () =>
      "Le délai de dépôt du compte-rendu est dépassé : les gains de cette session sont gelés. Contactez le support pour régulariser.",
  },
  "m06.report.overdue.admin": {
    category: "critical",
    title: () => "Compte-rendu en retard (supervision)",
    body: () =>
      "Une session a dépassé le délai de compte-rendu sans dépôt — gains gelés. À surveiller pour récidive éventuelle.",
  },

  // ── M09 — Ordonnance & Délivrance ──────────────────────────────────────────
  // RM-14-03 : jamais le détail des lignes/médicaments — seulement l'événement.
  "m09.prescription.sealed": {
    category: "care",
    title: () => "Votre ordonnance est disponible",
    body: () =>
      "Le professionnel a établi votre ordonnance. Présentez son QR en pharmacie (même hors ligne) pour la faire délivrer. Le détail est dans votre carnet.",
  },
  "m09.prescription.cancelled": {
    category: "care",
    title: () => "Ordonnance annulée",
    body: () =>
      "Le prescripteur a annulé votre ordonnance : son QR n'est plus valide. Si nécessaire, une nouvelle ordonnance devra être établie en consultation.",
  },
  /* ── Douze modèles ont été RETIRÉS le 02/09/2026 (chantier 26) ──────────────────────────────
     Deux de M09 (« délivrance complète », « délivrance partielle ») et dix de M12 (dévoilement,
     strikes de fiabilité, exclusion d'une officine). Ils n'ont plus d'émetteur : la chaîne du
     médicament en pharmacie sort du périmètre d'ULAMU, qui couvre le patient, le médecin et
     l'administration. Un catalogue qui garde des modèles que personne n'émet finit par faire
     croire qu'un chemin existe encore. */
  "m09.prescription.expired": {
    category: "care",
    title: () => "Ordonnance expirée",
    body: () =>
      "Le délai de validité de votre ordonnance est dépassé : elle ne peut plus être délivrée. Vous pouvez en redemander une via une consultation de suivi.",
  },


  // ── M16 — Pilotage & Administration (sanctions de compte) ──────────────────
  "m16.account.suspended": {
    // Argent/accès en jeu — critique, jamais désactivable (RM-14-02).
    category: "critical",
    title: () => "Votre compte a été suspendu",
    body: () =>
      "Votre compte ULAMU a été suspendu par l'équipe. Vos accès sont temporairement bloqués. Contactez le support pour connaître le motif et les voies de recours.",
  },
  "m16.account.reactivated": {
    category: "system",
    title: () => "Votre compte a été réactivé",
    body: () => "Votre compte ULAMU a été réactivé : vous pouvez de nouveau vous connecter et utiliser le service.",
  },
  "m16.account.banned": {
    category: "critical",
    title: () => "Votre compte a été fermé",
    body: () =>
      "Votre compte ULAMU a été fermé définitivement par l'équipe. Pour toute contestation, contactez le support via les voies de recours indiquées.",
  },
  "m16.account.ban_pending_approval": {
    // Destinée aux Super Admin (alerte interne) — critique.
    category: "critical",
    title: () => "Bannissement en attente d'approbation",
    body: () =>
      "Une demande de bannissement de compte attend une seconde validation. Ouvrez la console d'administration pour l'examiner et la décider.",
  },
};
