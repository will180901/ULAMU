-- Les balayages périodiques se rattrapent au réveil (chantier 57).
--
-- ⚠️ CONSTAT : les `@Cron` ne s'exécutent que si le processus est vivant à l'instant dit. Le plan
-- gratuit de Render endort le service après ~15 minutes d'inactivité — un service endormi ne
-- déclenche rien.
--
-- Mesuré en production le 06/09/2026, sur 11,4 jours de journal d'audit :
--   • le balayage QUOTIDIEN a tourné UNE seule fois (04/09 à 00:00 UTC) ;
--   • l'horaire, une fois observée (29/08 à 15:00) ;
--   • celui d'une minute, quelques fois — toujours pendant qu'un utilisateur était actif.
--
-- Autrement dit, les balayages ne tournent que par hasard. Ceux ajoutés les 06/09 (retraits
-- orphelins, fichiers sans propriétaire) auraient donc tourné environ une nuit sur onze.
--
-- Cette table porte la date du dernier passage réussi de chaque balayage. Le tick d'une minute —
-- qui se déclenche dès que le service est éveillé, donc à la première requête venue — vérifie le
-- RETARD et rattrape ce qui est dû. Le déclencheur cesse d'être l'heure ; il devient l'ancienneté.
--
-- C'est l'idiome que ce projet emploie déjà partout ailleurs : `settle()` fait les transitions au
-- moment de la lecture, sans dépendre d'aucune horloge.
--
-- ⚠️ Purement ADDITIVE : une table neuve. Rien d'existant n'est touché, et les `@Cron` restent en
-- place — le jour où l'hébergement gardera le service éveillé, ils feront le travail en avance et
-- le rattrapage ne trouvera jamais de retard.
CREATE TABLE "SchedulerRun" (
    "name" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchedulerRun_pkey" PRIMARY KEY ("name")
);
