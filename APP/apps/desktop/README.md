# @ulamu/desktop — Application PROFESSIONNELS / STRUCTURES / ADMIN (Next.js + Electron)

> Échafaudée au **Chantier 1** (Next.js) puis emballée Electron (ADR-05). Les mêmes écrans servent la version navigateur.
> Promesse clé : notification de poignée de main **sonore en < 5 s** (ENF-09) ; bascule « absent » après 15 min d'inactivité (PM-26).

## Structure cible

```
src/app/
├── (professionnel)/   # offres, poignées de main, sessions, compte-rendu, gains
├── (structure)/       # stock (M11), délivrances par scan (M09), réservations (M12), membres (M02)
└── (admin)/           # vérification (M03), modération (M04), finance (M13), paramètres PM-xx (M16)

src/realtime/          # socket : initiations, décompteur, présence (battement de cœur)
electron/              # main process, auto-update, badge présence, notifications système
```

🎨 **UI** : reproduire le rendu des maquettes officielles — jamais leur code (`docs/cahier_des_charges/04_ux_ui/README.md`, règle 4).
🔐 Toute action admin : TOTP + motif + audit (RM-16-03).
